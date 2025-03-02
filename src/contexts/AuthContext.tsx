import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfileManagement } from '@/hooks/useProfileManagement';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AuthResponse = {
  data: {
    user: any;
    session: any;
  } | null;
  error: Error | null;
}

interface AuthContextType {
  supabaseClient: any;
  session: any;
  user: any;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userType: 'educator' | 'student') => Promise<AuthResponse>;
  userType: 'educator' | 'student' | null;
  setUserType: (type: 'educator' | 'student') => void;
  profile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'educator' | 'student' | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { getEducatorProfile, getStudentProfile } = useProfileManagement();

  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          const path = location.pathname;
          const type = path.startsWith('/educator') ? 'educator' : 'student';
          setUserType(type);
          const userProfile = await fetchUserProfile(currentSession.user.id, type);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          const path = location.pathname;
          const type = path.startsWith('/educator') ? 'educator' : 'student';
          setUserType(type);
          const userProfile = await fetchUserProfile(currentSession.user.id, type);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      setUser(data.user);
      navigate('/');
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userType: 'educator' | 'student'): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType,
          },
        },
      });
      
      if (error) {
        toast.error(error.message);
        return { data: null, error };
      }
      
      setUser(data.user);
      setUserType(userType);
      
      if (userType === 'educator') {
        navigate('/pricing');
      } else {
        navigate('/');
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Sign up error:", error);
      return { data: null, error };
    }
  };

  const fetchUserProfile = async (userId: string, userType: 'educator' | 'student'): Promise<any> => {
    if (userType === 'educator') {
      return await getEducatorProfile(userId);
    } else {
      return await getStudentProfile(userId);
    }
  };

  const value: AuthContextType = {
    supabaseClient: supabase,
    session,
    user,
    isLoading,
    signOut,
    signIn,
    signUp,
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
