
// Follow this setup guide to integrate the Deno runtime and Supabase functions
// https://supabase.com/docs/guides/functions/deno-runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@12.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCorsRequest = () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

// Add CORS headers to response
const addCorsHeaders = (response: Response) => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
};

// Create Supabase client
const createSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing environment variables for Supabase client');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Handle Stripe webhook event
const handleWebhookEvent = async (req: Request) => {
  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Missing Stripe API keys');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    
    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      throw new Error('No Stripe signature found');
    }
    
    // Get the raw body as text
    const body = await req.text();
    
    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }
    
    console.log(`Received Stripe webhook event: ${event.type}`);
    
    // Initialize Supabase client
    const supabase = createSupabaseClient();
    
    // Process different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session);
        
        // Get the session ID to find the pending subscription
        const sessionId = session.id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        if (!sessionId) {
          throw new Error('No session ID found in the webhook event');
        }
        
        console.log(`Processing checkout session ${sessionId} for subscription ${subscriptionId}`);
        
        // Find the pending subscription by session ID
        const { data: pendingSubscription, error: pendingError } = await supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('session_id', sessionId)
          .single();
          
        if (pendingError || !pendingSubscription) {
          console.error('Error fetching pending subscription:', pendingError);
          throw new Error(`No pending subscription found for session ${sessionId}`);
        }
        
        console.log('Found pending subscription:', pendingSubscription);
        
        // Get the subscription details from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Retrieved subscription from Stripe:', stripeSubscription);
        
        // Update the pending subscription to completed
        const { error: updateError } = await supabase
          .from('pending_subscriptions')
          .update({
            status: 'completed',
            customer_id: customerId,
            subscription_id: subscriptionId
          })
          .eq('id', pendingSubscription.id);
          
        if (updateError) {
          console.error('Error updating pending subscription:', updateError);
        }
        
        // Get plan information
        const { data: plan, error: planError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('id', pendingSubscription.plan_id)
          .single();
          
        if (planError) {
          console.error('Error fetching plan:', planError);
          throw new Error(`Could not find plan ${pendingSubscription.plan_id}`);
        }
        
        // Determine subscription tier based on plan name
        let subscriptionTier = 'basic';
        if (plan.name.includes('Get Seen')) {
          subscriptionTier = 'standard';
        } else if (plan.name.includes('Get Results')) {
          subscriptionTier = 'premium';
        }
        
        // Create subscription record
        const { error: subscriptionCreateError } = await supabase
          .from('educator_subscriptions')
          .insert({
            user_id: pendingSubscription.user_id,
            plan_id: pendingSubscription.plan_id,
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
          });
          
        if (subscriptionCreateError) {
          console.error('Error creating subscription record:', subscriptionCreateError);
          throw new Error('Failed to create subscription record');
        }
        
        // Check if the educator profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('educator_profiles')
          .select('id')
          .eq('user_id', pendingSubscription.user_id)
          .maybeSingle();
          
        if (profileCheckError) {
          console.error('Error checking educator profile:', profileCheckError);
        }
        
        // Create or update the educator profile
        if (!existingProfile) {
          // Create new educator profile
          const { error: profileCreateError } = await supabase
            .from('educator_profiles')
            .insert({
              user_id: pendingSubscription.user_id,
              email: pendingSubscription.email,
              name: '',
              subscription_tier: subscriptionTier,
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId
            });
            
          if (profileCreateError) {
            console.error('Error creating educator profile:', profileCreateError);
            throw new Error('Failed to create educator profile');
          }
        } else {
          // Update existing profile
          const { error: profileUpdateError } = await supabase
            .from('educator_profiles')
            .update({
              subscription_tier: subscriptionTier,
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId
            })
            .eq('user_id', pendingSubscription.user_id);
            
          if (profileUpdateError) {
            console.error('Error updating educator profile:', profileUpdateError);
            throw new Error('Failed to update educator profile');
          }
        }
        
        console.log('Successfully processed subscription for user:', pendingSubscription.user_id);
        break;
      }
        
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription);
        
        // Update the subscription status in our database
        const { error: updateError } = await supabase
          .from('educator_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (updateError) {
          console.error('Error updating subscription:', updateError);
        }
        
        // Also update the educator profile
        const { error: profileUpdateError } = await supabase
          .from('educator_profiles')
          .update({
            subscription_status: subscription.status
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (profileUpdateError) {
          console.error('Error updating educator profile:', profileUpdateError);
        }
        
        break;
      }
        
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription);
        
        // Update the subscription status in our database
        const { error: updateError } = await supabase
          .from('educator_subscriptions')
          .update({
            status: 'cancelled'
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (updateError) {
          console.error('Error updating subscription to cancelled:', updateError);
        }
        
        // Also update the educator profile
        const { error: profileUpdateError } = await supabase
          .from('educator_profiles')
          .update({
            subscription_status: 'cancelled'
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (profileUpdateError) {
          console.error('Error updating educator profile subscription status:', profileUpdateError);
        }
        
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Main handler for all requests
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return handleCorsRequest();
  }
  
  try {
    // Process Stripe webhook events
    if (req.method === 'POST') {
      const response = await handleWebhookEvent(req);
      return addCorsHeaders(response);
    }
    
    // Handle unsupported methods
    return addCorsHeaders(
      new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
});
