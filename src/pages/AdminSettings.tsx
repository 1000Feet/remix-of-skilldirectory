
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  user_type: 'student' | 'educator';
  is_active: boolean;
  name: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  user_id: string;
}

export default function AdminSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        console.log('No user found');
        return;
      }
      
      console.log('Checking admin status for user:', user.id);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }
      
      console.log('Admin check result:', data);
      setIsAdmin(!!data);
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch educators
        const { data: educators, error: educatorError } = await supabase
          .from('educator_profiles')
          .select('id, email, name, is_active, user_id');

        if (educatorError) throw educatorError;

        // Fetch students
        const { data: students, error: studentError } = await supabase
          .from('student_profiles')
          .select('id, email, name, is_active, user_id');

        if (studentError) throw studentError;

        const formattedEducators = (educators || []).map((ed: UserProfile) => ({
          id: ed.user_id,
          email: ed.email,
          name: ed.name,
          is_active: ed.is_active,
          user_type: 'educator' as const
        }));

        const formattedStudents = (students || []).map((st: UserProfile) => ({
          id: st.user_id,
          email: st.email,
          name: st.name,
          is_active: st.is_active,
          user_type: 'student' as const
        }));

        setUsers([...formattedEducators, ...formattedStudents]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const toggleUserStatus = async (userId: string, userType: 'student' | 'educator', currentStatus: boolean) => {
    try {
      const table = userType === 'educator' ? 'educator_profiles' : 'student_profiles';
      
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

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
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user || !isAdmin) {
    console.log('Access denied. User:', user?.id, 'IsAdmin:', isAdmin);
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Settings</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{user.user_type}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => toggleUserStatus(user.id, user.user_type, user.is_active)}
                      />
                      <span className="text-sm text-gray-500">
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
