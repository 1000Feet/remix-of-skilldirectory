
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0";

// CORS headers for browser preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe with the secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY is not set in environment variables");
      return new Response(JSON.stringify({ error: "Stripe configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16", // Use the latest API version
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables are not set");
      return new Response(JSON.stringify({ error: "Supabase configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { priceId, userId, pendingId, customerEmail } = await req.json();
    console.log(`Creating checkout session for user ${userId}, plan ${priceId}, pending subscription ${pendingId}`);

    if (!priceId || !userId || !pendingId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get plan details from database
    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("name, price")
      .eq("stripe_price_id", priceId)
      .single();

    if (planError) {
      console.error("Error fetching plan:", planError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve plan details" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine the base URL for success/cancel redirects
    const baseUrl = req.headers.get("origin") || "http://localhost:5173";
    
    // Create a checkout session
    console.log(`Creating Stripe checkout session with price ID: ${priceId}`);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancel`,
      customer_email: customerEmail,
      metadata: {
        user_id: userId,
        pending_id: pendingId,
      },
    });

    console.log(`Checkout session created: ${session.id}`);

    // Update the pending subscription with the session ID
    const { error: updateError } = await supabase
      .from("pending_subscriptions")
      .update({ session_id: session.id })
      .eq("id", pendingId);

    if (updateError) {
      console.error("Error updating pending subscription:", updateError);
    }

    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
