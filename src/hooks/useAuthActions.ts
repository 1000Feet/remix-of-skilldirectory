import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UserType } from '@/lib/auth-types';
import { toast } from 'sonner';

export const useAuthActions = () => {
  const navigate = useNavigate();

  const signUp = async (email: string, password: string, userType: UserType) => {
    try {
      // Basic validation
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed - no user data returned');

      // Create the profile based on user type
      if (userType === 'student') {
        const { error: profileError } = await supabase
          .from('student_profiles')
          .insert([
            {
              user_id: authData.user.id,
              email: email,
              name: null,
              phone: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (profileError) throw profileError;
      } else {
        const { error: profileError } = await supabase
          .from('educator_profiles')
          .insert([
            {
              user_id: authData.user.id,
              email: email,
              name: '',
              description: null,
              image: null
            }
          ]);

        if (profileError) throw profileError;
      }

      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/auth');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      navigate('/', { replace: true });
      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/auth', { replace: true });
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  return { signIn, signUp, signOut };
};
