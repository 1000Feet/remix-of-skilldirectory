
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StripeManagement } from '@/components/stripe/StripeManagement';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SubscriptionData {
  tier: string;
  status: string;
  renewedAt: string | null;
}

export function SubscriptionInfo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('educator_profiles')
          .select('subscription_tier, subscription_status, subscription_renewed_at')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        setSubscription({
          tier: data.subscription_tier || 'basic',
          status: data.subscription_status || 'inactive',
          renewedAt: data.subscription_renewed_at,
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[250px] mb-2" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-[150px] mb-4" />
          <Skeleton className="h-5 w-[180px] mb-4" />
          <Skeleton className="h-10 w-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plan</CardTitle>
        <CardDescription>Manage your subscription and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Current Plan:</span>
          <Badge variant={subscription.tier === 'premium' ? 'default' : 'secondary'}>
            {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="font-medium">Status:</span>
          <Badge variant={subscription.status === 'active' ? 'default' : 'outline'}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Badge>
        </div>
        
        {subscription.renewedAt && (
          <div>
            <span className="font-medium">Last Updated:</span>
            <span className="ml-2 text-muted-foreground">
              {new Date(subscription.renewedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        <StripeManagement className="mt-4" />
      </CardContent>
    </Card>
  );
}
