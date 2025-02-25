import { format } from 'date-fns';
import { LessonRequest } from './types/lesson-request';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
        {request.message && <p className="text-sm mt-2">{request.message}</p>}
        <p className="text-sm font-medium mt-2 capitalize">
          Status: {request.status}
        </p>
      </div>
      <div className="flex justify-end mt-4">
        {request.status === 'pending' && <Button variant="destructive" size="sm" onClick={handleCancel} className="bg-slate-950 hover:bg-slate-800 bg-[8bc34a]">
            Cancel Request
          </Button>}
      </div>
    </div>;
}