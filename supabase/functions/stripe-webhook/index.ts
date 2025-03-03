
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Stripe-Signature",
        },
        status: 204,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle the event
    console.log(`Processing event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCheckoutSessionCompleted(session) {
  try {
    const { metadata, customer, subscription } = session;
    const userId = metadata?.user_id;
    const pendingId = metadata?.pending_id;

    if (!userId || !customer || !subscription) {
      console.error("Missing essential data in session", { userId, customer, subscription });
      return;
    }

    console.log(`Processing completed checkout for user ${userId}, subscription ${subscription}`);

    // Get subscription details
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscription);
    const priceId = subscriptionDetails.items.data[0]?.price.id;

    // Get plan from database based on Stripe price ID
    const { data: planData, error: planError } = await supabase
      .from("membership_plans")
      .select("id, name")
      .eq("stripe_price_id", priceId)
      .single();

    if (planError) {
      console.error("Error retrieving plan:", planError);
      throw new Error(`Failed to retrieve plan for price ID ${priceId}`);
    }

    // Update pending subscription
    await supabase
      .from("pending_subscriptions")
      .update({
        subscription_id: subscription,
        status: "completed",
      })
      .eq("id", pendingId);

    // Create educator subscription
    const { error: subscriptionError } = await supabase
      .from("educator_subscriptions")
      .insert({
        user_id: userId,
        plan_id: planData.id,
        stripe_customer_id: customer,
        stripe_subscription_id: subscription,
        status: subscriptionDetails.status,
        current_period_start: new Date(subscriptionDetails.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscriptionDetails.current_period_end * 1000).toISOString(),
      });

    if (subscriptionError) {
      console.error("Error creating subscription record:", subscriptionError);
      throw new Error("Failed to create subscription record");
    }

    // Create or update educator profile
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("educator_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      console.error("Error checking existing profile:", profileCheckError);
    }

    const planTier = planData.name.toLowerCase().includes("standard") 
      ? "standard" 
      : planData.name.toLowerCase().includes("premium") 
        ? "premium" 
        : "basic";

    if (!existingProfile) {
      // Create a new profile
      const { error: profileError } = await supabase
        .from("educator_profiles")
        .insert({
          user_id: userId,
          email: session.customer_details?.email,
          name: "",
          subscription_tier: planTier,
          subscription_status: subscriptionDetails.status,
          stripe_customer_id: customer,
          stripe_subscription_id: subscription,
        });

      if (profileError) {
        console.error("Error creating educator profile:", profileError);
        throw new Error("Failed to create educator profile");
      }
    } else {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("educator_profiles")
        .update({
          subscription_tier: planTier,
          subscription_status: subscriptionDetails.status,
          stripe_customer_id: customer,
          stripe_subscription_id: subscription,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating educator profile:", updateError);
        throw new Error("Failed to update educator profile");
      }
    }

    console.log(`Successfully processed checkout for user ${userId}`);
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
    throw error;
  }
}

async function handleInvoicePaid(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    
    if (!subscriptionId) return;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Find the educator profile with this subscription
    const { data: profiles, error: profileError } = await supabase
      .from("educator_profiles")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error finding profile for subscription:", profileError);
      return;
    }
    
    if (profiles) {
      // Update the subscription status
      await supabase
        .from("educator_subscriptions")
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);
        
      // Update the educator profile
      await supabase
        .from("educator_profiles")
        .update({
          subscription_status: subscription.status,
        })
        .eq("user_id", profiles.user_id);
    }
  } catch (error) {
    console.error("Error handling invoice paid:", error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const subscriptionId = subscription.id;
    const status = subscription.status;
    
    // Find the educator profile with this subscription
    const { data: profiles, error: profileError } = await supabase
      .from("educator_profiles")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error finding profile for subscription:", profileError);
      return;
    }
    
    if (profiles) {
      // Update the subscription status
      await supabase
        .from("educator_subscriptions")
        .update({
          status: status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);
        
      // Update the educator profile
      await supabase
        .from("educator_profiles")
        .update({
          subscription_status: status,
        })
        .eq("user_id", profiles.user_id);
    }
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const subscriptionId = subscription.id;
    
    // Find the educator profile with this subscription
    const { data: profiles, error: profileError } = await supabase
      .from("educator_profiles")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error finding profile for subscription:", profileError);
      return;
    }
    
    if (profiles) {
      // Update the subscription status
      await supabase
        .from("educator_subscriptions")
        .update({
          status: "canceled"
        })
        .eq("stripe_subscription_id", subscriptionId);
        
      // Update the educator profile
      await supabase
        .from("educator_profiles")
        .update({
          subscription_status: "canceled"
        })
        .eq("user_id", profiles.user_id);
    }
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}
