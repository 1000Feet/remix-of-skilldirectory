
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Index from './pages/Index';
import Auth from './pages/Auth';
import Listings from './pages/Listings';
import EducatorProfile from './pages/EducatorProfile';
import EducatorDashboard from './pages/EducatorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import About from './pages/About';
import Support from './pages/Support';
import NotFound from './pages/NotFound';
import AdminSettings from './pages/AdminSettings';
import Pricing from './pages/Pricing';
import SubscriptionPlans from './pages/SubscriptionPlans';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';

// Components
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Initialize QueryClient
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/search" element={<Listings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/educator/:id" element={<EducatorProfile />} />
            
            {/* Subscription Routes */}
            <Route path="/subscription/plans" element={<SubscriptionPlans />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
            
            {/* Protected Routes */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute userType="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/educator/dashboard"
              element={
                <ProtectedRoute userType="educator">
                  <EducatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/educator/profile"
              element={
                <ProtectedRoute userType="educator">
                  <EducatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
