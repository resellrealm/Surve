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
