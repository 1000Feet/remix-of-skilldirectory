import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EducatorProfileForm } from '@/components/educator/EducatorProfileForm';
import { LessonRequests } from '@/components/educator/LessonRequests';
import { toast } from 'sonner';
import type { EducatorProfile } from '@/components/educator/types';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';

export default function EducatorDashboard() {
  const { user } = useAuth();
  const [educatorProfile, setEducatorProfile] = useState<EducatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const { data, error: profileError } = await supabase
        .from('educator_profiles')
        .select(`
          id,
          user_id,
          name,
          description,
          website,
          address,
          phone,
          email,
          about_business,
          facebook_url,
          instagram_url,
          youtube_url,
          ai_chatbot,
          ai_voice_agent,
          image,
          categories,
          tags,
          subscription_tier
        `)
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setEducatorProfile(data);
    } catch (err) {
      console.error('Error fetching educator profile:', err);
      setError('Failed to load educator profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const handleProfileUpdate = (updatedProfile: EducatorProfile) => {
    setEducatorProfile(updatedProfile);
    toast.success('Profile updated successfully!');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <LessonRequests userId={user?.id} />
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-6">Educator Profile</h1>
            <EducatorProfileForm
              initialData={educatorProfile}
              onSuccess={handleProfileUpdate}
            />
          </Card>
        </div>
      </main>
    </div>
  );
}
