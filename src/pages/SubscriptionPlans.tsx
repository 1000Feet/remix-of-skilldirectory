import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPlans = () => {
  const { plans, loading: loadingPlans } = useSubscriptionPlans();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscription = async (planId: string) => {
    if (!user) {
      toast.error('Please log in to subscribe');
      navigate('/auth');
      return;
    }

    try {
      setProcessing(true);
      setSelectedPlan(planId);

      // Get the selected plan
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Selected plan not found');
      }

      console.log(`Starting subscription process for plan: ${plan.name} (${planId})`);
      console.log('Stripe Price ID:', plan.stripe_price_id);

      // Create a pending subscription
      const { data: pendingSubscription, error: pendingError } = await supabase
        .from('pending_subscriptions')
        .insert({
          user_id: user.id,
          email: user.email,
          plan_id: planId,
          status: 'pending'
        })
        .select()
        .single();

      if (pendingError) {
        if (pendingError.code === '23505') {
          toast.error('You already have a subscription pending. Please check your email.');
          setProcessing(false);
          setSelectedPlan(null);
          return;
        }
        throw pendingError;
      }

      console.log('Created pending subscription:', pendingSubscription);

      // If it's the free plan, skip Stripe and create educator profile directly
      if (plan.price === 0) {
        await handleFreeSubscription(planId);
        return;
      }

      // Validate that we have a valid Stripe price ID
      if (!plan.stripe_price_id || !plan.stripe_price_id.startsWith('price_')) {
        throw new Error(`Invalid Stripe price ID: ${plan.stripe_price_id}`);
      }

      // For paid plans, call Supabase Edge Function with explicit error handling
      try {
        console.log('Calling Supabase function with data:', {
          priceId: plan.stripe_price_id,
          userId: user.id,
          pendingId: pendingSubscription.id,
          customerEmail: user.email
        });
        
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            priceId: plan.stripe_price_id,
            userId: user.id,
            pendingId: pendingSubscription.id,
            customerEmail: user.email
          },
        });

        if (error) {
          console.error('Error invoking function:', error);
          throw new Error(error.message || 'Failed to create checkout session');
        }

        if (!data || !data.sessionUrl) {
          console.error('Invalid response from checkout session creation:', data);
          throw new Error('Invalid response from checkout session creation');
        }

        console.log('Checkout session created successfully:', data.sessionId);
        
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      } catch (fnError) {
        console.error('Function error:', fnError);
        throw new Error(`Error creating checkout session: ${fnError.message}`);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      
      let errorMessage = 'Failed to process subscription. Please try again later.';
      if (error.message && error.message.includes('Stripe API error')) {
        errorMessage = 'Stripe payment processing error. Please try again later.';
      } else if (error.code === '23505') {
        errorMessage = 'You already have a subscription pending. Please check your email.';
      } else if (error.message) {
        // Include more specific error information
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleFreeSubscription = async (planId: string) => {
    try {
      if (!user) return;

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('educator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create the educator profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('educator_profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            name: '',
            subscription_tier: 'basic',
            subscription_status: 'active'
          });

        if (profileError) throw profileError;
      } else {
        // Update existing profile subscription details
        const { error: updateError } = await supabase
          .from('educator_profiles')
          .update({
            subscription_tier: 'basic',
            subscription_status: 'active'
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // Create educator subscription record
      const { error: subscriptionError } = await supabase
        .from('educator_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        });

      if (subscriptionError) throw subscriptionError;

      toast.success('Successfully subscribed to Basic plan');
      navigate('/educator/profile');
    } catch (error) {
      console.error('Error with free subscription:', error);
      let errorMessage = 'Failed to activate free subscription';
      
      if (error.code === '23505') {
        errorMessage = 'You already have an active subscription';
        navigate('/educator/profile');
      }
      
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const Feature = ({ text }: { text: string }) => (
    <div className="flex items-center text-gray-600 text-base">
      <Check className="w-5 h-5 text-primary mr-2 flex-shrink-0" />
      {text}
    </div>
  );

  if (!user || user.user_metadata?.user_type !== 'educator') {
    navigate('/auth?signup=educator');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Choose Your <span className="text-primary">Plan</span>
            </h1>
            <p className="text-xl text-gray-600">
              Select a subscription plan to create your educator profile
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {plans.map((plan) => (
                <Card key={plan.id} className={`overflow-hidden flex flex-col h-full ${plan.name.includes('Standard') ? 'border-primary border-2' : ''}`}>
                  <div className={`p-6 text-center ${plan.name.includes('Standard') ? 'bg-primary' : 'bg-primary/90'}`}>
                    <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
                  </div>
                  <div className="p-6 text-center border-b h-24 flex flex-col justify-center">
                    <div className="text-4xl font-bold">${plan.price}</div>
                    {plan.price !== 0 && <div className="text-gray-500">/month</div>}
                  </div>
                  <div className="p-6 space-y-4 flex-1">
                    {Array.isArray(plan.features) && plan.features.map((feature, featureIndex) => (
                      <Feature key={featureIndex} text={feature} />
                    ))}
                  </div>
                  <div className="p-6 mt-auto">
                    <Button
                      className="w-full text-lg py-6"
                      variant={plan.name.includes('Standard') ? "default" : "default"}
                      onClick={() => handleSubscription(plan.id)}
                      disabled={processing && selectedPlan === plan.id}
                    >
                      {processing && selectedPlan === plan.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : (
                        'SELECT PLAN'
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionPlans;
