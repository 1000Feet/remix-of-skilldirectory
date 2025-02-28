import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ImageIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { RatingDisplay } from '@/components/shared/RatingDisplay';
import { useEducatorRatings } from '@/hooks/useEducatorRatings';
import { cn } from "@/lib/utils";

interface BusinessCardProps {
  name: string;
  description: string;
  distance: string;
  image?: string;
  id?: number;
  educator_id?: string;
  educator_profile_id?: string;
}

export function BusinessCard({ 
  name, 
  description, 
  distance, 
  image, 
  id,
  educator_profile_id 
}: BusinessCardProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { ratings } = useEducatorRatings([educator_profile_id]);
  const rating = ratings[educator_profile_id];
  const isStudent = user?.user_metadata?.user_type === 'student';
  
  // Create URL-friendly slug from business name
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent card navigation
    if (educator_profile_id) {
      toggleFavorite(educator_profile_id);
    }
  };

  return (
    <Card className="flex overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-4 relative">
      <div className="w-48 h-48 flex-shrink-0 bg-gray-50">
        {image ? (
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/192?text=No+Image';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>
      <CardContent className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-2xl font-semibold tracking-tight mb-2">{name}</h3>
            {isStudent && educator_profile_id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleFavoriteClick}
              >
                <Heart 
                  className={cn(
                    "h-5 w-5",
                    isFavorite(educator_profile_id) ? "fill-red-500 text-red-500" : "text-gray-500"
                  )} 
                />
              </Button>
            )}
          </div>
          {rating && (
            <RatingDisplay
              rating={rating.averageRating}
              reviewCount={rating.reviewCount}
              className="mb-2"
            />
          )}
          <p className="text-muted-foreground line-clamp-2">{description}</p>
        </div>
        <div className="flex items-center justify-between mt-4">
          {distance && (
            <span className="inline-flex items-center rounded-full bg-gray-600 px-3 py-1 text-sm text-white">
              {distance} Miles Away
            </span>
          )}
          <Link 
            to={`/educator/${createSlug(name)}`}
            state={{ id: educator_profile_id }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            DETAILS
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
