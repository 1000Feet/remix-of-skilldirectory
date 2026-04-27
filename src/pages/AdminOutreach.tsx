import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PotentialClients from '@/components/outreach/PotentialClients';
import { Loader2 } from 'lucide-react';

const AdminOutreach: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const { data } = await supabase.from('admin_users').select('id').eq('user_id', user.id).maybeSingle();
      if (!data) { navigate('/'); return; }
      setIsAdmin(true);
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Email Outreach</h1>
      <PotentialClients />
    </div>
  );
};

export default AdminOutreach;
