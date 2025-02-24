import { Card } from "@/components/ui/card";
import { Facebook, Globe, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";

interface ContactInfoProps {
  business: {
    website: string;
    address: string;
    phone: string;
    email: string;
    facebook_url: string;
    instagram_url: string;
    youtube_url?: string;
  };
}

export const ContactInfo = ({ business }: ContactInfoProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
      <div className="space-y-4">
        <a href={business.website} className="flex items-center gap-3 text-gray-600 hover:text-primary">
          <Globe className="w-5 h-5" />
          <span>Visit Website</span>
        </a>
        <div className="flex items-center gap-3 text-gray-600">
          <MapPin className="w-5 h-5" />
          <span>{business.address}</span>
        </div>
        <a href={`tel:${business.phone}`} className="flex items-center gap-3 text-gray-600 hover:text-primary">
          <Phone className="w-5 h-5" />
          <span>{business.phone}</span>
        </a>
        <a href={`mailto:${business.email}`} className="flex items-center gap-3 text-gray-600 hover:text-primary">
          <Mail className="w-5 h-5" />
          <span>{business.email}</span>
        </a>
        <div className="flex gap-4 mt-4">
          {business.facebook_url && (
            <a href={business.facebook_url} className="text-gray-600 hover:text-primary">
              <Facebook className="w-5 h-5" />
            </a>
          )}
          {business.instagram_url && (
            <a href={business.instagram_url} className="text-gray-600 hover:text-primary">
              <Instagram className="w-5 h-5" />
            </a>
          )}
          {business.youtube_url && (
            <a href={business.youtube_url} className="text-gray-600 hover:text-primary">
              <Youtube className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
};
