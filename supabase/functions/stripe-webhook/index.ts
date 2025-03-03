
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@12.1.1?target=deno';

// Initialize Stripe with the API key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

// Headers for CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import createClient from the Supabase SDK
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.1.0';

// Create a single supabase client for interacting with your database
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get the stripe signature from the headers
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe signature in request headers');
      return new Response(JSON.stringify({ error: 'No signature provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Read request body
    const body = await req.text();
    
    let event;
    
    try {
      // Verify and construct the event
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Received event: ${event.type}`);

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        try {
          // Get session metadata
          const userId = session.metadata?.userId;
          const pendingId = session.metadata?.pendingId;
          const planId = session.metadata?.planId;
          
          console.log(`Processing checkout for user: ${userId}, pending: ${pendingId}, plan: ${planId}`);
          
          if (!userId || !pendingId || !planId) {
            console.error('Missing required metadata in session');
            return new Response(JSON.stringify({ error: 'Missing required metadata' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 1. Get plan details for subscription tier
          const { data: planData, error: planError } = await supabase
            .from('membership_plans')
            .select('name')
            .eq('id', planId)
            .single();

          if (planError) {
            console.error('Error fetching plan:', planError);
            throw planError;
          }

          // Get plan tier (basic, standard, premium)
          const planTier = planData.name.toLowerCase().includes('standard') 
            ? 'standard' 
            : planData.name.toLowerCase().includes('premium') 
              ? 'premium' 
              : 'basic';

          // 2. Update pending subscription to completed
          const { error: pendingError } = await supabase
            .from('pending_subscriptions')
            .update({ 
              status: 'completed',
              subscription_id: session.subscription,
              customer_id: session.customer,
              session_id: session.id
            })
            .eq('id', pendingId)
            .eq('user_id', userId);

          if (pendingError) {
            console.error('Error updating pending subscription:', pendingError);
            throw pendingError;
          }

          // 3. Create the educator profile only after successful payment
          // First check if it already exists
          const { data: existingProfile } = await supabase
            .from('educator_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          // Create the profile if it doesn't exist
          if (!existingProfile) {
            // Get user email
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
            
            if (userError) {
              console.error('Error fetching user:', userError);
              throw userError;
            }

            const { error: profileError } = await supabase
              .from('educator_profiles')
              .insert({
                user_id: userId,
                email: userData.user.email,
                name: '',
                subscription_tier: planTier,
                subscription_status: 'active',
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription
              });

            if (profileError) {
              console.error('Error creating educator profile:', profileError);
              throw profileError;
            }

            console.log(`Created educator profile for user ${userId}`);
          } else {
            // Update existing profile if it exists
            const { error: updateError } = await supabase
              .from('educator_profiles')
              .update({
                subscription_tier: planTier,
                subscription_status: 'active',
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription
              })
              .eq('user_id', userId);

            if (updateError) {
              console.error('Error updating educator profile:', updateError);
              throw updateError;
            }

            console.log(`Updated educator profile for user ${userId}`);
          }

          // 4. Create subscription record
          const { error: subscriptionError } = await supabase
            .from('educator_subscriptions')
            .insert({
              user_id: userId,
              plan_id: planId,
              status: 'active',
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer,
              current_period_start: new Date().toISOString(),
              // Default to 30 days if no subscription data is available
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

          if (subscriptionError) {
            console.error('Error creating subscription record:', subscriptionError);
            throw subscriptionError;
          }

          console.log(`Created subscription record for user ${userId}`);
        } catch (error) {
          console.error('Error processing checkout session:', error);
          return new Response(JSON.stringify({ error: `Processing Error: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Check if this is a subscription invoice
        if (invoice.subscription) {
          try {
            // Get subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            
            // Update subscription record with new period dates
            await supabase
              .from('educator_subscriptions')
              .update({
                status: 'active',
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', invoice.subscription);
            
            console.log(`Updated subscription periods for ${invoice.subscription}`);
          } catch (error) {
            console.error('Error updating subscription after payment:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        try {
          // Update the subscription record
          await supabase
            .from('educator_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);
          
          // Also update the educator profile status
          await supabase
            .from('educator_profiles')
            .update({
              subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
            })
            .eq('stripe_subscription_id', subscription.id);
          
          console.log(`Updated subscription status for ${subscription.id} to ${subscription.status}`);
        } catch (error) {
          console.error('Error updating subscription status:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        try {
          // Update the subscription record
          await supabase
            .from('educator_subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);
          
          // Also update the educator profile status
          await supabase
            .from('educator_profiles')
            .update({
              subscription_status: 'canceled',
            })
            .eq('stripe_subscription_id', subscription.id);
          
          console.log(`Marked subscription ${subscription.id} as canceled`);
        } catch (error) {
          console.error('Error handling subscription cancellation:', error);
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(`Webhook error: ${err.message}`);
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
