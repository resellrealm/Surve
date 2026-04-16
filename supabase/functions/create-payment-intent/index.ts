import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

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

    const body = await req.json();
    const { booking_id, boost_id, amount_cents, metadata: extraMetadata } = body;

    if (!amount_cents || amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "Positive amount_cents required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!booking_id && !boost_id) {
      return new Response(JSON.stringify({ error: "booking_id or boost_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Boost payment flow ────────────────────────────────────────────
    if (boost_id) {
      const { data: boost, error: boostError } = await serviceClient
        .from("boosts")
        .select("id, listing_id, business_id, tier, status")
        .eq("id", boost_id)
        .single();

      if (boostError || !boost) {
        return new Response(JSON.stringify({ error: "Boost not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (boost.business_id !== user.id) {
        return new Response(JSON.stringify({ error: "Only the boost owner can pay for it" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount_cents,
        currency: "gbp",
        metadata: {
          boost_id: boost.id,
          boost_tier: boost.tier,
          listing_id: boost.listing_id,
          business_id: boost.business_id,
          ...(extraMetadata ?? {}),
        },
      });

      const { error: txError } = await serviceClient.from("transactions").insert({
        booking_id: null,
        payer_id: boost.business_id,
        payee_id: null,
        kind: "payment",
        amount_cents,
        currency: "gbp",
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        description: `Boost (${boost.tier}) for listing ${boost.listing_id}`,
      });

      if (txError) {
        console.error("Failed to create boost transaction record:", txError);
      }

      return new Response(
        JSON.stringify({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Booking payment flow (existing) ───────────────────────────────
    const { data: booking, error: bookingError } = await serviceClient
      .from("bookings")
      .select("id, business_id, creator_id, status")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.business_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the booking business can create a payment intent" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      capture_method: "manual",
      metadata: {
        booking_id: booking.id,
        business_id: booking.business_id,
        creator_id: booking.creator_id,
      },
    });

    const { error: updateError } = await serviceClient
      .from("bookings")
      .update({ escrow_intent_id: paymentIntent.id })
      .eq("id", booking_id);

    if (updateError) {
      console.error("Failed to store escrow_intent_id:", updateError);
    }

    const { error: txError } = await serviceClient.from("transactions").insert({
      booking_id,
      payer_id: booking.business_id,
      payee_id: booking.creator_id,
      kind: "payment",
      amount_cents,
      currency: "usd",
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
      description: `Escrow hold for booking ${booking_id}`,
    });

    if (txError) {
      console.error("Failed to create transaction record:", txError);
    }

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
