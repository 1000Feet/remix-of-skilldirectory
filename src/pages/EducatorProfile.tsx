
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { ClaimBanner } from "@/components/business/ClaimBanner";
import { ProfileHeader } from "@/components/educator/ProfileHeader";
import { AboutSection } from "@/components/educator/AboutSection";
import { ContactInfo } from "@/components/educator/ContactInfo";
import { LessonRequestForm } from "@/components/educator/LessonRequestForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  social: {
    facebook: string;
    instagram: string;
    youtube?: string;
  } | null;
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
        // If no ID in state, try to find by slug
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

        setProfile({
          ...slugData,
          social: slugData.social as EducatorProfile['social']
        });
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

      // Check if we need to redirect to the correct URL with slug
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

      setProfile({
        ...data,
        social: data.social as EducatorProfile['social']
      });
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
        <div className="container mx-auto py-8">
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
            </div>
            <div className="space-y-6">
              <ContactInfo
                address={profile.address}
                phone={profile.phone}
                email={profile.email}
                website={profile.website}
                social={profile.social}
              />
              <LessonRequestForm 
                educatorProfileId={profile.id} 
                educatorName={profile.name} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EducatorProfile;
