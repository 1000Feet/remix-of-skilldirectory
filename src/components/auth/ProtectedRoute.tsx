import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'educator' | 'student';
}

export function ProtectedRoute({ children, userType }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show nothing while checking auth status
  if (loading) {
    return null;
  }

  // Not logged in - redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check user type if specified
  if (userType && user.user_metadata?.user_type !== userType) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
