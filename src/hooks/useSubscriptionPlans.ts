
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
      console.log('Fetching subscription plans from Supabase...');
      
      const { data, error } = await (supabase
        .from('membership_plans') as any)
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      console.log('Raw subscription plans data:', data);

      // Ensure price is a number and features are properly parsed
      const parsedPlans = data.map((plan: any) => {
        // Ensure price is correctly processed as a number
        const price = typeof plan.price === 'string' 
          ? parseFloat(plan.price) 
          : Number(plan.price);
          
        console.log(`Plan ${plan.name}: Original price: ${plan.price}, Parsed price: ${price}, Stripe price ID: ${plan.stripe_price_id}`);
        
        // Parse features if needed
        const features = Array.isArray(plan.features) 
          ? plan.features 
          : (typeof plan.features === 'string' 
              ? JSON.parse(plan.features) 
              : plan.features || []);
        
        return {
          ...plan,
          price: price,
          features: features
        };
      });

      console.log('Parsed subscription plans:', parsedPlans);
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
