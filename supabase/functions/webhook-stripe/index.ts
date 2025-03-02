
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@12.16.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      console.error("No stripe signature provided");
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get the request body
    const body = await req.text();
    
    // Verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const pendingSignup = session.metadata?.pending_signup === 'true';
        const userEmail = session.metadata?.user_email;
        const userType = session.metadata?.user_type;
        
        console.log(`Checkout completed for ${userEmail}, type: ${userType}, pending signup: ${pendingSignup}`);
        
        // If this was a new signup, create the user account
        if (pendingSignup && userEmail) {
          // Get temporary credentials stored in educator_signups table
          const { data: signupData, error: signupError } = await supabaseAdmin
            .from('educator_signups')
            .select('email, password')
            .eq('email', userEmail)
            .single();
          
          if (signupError || !signupData) {
            console.error(`Failed to get signup info for ${userEmail}:`, signupError);
            return new Response(
              JSON.stringify({ error: `Failed to get signup info: ${signupError?.message}` }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }
          
          // Create the user in Supabase Auth
          const { data: authData, error: authError } = await supabaseAdmin.auth
            .admin.createUser({
              email: userEmail,
              password: signupData.password,
              email_confirm: true,
              user_metadata: { user_type: userType }
            });
          
          if (authError) {
            console.error(`Failed to create user ${userEmail}:`, authError);
            return new Response(
              JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }
          
          // User created successfully, now create their educator profile
          const userId = authData.user.id;
          const subscription = {
            tier: getPlanTier(session.metadata?.price_id),
            status: 'active'
          };
          
          // Create educator profile
          const { error: profileError } = await supabaseAdmin
            .from('educator_profiles')
            .insert({
              user_id: userId,
              email: userEmail,
              is_active: true,
              subscription_tier: subscription.tier,
              subscription_status: subscription.status,
              subscription_renewed_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.error(`Failed to create educator profile for ${userEmail}:`, profileError);
            return new Response(
              JSON.stringify({ error: `Failed to create educator profile: ${profileError.message}` }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              }
            );
          }
          
          // Delete temporary credentials from educator_signups table
          await supabaseAdmin
            .from('educator_signups')
            .delete()
            .eq('email', userEmail);
            
          console.log(`Successfully created account for ${userEmail} with ID ${userId}`);
        }
        break;
      
      // Handle other events as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Helper function to determine plan tier from price ID
function getPlanTier(priceId: string | undefined): string {
  if (!priceId) return 'basic';
  
  // These should match your actual price IDs in Stripe
  switch(priceId) {
    case 'price_1Qxp1X2ef3wsxdNewIs5Ewzl':
      return 'basic';
    case 'price_1Qxp262ef3wsxdNeH5ShSDTi':
      return 'standard';
    case 'price_1Qxp2c2ef3wsxdNeQ62MW8h8':
      return 'premium';
    default:
      return 'basic';
  }
}
