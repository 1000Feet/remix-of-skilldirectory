
// Follow ES module syntax for Deno
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.1.1?dts';

// Initialize Stripe with the secret key from environment variable
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// CORS headers for browser requests
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
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing Stripe signature');
      return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get webhook secret from environment variables
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Missing webhook secret');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get request body as text for the verification
    const body = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Webhook event received: ${event.type}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create a Supabase client
    const createClient = (supabaseUrl, supabaseKey) => {
      return {
        from: (table) => ({
          select: (columns = '*') => {
            return fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
            }).then(res => res.json());
          },
          insert: (values, options = {}) => {
            const query = options.upsert ? '?on_conflict=user_id' : '';
            return fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': options.returning ? 'return=representation' : 'return=minimal',
              },
              body: JSON.stringify(values),
            }).then(res => res.json());
          },
          update: (values) => ({
            eq: (column, value) => {
              return fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
              }).then(res => res.json());
            },
            match: (criteria) => {
              let query = '';
              Object.entries(criteria).forEach(([key, value]) => {
                query += `${key}=eq.${value}&`;
              });
              return fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
              }).then(res => res.json());
            }
          }),
          delete: () => ({
            eq: (column, value) => {
              return fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
                method: 'DELETE',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                },
              }).then(res => res.json());
            },
          }),
        }),
      };
    };

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process different webhook events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session);
        
        // Get the pending subscription from the metadata
        const pendingId = session.metadata.pendingId;
        const userId = session.client_reference_id;
        
        if (!pendingId || !userId) {
          throw new Error('Missing pendingId or userId in session metadata');
        }

        // Get pending subscription details
        const pendingResponse = await fetch(
          `${supabaseUrl}/rest/v1/pending_subscriptions?id=eq.${pendingId}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
        
        const pendingSubscriptions = await pendingResponse.json();
        if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
          throw new Error(`No pending subscription found with ID: ${pendingId}`);
        }
        
        const pendingSubscription = pendingSubscriptions[0];
        console.log('Found pending subscription:', pendingSubscription);

        // Get subscription details from Stripe
        const subscriptionId = session.subscription;
        if (!subscriptionId) {
          throw new Error('No subscription ID in checkout session');
        }
        
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Retrieved Stripe subscription:', subscription);
        
        // Get price details to determine plan
        const priceId = subscription.items.data[0].price.id;
        const planResponse = await fetch(
          `${supabaseUrl}/rest/v1/membership_plans?stripe_price_id=eq.${priceId}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
        
        const plans = await planResponse.json();
        if (!plans || plans.length === 0) {
          throw new Error(`No plan found for price ID: ${priceId}`);
        }
        
        const plan = plans[0];
        console.log('Found matching plan:', plan);
        
        // Update pending subscription status
        await fetch(
          `${supabaseUrl}/rest/v1/pending_subscriptions?id=eq.${pendingId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'completed',
              customer_id: session.customer,
              subscription_id: subscriptionId,
              session_id: session.id
            }),
          }
        );
        
        // Create educator subscription record
        await fetch(
          `${supabaseUrl}/rest/v1/educator_subscriptions`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              user_id: userId,
              plan_id: plan.id,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer,
              status: 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            }),
          }
        );
        
        // Now create or update the educator profile
        // First check if profile exists
        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/educator_profiles?user_id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
        
        const profiles = await profileResponse.json();
        const profileExists = profiles && profiles.length > 0;
        
        const profileData = {
          subscription_tier: plan.name.toLowerCase().replace(/\s+/g, '_'),
          subscription_status: 'active',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer
        };
        
        if (profileExists) {
          // Update existing profile
          await fetch(
            `${supabaseUrl}/rest/v1/educator_profiles?user_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(profileData),
            }
          );
        } else {
          // Create a new profile
          // Get user email from pending subscription
          const userData = {
            user_id: userId,
            email: pendingSubscription.email,
            name: '', // Required field with empty string as default
            ...profileData
          };
          
          await fetch(
            `${supabaseUrl}/rest/v1/educator_profiles`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userData),
            }
          );
        }
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice);
        
        // Only process subscription invoices
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription;
          
          // Update subscription status
          await fetch(
            `${supabaseUrl}/rest/v1/educator_subscriptions?stripe_subscription_id=eq.${subscriptionId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'active',
                // Update period dates if available
                ...(invoice.lines.data[0]?.period && {
                  current_period_start: new Date(invoice.lines.data[0].period.start * 1000).toISOString(),
                  current_period_end: new Date(invoice.lines.data[0].period.end * 1000).toISOString()
                })
              }),
            }
          );
          
          // Also update the educator profile
          await fetch(
            `${supabaseUrl}/rest/v1/educator_profiles?stripe_subscription_id=eq.${subscriptionId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscription_status: 'active'
              }),
            }
          );
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription);
        
        // Update subscription record
        await fetch(
          `${supabaseUrl}/rest/v1/educator_subscriptions?stripe_subscription_id=eq.${subscription.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            }),
          }
        );
        
        // Update educator profile
        await fetch(
          `${supabaseUrl}/rest/v1/educator_profiles?stripe_subscription_id=eq.${subscription.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription_status: subscription.status
            }),
          }
        );
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription);
        
        // Update subscription record
        await fetch(
          `${supabaseUrl}/rest/v1/educator_subscriptions?stripe_subscription_id=eq.${subscription.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'canceled'
            }),
          }
        );
        
        // Update educator profile
        await fetch(
          `${supabaseUrl}/rest/v1/educator_profiles?stripe_subscription_id=eq.${subscription.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription_status: 'canceled'
            }),
          }
        );
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
