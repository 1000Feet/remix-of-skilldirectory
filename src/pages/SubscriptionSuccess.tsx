
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SubscriptionSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

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

        // Check the subscription status
        const { data, error } = await supabase
          .from('educator_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          throw error;
        }

        setSubscription(data);

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
    navigate('/educator/profile');
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
