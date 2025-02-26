
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { ClaimBanner } from "@/components/business/ClaimBanner";
import { ProfileHeader } from "@/components/educator/ProfileHeader";
import { AboutSection } from "@/components/educator/AboutSection";
import { ContactInfo } from "@/components/educator/ContactInfo";
import { RequestLessonForm } from "@/components/student/RequestLessonForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessageSquare, Video, Calendar } from "lucide-react";

interface EducatorProfile {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  address: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  categories: string[] | null;
  tags: string[] | null;
  about_business: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
}

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const EducatorProfile = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const profileId = location.state?.id;
  
  const [showClaimBanner, setShowClaimBanner] = useState(true);
  const [profile, setProfile] = useState<EducatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) {
        const { data: slugData, error: slugError } = await supabase
          .from('educator_profiles')
          .select('*')
          .ilike('name', slug?.replace(/-/g, '%') || '')
          .maybeSingle();

        if (slugError || !slugData) {
          setError("Profile not found");
          setLoading(false);
          return;
        }

        setProfile(slugData);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('educator_profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        setError("Failed to load educator profile");
        toast.error('Failed to load educator profile');
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Profile not found");
        setLoading(false);
        return;
      }

      if (data.name) {
        const correctSlug = createSlug(data.name);
        if (!slug || slug !== correctSlug) {
          navigate(`/educator/${correctSlug}`, { 
            state: { id: profileId },
            replace: true 
          });
          return;
        }
      }

      setProfile(data);
      setError(null);
      setLoading(false);
    };

    fetchProfile();
  }, [profileId, slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-gray-600">{error || "The educator profile you're looking for doesn't exist."}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          {showClaimBanner && (
            <ClaimBanner onClose={() => setShowClaimBanner(false)} />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <ProfileHeader
                name={profile.name}
                description={profile.description}
                image={profile.image}
                categories={profile.categories}
              />
              
              <AboutSection
                about={profile.about_business}
                description={profile.description}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#F2FCE2] p-6 rounded-lg text-center">
                  <MessageSquare className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-semibold mb-2">Chat with AI Assistant</h3>
                  <p className="text-sm text-gray-600 mb-4">Ask about our services to our AI Voice Agent!</p>
                  <Button variant="outline" className="w-full">Start Chat</Button>
                </div>

                <div className="bg-[#F2FCE2] p-6 rounded-lg text-center">
                  <Video className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-semibold mb-2">Watch Our Studio</h3>
                  <p className="text-sm text-gray-600 mb-4">YouTube video presentation of our work</p>
                  <Button variant="outline" className="w-full">Watch Video</Button>
                </div>

                <div className="bg-[#F2FCE2] p-6 rounded-lg text-center">
                  <Calendar className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-semibold mb-2">Book a Lesson</h3>
                  <p className="text-sm text-gray-600 mb-4">Free introductory lesson (in person or online)</p>
                  <Button variant="outline" className="w-full">Schedule Now</Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-center text-green-600">
                  Start with a FREE VIDEO LESSON NOW!
                </h2>
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {profile.youtube_url ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={profile.youtube_url.replace('watch?v=', 'embed/')}
                      title="Video presentation"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No video available
                    </div>
                  )}
                </div>
              </div>

              <ContactInfo
                address={profile.address}
                phone={profile.phone}
                email={profile.email}
                website={profile.website}
                facebook_url={profile.facebook_url}
                instagram_url={profile.instagram_url}
              />

              <RequestLessonForm 
                educatorId={profile.id}
                educatorProfileId={profile.id}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EducatorProfile;
