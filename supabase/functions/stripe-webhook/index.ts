
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe signature or webhook secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Extract customer and payment details
        const { userId, pendingId } = session.metadata;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        if (!userId || !pendingId || !customerId || !subscriptionId) {
          throw new Error('Required metadata missing from checkout session');
        }
        
        console.log(`Processing successful checkout for user ${userId}, subscription ${subscriptionId}`);
        
        // Get subscription details to determine the plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        
        // Get plan details from database
        const { data: planData, error: planError } = await supabase
          .from('membership_plans')
          .select('id, name')
          .eq('stripe_price_id', priceId)
          .single();
          
        if (planError || !planData) {
          throw new Error(`Failed to find plan with stripe_price_id ${priceId}: ${planError?.message}`);
        }
        
        // Update pending subscription
        const { error: pendingError } = await supabase
          .from('pending_subscriptions')
          .update({
            status: 'completed',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          })
          .eq('id', pendingId);

        if (pendingError) {
          throw new Error(`Failed to update pending subscription: ${pendingError.message}`);
        }
        
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('educator_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        // Create or update educator profile
        if (!existingProfile) {
          // Create new profile
          const { error: profileError } = await supabase
            .from('educator_profiles')
            .insert({
              user_id: userId,
              subscription_tier: planData.name.toLowerCase(),
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              name: ''
            });
            
          if (profileError) {
            throw new Error(`Failed to create educator profile: ${profileError.message}`);
          }
        } else {
          // Update existing profile
          const { error: updateError } = await supabase
            .from('educator_profiles')
            .update({
              subscription_tier: planData.name.toLowerCase(),
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId
            })
            .eq('user_id', userId);
            
          if (updateError) {
            throw new Error(`Failed to update educator profile: ${updateError.message}`);
          }
        }
        
        // Create subscription record
        const { error: subscriptionError } = await supabase
          .from('educator_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planData.id,
            status: 'active',
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
          
        if (subscriptionError) {
          throw new Error(`Failed to create subscription record: ${subscriptionError.message}`);
        }
        
        console.log(`Successfully processed checkout for user ${userId}`);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (!subscriptionId) break;
        
        console.log(`Processing successful payment for subscription ${subscriptionId}`);
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Update subscription period in database
        const { error: updateError } = await supabase
          .from('educator_subscriptions')
          .update({
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
          
        if (updateError) {
          throw new Error(`Failed to update subscription period: ${updateError.message}`);
        }
        
        console.log(`Successfully updated subscription period for ${subscriptionId}`);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        
        console.log(`Processing subscription update for ${subscriptionId}: ${status}`);
        
        // Update subscription status in database
        const { error: updateError } = await supabase
          .from('educator_subscriptions')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
          
        if (updateError) {
          throw new Error(`Failed to update subscription status: ${updateError.message}`);
        }
        
        // Also update the educator profile subscription status
        const { data: subscriptionData } = await supabase
          .from('educator_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
          
        if (subscriptionData) {
          const { error: profileError } = await supabase
            .from('educator_profiles')
            .update({
              subscription_status: status
            })
            .eq('user_id', subscriptionData.user_id);
            
          if (profileError) {
            console.error(`Failed to update educator profile status: ${profileError.message}`);
          }
        }
        
        console.log(`Successfully updated subscription ${subscriptionId} status to ${status}`);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        
        console.log(`Processing subscription cancellation for ${subscriptionId}`);
        
        // Update subscription status in database
        const { error: updateError } = await supabase
          .from('educator_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
          
        if (updateError) {
          throw new Error(`Failed to update subscription status to canceled: ${updateError.message}`);
        }
        
        // Also update the educator profile subscription status
        const { data: subscriptionData } = await supabase
          .from('educator_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();
          
        if (subscriptionData) {
          const { error: profileError } = await supabase
            .from('educator_profiles')
            .update({
              subscription_status: 'canceled'
            })
            .eq('user_id', subscriptionData.user_id);
            
          if (profileError) {
            console.error(`Failed to update educator profile status: ${profileError.message}`);
          }
        }
        
        console.log(`Successfully marked subscription ${subscriptionId} as canceled`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
