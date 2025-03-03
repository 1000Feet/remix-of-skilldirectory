
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

      // Create a pending subscription
      // Use type casting with "as any" to work around TypeScript issues
      const { data: pendingSubscription, error: pendingError } = await (supabase
        .from('pending_subscriptions') as any)
        .insert({
          user_id: user.id,
          email: user.email,
          plan_id: planId,
          status: 'pending'
        })
        .select()
        .single();

      if (pendingError) {
        throw pendingError;
      }

      // If it's the free plan, skip Stripe and create educator profile directly
      if (plan.price === 0) {
        await handleFreeSubscription(planId);
        return;
      }

      // For paid plans, create a Stripe Checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripe_price_id,
          userId: user.id,
          pendingId: pendingSubscription.id,
          customerEmail: user.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { sessionUrl } = await response.json();
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to process subscription');
      setSelectedPlan(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleFreeSubscription = async (planId: string) => {
    try {
      if (!user) return;

      // Create educator subscription record
      // Use type casting with "as any" to work around TypeScript issues
      const { error: subscriptionError } = await (supabase
        .from('educator_subscriptions') as any)
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        });

      if (subscriptionError) throw subscriptionError;

      // Create the educator profile
      const { error: profileError } = await supabase
        .from('educator_profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          name: '',
          subscription_tier: 'basic',
          subscription_status: 'active'
        });

      if (profileError) throw profileError;

      toast.success('Successfully subscribed to Basic plan');
      navigate('/educator/profile');
    } catch (error) {
      console.error('Error with free subscription:', error);
      toast.error('Failed to activate free subscription');
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
