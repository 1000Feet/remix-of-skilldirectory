import { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, UserType } from '@/lib/auth-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuthActions } from '@/hooks/useAuthActions';
import { useProfileManagement } from '@/hooks/useProfileManagement';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userType: UserType) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { signIn, signUp, signOut } = useAuthActions();
  const { fetchProfile, updateProfile: updateUserProfile, createProfile } = useProfileManagement();

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserChange(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (session?.user) {
        await handleUserChange(session.user);
      } else {
        setUser(null);
        // Clear stored user data on sign out
        localStorage.removeItem('auth.user');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUserChange = async (authUser: any) => {
    try {
      const userType = authUser.user_metadata?.user_type as UserType;
      console.log('Handling user change:', authUser.id, userType);

      // Try to get profile from local storage first
      const storedUserData = localStorage.getItem('auth.user');
      let profile = storedUserData ? JSON.parse(storedUserData).profile : null;

      // If no profile in storage, fetch or create from DB
      if (!profile) {
        // First try to fetch existing profile
        profile = await fetchProfile(authUser.id, userType);
        
        // If no profile exists, create one
        if (!profile) {
          console.log('No profile found, creating new profile');
          await createProfile(authUser.id, userType, {
            email: authUser.email,
            user_type: userType
          });
          // Fetch the newly created profile
          profile = await fetchProfile(authUser.id, userType);
        }
      }

      const userData = {
        id: authUser.id,
        email: authUser.email,
        user_metadata: {
          user_type: userType
        },
        profile
      };

      setUser(userData);
      
      // Save user data to localStorage for persistence
      localStorage.setItem('auth.user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error handling user change:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('auth.user');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: any) => {
    if (!user) throw new Error('No user logged in');
    
    const updatedProfile = await updateUserProfile(
      user.id,
      user.user_metadata.user_type,
      data
    );

    const updatedUser = {
      ...user,
      profile: updatedProfile
    };

    setUser(updatedUser);
    localStorage.setItem('auth.user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
