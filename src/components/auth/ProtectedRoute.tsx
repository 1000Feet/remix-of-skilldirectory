import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'student' | 'educator' | 'admin';
}

export const ProtectedRoute = ({ children, requiredUserType }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasEducatorProfile, setHasEducatorProfile] = useState<boolean | null>(null);
  const [isProfileChecking, setIsProfileChecking] = useState(true);
  
  useEffect(() => {
    const checkEducatorProfile = async () => {
      if (!user || user.user_metadata?.user_type !== 'educator') {
        setIsProfileChecking(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('educator_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        setHasEducatorProfile(!!data);
      } catch (error) {
        console.error('Error checking educator profile:', error);
      } finally {
        setIsProfileChecking(false);
      }
    };
    
    checkEducatorProfile();
  }, [user]);

  // Show loading state while we check auth and profile
  if (loading || isProfileChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in, redirect to auth
  if (!user) {
    return <Navigate to={`/auth?redirectTo=${location.pathname}`} replace />;
  }

  // Check user type if required
  if (requiredUserType && user.user_metadata?.user_type !== requiredUserType) {
    // Special case: For non-educators trying to access educator pages, redirect to home
    if (requiredUserType === 'educator' && user.user_metadata?.user_type !== 'educator') {
      return <Navigate to="/" replace />;
    }
    
    // For all other mismatches, redirect to home
    return <Navigate to="/" replace />;
  }

  // Only redirect educators without profiles if they're trying to access the dashboard
  if (
    user.user_metadata?.user_type === 'educator' && 
    !hasEducatorProfile && 
    location.pathname === '/dashboard'
  ) {
    return <Navigate to="/subscription-plans" replace />;
  }

  return <>{children}</>;
};
