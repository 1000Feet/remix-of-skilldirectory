
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.stripe.com/stripe-js/deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

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
    const body = await req.json();
    const { priceId, userId, pendingId, customerEmail, planName } = body;
    
    console.log('Creating checkout session with:', { priceId, userId, pendingId, customerEmail, planName });
    
    if (!priceId || !userId || !pendingId || !customerEmail) {
      console.error('Missing required parameters:', { priceId, userId, pendingId, customerEmail });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that the priceId is a valid Stripe price ID format
    if (!priceId.startsWith('price_')) {
      console.error(`Invalid price ID format: ${priceId}`);
      return new Response(
        JSON.stringify({ error: `Invalid price ID format: ${priceId}. Must start with "price_"` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client to fetch the correct plan name
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the plan details from Supabase using the price ID
    const { data: planData, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, description, price')
      .eq('stripe_price_id', priceId)
      .single();

    if (planError) {
      console.error('Error fetching plan data:', planError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch plan data: ${planError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!planData) {
      console.error('No plan found for priceId:', priceId);
      return new Response(
        JSON.stringify({ error: `No subscription plan found for price ID: ${priceId}` }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify that the plan name from DB matches the one sent from frontend
    if (planName && planData.name && planName !== planData.name) {
      console.warn(`Plan name mismatch. Frontend sent: "${planName}", Database has: "${planData.name}"`);
    }

    console.log('Found plan data:', planData);
    const verifiedPlanName = planData.name;
    const planDescription = planData.description || `${verifiedPlanName} Subscription`;

    // Create a new checkout session with the correct plan name
    try {
      // FIXED: Removed the description property from line_items that was causing errors
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
            // NOTE: Removed description property that was causing the error
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
          planName: verifiedPlanName,
          planId: planData.id
        },
        // Use top-level description for the session instead
        payment_intent_data: {
          description: `${verifiedPlanName} Plan - Educator Profile Subscription`
        }
      });

      console.log('Checkout session created successfully:', {
        sessionId: session.id,
        planName: verifiedPlanName,
        planId: planData.id
      });
      
      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          sessionUrl: session.url,
          planName: verifiedPlanName
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      return new Response(
        JSON.stringify({ 
          error: `Stripe API error: ${stripeError.message}` 
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Error creating checkout session: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
