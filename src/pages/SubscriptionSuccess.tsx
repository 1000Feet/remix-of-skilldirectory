
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Subscription {
  id: string;
  status: string;
  plan_id: string;
  user_id: string;
  created_at: string;
  [key: string]: any;
}

const SubscriptionSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          throw new Error('No session ID found');
        }

        // Update pending subscription status
        const { error: updatePendingError } = await supabase
          .from('pending_subscriptions')
          .update({ status: 'completed', session_id: sessionId })
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (updatePendingError) {
          console.error('Error updating pending subscription:', updatePendingError);
        }

        // Check if educator profile already exists
        const { data: existingProfile, error: profileError } = await supabase
          .from('educator_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking for existing profile:', profileError);
        }

        // Create educator profile if it doesn't exist
        if (!existingProfile) {
          console.log('Creating educator profile for user:', user.id);
          
          // Fetch subscription data to get the plan details
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('educator_subscriptions')
            .select('*, membership_plans:plan_id(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (subscriptionError) {
            console.error('Error fetching subscription data:', subscriptionError);
          }
          
          // Determine subscription tier from the plan name
          let subscriptionTier = 'basic';
          if (subscriptionData?.membership_plans?.name) {
            const planName = subscriptionData.membership_plans.name.toLowerCase();
            if (planName.includes('premium')) {
              subscriptionTier = 'premium';
            } else if (planName.includes('professional')) {
              subscriptionTier = 'professional';
            }
          }
          
          // Create the educator profile
          const { error: createProfileError } = await supabase
            .from('educator_profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              name: '',
              subscription_tier: subscriptionTier,
              subscription_status: 'active',
              stripe_subscription_id: subscriptionData?.stripe_subscription_id || null,
              stripe_customer_id: subscriptionData?.stripe_customer_id || null
            });

          if (createProfileError) {
            console.error('Error creating educator profile:', createProfileError);
            toast.error('Failed to create your profile. Please contact support.');
          } else {
            console.log('Successfully created educator profile');
          }
        } else {
          console.log('Educator profile already exists, skipping creation');
        }

        // Check the subscription status
        const { data, error } = await (supabase
          .from('educator_subscriptions') as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // If no subscription exists yet, it might be processing
          console.log('Waiting for subscription to be processed...');
          // Don't throw here, as the webhook might not have processed yet
        } else {
          setSubscription(data);
        }

        // Small delay to ensure the profile is created in the database
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      } catch (error) {
        console.error('Error checking subscription:', error);
        toast.error('Could not verify your subscription');
        setLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [user, location.search, navigate]);

  const goToProfile = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Verifying your subscription</h2>
                <p className="text-gray-600">Please wait while we confirm your payment...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
                <h1 className="text-3xl font-bold mb-4">Subscription Complete!</h1>
                <p className="text-xl text-gray-700 mb-6">
                  Your subscription has been successfully activated. You can now create and manage your educator profile.
                </p>
                <Button size="lg" onClick={goToProfile} className="text-lg px-8 py-6">
                  Go to Your Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionSuccess;
