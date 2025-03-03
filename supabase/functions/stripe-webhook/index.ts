
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Create a Stripe client
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  
  // Get the signature from the headers
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
  
  try {
    // Get the raw body
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    
    // Verify the signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed.`, err.message)
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    console.log(`Event received: ${event.type}`)
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // Retrieve the session with line items
        const checkoutSession = await stripe.checkout.sessions.retrieve(
          session.id,
          { expand: ['line_items'] }
        )
        
        if (!checkoutSession) {
          throw new Error('Could not retrieve checkout session')
        }
        
        // Get metadata from session
        const userId = session.client_reference_id || checkoutSession.metadata.userId
        const pendingId = checkoutSession.metadata.pendingId
        
        if (!userId) {
          throw new Error('No user ID found in session')
        }
        
        // Get customer and subscription info
        const customerId = session.customer
        const subscriptionId = session.subscription
        
        // Get pending subscription
        const { data: pendingSubscription, error: pendingError } = await supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('id', pendingId)
          .single()
        
        if (pendingError || !pendingSubscription) {
          throw new Error(`Could not find pending subscription: ${pendingError?.message}`)
        }
        
        // Get price from pending subscription
        const { data: plan, error: planError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('id', pendingSubscription.plan_id)
          .single()
        
        if (planError || !plan) {
          throw new Error(`Could not find plan: ${planError?.message}`)
        }
        
        // Update pending subscription status
        await supabase
          .from('pending_subscriptions')
          .update({
            status: 'completed',
            customer_id: customerId,
            subscription_id: subscriptionId
          })
          .eq('id', pendingId)
        
        // Create educator subscription
        const { error: subscriptionError } = await supabase
          .from('educator_subscriptions')
          .insert({
            user_id: userId,
            plan_id: pendingSubscription.plan_id,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          })
        
        if (subscriptionError) {
          throw new Error(`Could not create subscription: ${subscriptionError.message}`)
        }
        
        // Update educator profile
        const { error: profileError } = await supabase
          .from('educator_profiles')
          .upsert({
            user_id: userId,
            email: pendingSubscription.email,
            subscription_tier: plan.name.toLowerCase().includes('premium') ? 'premium' : 
                               plan.name.toLowerCase().includes('standard') ? 'standard' : 'basic',
            subscription_status: 'active',
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId
          })
        
        if (profileError) {
          throw new Error(`Could not update profile: ${profileError.message}`)
        }
        
        console.log(`Subscription created for user ${userId}`)
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        
        // Update subscription status in database
        const { error: subscriptionError } = await supabase
          .from('educator_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        
        if (subscriptionError) {
          throw new Error(`Could not update subscription: ${subscriptionError.message}`)
        }
        
        // Update profile subscription status
        const { data: existingSubscription } = await supabase
          .from('educator_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (existingSubscription) {
          await supabase
            .from('educator_profiles')
            .update({ 
              subscription_status: subscription.status 
            })
            .eq('user_id', existingSubscription.user_id)
        }
        
        console.log(`Subscription updated: ${subscription.id}`)
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        // Update subscription status in database
        const { error: subscriptionError } = await supabase
          .from('educator_subscriptions')
          .update({
            status: 'canceled'
          })
          .eq('stripe_subscription_id', subscription.id)
        
        if (subscriptionError) {
          throw new Error(`Could not update subscription: ${subscriptionError.message}`)
        }
        
        // Update profile subscription status
        const { data: existingSubscription } = await supabase
          .from('educator_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (existingSubscription) {
          await supabase
            .from('educator_profiles')
            .update({ 
              subscription_status: 'canceled' 
            })
            .eq('user_id', existingSubscription.user_id)
        }
        
        console.log(`Subscription canceled: ${subscription.id}`)
        break
      }
      
      // Handle other events as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    // Return a success response
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error processing webhook',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
