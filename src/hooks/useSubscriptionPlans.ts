
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  stripe_price_id: string;
  features: string[];
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // Use type casting with "as any" to work around TypeScript issues
      // This is safe since we know the table exists in our Supabase instance
      const { data, error } = await (supabase
        .from('membership_plans') as any)
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      // Parse the features array if it's stored as JSONB
      const parsedPlans = data.map((plan: any) => ({
        ...plan,
        features: Array.isArray(plan.features) 
          ? plan.features 
          : (typeof plan.features === 'string' 
              ? JSON.parse(plan.features) 
              : plan.features || [])
      }));

      setPlans(parsedPlans || []);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return { plans, loading, fetchPlans };
};
