
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
      
      // Use type casting with "as any" to work around TypeScript issues
      // This is safe since we know the table exists in our Supabase instance
      const { data, error } = await (supabase
        .from('membership_plans') as any)
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      console.log('Raw subscription plans data:', data);

      // Parse the features array if it's stored as JSONB
      const parsedPlans = data.map((plan: any) => {
        // Logging for debugging
        console.log(`Processing plan: ${plan.name} (${plan.id})`);
        console.log(`Price raw value: ${plan.price}, type: ${typeof plan.price}`);
        console.log(`Stripe price ID: ${plan.stripe_price_id}`);
        
        // Ensure price is displayed correctly as a number
        let price = 0;
        if (typeof plan.price === 'string') {
          price = parseFloat(plan.price);
        } else if (typeof plan.price === 'number') {
          price = plan.price;
        }
        
        if (isNaN(price)) {
          console.error(`Invalid price format for plan ${plan.name}: ${plan.price}`);
          price = 0;
        }
        
        // Parse features properly
        let features = [];
        if (Array.isArray(plan.features)) {
          features = plan.features;
        } else if (typeof plan.features === 'string') {
          try {
            features = JSON.parse(plan.features);
          } catch (e) {
            console.error(`Error parsing features for plan ${plan.name}:`, e);
            features = [];
          }
        } else if (plan.features && typeof plan.features === 'object') {
          features = plan.features;
        }
        
        return {
          id: plan.id,
          name: plan.name,
          description: plan.description || '',
          price: price,
          stripe_price_id: plan.stripe_price_id,
          features: Array.isArray(features) ? features : []
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
