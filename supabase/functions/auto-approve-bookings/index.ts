import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const PLATFORM_FEE_BPS = parseInt(Deno.env.get("PLATFORM_FEE_BPS") ?? "500");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("CRON_SECRET");
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: bookings, error: fetchError } = await serviceClient
    .from("bookings")
    .select(
      "id, business_id, creator_id, escrow_intent_id, pay_agreed, status"
    )
    .eq("status", "proof_submitted")
    .lt("auto_approve_at", new Date().toISOString());

  if (fetchError) {
    console.error("Failed to fetch bookings:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!bookings || bookings.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, message: "No bookings to auto-approve" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripe = stripeKey
    ? new Stripe(stripeKey, {
        apiVersion: "2024-04-10",
        httpClient: Stripe.createFetchHttpClient(),
      })
    : null;

  const results: Array<{ booking_id: string; ok: boolean; error?: string }> =
    [];

  for (const booking of bookings) {
    try {
      const now = new Date().toISOString();

      if (stripe && booking.escrow_intent_id) {
        const paymentIntent = await stripe.paymentIntents.capture(
          booking.escrow_intent_id
        );
        const capturedAmount = paymentIntent.amount_received;

        const { data: creator } = await serviceClient
          .from("creator_profiles")
          .select("stripe_account_id")
          .eq("user_id", booking.creator_id)
          .single();

        if (creator?.stripe_account_id) {
          const platformFee = Math.round(
            (capturedAmount * PLATFORM_FEE_BPS) / 10000
          );
          const creatorPayout = capturedAmount - platformFee;

          const transfer = await stripe.transfers.create({
            amount: creatorPayout,
            currency: paymentIntent.currency,
            destination: creator.stripe_account_id,
            metadata: {
              booking_id: booking.id,
              creator_id: booking.creator_id,
              business_id: booking.business_id,
              auto_approved: "true",
            },
          });

          await serviceClient.from("transactions").insert([
            {
              booking_id: booking.id,
              payer_id: booking.business_id,
              payee_id: booking.creator_id,
              kind: "payout",
              amount_cents: creatorPayout,
              currency: paymentIntent.currency,
              status: "pending",
              stripe_payment_intent_id: paymentIntent.id,
              description: `Auto-approved payout for booking ${booking.id}`,
            },
            {
              booking_id: booking.id,
              payer_id: booking.business_id,
              payee_id: null,
              kind: "platform_fee",
              amount_cents: platformFee,
              currency: paymentIntent.currency,
              status: "succeeded",
              stripe_payment_intent_id: paymentIntent.id,
              description: `Platform fee (${PLATFORM_FEE_BPS / 100}%) for booking ${booking.id}`,
            },
          ]);

          await serviceClient.from("notifications").insert([
            {
              user_id: booking.creator_id,
              type: "payment",
              title: "Payment auto-approved",
              body: `$${(creatorPayout / 100).toFixed(2)} is on its way — proof was auto-approved after 72 hours.`,
              data: {
                booking_id: booking.id,
                transfer_id: transfer.id,
              },
            },
            {
              user_id: booking.business_id,
              type: "booking",
              title: "Booking auto-approved",
              body: `Proof for booking was auto-approved after 72 hours. $${(capturedAmount / 100).toFixed(2)} has been released.`,
              data: { booking_id: booking.id },
            },
          ]);
        }
      }

      await serviceClient
        .from("bookings")
        .update({
          status: "completed",
          proof_approved_at: now,
          completed_at: now,
        })
        .eq("id", booking.id);

      results.push({ booking_id: booking.id, ok: true });
    } catch (err) {
      console.error(`Auto-approve failed for booking ${booking.id}:`, err);
      results.push({
        booking_id: booking.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return new Response(
    JSON.stringify({ processed: results.length, succeeded, failed, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
