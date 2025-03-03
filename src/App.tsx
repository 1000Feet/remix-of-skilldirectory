import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Toaster as SonnerToaster } from 'sonner';

// Pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Listings from '@/pages/Listings';
import EducatorProfile from '@/pages/EducatorProfile';
import StudentDashboard from '@/pages/StudentDashboard';
import EducatorDashboard from '@/pages/EducatorDashboard';
import About from '@/pages/About';
import Support from '@/pages/Support';
import NotFound from '@/pages/NotFound';
import Pricing from '@/pages/Pricing';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import SubscriptionSuccess from '@/pages/SubscriptionSuccess';
import SubscriptionCancel from '@/pages/SubscriptionCancel';
import AdminSettings from '@/pages/AdminSettings';

import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <SonnerToaster position="top-right" />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/about" element={<About />} />
          <Route path="/educators" element={<Listings />} />
          <Route path="/educator/:id" element={<EducatorProfile />} />
          <Route path="/support" element={<Support />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/subscription-plans" element={<SubscriptionPlans />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />
          <Route path="/subscription-cancel" element={<SubscriptionCancel />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredUserType="educator">
              <EducatorDashboard />
            </ProtectedRoute>
          } />
          
          {/* Keep backward compatibility */}
          <Route path="/educator/dashboard" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/student/dashboard" element={
            <ProtectedRoute requiredUserType="student">
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/settings" element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          } />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
