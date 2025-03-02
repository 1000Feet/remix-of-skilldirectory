
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define the EducatorProfile type
export interface EducatorProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  description?: string;
  image?: string;
  address?: string;
  phone?: string;
  website?: string;
  categories?: string[];
  tags?: string[];
  about_business?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  ai_chatbot?: string;
  ai_voice_agent: {
    voice_id: string;
    knowledge_base: string[];
  };
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  is_featured?: boolean;
  subscription_tier?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  subscription_renewed_at?: string;
  role?: string;
}

// Define the StudentProfile type
export interface StudentProfile {
  id: string;
  user_id: string;
  name?: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  favorites?: string[];
}

export const useProfileManagement = () => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Get the user from function parameter instead of useAuth to avoid circular dependency
  const getEducatorProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('educator_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      // Ensure ai_voice_agent has the correct structure
      if (data && typeof data.ai_voice_agent === 'string') {
        try {
          data.ai_voice_agent = JSON.parse(data.ai_voice_agent);
        } catch (e) {
          data.ai_voice_agent = { voice_id: '', knowledge_base: [] };
        }
      } else if (data && !data.ai_voice_agent) {
        data.ai_voice_agent = { voice_id: '', knowledge_base: [] };
      }
      
      return data as EducatorProfile;
    } catch (error) {
      console.error('Error fetching educator profile:', error);
      toast.error('Failed to fetch educator profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getStudentProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as StudentProfile;
    } catch (error) {
      console.error('Error fetching student profile:', error);
      toast.error('Failed to fetch student profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateEducatorProfile = async (userId: string, profileData: Partial<EducatorProfile>) => {
    if (!userId) {
      toast.error('You must be signed in to update your profile');
      return null;
    }

    setUpdating(true);
    try {
      // Ensure ai_voice_agent is handled correctly
      let updatedData = { ...profileData };
      
      const { data, error } = await supabase
        .from('educator_profiles')
        .update(updatedData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      
      // Ensure ai_voice_agent has the correct structure in returned data
      if (data && typeof data.ai_voice_agent === 'string') {
        try {
          data.ai_voice_agent = JSON.parse(data.ai_voice_agent);
        } catch (e) {
          data.ai_voice_agent = { voice_id: '', knowledge_base: [] };
        }
      } else if (data && !data.ai_voice_agent) {
        data.ai_voice_agent = { voice_id: '', knowledge_base: [] };
      }
      
      return data as EducatorProfile;
    } catch (error) {
      console.error('Error updating educator profile:', error);
      toast.error('Failed to update profile');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  const updateStudentProfile = async (userId: string, profileData: Partial<StudentProfile>) => {
    if (!userId) {
      toast.error('You must be signed in to update your profile');
      return null;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      return data as StudentProfile;
    } catch (error) {
      console.error('Error updating student profile:', error);
      toast.error('Failed to update profile');
      return null;
    } finally {
      setUpdating(false);
    }
  };

  return {
    loading,
    updating,
    getEducatorProfile,
    getStudentProfile,
    updateEducatorProfile,
    updateStudentProfile
  };
};
