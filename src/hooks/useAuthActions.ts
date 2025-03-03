
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserType } from '@/lib/auth-types';
import { toast } from 'sonner';

export const useAuthActions = () => {
  const signUp = async (email: string, password: string, userType: UserType) => {
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

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

      // For student users, create the profile immediately
      // For educators, the profile will be created after subscription
      if (userType === 'student') {
        // Check if the profile already exists
        const { data: existingProfile } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        if (!existingProfile) {
          // Create the student profile
          await supabase.from('student_profiles').insert({
            user_id: authData.user.id,
            email: email
          });
        }
      }

      toast.success('Your account has been created successfully!');
      
      // For educators, we'll redirect them to the subscription page after
      // This happens in the Auth component
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
      
      // Redirect will be handled by AuthContext
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
      
      window.location.href = '/auth';
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  return { signIn, signUp, signOut };
};
