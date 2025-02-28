import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useDistance } from "@/hooks/useDistance";
import { BusinessCard } from "@/components/BusinessCard";
import { toast } from "sonner";

interface EducatorProfile {
  id: string;
  name: string;
  description: string;
  image: string;
  address: string;
  distance?: {
    miles: number;
    kilometers: number;
  } | null;
}

export function FavoriteEducators() {
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { calculateDistanceFromStudent, loading: distanceLoading, isAuthenticated } = useDistance();
  const [educators, setEducators] = useState<EducatorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteEducators = async () => {
      if (!favorites.length) {
        setEducators([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('educator_profiles')
          .select('id, name, description, image, address')
          .in('id', favorites);

        if (error) throw error;

        // Calculate distances for each educator
        const educatorsWithDistance = await Promise.all(
          (data || []).map(async (educator) => {
            let distance = null;
            if (isAuthenticated && educator.address) {
              distance = await calculateDistanceFromStudent(educator.address);
            }
            return {
              ...educator,
              distance
            };
          })
        );

        setEducators(educatorsWithDistance);
      } catch (error) {
        console.error('Error fetching favorite educators:', error);
        toast.error('Failed to load favorite educators');
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteEducators();
  }, [favorites, isAuthenticated, calculateDistanceFromStudent]);

  if (loading || favoritesLoading || distanceLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-48 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">No Favorite Educators</h3>
        <p className="text-gray-600">
          Start exploring educators and add them to your favorites!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Favorite Educators</h2>
      {educators.map((educator) => (
        <BusinessCard
          key={educator.id}
          name={educator.name}
          description={educator.description}
          image={educator.image}
          distance={educator.distance 
            ? `${educator.distance.miles.toFixed(1)} mi (${educator.distance.kilometers.toFixed(1)} km)`
            : "N/A"}
          educator_profile_id={educator.id}
        />
      ))}
    </div>
  );
}
