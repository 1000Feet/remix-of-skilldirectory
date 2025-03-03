
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0';

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Parse request body
    const { priceId, userId, pendingId, customerEmail, planName } = await req.json();

    // Validate input parameters
    if (!priceId || !userId || !pendingId || !customerEmail) {
      console.error('Missing required parameters:', { priceId, userId, pendingId, customerEmail });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating checkout session with params:', {
      priceId,
      userId,
      pendingId,
      customerEmail,
      planName
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        pendingId,
        planName: planName || '', // Include plan name in metadata
      },
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
    });

    if (!session.id || !session.url) {
      throw new Error('Failed to create Stripe session');
    }

    console.log('Checkout session created successfully:', { 
      sessionId: session.id,
      url: session.url
    });

    // Update the pending subscription with the session ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('pending_subscriptions')
      .update({ 
        session_id: session.id
      })
      .eq('id', pendingId);

    if (updateError) {
      console.error('Error updating pending subscription:', updateError);
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionUrl: session.url
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
