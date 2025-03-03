
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Stripe - fixed for Deno
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  // Removed httpClient that was causing issues
});

// CORS headers
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

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found in the request headers');
    return new Response(JSON.stringify({ error: 'No Stripe signature found in the request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the raw body
    const body = await req.text();
    console.log('Received webhook request with signature:', signature.substring(0, 20) + '...');

    // Verify webhook signature
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing webhook event: ${event.type}`);

    // Handle specific webhook events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);

      // Extract the user ID and pending subscription ID from metadata
      const userId = session.metadata?.user_id;
      const pendingId = session.metadata?.pending_subscription_id;

      if (!userId) {
        throw new Error('User ID not found in session metadata');
      }

      // Update pending subscription
      if (pendingId) {
        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_subscriptions')
          .update({
            status: 'completed',
            customer_id: session.customer,
            subscription_id: session.subscription
          })
          .eq('id', pendingId)
          .select()
          .single();

        if (pendingError) {
          console.error('Error updating pending subscription:', pendingError);
        } else {
          console.log('Updated pending subscription:', pendingData);
        }
      }

      // Get the subscription from Stripe
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        console.log('Retrieved subscription:', subscription.id);

        // Get the product and price details
        const priceId = subscription.items.data[0]?.price.id;
        
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          const product = await stripe.products.retrieve(price.product as string);
          console.log('Product:', product.name, 'Price:', price.unit_amount);

          // Find the plan in our system
          const { data: planData, error: planError } = await supabase
            .from('membership_plans')
            .select('*')
            .eq('stripe_price_id', priceId)
            .single();

          if (planError) {
            console.error('Error finding plan:', planError);
          } else if (planData) {
            console.log('Found matching plan:', planData.name);

            // Create or update educator subscription record
            const { error: subscriptionError } = await supabase
              .from('educator_subscriptions')
              .insert({
                user_id: userId,
                plan_id: planData.id,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: session.customer,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                plan: planData.name
              });

            if (subscriptionError) {
              console.error('Error creating educator subscription:', subscriptionError);
            } else {
              console.log('Created educator subscription record');
            }

            // Check if educator profile exists
            const { data: profileData, error: profileError } = await supabase
              .from('educator_profiles')
              .select('*')
              .eq('user_id', userId)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              // Create new educator profile
              const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
              
              if (userError) {
                console.error('Error getting user data:', userError);
              } else {
                const { error: createProfileError } = await supabase
                  .from('educator_profiles')
                  .insert({
                    user_id: userId,
                    email: userData.user.email,
                    name: '',
                    subscription_tier: planData.name,
                    subscription_status: 'active',
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: subscription.id
                  });

                if (createProfileError) {
                  console.error('Error creating educator profile:', createProfileError);
                } else {
                  console.log('Created new educator profile');
                }
              }
            } else if (profileData) {
              // Update existing profile
              const { error: updateProfileError } = await supabase
                .from('educator_profiles')
                .update({
                  subscription_tier: planData.name,
                  subscription_status: 'active',
                  stripe_customer_id: session.customer,
                  stripe_subscription_id: subscription.id
                })
                .eq('user_id', userId);

              if (updateProfileError) {
                console.error('Error updating educator profile:', updateProfileError);
              } else {
                console.log('Updated existing educator profile');
              }
            }
          }
        }
      }
    }
    else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id);
      
      // Update the existing subscription record
      const { error: updateError } = await supabase
        .from('educator_subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      
      if (updateError) {
        console.error('Error updating subscription record:', updateError);
      } else {
        console.log('Updated subscription record');
      }
    }
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      console.log('Subscription deleted:', subscription.id);
      
      // Update the subscription record to cancelled
      const { error: updateError } = await supabase
        .from('educator_subscriptions')
        .update({
          status: 'canceled',
        })
        .eq('stripe_subscription_id', subscription.id);
      
      if (updateError) {
        console.error('Error updating subscription record to canceled:', updateError);
      } else {
        console.log('Marked subscription as canceled');
      }
      
      // Update the educator profile
      const { data: subscriptionData, error: subQueryError } = await supabase
        .from('educator_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();
      
      if (subQueryError) {
        console.error('Error finding user for subscription:', subQueryError);
      } else if (subscriptionData) {
        const { error: profileUpdateError } = await supabase
          .from('educator_profiles')
          .update({
            subscription_status: 'inactive'
          })
          .eq('user_id', subscriptionData.user_id);
        
        if (profileUpdateError) {
          console.error('Error updating profile subscription status:', profileUpdateError);
        } else {
          console.log('Updated profile subscription status to inactive');
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
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
