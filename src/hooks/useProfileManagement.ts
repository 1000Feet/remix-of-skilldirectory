
import { supabase } from '@/integrations/supabase/client';
import { UserType, StudentProfile, EducatorProfile } from '@/lib/auth-types';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Tables = Database['public']['Tables'];
type StudentProfileRow = Tables['student_profiles']['Row'];
type EducatorProfileRow = Tables['educator_profiles']['Row'];

export const useProfileManagement = () => {
  const fetchProfile = async (userId: string, userType: UserType): Promise<StudentProfile | EducatorProfile | null> => {
    try {
      console.log(`Fetching ${userType} profile for user ${userId}`);
      
      if (userType === 'student') {
        const { data: studentProfile, error: studentError } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (studentError) {
          console.error('Error fetching student profile:', studentError);
          return null;
        }

        if (studentProfile) {
          return {
            id: studentProfile.id,
            email: studentProfile.email,
            user_type: 'student',
            name: studentProfile.name,
            phone: studentProfile.phone,
            created_at: studentProfile.created_at,
            updated_at: studentProfile.updated_at,
            user_id: studentProfile.user_id
          };
        }
      } else {
        const { data: educatorProfile, error: educatorError } = await supabase
          .from('educator_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle<EducatorProfileRow>();

        if (educatorError) {
          console.error('Error fetching educator profile:', educatorError);
          return null;
        }

        if (educatorProfile) {
          return {
            id: educatorProfile.id,
            email: educatorProfile.email,
            user_type: 'educator',
            name: educatorProfile.name,
            description: educatorProfile.description,
            image: educatorProfile.image
          };
        }
      }
      
      console.log(`No ${userType} profile found`);
      return null;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const updateProfile = async (userId: string, userType: UserType, profileData: any): Promise<StudentProfile | EducatorProfile | null> => {
    try {
      console.log(`Updating ${userType} profile for user ${userId}`, profileData);

      if (userType === 'student') {
        const { data, error } = await supabase
          .from('student_profiles')
          .update({
            name: profileData.name,
            phone: profileData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          email: data.email,
          user_type: 'student',
          name: data.name,
          phone: data.phone,
          created_at: data.created_at,
          updated_at: data.updated_at,
          user_id: data.user_id
        };
      } else {
        const { data, error } = await supabase
          .from('educator_profiles')
          .update(profileData)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) throw error;

        return {
          id: data.id,
          email: data.email,
          user_type: 'educator',
          name: data.name,
          description: data.description,
          image: data.image
        };
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const createProfile = async (userId: string, userType: UserType, data: any): Promise<void> => {
    try {
      console.log(`Creating ${userType} profile for user ${userId}`, data);

      if (userType === 'student') {
        // First check if profile already exists
        const { data: existingProfile } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        // If profile exists, just return
        if (existingProfile) {
          console.log('Student profile already exists, skipping creation');
          return;
        }

        const studentData = {
          user_id: userId,
          name: data.name || null,
          phone: data.phone || null,
          email: data.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('student_profiles')
          .insert([studentData]);

        if (error) {
          console.error('Error creating student profile:', error);
          throw error;
        }
      } else {
        // Check if educator profile exists
        const { data: existingProfile } = await supabase
          .from('educator_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        // If profile exists, just return
        if (existingProfile) {
          console.log('Educator profile already exists, skipping creation');
          return;
        }

        const { error: educatorError } = await supabase
          .from('educator_profiles')
          .insert({
            user_id: userId,
            email: data.email,
            name: '', // Required field, start with empty string
            description: null,
            image: null,
            website: null,
            address: null,
            phone: null,
            about_business: null,
            categories: [],
            tags: [],
            facebook_url: '',
            instagram_url: '',
            youtube_url: '',
            ai_chatbot: null,
            ai_voice_agent: {
              knowledge_base: [],
              voice_id: 'cjVigY5qzO86Huf0OWal'
            }
          });

        if (educatorError) {
          console.error('Error creating educator profile:', educatorError);
          throw educatorError;
        }
      }
    } catch (error: any) {
      console.error('Error creating profile:', error);
      if (error.code === '23505') { // Unique constraint violation
        console.log('Profile already exists, ignoring duplicate error');
        return;
      }
      toast.error('Failed to create profile');
      throw error;
    }
  };

  return { fetchProfile, updateProfile, createProfile };
};
