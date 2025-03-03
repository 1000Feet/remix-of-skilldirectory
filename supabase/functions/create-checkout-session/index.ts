
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

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { priceId, userId, pendingId, customerEmail } = await req.json();

    // Validate required parameters
    if (!priceId || !userId || !pendingId || !customerEmail) {
      console.error('Missing required parameters', { priceId, userId, pendingId, customerEmail });
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: priceId, userId, pendingId, or customerEmail'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate that priceId starts with 'price_'
    if (!priceId.startsWith('price_')) {
      console.error('Invalid price ID format:', priceId);
      return new Response(
        JSON.stringify({
          error: `Invalid price ID format. Expected a Stripe price ID starting with 'price_', got: ${priceId}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Creating checkout session for price: ${priceId}, user: ${userId}`);

    // Get plan ID from pendingId
    // Import createClient from the Supabase SDK
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.1.0');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .select('plan_id')
      .eq('id', pendingId)
      .single();

    if (pendingError) {
      console.error('Error retrieving pending subscription data:', pendingError);
      throw new Error(`Failed to retrieve pending subscription: ${pendingError.message}`);
    }

    const planId = pendingData.plan_id;

    // Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      customer_email: customerEmail,
      metadata: {
        userId,
        pendingId,
        planId
      },
    });

    console.log(`Checkout session created: ${session.id}, URL: ${session.url}`);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionUrl: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Format the error message for client consumption
    let errorMessage = 'Failed to create checkout session';
    if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({
        error: `Error creating checkout session: ${errorMessage}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
