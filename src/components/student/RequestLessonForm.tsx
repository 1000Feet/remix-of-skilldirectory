import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const requestLessonSchema = z.object({
  proposedDate: z.date({
    required_error: "Please select a date",
  }),
  proposedTime: z.string({
    required_error: "Please select a time",
  }),
  message: z.string().optional(),
});

type RequestLessonForm = z.infer<typeof requestLessonSchema>;

interface RequestLessonFormProps {
  educatorId: string;
  educatorProfileId: string;
}

// Generate time slots from 9 AM to 5 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    slots.push(`${hourStr}:00`);
    slots.push(`${hourStr}:30`);
  }
  return slots;
};

export function RequestLessonForm({ educatorId, educatorProfileId }: RequestLessonFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<RequestLessonForm>({
    resolver: zodResolver(requestLessonSchema),
    defaultValues: {
      proposedTime: '',
      message: ''
    }
  });

  const onSubmit = async (data: RequestLessonForm) => {
    try {
      if (!user) {
        toast.error("Please sign in to request a lesson");
        return;
      }

      setLoading(true);

      // Get the educator profile
      const { data: educatorData, error: educatorError } = await supabase
        .from('educator_profiles')
        .select('user_id')
        .eq('id', educatorProfileId)
        .single();

      if (educatorError || !educatorData) {
        throw new Error('Could not find educator information');
      }

      // Format the date and time together
      const dateTime = new Date(data.proposedDate);
      const [hours, minutes] = data.proposedTime.split(':');
      dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const { error } = await supabase
        .from('lesson_requests')
        .insert({
          student_id: user.id,
          educator_id: educatorData.user_id,
          educator_profile_id: educatorProfileId,
          proposed_date: dateTime.toISOString(),
          proposed_time: data.proposedTime,
          message: data.message || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Lesson request sent successfully!");
      form.reset();
    } catch (error: any) {
      console.error('Error submitting lesson request:', error);
      toast.error(error.message || "Failed to send lesson request");
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="bg-white rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Request a Lesson</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <FormField
              control={form.control}
              name="proposedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="font-medium">Proposed Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-[#F9F9F9]",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={loading}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="proposedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Proposed Time</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-[#F9F9F9]">
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell the educator about your learning goals..."
                      className="resize-none bg-[#F9F9F9]"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-medium py-3"
            disabled={loading}
          >
            {loading ? "Sending Request..." : "Request Lesson"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
