
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Parse request body
    const { priceId, userId, pendingId, customerEmail } = await req.json()
    
    console.log(`Processing checkout request for price: ${priceId}, user: ${userId}, pendingId: ${pendingId}`)
    
    if (!priceId || !userId || !pendingId || !customerEmail) {
      throw new Error('Missing required parameters')
    }

    // Create a new checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      customer_email: customerEmail,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        pendingId: pendingId
      }
    })

    // Update pending subscription with session ID
    const { error: updateError } = await supabase
      .from('pending_subscriptions')
      .update({ 
        session_id: session.id,
        status: 'checkout_created'
      })
      .eq('id', pendingId)

    if (updateError) {
      console.error('Error updating pending subscription:', updateError)
      throw new Error(`Failed to update pending subscription: ${updateError.message}`)
    }

    console.log(`Checkout session created successfully: ${session.id}`)

    // Return the checkout session URL
    return new Response(
      JSON.stringify({ 
        sessionUrl: session.url,
        sessionId: session.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error(`Error creating checkout session:`, error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
