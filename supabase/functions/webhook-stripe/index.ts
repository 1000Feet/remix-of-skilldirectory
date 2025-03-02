
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Webhook handler initialized')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract the Stripe signature and body
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('No stripe signature found')
      return new Response(JSON.stringify({ error: 'No stripe signature found' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    const body = await req.text()
    console.log(`Received webhook with signature ${signature.substring(0, 20)}...`)
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Parse Stripe event
    const stripeEvent = JSON.parse(body)
    console.log(`Processing ${stripeEvent.type} event`)
    
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object
      console.log(`Checkout complete for session ${session.id}`)
      
      // Extract custom metadata from the session
      const { metadata } = session
      
      if (!metadata) {
        console.error('No metadata found in session')
        return new Response(JSON.stringify({ error: 'No metadata found in session' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      
      const { userEmail, pendingSignup, planId, userType } = metadata
      console.log(`Session metadata: email=${userEmail}, pendingSignup=${pendingSignup}, planId=${planId}, userType=${userType}`)
      
      // First handle pending signups if needed (create the user)
      if (pendingSignup === 'true') {
        console.log(`Processing pending signup for ${userEmail}`)
        
        // Fetch signup details
        const { data: signupData, error: signupError } = await supabase
          .from('educator_signups')
          .select('email, password')
          .eq('email', userEmail)
          .single()
        
        if (signupError || !signupData) {
          console.error(`Error fetching signup details for ${userEmail}`, signupError)
          return new Response(JSON.stringify({ error: 'Failed to find signup details' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        // Create the user
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: signupData.email,
          password: signupData.password,
          email_confirm: true,
          user_metadata: {
            user_type: userType || 'educator',
          }
        })
        
        if (userError) {
          console.error(`Error creating user for ${userEmail}`, userError)
          return new Response(JSON.stringify({ error: 'Failed to create user' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        console.log(`User ${userEmail} created successfully with ID ${userData.user.id}`)
        
        // Delete signup record now that it's processed
        await supabase
          .from('educator_signups')
          .delete()
          .eq('email', userEmail)
        
        // Now update the profile with subscription details
        await updateEducatorProfile(supabase, userData.user.id, session, planId)
      } else {
        // For existing users, look up their user ID from their email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
        
        if (userError) {
          console.error('Error listing users', userError)
          return new Response(JSON.stringify({ error: 'Failed to find user' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        const user = userData.users.find(u => u.email === userEmail)
        
        if (!user) {
          console.error(`User with email ${userEmail} not found`)
          return new Response(JSON.stringify({ error: 'User not found' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        console.log(`Found existing user with ID ${user.id}`)
        
        // Update their profile with subscription details
        await updateEducatorProfile(supabase, user.id, session, planId)
      }
    }
    
    // Return a successful response
    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

async function updateEducatorProfile(supabase, userId, session, planId) {
  // Determine subscription tier based on price ID
  let tier = 'basic'
  
  if (planId.includes('standard')) {
    tier = 'standard'
  } else if (planId.includes('premium')) {
    tier = 'premium'
  }
  
  console.log(`Updating user ${userId} to ${tier} tier`)
  
  // First check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('educator_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  if (profileError && profileError.code !== 'PGRST116') {
    console.error(`Error fetching profile for ${userId}`, profileError)
    throw new Error('Failed to fetch educator profile')
  }
  
  if (!profile) {
    // Create a basic profile if one doesn't exist yet
    console.log(`Creating new profile for user ${userId}`)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError) {
      console.error(`Error fetching user data for ${userId}`, userError)
      throw new Error('Failed to fetch user data')
    }
    
    const { error: insertError } = await supabase
      .from('educator_profiles')
      .insert({
        user_id: userId,
        email: userData.user.email,
        name: userData.user.email.split('@')[0], // Use email prefix as temporary name
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_renewed_at: new Date().toISOString(),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
    
    if (insertError) {
      console.error(`Error creating profile for ${userId}`, insertError)
      throw new Error('Failed to create educator profile')
    }
    
    console.log(`Created new profile for user ${userId}`)
  } else {
    // Update existing profile
    console.log(`Updating existing profile for user ${userId}`)
    const { error: updateError } = await supabase
      .from('educator_profiles')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_renewed_at: new Date().toISOString(),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      })
      .eq('user_id', userId)
    
    if (updateError) {
      console.error(`Error updating profile for ${userId}`, updateError)
      throw new Error('Failed to update educator profile')
    }
    
    console.log(`Updated profile for user ${userId}`)
  }
}
