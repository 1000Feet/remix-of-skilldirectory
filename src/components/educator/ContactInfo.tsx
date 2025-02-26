
import { Card } from "@/components/ui/card";
import { Facebook, Instagram, Globe, MapPin, Phone, Mail } from "lucide-react";

interface ContactInfoProps {
  address: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
}

export const ContactInfo = ({ 
  address, 
  phone, 
  email, 
  website,
  facebook_url,
  instagram_url 
}: ContactInfoProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
      <div className="space-y-4">
        {website && (
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-500" />
            <a 
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}
        
        {address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <p className="text-gray-600">{address}</p>
          </div>
        )}
        
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-gray-500" />
            <p className="text-gray-600">{phone}</p>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-gray-500" />
          <p className="text-gray-600">{email}</p>
        </div>

        {(facebook_url || instagram_url) && (
          <div className="flex gap-4 mt-4">
            {facebook_url && (
              <a 
                href={facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 flex items-center gap-2"
              >
                <Facebook className="h-5 w-5" />
                <span>Facebook</span>
              </a>
            )}
            {instagram_url && (
              <a 
                href={instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 flex items-center gap-2"
              >
                <Instagram className="h-5 w-5" />
                <span>Instagram</span>
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
