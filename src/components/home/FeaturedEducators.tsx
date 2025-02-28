import { useEffect, useState, useRef, useCallback } from "react";
import { Star, Heart } from "lucide-react";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RatingDisplay } from "@/components/shared/RatingDisplay";
import { useEducatorRatings } from "@/hooks/useEducatorRatings";

interface EducatorProfile {
  id: string;
  name: string;
  image: string;
  categories: string[];
}

export const FeaturedEducators = () => {
  const [educators, setEducators] = useState<EducatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [api, setApi] = useState<any>(null);
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { ratings } = useEducatorRatings(educators.map(e => e.id));
  const isStudent = user?.user_metadata?.user_type === 'student';

  // Create URL-friendly slug from business name
  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Auto-scroll function
  const runAutoplay = useCallback(() => {
    if (!api) return;
    
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
    }
    
    autoplayTimerRef.current = setTimeout(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
      runAutoplay();
    }, 3000);
  }, [api]);

  // Start autoplay when API is available
  useEffect(() => {
    if (!api) return;
    
    runAutoplay();
    
    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [api, runAutoplay]);

  useEffect(() => {
    fetchFeaturedEducators();
  }, []);

  const fetchFeaturedEducators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('educator_profiles')
        .select('id, name, image, categories')
        .eq('is_active', true)
        .eq('is_featured', true)
        .not('image', 'is', null)
        .not('name', 'is', null)
        .limit(6);

      if (error) {
        throw error;
      }

      setEducators(data || []);
    } catch (error) {
      console.error('Error fetching featured educators:', error);
      toast.error('Error loading featured educators');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent, educatorId: string) => {
    e.preventDefault(); // Prevent navigation
    toggleFavorite(educatorId);
  };

  if (loading) {
    return null;
  }

  if (educators.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">Featured Educators</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Learn from our most highly rated and experienced educators
        </p>
        <div ref={carouselRef}>
          <Carousel 
            opts={{
              align: "start",
              loop: true,
            }} 
            setApi={setApi}
            className="w-full max-w-6xl mx-auto"
            onMouseEnter={() => {
              if (autoplayTimerRef.current) {
                clearTimeout(autoplayTimerRef.current);
              }
            }}
            onMouseLeave={() => {
              runAutoplay();
            }}
          >
            <CarouselContent>
              {educators.map(educator => (
                <CarouselItem key={educator.id} className="md:basis-1/2 lg:basis-1/3">
                  <Link 
                    to={`/educator/${createSlug(educator.name)}`}
                    state={{ id: educator.id }}
                    className="block relative"
                  >
                    <div className="p-4">
                      <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                        <div className="relative h-48 w-full">
                          <img 
                            src={educator.image} 
                            alt={educator.name} 
                            className="w-full h-full object-cover" 
                          />
                          {isStudent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-9 w-9 bg-white/80 hover:bg-white"
                              onClick={(e) => handleFavoriteClick(e, educator.id)}
                            >
                              <Heart 
                                className={cn(
                                  "h-5 w-5",
                                  isFavorite(educator.id) ? "fill-red-500 text-red-500" : "text-gray-500"
                                )} 
                              />
                            </Button>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-1">{educator.name}</h3>
                          {ratings[educator.id] && (
                            <div className="mb-2">
                              <RatingDisplay
                                rating={ratings[educator.id].averageRating}
                                reviewCount={ratings[educator.id].reviewCount}
                              />
                            </div>
                          )}
                          <p className="text-gray-600 text-sm mb-2">{educator.categories?.[0] || 'Multiple Categories'}</p>
                          <div className="flex items-center gap-1">
      
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="hidden md:block">
              <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2" />
              <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};
