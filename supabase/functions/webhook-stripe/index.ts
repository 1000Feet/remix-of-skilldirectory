
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@12.16.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  try {
    // Get the raw body as text
    const body = await req.text();
    
    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event;
    
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    } else {
      // Fallback if webhook secret is not configured
      try {
        event = JSON.parse(body);
      } catch (err) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    }
    
    // Initialize Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        console.log("Checkout session completed:", session.id);
        console.log("Customer email:", session.customer_email);
        console.log("Metadata:", session.metadata);
        
        const pendingSignup = session.metadata?.pendingSignup === 'true';
        const userEmail = session.customer_email || session.metadata?.user_email;
        const userType = session.metadata?.user_type || 'educator';
        const planId = session.metadata?.planId;
        
        // Check if this is a new user that needs to be created
        if (pendingSignup && userEmail) {
          console.log("Creating new user from pending signup:", userEmail);
          
          // Create a password (will be reset by user)
          const tempPassword = Math.random().toString(36).slice(-8);
          
          // Create the user in Supabase Auth
          const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              user_type: userType,
            },
          });
          
          if (userError) {
            console.error("Error creating user:", userError);
            return new Response(`Error creating user: ${userError.message}`, { status: 500 });
          }
          
          console.log("User created successfully:", userData.user.id);
        }
        
        // Update subscription info regardless of new user or existing
        // Find user by email
        const { data: userLookup, error: lookupError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', userEmail)
          .single();
          
        if (lookupError) {
          console.error("Error looking up user:", lookupError);
          return new Response(`Error looking up user: ${lookupError.message}`, { status: 500 });
        }
        
        const userId = userLookup.id;
        
        // Get plan info from product
        const planName = session.metadata?.planName || 'standard'; // Default to standard if not specified
        
        // Update educator profile with subscription info
        const { error: updateError } = await supabase
          .from('educator_profiles')
          .update({
            subscription_tier: planName,
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_renewed_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
          
        if (updateError) {
          console.error("Error updating subscription info:", updateError);
          return new Response(`Error updating subscription: ${updateError.message}`, { status: 500 });
        }
        
        console.log("Subscription info updated successfully");
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        
        console.log("Subscription updated:", subscription.id);
        
        // Update subscription status in educator profile
        if (subscription.customer) {
          // First find the user by stripe customer ID
          const { data: profiles, error: profileError } = await supabase
            .from('educator_profiles')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .limit(1);
            
          if (profileError) {
            console.error("Error finding profile:", profileError);
            return new Response(`Error finding profile: ${profileError.message}`, { status: 500 });
          }
          
          if (profiles && profiles.length > 0) {
            const userId = profiles[0].user_id;
            
            // Update the subscription status
            const { error: updateError } = await supabase
              .from('educator_profiles')
              .update({
                subscription_status: subscription.status,
                subscription_renewed_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
              
            if (updateError) {
              console.error("Error updating subscription status:", updateError);
              return new Response(`Error updating status: ${updateError.message}`, { status: 500 });
            }
            
            console.log("Subscription status updated successfully");
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        
        console.log("Subscription canceled:", canceledSubscription.id);
        
        // Update subscription status to canceled in educator profile
        if (canceledSubscription.customer) {
          const { data: profiles, error: profileError } = await supabase
            .from('educator_profiles')
            .select('user_id')
            .eq('stripe_customer_id', canceledSubscription.customer)
            .limit(1);
            
          if (profileError) {
            console.error("Error finding profile:", profileError);
            return new Response(`Error finding profile: ${profileError.message}`, { status: 500 });
          }
          
          if (profiles && profiles.length > 0) {
            const userId = profiles[0].user_id;
            
            // Update the subscription status
            const { error: updateError } = await supabase
              .from('educator_profiles')
              .update({
                subscription_status: 'canceled',
                subscription_renewed_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
              
            if (updateError) {
              console.error("Error updating subscription status:", updateError);
              return new Response(`Error updating status: ${updateError.message}`, { status: 500 });
            }
            
            console.log("Subscription marked as canceled successfully");
          }
        }
        break;
    }
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
