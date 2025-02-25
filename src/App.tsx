
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { BusinessCard } from './components/BusinessCard';
import Index from './pages/Index';
import AdminSettings from './pages/AdminSettings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminSettings />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
