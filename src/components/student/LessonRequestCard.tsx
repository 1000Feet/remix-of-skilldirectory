import { format } from 'date-fns';
import { LessonRequest } from './types/lesson-request';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

interface LessonRequestCardProps {
  request: LessonRequest;
}

export function LessonRequestCard({
  request
}: LessonRequestCardProps) {
  const handleCancel = async () => {
    try {
      const {
        error
      } = await supabase.from('lesson_requests').update({
        status: 'cancelled'
      }).eq('id', request.id);
      if (error) throw error;
      toast.success('Lesson request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling lesson request:', error);
      toast.error('Failed to cancel lesson request');
    }
  };
  
  return <div className="flex flex-col p-4 border rounded-lg bg-card">
      <div className="flex-grow space-y-1">
        <h4 className="font-medium">
          {request.educator?.name}
        </h4>
        <p className="text-sm text-muted-foreground">
          {request.educator?.email}
        </p>
        <p className="text-sm">
          Proposed: {format(new Date(request.proposed_date), 'PPp')}
        </p>
        
        {request.message && (
          <div className="flex items-start gap-2 mt-2">
            <MessageCircle className="w-4 h-4 mt-1" />
            <p className="text-sm">
              <span className="font-medium">Your message:</span> {request.message}
            </p>
          </div>
        )}
        
        {request.message_from_educator && (
          <div className="flex items-start gap-2 mt-2">
            <MessageCircle className="w-4 h-4 mt-1" />
            <p className="text-sm">
              <span className="font-medium">Educator's response:</span> {request.message_from_educator}
            </p>
          </div>
        )}
        
        <p className="text-sm font-medium mt-2 capitalize">
          Status: {request.status}
        </p>
      </div>
      <div className="flex justify-end mt-4">
        {request.status === 'pending' && <Button variant="destructive" size="sm" onClick={handleCancel} className="bg-[8bc34a] bg-[#8bc34a]">
            Cancel Request
          </Button>}
      </div>
    </div>;
}