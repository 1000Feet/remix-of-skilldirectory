export interface EducatorProfile {
  id?: string;
  user_id?: string;
  name: string;
  description: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  about_business: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url?: string;
  ai_chatbot?: string;
  ai_voice_agent?: {
    knowledge_base: string[];
    voice_id: string;
  };
  image?: string | null;
  categories?: string[];
  tags?: string[];
  subscription_tier?: string;
}

export interface EducatorProfileFormProps {
  initialData?: EducatorProfile | null;
  onSuccess?: () => void;
}
