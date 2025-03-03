
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.stripe.com/stripe-js/deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

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
    // Parse request body
    const { priceId, userId, pendingId, customerEmail } = await req.json();
    
    console.log('Creating checkout session with:', { priceId, userId, pendingId, customerEmail });
    
    if (!priceId || !userId || !pendingId || !customerEmail) {
      throw new Error('Missing required parameters');
    }

    // Validate that the priceId is a valid Stripe price ID format
    if (!priceId.startsWith('price_')) {
      console.error(`Invalid price ID format: ${priceId}`);
      throw new Error(`Invalid price ID format: ${priceId}. Must start with "price_"`);
    }

    // Initialize Supabase client to fetch the correct plan name
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the plan details from Supabase using the price ID
    const { data: planData, error: planError } = await supabase
      .from('membership_plans')
      .select('name, description')
      .eq('stripe_price_id', priceId)
      .single();

    if (planError) {
      console.error('Error fetching plan data:', planError);
      throw new Error(`Failed to fetch plan data: ${planError.message}`);
    }

    if (!planData) {
      console.error('No plan found for priceId:', priceId);
      throw new Error(`No subscription plan found for price ID: ${priceId}`);
    }

    console.log('Found plan data:', planData);
    const planName = planData.name;
    const planDescription = planData.description || `${planName} Subscription`;

    // Create a new checkout session with the correct plan name
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
          description: planName, // Set the correct plan name in the line item
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      client_reference_id: userId,
      customer_email: customerEmail,
      metadata: {
        userId: userId,
        pendingId: pendingId,
        planName: planName
      },
    });

    console.log('Checkout session created:', session.id);
    
    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        sessionUrl: session.url
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Extract more meaningful error information
    const errorMessage = error.message || 'An unexpected error occurred';
    const stripeError = error.type === 'Ce' ? {
      type: error.rawType,
      code: error.code,
      param: error.param,
      message: error.raw?.message || errorMessage
    } : null;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: stripeError
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
