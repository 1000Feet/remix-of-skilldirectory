
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Stripe
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetch(),
});

// CORS headers for browser requests
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
    const { user_id, price_id, success_url, cancel_url } = await req.json();
    
    if (!user_id || !price_id) {
      throw new Error('Missing required parameters: user_id and price_id are required');
    }

    console.log(`Creating checkout session for user ${user_id} with price ${price_id}`);

    // Get user email for the checkout session
    const { data: userData, error: userError } = await supabase
      .auth
      .admin
      .getUserById(user_id);

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      throw new Error(`Could not find user with ID: ${user_id}`);
    }

    // Fetch price data to get the product name
    const price = await stripe.prices.retrieve(price_id);
    const product = await stripe.products.retrieve(price.product as string);
    
    console.log(`User email: ${userData.user.email}, Product: ${product.name}`);

    // Create a pending subscription record
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .insert([
        {
          user_id: user_id,
          plan_id: price_id,
          status: 'pending',
          plan_name: product.name,
          payment_provider: 'stripe'
        }
      ])
      .select('id')
      .single();
      
    if (pendingError) {
      console.error('Error creating pending subscription:', pendingError);
      throw new Error('Failed to create pending subscription record');
    }

    console.log('Created pending subscription', pendingData);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: userData.user.email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      metadata: {
        user_id: user_id,
        pending_subscription_id: pendingData.id
      }
    });

    console.log('Created checkout session', session.id);

    // Return the session URL
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
