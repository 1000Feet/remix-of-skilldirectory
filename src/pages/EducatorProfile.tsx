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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Video, Calendar } from "lucide-react";
import { ChatModal } from "@/components/educator/ChatModal";
import { Reviews } from '@/components/educator/Reviews';

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

const getEmbedUrl = (url: string) => {
  // Extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
};

const EducatorProfile = () => {
  const { id: slugParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const profileId = location.state?.id;
  
  const [showClaimBanner, setShowClaimBanner] = useState(true);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [profile, setProfile] = useState<EducatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      
      try {
        // If we have a profile ID from state, use that directly
        if (profileId) {
          const { data, error: fetchError } = await supabase
            .from('educator_profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

          if (fetchError) {
            console.error('Error fetching profile by ID:', fetchError);
            throw fetchError;
          }

          if (!data) {
            setError("Profile not found");
            setLoading(false);
            return;
          }

          // Check if the URL matches the slug for this profile
          if (data.name) {
            const correctSlug = createSlug(data.name);
            if (slugParam !== correctSlug) {
              navigate(`/educator/${correctSlug}`, { 
                state: { id: profileId },
                replace: true 
              });
              return;
            }
          }

          setProfile(data);
        } 
        // Otherwise, try to find the educator by slug
        else if (slugParam) {
          console.log('Fetching profile by slug:', slugParam);
          
          // First, try a direct slug match by converting the slug format back to possible name patterns
          const slugWithSpaces = slugParam.replace(/-/g, ' ');
          
          const { data: profiles, error: slugError } = await supabase
            .from('educator_profiles')
            .select('*')
            .or(`name.ilike.%${slugWithSpaces}%,description.ilike.%${slugWithSpaces}%`);

          if (slugError) {
            console.error('Error searching profiles by slug:', slugError);
            throw slugError;
          }

          if (!profiles || profiles.length === 0) {
            setError("Profile not found");
            setLoading(false);
            return;
          }

          // Find the profile whose slug would match the provided slug
          const matchedProfile = profiles.find(p => 
            createSlug(p.name) === slugParam
          );

          // If no exact match, use the first result that's closest to the slug
          const profileToUse = matchedProfile || profiles[0];
          
          // If we found a profile but its slug doesn't match the URL, redirect to the correct URL
          if (profileToUse && createSlug(profileToUse.name) !== slugParam) {
            navigate(`/educator/${createSlug(profileToUse.name)}`, { 
              state: { id: profileToUse.id },
              replace: true 
            });
            return;
          }

          setProfile(profileToUse);
        }
      } catch (err) {
        console.error('Error in fetchProfile:', err);
        setError("Failed to load educator profile");
        toast.error("Failed to load educator profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, slugParam, navigate]);

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

  const embedUrl = profile.youtube_url ? getEmbedUrl(profile.youtube_url) : null;

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
                educatorId={profile.id}
              />
              
              <AboutSection
                about={profile.about_business}
                description={profile.description}
              />

              <div className="mt-8 space-y-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-semibold mb-4">About</h2>
                  <p className="text-gray-700">{profile.description || 'No bio available.'}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
                  <Reviews educatorId={profile.id} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#F2FCE2] p-6 rounded-lg text-center">
                  <MessageSquare className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-semibold mb-2">Chat with AI Assistant</h3>
                  <p className="text-sm text-gray-600 mb-4">Ask about our services to our AI Agent!</p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsChatOpen(true)}
                  >
                    Start Chat
                  </Button>
                </div>

                <div className="bg-[#F2FCE2] p-6 rounded-lg text-center">
                  <Video className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-semibold mb-2">Watch Our Studio</h3>
                  <p className="text-sm text-gray-600 mb-4">YouTube video presentation of our work</p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsVideoModalOpen(true)}
                    disabled={!embedUrl}
                  >
                    Watch Video
                  </Button>
                </div>

                <div className="bg-[#F2FCE2] p-6 rounded-lg text-center">
                  <Calendar className="mx-auto mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-semibold mb-2">Book a Lesson</h3>
                  <p className="text-sm text-gray-600 mb-4">Free introductory lesson (in person or online)</p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsRequestFormOpen(true)}
                  >
                    Schedule Now
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-center text-green-600">
                  Start with a FREE VIDEO LESSON NOW!
                </h2>
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {embedUrl ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={embedUrl}
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
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isRequestFormOpen} onOpenChange={setIsRequestFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a Lesson</DialogTitle>
          </DialogHeader>
          <RequestLessonForm 
            educatorId={profile.id}
            educatorProfileId={profile.id}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Presentation</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {embedUrl && (
              <iframe
                width="100%"
                height="100%"
                src={embedUrl}
                title="Video presentation"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isChatOpen && (
        <ChatModal 
          isOpen={isChatOpen} 
          onOpenChange={setIsChatOpen}
          profile={profile}
        />
      )}
    </div>
  );
};

export default EducatorProfile;
