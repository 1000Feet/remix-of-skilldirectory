import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'student' | 'educator';
}

export const ProtectedRoute = ({ children, userType }: ProtectedRouteProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user type matches required type (if specified)
        if (userType && user.user_metadata?.user_type !== userType) {
          setLoading(false);
          return;
        }

        // For educators, check if they have a profile (which means they've paid)
        if (user.user_metadata?.user_type === 'educator') {
          const { data: profile, error } = await supabase
            .from('educator_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error checking educator profile:', error);
          }

          setHasProfile(!!profile);
        } else {
          // For other user types, we don't need to check for profile existence
          setHasProfile(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, userType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user type doesn't match required type, redirect to home
  if (userType && user.user_metadata?.user_type !== userType) {
    return <Navigate to="/" replace />;
  }

  // For educators without a profile (not paid), redirect to subscription plans
  if (user.user_metadata?.user_type === 'educator' && !hasProfile) {
    return <Navigate to="/subscription/plans" replace />;
  }

  // Otherwise, render the protected content
  return <>{children}</>;
};
