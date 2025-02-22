import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LessonRequestFormProps {
  educatorProfileId: string;
  educatorName: string;
}

export function LessonRequestForm({ educatorProfileId, educatorName }: LessonRequestFormProps) {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to request a lesson');
      return;
    }

    if (!date) {
      toast.error('Please select a proposed date');
      return;
    }

    try {
      setLoading(true);

      // Get the student profile ID
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError || !studentData) {
        throw new Error('Could not find your student profile');
      }

      // Get the educator profile
      const { data: educatorData, error: educatorError } = await supabase
        .from('educator_profiles')
        .select('id, user_id')
        .eq('id', educatorProfileId)
        .single();

      if (educatorError || !educatorData) {
        throw new Error('Could not find educator information');
      }

      // Create the lesson request
      const { error: requestError } = await supabase
        .from('lesson_requests')
        .insert([
          {
            student_id: studentData.id,
            educator_id: educatorData.user_id,
            educator_profile_id: educatorProfileId,
            proposed_date: date.toISOString(),
            message: message.trim(),
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (requestError) {
        throw requestError;
      }

      toast.success('Lesson request sent successfully!');
      setDate(undefined);
      setMessage('');
    } catch (error: any) {
      console.error('Error sending lesson request:', error);
      toast.error(error.message || 'Failed to send lesson request');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request a Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please sign in to request a lesson with {educatorName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Lesson</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Proposed Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message (Optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the educator about your learning goals..."
              className="min-h-[100px]"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !date}>
            {loading ? 'Sending Request...' : 'Request Lesson'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
