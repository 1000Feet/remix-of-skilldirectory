import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { EducatorProfile } from './types';
import type { EducatorProfileFormProps } from './types';
import { BasicInfoSection } from './BasicInfoSection';
import { SocialMediaSection } from './SocialMediaSection';
import { AIChatbotSection } from './AIChatbotSection';
import { VoiceAgentSection } from './VoiceAgentSection';
import { EducatorImageUpload } from './EducatorImageUpload';

interface EducatorProfileFormProps {
  initialData?: EducatorProfile | null;
  onSuccess?: (updatedProfile: EducatorProfile) => void;
}

export function EducatorProfileForm({ initialData, onSuccess }: EducatorProfileFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    website: initialData?.website || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || user?.email || '',
    about_business: initialData?.about_business || '',
    image: initialData?.image || '',
    facebook_url: initialData?.facebook_url || '',
    instagram_url: initialData?.instagram_url || '',
    youtube_url: initialData?.youtube_url || '',
    ai_chatbot: initialData?.ai_chatbot || { knowledge_base: [] },
    ai_voice_agent: initialData?.ai_voice_agent || { 
      knowledge_base: [], 
      voice_id: 'cjVigY5qzO86Huf0OWal' 
    },
    categories: initialData?.categories || [],
    tags: initialData?.tags || [],
    subscription_tier: initialData?.subscription_tier || 'basic'
  });

  const handleBasicInfoChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (url: string) => {
    setFormData(prev => ({ ...prev, image: url }));
  };

  const handleSocialChange = (social: { facebook: string; instagram: string; youtube?: string }) => {
    const formatUrl = (url: string) => {
      if (!url) return '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    };

    setFormData(prev => ({ 
      ...prev, 
      facebook_url: formatUrl(social.facebook),
      instagram_url: formatUrl(social.instagram),
      youtube_url: social.youtube ? formatUrl(social.youtube) : ''
    }));
  };

  const handleChatbotChange = (ai_chatbot: { knowledge_base: string[] }) => {
    setFormData(prev => ({ ...prev, ai_chatbot }));
  };

  const handleVoiceAgentChange = (ai_voice_agent: { knowledge_base: string[], voice_id: string }) => {
    setFormData(prev => ({ ...prev, ai_voice_agent }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to submit the form');
      return;
    }

    if (!formData.name) {
      toast.error('Business name is required');
      return;
    }

    setIsSubmitting(true);
    console.log('Starting profile update with data:', formData);

    try {
      const formatUrl = (url: string) => {
        if (!url) return '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      };

      const profileData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        website: formatUrl(formData.website.trim()),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        about_business: formData.about_business.trim(),
        image: formData.image,
        facebook_url: formatUrl(formData.facebook_url.trim()),
        instagram_url: formatUrl(formData.instagram_url.trim()),
        youtube_url: formData.youtube_url ? formatUrl(formData.youtube_url.trim()) : '',
        ai_chatbot: formData.ai_chatbot,
        ai_voice_agent: formData.ai_voice_agent,
        categories: formData.categories,
        tags: formData.tags,
        subscription_tier: formData.subscription_tier,
        updated_at: new Date().toISOString()
      };

      let result;
      if (initialData?.id) {
        console.log('Updating existing profile with data:', profileData);
        result = await supabase
          .from('educator_profiles')
          .update(profileData)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        console.log('Creating new profile with data:', profileData);
        result = await supabase
          .from('educator_profiles')
          .insert(profileData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Call onSuccess with the updated profile data
      onSuccess?.(result.data);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 p-6">
      <EducatorImageUpload
        currentImage={formData.image}
        onImageUpload={handleImageChange}
        loading={isSubmitting}
      />
      <BasicInfoSection 
        info={formData} 
        onChange={handleBasicInfoChange}
      />

      <SocialMediaSection
        facebook={formData.facebook_url}
        instagram={formData.instagram_url}
        youtube={formData.youtube_url}
        onChange={handleSocialChange}
      />

      <AIChatbotSection
        chatbot={formData.ai_chatbot}
        onChange={handleChatbotChange}
      />

      <VoiceAgentSection
        voiceAgent={formData.ai_voice_agent}
        onChange={handleVoiceAgentChange}
      />

      <Button 
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : (initialData ? 'Update Profile' : 'Create Profile')}
      </Button>
    </form>
  );
}
