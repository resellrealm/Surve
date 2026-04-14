import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const PLATFORM_FEE_BPS = parseInt(Deno.env.get("PLATFORM_FEE_BPS") ?? "500");

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking, error: bookingError } = await serviceClient
      .from("bookings")
      .select("id, business_id, creator_id, escrow_intent_id, status, pay_agreed")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.business_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the booking business can release escrow" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!booking.escrow_intent_id) {
      return new Response(JSON.stringify({ error: "No escrow payment intent on this booking" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentIntent = await stripe.paymentIntents.capture(booking.escrow_intent_id);
    const capturedAmount = paymentIntent.amount_received;

    const { data: creator } = await serviceClient
      .from("creator_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.creator_id)
      .single();

    if (!creator?.stripe_account_id) {
      return new Response(JSON.stringify({ error: "Creator has no connected Stripe account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformFee = Math.round(capturedAmount * PLATFORM_FEE_BPS / 10000);
    const creatorPayout = capturedAmount - platformFee;

    const transfer = await stripe.transfers.create({
      amount: creatorPayout,
      currency: paymentIntent.currency,
      destination: creator.stripe_account_id,
      metadata: {
        booking_id: booking.id,
        creator_id: booking.creator_id,
        business_id: booking.business_id,
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
        description: `Creator payout for booking ${booking.id}`,
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

    await serviceClient
      .from("bookings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", booking.id);

    await serviceClient.from("notifications").insert([
      {
        user_id: booking.creator_id,
        type: "payment",
        title: "Payment released",
        body: `$${(creatorPayout / 100).toFixed(2)} is on its way to your account!`,
        data: { booking_id: booking.id, transfer_id: transfer.id },
      },
      {
        user_id: booking.business_id,
        type: "payment",
        title: "Escrow released",
        body: `$${(capturedAmount / 100).toFixed(2)} has been released for the booking.`,
        data: { booking_id: booking.id },
      },
    ]);

    return new Response(
      JSON.stringify({
        captured_amount: capturedAmount,
        creator_payout: creatorPayout,
        platform_fee: platformFee,
        transfer_id: transfer.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("release-escrow error:", err);
    const message = err instanceof Stripe.errors.StripeError ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
