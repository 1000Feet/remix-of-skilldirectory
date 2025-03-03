
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.text()
    
    // Verify the webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err)
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing Stripe webhook event: ${event.type}`)

    // Handle specific events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log(`Checkout session completed: ${session.id}`)
        
        // Extract the user ID and pending ID from metadata
        const userId = session.metadata?.userId
        const pendingId = session.metadata?.pendingId
        
        if (!userId || !pendingId) {
          throw new Error('Missing user ID or pending ID in session metadata')
        }

        // Get the pending subscription
        const { data: pendingSubscription, error: pendingError } = await supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('id', pendingId)
          .single()

        if (pendingError) {
          throw new Error(`Failed to retrieve pending subscription: ${pendingError.message}`)
        }

        // Get Stripe subscription info
        const subscriptionId = session.subscription
        if (!subscriptionId) {
          throw new Error('No subscription ID found in checkout session')
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        // Get the plan ID from the pending subscription
        const planId = pendingSubscription.plan_id

        // Update the pending subscription
        await supabase
          .from('pending_subscriptions')
          .update({
            status: 'completed',
            subscription_id: subscriptionId,
            customer_id: session.customer
          })
          .eq('id', pendingId)

        // Create or update the educator profile
        const { data: existingProfile } = await supabase
          .from('educator_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        const planTier = subscription.items.data[0]?.price.id === 'price_1Qxp262ef3wsxdNeH5ShSDTi' 
          ? 'standard' 
          : 'premium'

        if (!existingProfile) {
          // Create new profile
          await supabase
            .from('educator_profiles')
            .insert({
              user_id: userId,
              email: session.customer_email,
              name: '',
              subscription_tier: planTier,
              subscription_status: 'active',
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer
            })
        } else {
          // Update existing profile
          await supabase
            .from('educator_profiles')
            .update({
              subscription_tier: planTier,
              subscription_status: 'active',
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer
            })
            .eq('user_id', userId)
        }

        // Create subscription record
        await supabase
          .from('educator_subscriptions')
          .insert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer,
            plan_id: planId,
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })

        console.log(`Successfully processed subscription for user: ${userId}`)
        break
      }

      case 'invoice.payment_succeeded': {
        // Handle subscription renewals
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          
          // Update subscription end date
          await supabase
            .from('educator_subscriptions')
            .update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq('stripe_subscription_id', subscriptionId)
          
          console.log(`Updated subscription renewal: ${subscriptionId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        
        // Update subscription status
        await supabase
          .from('educator_subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        
        // Also update the educator profile subscription status
        await supabase
          .from('educator_profiles')
          .update({
            subscription_status: subscription.status
          })
          .eq('stripe_subscription_id', subscription.id)
        
        console.log(`Updated subscription status: ${subscription.id} to ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        // Update subscription status to cancelled
        await supabase
          .from('educator_subscriptions')
          .update({
            status: 'cancelled'
          })
          .eq('stripe_subscription_id', subscription.id)
        
        // Also update the educator profile subscription status
        await supabase
          .from('educator_profiles')
          .update({
            subscription_status: 'cancelled'
          })
          .eq('stripe_subscription_id', subscription.id)
        
        console.log(`Marked subscription as cancelled: ${subscription.id}`)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error(`Error processing webhook:`, error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
