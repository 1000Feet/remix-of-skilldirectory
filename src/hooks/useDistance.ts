
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDistanceBetweenAddresses } from '@/utils/distance';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useDistance() {
  const { user } = useAuth();
  const [studentAddress, setStudentAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset state when user changes
  useEffect(() => {
    if (!user) {
      setStudentAddress(null);
      setLoading(false);
    } else {
      fetchStudentAddress();
    }
  }, [user?.id]); // Add user.id as dependency to properly track auth changes

  const fetchStudentAddress = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      const { data, error } = await supabase
        .from('student_profiles')
        .select('address')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching student address:', error);
        throw error;
      }
      
      if (!data?.address) {
        console.log('No address found for student');
        toast.error('Please add your address in your profile to see distance calculations');
      }
      
      setStudentAddress(data?.address || null);
      console.log('Successfully fetched student address:', data?.address);
    } catch (error) {
      console.error('Error fetching student address:', error);
      toast.error('Error fetching your location');
      setStudentAddress(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceFromStudent = async (educatorAddress: string | null) => {
    if (!user) {
      console.log('No user logged in');
      return null;
    }

    if (!studentAddress) {
      console.log('No student address available');
      return null;
    }

    if (!educatorAddress) {
      console.log('No educator address provided');
      return null;
    }
    
    try {
      const distance = await getDistanceBetweenAddresses(studentAddress, educatorAddress);
      console.log('Distance calculated:', distance);
      return distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  };

  return {
    loading,
    calculateDistanceFromStudent,
    studentAddress,
    isAuthenticated: !!user,
    refetchAddress: fetchStudentAddress // Export refetch function
  };
}
