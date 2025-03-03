
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    try {
      const { data: studentProfile, error: studentError } = await supabase
        .from('student_profiles')
        .select('favorites')
        .eq('user_id', user.id)
        .single();

      if (studentError) {
        console.error('Error fetching favorites:', studentError);
        // Only show error toast for student users
        if (user?.user_metadata?.user_type === 'student') {
          toast.error('Failed to load favorites');
        }
        return;
      }

      // Handle potential null or non-array values safely
      if (studentProfile?.favorites && Array.isArray(studentProfile.favorites)) {
        setFavorites(studentProfile.favorites as string[]);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error in fetchFavorites:', error);
      // Only show error toast for student users
      if (user?.user_metadata?.user_type === 'student') {
        toast.error('Failed to load favorites');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (educatorId: string) => {
    if (!user?.profile?.id) {
      toast.error('Please sign in as a student to favorite educators');
      return;
    }

    try {
      const newFavorites = favorites.includes(educatorId)
        ? favorites.filter(id => id !== educatorId)
        : [...favorites, educatorId];

      const { error } = await supabase
        .from('student_profiles')
        .update({ favorites: newFavorites })
        .eq('id', user.profile.id);

      if (error) throw error;

      setFavorites(newFavorites);
      toast.success(
        favorites.includes(educatorId)
          ? 'Removed from favorites'
          : 'Added to favorites'
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const isFavorite = (educatorId: string) => favorites.includes(educatorId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    fetchFavorites
  };
};
