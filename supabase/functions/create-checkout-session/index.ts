
// Follow this setup guide to integrate the Deno runtime and Supabase functions
// https://supabase.com/docs/guides/functions/deno-runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@12.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Handle CORS preflight request
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

// Create checkout session
const createCheckoutSession = async (req: Request) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Missing Stripe API key');
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
    
    // Get request body
    const { priceId, userId, pendingId, customerEmail } = await req.json();
    
    if (!priceId || !userId || !pendingId || !customerEmail) {
      throw new Error('Missing required parameters');
    }
    
    console.log('Creating checkout session with:', { priceId, userId, pendingId, customerEmail });
    
    // Verify the price ID exists in our membership_plans table
    const supabase = createSupabaseClient();
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('stripe_price_id', priceId)
      .maybeSingle();
      
    if (planError || !plan) {
      console.error('Error retrieving plan:', planError);
      throw new Error(`No plan found with Stripe price ID: ${priceId}`);
    }
    
    console.log('Found plan in database:', plan);
    
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
      success_url: `${req.headers.get('origin')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription-cancel`,
      customer_email: customerEmail,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        pendingId: pendingId,
      },
    });
    
    console.log('Created checkout session:', session.id);
    
    // Update the pending subscription with the session ID
    const { error: updateError } = await supabase
      .from('pending_subscriptions')
      .update({ session_id: session.id })
      .eq('id', pendingId);
      
    if (updateError) {
      console.error('Error updating pending subscription:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionUrl: session.url,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Main handler for all requests
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return handleCorsRequest();
  }
  
  try {
    // Process create checkout session request
    if (req.method === 'POST') {
      const response = await createCheckoutSession(req);
      return addCorsHeaders(response);
    }
    
    // Handle unsupported methods
    return addCorsHeaders(
      new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return addCorsHeaders(
      new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
});
