import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  name: string;
  description: string | null;
  image: string | null;
  categories: string[] | null;
  educatorId: string;
}

export const ProfileHeader = ({ 
  name, 
  description, 
  image, 
  categories,
  educatorId
}: ProfileHeaderProps) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isStudent = user?.user_metadata?.user_type === 'student';

  return (
    <Card className="p-6">
      <div className="flex gap-6">
        {image && (
          <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={image} 
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{name}</h1>
              <p className="text-gray-600 mb-4">{description}</p>
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <span 
                      key={category}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {isStudent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => toggleFavorite(educatorId)}
              >
                <Heart 
                  className={cn(
                    "h-6 w-6",
                    isFavorite(educatorId) ? "fill-red-500 text-red-500" : "text-gray-500"
                  )} 
                />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
