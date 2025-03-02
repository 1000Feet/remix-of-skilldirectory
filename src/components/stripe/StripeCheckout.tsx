
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface StripeCheckoutProps {
  priceId: string;
  buttonText: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  className?: string;
  userType?: 'student' | 'educator';
  onSuccess?: () => void;
}

export function StripeCheckout({
  priceId,
  buttonText,
  variant = 'default',
  className = '',
  userType = 'educator',
  onSuccess
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { user, signUp } = useAuth();
  const [hasPendingSignup, setHasPendingSignup] = useState(false);

  useEffect(() => {
    // Check if there's a pending signup
    const email = sessionStorage.getItem('pending_educator_email');
    const password = sessionStorage.getItem('pending_educator_password');
    setHasPendingSignup(!!email && !!password);
  }, []);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      let userEmail;
      let pendingSignup = false;
      
      // If there's a pending signup, use the stored email
      if (hasPendingSignup) {
        userEmail = sessionStorage.getItem('pending_educator_email');
        pendingSignup = true;
      } else if (user) {
        // If user is logged in, use their email
        userEmail = user.email;
      } else {
        // No pending signup, no user - redirect to auth page
        toast.error('Please sign in to continue');
        sessionStorage.setItem('redirect_after_auth', 'pricing');
        window.location.href = '/auth?signup=educator';
        return;
      }
      
      // Create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          userEmail,
          userType,
          pendingSignup,
          successUrl: `${window.location.origin}/educator-dashboard?checkout_success=true`,
          cancelUrl: `${window.location.origin}/pricing?checkout_canceled=true`,
        },
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };
  
  // Check for success or canceled parameters in URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const checkoutSuccess = queryParams.get('checkout_success');
    const checkoutCanceled = queryParams.get('checkout_canceled');
    
    if (checkoutSuccess === 'true') {
      toast.success('Your subscription has been activated!');
      onSuccess?.();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (checkoutCanceled === 'true') {
      toast.info('Checkout was canceled');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onSuccess]);

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? 'Processing...' : buttonText}
    </Button>
  );
}
