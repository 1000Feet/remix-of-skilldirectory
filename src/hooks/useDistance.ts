import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDistanceBetweenAddresses } from '@/utils/distance';
import { useAuth } from '@/contexts/AuthContext';

export function useDistance() {
  const { user } = useAuth();
  const [studentAddress, setStudentAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudentAddress();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStudentAddress = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_profiles')
        .select('address')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setStudentAddress(data?.address || null);
    } catch (error) {
      console.error('Error fetching student address:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceFromStudent = async (educatorAddress: string | null) => {
    // If no user is logged in or no student address, just return null
    if (!user || !studentAddress || !educatorAddress) return null;
    
    try {
      const distance = await getDistanceBetweenAddresses(studentAddress, educatorAddress);
      return distance ? `${distance}` : null;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  };

  return {
    loading,
    calculateDistanceFromStudent,
    studentAddress,
    isAuthenticated: !!user
  };
}
