import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
  proposed_time: string;
  status: string;
  message: string | null;
  message_from_educator: string | null;
  created_at: string;
  updated_at: string;
  student: Student;
}

export function LessonRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

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
          message_from_educator: responseMessage.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus, message_from_educator: responseMessage.trim() || null }
          : request
      ));

      // Reset the form
      setResponseMessage('');
      setSelectedRequestId(null);
      setPendingStatus(null);
      setIsResponseDialogOpen(false);

      toast.success(`Request ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request status');
    }
  };

  const openResponseDialog = (requestId: string, status: string) => {
    setSelectedRequestId(requestId);
    setPendingStatus(status);
    setResponseMessage('');
    setIsResponseDialogOpen(true);
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
                      <p className="text-sm text-gray-600">
                        {request.proposed_time}
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
                      <p className="text-sm">
                        <span className="font-medium">Student:</span> {request.message}
                      </p>
                    </div>
                  )}

                  {request.message_from_educator && (
                    <div className="flex items-start gap-2 mt-2">
                      <MessageCircle className="w-4 h-4 mt-1" />
                      <p className="text-sm">
                        <span className="font-medium">Your response:</span> {request.message_from_educator}
                      </p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => openResponseDialog(request.id, 'accepted')}
                        className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => openResponseDialog(request.id, 'rejected')}
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

        {/* Response Dialog */}
        <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pendingStatus === 'accepted' ? 'Accept' : 'Decline'} Lesson Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message to Student (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder={pendingStatus === 'accepted' 
                    ? "Add details about the lesson or propose another time..." 
                    : "Explain why you're declining or suggest an alternative..."}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedRequestId && pendingStatus && handleStatusUpdate(selectedRequestId, pendingStatus)}
                className={pendingStatus === 'accepted' 
                  ? "bg-[#8BC34A] hover:bg-[#7CB342] text-white" 
                  : ""}
              >
                {pendingStatus === 'accepted' ? 'Accept' : 'Decline'} Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
