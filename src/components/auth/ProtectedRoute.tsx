
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType?: 'educator' | 'student';
}

export function ProtectedRoute({ children, userType }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show nothing while checking auth status
  if (isLoading) {
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
