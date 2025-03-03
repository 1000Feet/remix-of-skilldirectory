
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Stripe
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetch(),
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }
    
    // Get the raw body for verification
    const body = await req.text();
    
    console.log('Received webhook payload');
    
    let event;
    try {
      // Verify the event with Stripe
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Event type: ${event.type}`);
    
    // Handle specific events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const pendingSubscriptionId = session.metadata?.pending_subscription_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        console.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`);
        
        if (!userId || !subscriptionId) {
          console.error('Missing required metadata in session', session);
          throw new Error('Missing required metadata in session');
        }
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        
        console.log(`Processing subscription with price ID: ${priceId}`);
        
        // Update pending subscription status
        if (pendingSubscriptionId) {
          const { error: pendingError } = await supabase
            .from('pending_subscriptions')
            .update({
              status: 'completed',
              session_id: session.id,
              customer_id: customerId,
              subscription_id: subscriptionId
            })
            .eq('id', pendingSubscriptionId);
          
          if (pendingError) {
            console.error('Error updating pending subscription:', pendingError);
          } else {
            console.log(`Updated pending subscription ${pendingSubscriptionId} to completed`);
          }
        }
        
        // Get plan details
        const { data: planData, error: planError } = await supabase
          .from('membership_plans')
          .select('id, name, price')
          .eq('stripe_price_id', priceId)
          .single();
        
        if (planError || !planData) {
          console.error('Error fetching plan data:', planError);
          throw new Error(`Could not find plan with price ID: ${priceId}`);
        }
        
        console.log(`Found plan: ${planData.name} with price: ${planData.price}`);
        
        // Create subscription record
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('educator_subscriptions')
          .insert([
            {
              user_id: userId,
              plan: planData.name,
              price: planData.price,
              plan_id: planData.id,
              status: 'active',
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            }
          ]);
        
        if (subscriptionError) {
          console.error('Error creating subscription record:', subscriptionError);
          throw new Error('Failed to create subscription record');
        }
        
        console.log('Created subscription record in database');
        
        // Check if the user already has an educator profile
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('educator_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profileCheckError) {
          console.error('Error checking for existing profile:', profileCheckError);
        }
        
        // If no profile exists, create one
        if (!existingProfile) {
          // Get user details
          const { data: userData, error: userError } = await supabase
            .auth
            .admin
            .getUserById(userId);
          
          if (userError || !userData) {
            console.error('Error fetching user data:', userError);
            throw new Error(`Could not find user with ID: ${userId}`);
          }
          
          // Create educator profile
          const { error: profileError } = await supabase
            .from('educator_profiles')
            .insert([
              {
                user_id: userId,
                email: userData.user.email,
                name: userData.user.user_metadata?.full_name || '',
                subscription_tier: planData.name,
                subscription_status: 'active',
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId
              }
            ]);
          
          if (profileError) {
            console.error('Error creating educator profile:', profileError);
            throw new Error('Failed to create educator profile');
          }
          
          console.log(`Created educator profile for user ${userId}`);
        } else {
          // Update existing profile with subscription info
          const { error: updateError } = await supabase
            .from('educator_profiles')
            .update({
              subscription_tier: planData.name,
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId
            })
            .eq('user_id', userId);
          
          if (updateError) {
            console.error('Error updating educator profile:', updateError);
          } else {
            console.log(`Updated educator profile for user ${userId}`);
          }
        }
        
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        console.log(`Payment succeeded for subscription ${subscriptionId}`);
        
        if (subscriptionId) {
          // Update subscription status to active
          const { error: updateError } = await supabase
            .from('educator_subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId);
          
          if (updateError) {
            console.error('Error updating subscription status:', updateError);
          } else {
            console.log(`Updated subscription ${subscriptionId} status to active`);
          }
        }
        
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        console.log(`Payment failed for subscription ${subscriptionId}`);
        
        if (subscriptionId) {
          // Update subscription status to past_due
          const { error: updateError } = await supabase
            .from('educator_subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);
          
          if (updateError) {
            console.error('Error updating subscription status:', updateError);
          } else {
            console.log(`Updated subscription ${subscriptionId} status to past_due`);
          }
        }
        
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        
        console.log(`Subscription ${subscriptionId} cancelled`);
        
        if (subscriptionId) {
          // Update subscription status to cancelled
          const { error: updateError } = await supabase
            .from('educator_subscriptions')
            .update({ 
              status: 'cancelled',
              cancelled_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscriptionId);
          
          if (updateError) {
            console.error('Error updating subscription status:', updateError);
          } else {
            console.log(`Updated subscription ${subscriptionId} status to cancelled`);
            
            // Also update educator profile
            const { data: subData } = await supabase
              .from('educator_subscriptions')
              .select('user_id')
              .eq('stripe_subscription_id', subscriptionId)
              .single();
            
            if (subData) {
              const { error: profileError } = await supabase
                .from('educator_profiles')
                .update({ 
                  subscription_status: 'cancelled'
                })
                .eq('user_id', subData.user_id);
              
              if (profileError) {
                console.error('Error updating educator profile:', profileError);
              } else {
                console.log(`Updated educator profile for cancelled subscription`);
              }
            }
          }
        }
        
        break;
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
