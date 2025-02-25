
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

interface UserData {
  id: string;
  email: string;
  user_metadata: {
    user_type: 'student' | 'educator';
  };
  is_active: boolean;
}

export default function AdminSettings() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        navigate('/');
        toast.error('Unauthorized access');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id');

      if (adminError) throw adminError;

      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) throw userError;

      const processedUsers = userData.users.map(user => ({
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        is_active: !user.banned_until
      }));

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: currentStatus ? '876000h' : null // 100 years if banning, null if unbanning
      });

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ));

      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return <div className="container mx-auto mt-8 text-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>User Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">
                  {user.user_metadata?.user_type || 'N/A'}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                    />
                    <span className="text-sm text-gray-500">
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
