
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
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      setPlans(data || []);
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
