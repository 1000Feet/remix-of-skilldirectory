
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Stripe - fixed initialization for Deno
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  // Remove the httpClient that's causing issues
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
    const { priceId, userId, pendingId, customerEmail } = await req.json();
    
    if (!userId || !priceId) {
      throw new Error('Missing required parameters: userId and priceId are required');
    }

    console.log(`Creating checkout session for user ${userId} with price ${priceId}`);

    // Update pending subscription with session information
    if (pendingId) {
      const { error: updateError } = await supabase
        .from('pending_subscriptions')
        .update({ 
          status: 'processing',
          stripe_price_id: priceId
        })
        .eq('id', pendingId);

      if (updateError) {
        console.error('Error updating pending subscription:', updateError);
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription-cancel`,
      metadata: {
        user_id: userId,
        pending_subscription_id: pendingId
      }
    });

    console.log('Created checkout session', session.id);

    // If we have a pendingId, update it with the session ID
    if (pendingId) {
      const { error: sessionUpdateError } = await supabase
        .from('pending_subscriptions')
        .update({ 
          session_id: session.id
        })
        .eq('id', pendingId);

      if (sessionUpdateError) {
        console.error('Error updating session ID:', sessionUpdateError);
      }
    }

    // Return the session URL
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionUrl: session.url,
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
