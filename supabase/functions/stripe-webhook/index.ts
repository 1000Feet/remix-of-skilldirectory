
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0";

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
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!stripeSecretKey || !endpointSecret) {
      console.error("Stripe configuration error - missing environment variables");
      return new Response(JSON.stringify({ error: "Stripe configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables are not set");
      return new Response(JSON.stringify({ error: "Supabase configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify the event
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

    console.log(`Event received: ${event.type}`);

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Get metadata
      const userId = session.metadata?.user_id;
      const pendingId = session.metadata?.pending_id;
      
      if (!userId || !pendingId) {
        console.error('Missing metadata in session', session);
        return new Response(JSON.stringify({ error: 'Missing metadata in session' }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Get the pending subscription
        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('id', pendingId)
          .single();

        if (pendingError) {
          throw pendingError;
        }

        // Get the plan
        const { data: planData, error: planError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('id', pendingData.plan_id)
          .single();

        if (planError) {
          throw planError;
        }

        // Create a subscription record
        const { error: subscriptionError } = await supabase
          .from('educator_subscriptions')
          .insert({
            user_id: userId,
            plan_id: pendingData.plan_id,
            plan: planData.name.toLowerCase().replace(/\s+/g, '_'),
            status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          });

        if (subscriptionError) {
          throw subscriptionError;
        }

        // Create or update educator profile
        const { error: profileError } = await supabase
          .from('educator_profiles')
          .upsert({
            user_id: userId,
            email: pendingData.email,
            name: '',
            subscription_tier: planData.name.toLowerCase().replace(/\s+/g, '_'),
            subscription_status: 'active'
          });

        if (profileError) {
          throw profileError;
        }

        // Update pending subscription
        const { error: updateError } = await supabase
          .from('pending_subscriptions')
          .update({
            status: 'completed'
          })
          .eq('id', pendingId);

        if (updateError) {
          console.error('Error updating pending subscription:', updateError);
        }

        console.log(`Subscription created successfully for user ${userId}`);
      } catch (error) {
        console.error('Error processing checkout session:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else if (event.type === 'invoice.payment_failed') {
      // Handle failed payment
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        try {
          // Find the subscription in our database
          const { data: subscription, error: findError } = await supabase
            .from('educator_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (findError) {
            throw findError;
          }

          // Update subscription status
          const { error: updateError } = await supabase
            .from('educator_subscriptions')
            .update({
              status: 'past_due'
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (updateError) {
            throw updateError;
          }

          // Update educator profile
          const { error: profileError } = await supabase
            .from('educator_profiles')
            .update({
              subscription_status: 'past_due'
            })
            .eq('user_id', subscription.user_id);

          if (profileError) {
            throw profileError;
          }
        } catch (error) {
          console.error('Error handling payment failure:', error);
        }
      }
    }

    // Return a successful response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
