
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && sessionId) {
      processSuccessfulSubscription();
    } else if (!loading) {
      setError('Missing user information or session ID');
    }
  }, [user, sessionId]);

  const processSuccessfulSubscription = async () => {
    try {
      setLoading(true);
      console.log('Processing subscription success with session ID:', sessionId);

      // 1. Find the pending subscription
      const { data: pendingSubscription, error: pendingError } = await supabase
        .from('pending_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .single();

      if (pendingError || !pendingSubscription) {
        throw new Error('Unable to find your pending subscription');
      }

      console.log('Found pending subscription:', pendingSubscription);

      // 2. Update the pending subscription
      const { error: updateError } = await supabase
        .from('pending_subscriptions')
        .update({ 
          status: 'completed',
          session_id: sessionId
        })
        .eq('id', pendingSubscription.id);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      // 3. Get plan details
      const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('id', pendingSubscription.plan_id)
        .single();

      if (planError || !plan) {
        throw new Error('Unable to find subscription plan details');
      }

      // 4. Create or update subscription record
      const { error: subscriptionError } = await supabase
        .from('educator_subscriptions')
        .insert({
          user_id: user?.id,
          plan_id: pendingSubscription.plan_id,
          status: 'active',
          stripe_customer_id: pendingSubscription.customer_id,
          stripe_subscription_id: pendingSubscription.subscription_id,
          current_period_start: new Date().toISOString(),
          // Default to 1 year for subscriptions processed here
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (subscriptionError) {
        throw new Error('Failed to create subscription record');
      }

      // 5. Create educator profile if it doesn't exist
      const { data: existingProfile } = await supabase
        .from('educator_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create new educator profile
        const { error: profileError } = await supabase
          .from('educator_profiles')
          .insert({
            user_id: user?.id,
            email: user?.email,
            name: '',
            subscription_tier: plan.name.toLowerCase().includes('basic') ? 'basic' : 
                              plan.name.toLowerCase().includes('standard') ? 'standard' : 'premium',
            subscription_status: 'active',
            stripe_customer_id: pendingSubscription.customer_id,
            stripe_subscription_id: pendingSubscription.subscription_id
          });

        if (profileError) {
          throw new Error('Failed to create educator profile');
        }
      }

      console.log('Successfully processed subscription');
      setProcessed(true);
      toast.success('Your subscription has been successfully activated!');

    } catch (err) {
      console.error('Error processing subscription:', err);
      setError(err.message || 'An error occurred while processing your subscription');
      toast.error(err.message || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center bg-gray-50 py-12">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          {loading ? (
            <div className="text-center py-10">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold">Processing Your Subscription</h2>
              <p className="text-gray-600 mt-2">Please wait while we activate your account...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-2xl">×</span>
              </div>
              <h2 className="text-xl font-semibold text-red-600">Subscription Error</h2>
              <p className="text-gray-600 mt-2">{error}</p>
              <Button 
                className="mt-6" 
                onClick={() => navigate('/subscription-plans')}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600">Subscription Successful!</h2>
              <p className="text-gray-600 mt-4">
                Your account has been successfully activated. You now have access to all features.
              </p>
              <Button 
                className="mt-8 w-full" 
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SubscriptionSuccess;
