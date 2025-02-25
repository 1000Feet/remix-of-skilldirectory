
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

interface BusinessCardProps {
  name: string;
  description: string;
  image: string;
  distance?: string;
  educator_profile_id: string;
}

export const BusinessCard = ({
  name,
  description,
  image,
  distance,
  educator_profile_id
}: BusinessCardProps) => {
  const handleViewProfile = () => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    window.open(`/educator/${slug}`, '_blank');
  };

  return (
    <div className={cn(
      "relative flex flex-col md:flex-row gap-6 p-6",
      "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
    )}>
      <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{name}</h3>
          <p className="text-gray-600 mb-4 line-clamp-2">{description}</p>
          
          {distance && (
            <p className="text-sm text-gray-500">
              Distance: {distance}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <Button onClick={handleViewProfile} variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> View Profile
          </Button>
          <Link to={`/educator/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} state={{ id: educator_profile_id }}>
            <Button>Learn More</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
