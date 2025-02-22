
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Student {
  user_id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

interface LessonRequest {
  id: string;
  student_id: string;
  educator_id: string;
  educator_profile_id: string;
  proposed_date: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  student: Student;
}

export function LessonRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      try {
        setLoading(true);
        console.log('Fetching requests for educator:', user.id);

        const { data, error } = await supabase
          .from('lesson_requests')
          .select(`
            *,
            student:student_profiles!lesson_requests_student_id_fkey(
              user_id,
              name,
              email,
              phone
            )
          `)
          .eq('educator_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        console.log('Fetched lesson requests:', data);
        setRequests(data || []);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching requests:', error);
        setError(error.message);
        toast.error('Failed to load lesson requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lesson_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus }
          : request
      ));

      toast.success(`Request ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request status');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lesson Requests</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lesson Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading requests: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No lesson requests yet</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {request.student?.name || 'Anonymous Student'}
                      </h3>
                      <p className="text-sm text-gray-500">{request.student?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(request.proposed_date), 'PPP')}
                      </p>
                      <span className={`text-sm ${
                        request.status === 'pending' ? 'text-yellow-500' :
                        request.status === 'accepted' ? 'text-green-500' :
                        'text-red-500'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {request.message && (
                    <div className="flex items-start gap-2 mt-2">
                      <MessageCircle className="w-4 h-4 mt-1" />
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleStatusUpdate(request.id, 'accepted')}
                        className="flex-1"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(request.id, 'rejected')}
                        variant="outline"
                        className="flex-1"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
