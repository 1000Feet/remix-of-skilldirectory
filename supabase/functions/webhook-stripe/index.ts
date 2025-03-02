
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.16.0";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  // Get the signature from the headers
  const signature = req.headers.get("stripe-signature");
  
  // Get the raw body as text
  const body = await req.text();
  
  let event;
  try {
    // Verify the event with Stripe using the signature and your webhook secret
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
    });
  }

  // Handle specific events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        if (session.mode === "subscription") {
          // Get the user ID from the metadata
          const userId = session.metadata.user_id;
          
          if (!userId) {
            console.error("No user ID found in session metadata");
            break;
          }
          
          // Get the subscription
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );
          
          // Determine plan based on the price
          const priceId = subscription.items.data[0].price.id;
          let plan = "basic";
          
          // Map price IDs to subscription tiers
          // Note: Update these with your actual price IDs
          if (priceId === "price_STANDARD") {
            plan = "standard";
          } else if (priceId === "price_PREMIUM") {
            plan = "premium";
          }
          
          // Update the educator profile
          const { error } = await supabase
            .from("educator_profiles")
            .update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_tier: plan,
              subscription_status: subscription.status,
              subscription_renewed_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
            
          if (error) {
            console.error("Error updating educator profile:", error);
          }
        }
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        
        // Find the educator profile with this subscription ID
        const { data: profiles, error: fetchError } = await supabase
          .from("educator_profiles")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id);
          
        if (fetchError || !profiles.length) {
          console.error("Error finding profile:", fetchError);
          break;
        }
        
        // Determine plan based on the price
        const priceId = subscription.items.data[0].price.id;
        let plan = "basic";
        
        // Map price IDs to subscription tiers
        if (priceId === "price_STANDARD") {
          plan = "standard";
        } else if (priceId === "price_PREMIUM") {
          plan = "premium";
        }
        
        // Update the educator profile
        const { error } = await supabase
          .from("educator_profiles")
          .update({
            subscription_tier: plan,
            subscription_status: subscription.status,
            subscription_renewed_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
          
        if (error) {
          console.error("Error updating educator profile:", error);
        }
        
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        
        // Find the educator profile with this subscription ID
        const { data: profiles, error: fetchError } = await supabase
          .from("educator_profiles")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id);
          
        if (fetchError || !profiles.length) {
          console.error("Error finding profile:", fetchError);
          break;
        }
        
        // Update the educator profile
        const { error } = await supabase
          .from("educator_profiles")
          .update({
            subscription_tier: "basic",
            subscription_status: "canceled",
            subscription_renewed_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
          
        if (error) {
          console.error("Error updating educator profile:", error);
        }
        
        break;
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (err) {
    console.error(`Error processing webhook: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
    });
  }
});
