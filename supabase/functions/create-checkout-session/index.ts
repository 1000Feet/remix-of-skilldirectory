
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        status: 204,
      });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const { priceId, userId, pendingId, customerEmail } = await req.json();

    if (!priceId || !userId || !pendingId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get the frontend URL from environment or use a default
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://skilldirectory.lovable.app";
    
    // Create a customer if one doesn't exist
    const { data: existingCustomers, error: customerError } = await supabase
      .from("educator_profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerError && customerError.code !== "PGRST116") {
      console.error("Error checking existing customer:", customerError);
      throw new Error("Failed to check existing customer");
    }

    let customerId = existingCustomers?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;

      // Update the pending subscription with the customer ID
      await supabase
        .from("pending_subscriptions")
        .update({ customer_id: customerId })
        .eq("id", pendingId);
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscription/cancel`,
      metadata: {
        user_id: userId,
        pending_id: pendingId,
      },
    });

    // Update the pending subscription with the session ID
    await supabase
      .from("pending_subscriptions")
      .update({ session_id: session.id })
      .eq("id", pendingId);

    return new Response(
      JSON.stringify({ sessionUrl: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
