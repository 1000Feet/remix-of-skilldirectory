
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(1, "Phone number is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function StudentProfileForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: user?.email || "",
      phone: "",
    },
  });

  const loadProfile = async () => {
    try {
      if (!user) return;

      setIsInitialLoading(true);
      
      const { data: profile, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      if (profile) {
        form.reset({
          name: profile.name || "",
          email: user.email || "",
          phone: profile.phone || "",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  async function onSubmit(data: ProfileFormValues) {
    try {
      if (!user) {
        toast.error('Please log in to update your profile');
        return;
      }

      setLoading(true);

      // First try to update the profile
      const { data: existingProfile, error: checkError } = await supabase
        .from('student_profiles')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking profile:', checkError);
        toast.error('Failed to check profile');
        return;
      }

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('student_profiles')
          .update({
            name: data.name,
            phone: data.phone,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();
      } else {
        // Create new profile
        result = await supabase
          .from('student_profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            name: data.name,
            phone: data.phone
          })
          .select();
      }

      if (result.error) {
        console.error('Error saving profile:', result.error);
        toast.error('Failed to save profile');
        return;
      }

      toast.success('Profile updated successfully');
      await loadProfile(); // Reload the profile data
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  if (isInitialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled placeholder="Email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your phone number" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
