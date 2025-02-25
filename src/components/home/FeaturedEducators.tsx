
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EducatorProfile {
  id: string;
  name: string;
  image: string;
  categories: string[];
}

export const FeaturedEducators = () => {
  const [educators, setEducators] = useState<EducatorProfile[]>([]);
  const [loading, setLoading] = useState(true);

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
        .not('image', 'is', null)
        .not('name', 'is', null)
        .limit(4);

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

  if (loading) {
    return null; // Don't show the section while loading
  }

  if (educators.length === 0) {
    return null; // Don't show the section if no educators are found
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">Featured Educators</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Learn from our most highly rated and experienced educators
        </p>
        <Carousel opts={{
          align: "start",
          loop: true
        }} className="w-full max-w-6xl mx-auto">
          <CarouselContent>
            {educators.map(educator => (
              <CarouselItem key={educator.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-4">
                  <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div className="relative h-48 w-full">
                      <img 
                        src={educator.image} 
                        alt={educator.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{educator.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{educator.categories?.[0] || 'Multiple Categories'}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">Featured</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};
