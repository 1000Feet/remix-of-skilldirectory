
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Stripe } from 'https://esm.sh/stripe@11.1.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15',
    })

    // Parse the request body
    const { priceId, userEmail, userType, pendingSignup, successUrl, cancelUrl } = await req.json()

    console.log(`Creating checkout for ${userEmail}, price: ${priceId}, pending signup: ${pendingSignup}`)

    if (!priceId || !userEmail) {
      throw new Error('Missing required parameters: priceId or userEmail')
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || 'https://skilldirectory.lovable.app/educator-dashboard?checkout_success=true',
      cancel_url: cancelUrl || 'https://skilldirectory.lovable.app/pricing?checkout_canceled=true',
      customer_email: userEmail,
      metadata: {
        userEmail,
        pendingSignup: pendingSignup ? 'true' : 'false',
        userType: userType || 'educator',
        planId: priceId
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
