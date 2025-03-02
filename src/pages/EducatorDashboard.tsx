
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { EducatorProfileForm } from "@/components/educator/EducatorProfileForm";
import { LessonRequests } from "@/components/educator/LessonRequests";
import { SubscriptionInfo } from "@/components/educator/SubscriptionInfo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { EducatorProfile } from "@/components/educator/types";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export default function EducatorDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<EducatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user?.user_metadata?.user_type !== 'educator') {
      navigate('/');
      return;
    }

    const fetchEducatorProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('educator_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching educator profile:', error);
          return;
        }

        // Handle ai_voice_agent field that could be a string from JSON
        if (data && typeof data.ai_voice_agent === 'string') {
          try {
            data.ai_voice_agent = JSON.parse(data.ai_voice_agent);
          } catch (e) {
            // If parsing fails, set a default value
            data.ai_voice_agent = { 
              knowledge_base: [],
              voice_id: 'cjVigY5qzO86Huf0OWal'
            };
          }
        }

        setProfileData(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEducatorProfile();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleProfileUpdate = (updatedProfile: EducatorProfile) => {
    setProfileData(updatedProfile);
  };

  const profileSlug = profileData?.name ? createSlug(profileData.name) : user.id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6 px-4 space-y-8">
        <div className="flex justify-end">
          <Link 
            to={`/educator/${profileSlug}`} 
            target="_blank"
            className="inline-flex"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Public Profile
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <EducatorProfileForm 
              initialData={profileData} 
              onSuccess={handleProfileUpdate}
            />
          </div>
          <div className="space-y-6">
            <SubscriptionInfo />
            <LessonRequests />
          </div>
        </div>
      </main>
    </div>
  );
}
