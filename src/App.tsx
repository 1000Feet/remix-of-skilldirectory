import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { BusinessCard } from './components/BusinessCard';
import Home from './pages/Home';
import Listings from './pages/Listings';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Support from './pages/Support';
import EducatorProfile from './pages/EducatorProfile';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSettings from './pages/AdminSettings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/educator/:educatorName" element={<EducatorProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/admin" element={<AdminSettings />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
