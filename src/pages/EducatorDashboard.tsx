import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EducatorProfileForm } from '@/components/educator/EducatorProfileForm';
import { LessonRequests } from '@/components/educator/LessonRequests';
import { AIChatbotSection } from '@/components/educator/AIChatbotSection';
import { VoiceAgentSection } from '@/components/educator/VoiceAgentSection';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SubscriptionInfo } from '@/components/educator/SubscriptionInfo';
import { useProfileManagement, EducatorProfile } from '@/hooks/useProfileManagement';

const EducatorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getEducatorProfile, loading: profileLoading } = useProfileManagement();
  const [educatorProfile, setEducatorProfile] = useState<EducatorProfile | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (!user) {
        toast.error('You must be signed in to access this page');
        navigate('/auth?signin=educator');
        return false;
      }
      return true;
    };

    const loadProfile = async () => {
      if (!checkAuth()) return;

      try {
        setLoading(true);
        const profile = await getEducatorProfile(user.id);
        
        if (profile) {
          // Ensure ai_voice_agent has the correct structure
          if (typeof profile.ai_voice_agent === 'string') {
            try {
              profile.ai_voice_agent = JSON.parse(profile.ai_voice_agent);
            } catch (e) {
              profile.ai_voice_agent = { voice_id: '', knowledge_base: [] };
            }
          } else if (!profile.ai_voice_agent) {
            profile.ai_voice_agent = { voice_id: '', knowledge_base: [] };
          }
          
          setEducatorProfile(profile as EducatorProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, navigate, getEducatorProfile]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg">Loading your dashboard...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Educator Dashboard</h1>
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="lessons">Lesson Requests</TabsTrigger>
                <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="space-y-6">
              <EducatorProfileForm initialData={educatorProfile} />
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
              <SubscriptionInfo />
              
              <div className="mt-6">
                <Button onClick={() => navigate('/pricing')} variant="outline">
                  View Pricing Plans
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="lessons" className="space-y-6">
              <LessonRequests />
            </TabsContent>

            <TabsContent value="ai-tools" className="space-y-8">
              <AIChatbotSection />
              <VoiceAgentSection />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EducatorDashboard;
