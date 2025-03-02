
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StripeManagementProps {
  buttonText?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

export function StripeManagement({
  buttonText = 'Manage Subscription',
  variant = 'outline',
  className = '',
}: StripeManagementProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleOpenPortal = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        toast.error('Please sign in to manage your subscription');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-portal', {
        body: {
          returnUrl: window.location.href,
        },
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      toast.error('Failed to open subscription management portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleOpenPortal}
      disabled={loading}
    >
      {loading ? 'Loading...' : buttonText}
    </Button>
  );
}
