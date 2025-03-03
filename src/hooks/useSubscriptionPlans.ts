
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

      // Create a proper mapping of plan data to ensure correct display
      const parsedPlans = data.map((plan: any) => {
        // Always convert price to a number
        let price = 0;
        
        if (typeof plan.price === 'string') {
          price = parseFloat(plan.price);
        } else if (typeof plan.price === 'number') {
          price = plan.price;
        }
        
        // Ensure price is a valid number
        if (isNaN(price)) {
          price = 0;
          console.error(`Invalid price format for plan ${plan.name}: ${plan.price}`);
        }
        
        console.log(`Plan ${plan.name}: Original price: ${plan.price}, Parsed price: ${price}, Stripe price ID: ${plan.stripe_price_id}`);
        
        // Parse features if needed
        const features = Array.isArray(plan.features) 
          ? plan.features 
          : (typeof plan.features === 'string' 
              ? JSON.parse(plan.features) 
              : plan.features || []);
        
        return {
          id: plan.id,
          name: plan.name,
          description: plan.description || '',
          price: price,
          stripe_price_id: plan.stripe_price_id,
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
