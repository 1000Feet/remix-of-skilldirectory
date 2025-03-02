
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EducatorProfileForm } from '@/components/educator/EducatorProfileForm';
import { useAuth } from '@/contexts/AuthContext';
import { EducatorProfile, useProfileManagement } from '@/hooks/useProfileManagement';
import { LessonRequests } from '@/components/educator/LessonRequests';
import { StripeManagement } from '@/components/stripe/StripeManagement';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

const EducatorDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { getEducatorProfile } = useProfileManagement();
  const [profile, setProfile] = useState<EducatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const loadEducatorProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const profileData = await getEducatorProfile(user.id);
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading educator profile:", error);
        toast.error("Failed to load your profile.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      loadEducatorProfile();
    } else if (!authLoading && !user) {
      navigate('/auth?redirect=educator-dashboard');
    }
  }, [user, authLoading, getEducatorProfile, navigate]);

  useEffect(() => {
    // Check for checkout_success parameter
    const checkoutSuccess = searchParams.get('checkout_success');
    if (checkoutSuccess === 'true') {
      toast.success("Your subscription has been activated!");
      // Clean up URL parameters
      navigate('/educator-dashboard', { replace: true });
      
      // Reload profile to get updated subscription status
      if (user) {
        getEducatorProfile(user.id).then(profileData => {
          setProfile(profileData);
        });
      }
    }
  }, [searchParams, navigate, user, getEducatorProfile]);

  const handleProfileUpdated = (updatedProfile: EducatorProfile) => {
    setProfile(updatedProfile);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Educator Dashboard</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="lessons">Lesson Requests</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-primary text-white">
                <h2 className="text-xl font-semibold">Your Educator Profile</h2>
                <p className="text-sm opacity-90">
                  Complete your profile to appear in search results
                </p>
              </div>
              <EducatorProfileForm 
                initialData={profile}
                onSuccess={handleProfileUpdated}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="lessons" className="mt-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-primary text-white">
                <h2 className="text-xl font-semibold">Manage Lesson Requests</h2>
                <p className="text-sm opacity-90">
                  View and respond to lesson requests from students
                </p>
              </div>
              <div className="p-6">
                {profile ? (
                  <LessonRequests educatorId={user?.id} />
                ) : (
                  <p>Please complete your profile first</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="subscription" className="mt-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-primary text-white">
                <h2 className="text-xl font-semibold">Manage Subscription</h2>
                <p className="text-sm opacity-90">
                  View and manage your current subscription plan
                </p>
              </div>
              <div className="p-6">
                <StripeManagement 
                  profile={profile} 
                  onProfileUpdated={handleProfileUpdated} 
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default EducatorDashboard;
