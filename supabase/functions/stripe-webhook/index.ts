import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ─── Fraud Detection Thresholds ──────────────────────────────────────────────

const HIGH_AMOUNT_CENTS = 100_000; // $1,000
const VELOCITY_WINDOW_HOURS = 24;
const VELOCITY_MAX_TRANSACTIONS = 5;
const NEW_ACCOUNT_DAYS = 7;

type FlagType =
  | "chargeback"
  | "chargeback_updated"
  | "chargeback_won"
  | "chargeback_lost"
  | "high_amount"
  | "velocity"
  | "new_account"
  | "mismatched_country";

interface FraudFlag {
  booking_id?: string;
  user_id?: string;
  stripe_dispute_id?: string;
  stripe_payment_intent_id?: string;
  flag_type: FlagType;
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  reason: string;
  details: Record<string, unknown>;
}

async function insertFraudFlag(flag: FraudFlag) {
  const { error } = await supabase.from("fraud_flags").insert(flag);
  if (error) console.error("Failed to insert fraud flag:", error);
}

async function notifyAdmins(title: string, body: string, data: Record<string, unknown>) {
  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    const notifications = admins.map((a: { id: string }) => ({
      user_id: a.id,
      type: "system" as const,
      title,
      body,
      data,
    }));
    await supabase.from("notifications").insert(notifications);
  }
}

// ─── Risk Scoring for Payment Events ─────────────────────────────────────────

async function assessPaymentRisk(pi: Stripe.PaymentIntent) {
  const flags: FraudFlag[] = [];
  const userId = pi.metadata.business_id;
  const bookingId = pi.metadata.booking_id;

  // High amount check
  if (pi.amount >= HIGH_AMOUNT_CENTS) {
    flags.push({
      booking_id: bookingId,
      user_id: userId,
      stripe_payment_intent_id: pi.id,
      flag_type: "high_amount",
      risk_score: Math.min(100, Math.round((pi.amount / HIGH_AMOUNT_CENTS) * 40)),
      severity: pi.amount >= HIGH_AMOUNT_CENTS * 5 ? "high" : "medium",
      status: "pending_review",
      reason: `Payment of $${(pi.amount / 100).toFixed(2)} exceeds $${(HIGH_AMOUNT_CENTS / 100).toFixed(2)} threshold`,
      details: { amount_cents: pi.amount, currency: pi.currency },
    });
  }

  // Velocity check — count recent transactions by this user
  if (userId) {
    const since = new Date(Date.now() - VELOCITY_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("payer_id", userId)
      .gte("created_at", since);

    if (count && count >= VELOCITY_MAX_TRANSACTIONS) {
      flags.push({
        booking_id: bookingId,
        user_id: userId,
        stripe_payment_intent_id: pi.id,
        flag_type: "velocity",
        risk_score: Math.min(100, 50 + (count - VELOCITY_MAX_TRANSACTIONS) * 10),
        severity: count >= VELOCITY_MAX_TRANSACTIONS * 2 ? "high" : "medium",
        status: "pending_review",
        reason: `${count} transactions in the last ${VELOCITY_WINDOW_HOURS}h (limit: ${VELOCITY_MAX_TRANSACTIONS})`,
        details: { transaction_count: count, window_hours: VELOCITY_WINDOW_HOURS },
      });
    }

    // New account check
    const { data: user } = await supabase
      .from("users")
      .select("created_at")
      .eq("id", userId)
      .single();

    if (user) {
      const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < NEW_ACCOUNT_DAYS) {
        flags.push({
          booking_id: bookingId,
          user_id: userId,
          stripe_payment_intent_id: pi.id,
          flag_type: "new_account",
          risk_score: Math.round(30 + (NEW_ACCOUNT_DAYS - accountAgeDays) * 5),
          severity: accountAgeDays < 1 ? "high" : "low",
          status: "pending_review",
          reason: `Account is ${Math.round(accountAgeDays)} day(s) old (threshold: ${NEW_ACCOUNT_DAYS} days)`,
          details: { account_age_days: Math.round(accountAgeDays), created_at: user.created_at },
        });
      }
    }
  }

  // Country mismatch check (charge vs. account)
  const charge = pi.latest_charge;
  if (charge && typeof charge !== "string") {
    const paymentDetails = (charge as Stripe.Charge).payment_method_details;
    const cardCountry = paymentDetails?.card?.country;
    if (cardCountry && pi.metadata.account_country && cardCountry !== pi.metadata.account_country) {
      flags.push({
        booking_id: bookingId,
        user_id: userId,
        stripe_payment_intent_id: pi.id,
        flag_type: "mismatched_country",
        risk_score: 60,
        severity: "medium",
        status: "pending_review",
        reason: `Card country (${cardCountry}) differs from account country (${pi.metadata.account_country})`,
        details: { card_country: cardCountry, account_country: pi.metadata.account_country },
      });
    }
  }

  for (const flag of flags) {
    await insertFraudFlag(flag);
  }

  if (flags.some((f) => f.severity === "high" || f.severity === "critical")) {
    await notifyAdmins(
      "High-risk transaction flagged",
      `Payment of $${(pi.amount / 100).toFixed(2)} flagged for review. ${flags.length} risk factor(s) detected.`,
      { booking_id: bookingId, payment_intent_id: pi.id, flag_count: flags.length }
    );
  }
}

// ─── Chargeback / Dispute Handlers ───────────────────────────────────────────

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const piId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent
    : dispute.payment_intent?.id;

  const { data: tx } = await supabase
    .from("transactions")
    .select("booking_id, payer_id, payee_id, amount_cents")
    .eq("stripe_payment_intent_id", piId)
    .eq("kind", "payment")
    .maybeSingle();

  const bookingId = tx?.booking_id ?? dispute.metadata?.booking_id;
  const userId = tx?.payer_id;

  await insertFraudFlag({
    booking_id: bookingId,
    user_id: userId,
    stripe_dispute_id: dispute.id,
    stripe_payment_intent_id: piId ?? undefined,
    flag_type: "chargeback",
    risk_score: 90,
    severity: "critical",
    status: "pending_review",
    reason: `Chargeback filed: ${dispute.reason ?? "unknown reason"} — $${(dispute.amount / 100).toFixed(2)}`,
    details: {
      dispute_reason: dispute.reason,
      dispute_status: dispute.status,
      amount_cents: dispute.amount,
      currency: dispute.currency,
      evidence_due_by: dispute.evidence_details?.due_by,
      is_charge_refundable: dispute.is_charge_refundable,
    },
  });

  if (bookingId) {
    await supabase
      .from("bookings")
      .update({ status: "disputed" })
      .eq("id", bookingId);
  }

  await notifyAdmins(
    "Chargeback received",
    `A $${(dispute.amount / 100).toFixed(2)} chargeback was filed (${dispute.reason}). Evidence due by ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString() : "N/A"}.`,
    { dispute_id: dispute.id, booking_id: bookingId, payment_intent_id: piId }
  );

  // Check for repeat offenders
  if (userId) {
    const { count } = await supabase
      .from("fraud_flags")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("flag_type", "chargeback");

    if (count && count > 1) {
      await notifyAdmins(
        "Repeat chargeback offender",
        `User has ${count} chargebacks. Consider suspending account.`,
        { user_id: userId, chargeback_count: count }
      );
    }
  }
}

async function handleDisputeUpdated(dispute: Stripe.Dispute) {
  const isWon = dispute.status === "won";
  const isLost = dispute.status === "lost";
  const flagType = isWon ? "chargeback_won" : isLost ? "chargeback_lost" : "chargeback_updated";

  const piId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent
    : dispute.payment_intent?.id;

  // Update existing chargeback flag status
  if (isWon || isLost) {
    await supabase
      .from("fraud_flags")
      .update({
        status: isWon ? "resolved_safe" : "resolved_fraud",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_dispute_id", dispute.id)
      .eq("flag_type", "chargeback");
  }

  const { data: tx } = await supabase
    .from("transactions")
    .select("booking_id, payer_id")
    .eq("stripe_payment_intent_id", piId)
    .eq("kind", "payment")
    .maybeSingle();

  await insertFraudFlag({
    booking_id: tx?.booking_id,
    user_id: tx?.payer_id,
    stripe_dispute_id: dispute.id,
    stripe_payment_intent_id: piId ?? undefined,
    flag_type: flagType,
    risk_score: isLost ? 100 : isWon ? 10 : 70,
    severity: isLost ? "critical" : isWon ? "low" : "high",
    status: isWon ? "resolved_safe" : isLost ? "resolved_fraud" : "pending_review",
    reason: `Chargeback ${dispute.status}: ${dispute.reason ?? "unknown"} — $${(dispute.amount / 100).toFixed(2)}`,
    details: {
      dispute_reason: dispute.reason,
      dispute_status: dispute.status,
      amount_cents: dispute.amount,
      currency: dispute.currency,
    },
  });

  const title = isWon
    ? "Chargeback won"
    : isLost
      ? "Chargeback lost — funds deducted"
      : "Chargeback status updated";

  await notifyAdmins(title, `Dispute ${dispute.id} is now "${dispute.status}".`, {
    dispute_id: dispute.id,
    booking_id: tx?.booking_id,
    status: dispute.status,
  });
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata.booking_id;
        if (bookingId) {
          await supabase
            .from("transactions")
            .update({ status: "succeeded" })
            .eq("stripe_payment_intent_id", pi.id)
            .eq("kind", "payment");

          await supabase
            .from("notifications")
            .insert({
              user_id: pi.metadata.business_id,
              type: "payment",
              title: "Payment confirmed",
              body: `Payment of $${(pi.amount / 100).toFixed(2)} for booking confirmed.`,
              data: { booking_id: bookingId, payment_intent_id: pi.id },
            });
        }

        await assessPaymentRisk(pi);
        break;
      }

      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata.booking_id;
        if (bookingId) {
          await supabase
            .from("transactions")
            .update({ status: "failed" })
            .eq("stripe_payment_intent_id", pi.id)
            .eq("kind", "payment");

          await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId);

          await supabase
            .from("notifications")
            .insert({
              user_id: pi.metadata.business_id,
              type: "payment",
              title: "Payment cancelled",
              body: `Payment for booking was cancelled.`,
              data: { booking_id: bookingId },
            });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        if (account.charges_enabled && account.payouts_enabled) {
          await supabase
            .from("creator_profiles")
            .update({ stripe_onboarding_complete: true })
            .eq("stripe_account_id", account.id);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (piId) {
          const { data: tx } = await supabase
            .from("transactions")
            .select("booking_id, payer_id, payee_id, amount_cents")
            .eq("stripe_payment_intent_id", piId)
            .eq("kind", "payment")
            .single();

          if (tx) {
            await supabase
              .from("transactions")
              .update({ status: "refunded" })
              .eq("stripe_payment_intent_id", piId)
              .eq("kind", "payment");

            await supabase.from("transactions").insert({
              booking_id: tx.booking_id,
              payer_id: tx.payer_id,
              payee_id: tx.payee_id,
              kind: "refund",
              amount_cents: charge.amount_refunded,
              currency: charge.currency,
              status: "succeeded",
              stripe_payment_intent_id: piId,
              description: `Refund for booking ${tx.booking_id}`,
            });

            if (tx.payer_id) {
              await supabase.from("notifications").insert({
                user_id: tx.payer_id,
                type: "payment",
                title: "Refund processed",
                body: `$${(charge.amount_refunded / 100).toFixed(2)} has been refunded.`,
                data: { booking_id: tx.booking_id },
              });
            }
          }
        }
        break;
      }

      case "transfer.paid": {
        const transfer = event.data.object as Stripe.Transfer;
        const bookingId = transfer.metadata?.booking_id;
        const creatorId = transfer.metadata?.creator_id;

        if (bookingId && creatorId) {
          await supabase
            .from("transactions")
            .update({ status: "succeeded" })
            .eq("booking_id", bookingId)
            .eq("kind", "payout");

          await supabase.from("notifications").insert({
            user_id: creatorId,
            type: "payment",
            title: "Payout received",
            body: `$${(transfer.amount / 100).toFixed(2)} has been deposited to your account.`,
            data: { booking_id: bookingId },
          });
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        break;
      }

      case "charge.dispute.updated":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeUpdated(dispute);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
