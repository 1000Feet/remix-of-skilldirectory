
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('student_profiles')
          .select('favorites')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // Handle case where favorites might be null
        if (data.favorites && typeof data.favorites === 'object') {
          const favArray = Array.isArray(data.favorites) 
            ? data.favorites 
            : Object.keys(data.favorites);
          setFavorites(favArray as string[]);
        } else {
          setFavorites([]);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const toggleFavorite = async (educatorId: string) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }

    try {
      const newFavorites = favorites.includes(educatorId)
        ? favorites.filter(id => id !== educatorId)
        : [...favorites, educatorId];

      setFavorites(newFavorites);

      const { error } = await supabase
        .from('student_profiles')
        .update({ favorites: newFavorites })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(
        favorites.includes(educatorId)
          ? 'Removed from favorites'
          : 'Added to favorites'
      );
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('Failed to update favorites');
    }
  };

  const isFavorite = (educatorId: string) => {
    return favorites.includes(educatorId);
  };

  return { favorites, toggleFavorite, isFavorite, loading };
};
