import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth, SupabaseClient, useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useProfileManagement } from '@/hooks/useProfileManagement';

interface AuthContextType {
  supabaseClient: SupabaseClient | null;
  session: any;
  user: any;
  isLoading: boolean;
  signOut: () => Promise<void>;
  userType: 'educator' | 'student' | null;
  setUserType: (type: 'educator' | 'student') => void;
  profile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabaseClient = useSupabaseClient();
  const session = useSession();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'educator' | 'student' | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  // Remove references to non-existent functions from useProfileManagement
  const { getEducatorProfile, getStudentProfile } = useProfileManagement();

  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      try {
        if (session) {
          setUser(session.user);
          // Determine user type based on the URL
          const path = router.pathname;
          const type = path.startsWith('/educator') ? 'educator' : 'student';
          setUserType(type);

          // Fetch user profile immediately after determining user type
          const userProfile = await fetchUserProfile(session.user.id, type);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [session, router.pathname]);

  const signOut = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/');
  };

  // Make sure the fetchUserProfile function is updated to use the correct methods
  const fetchUserProfile = async (userId: string, userType: 'educator' | 'student'): Promise<any> => {
    if (userType === 'educator') {
      return await getEducatorProfile(userId);
    } else {
      return await getStudentProfile(userId);
    }
  };

  const value: AuthContextType = {
    supabaseClient,
    session,
    user,
    isLoading,
    signOut,
    userType,
    setUserType,
    profile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
