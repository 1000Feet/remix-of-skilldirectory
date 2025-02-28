import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EducatorRating {
  educatorId: string;
  averageRating: number;
  reviewCount: number;
}

export const useEducatorRatings = (educatorIds: string[]) => {
  const [ratings, setRatings] = useState<Record<string, EducatorRating>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!educatorIds.length) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('educator_id, rating')
          .in('educator_id', educatorIds);

        if (error) throw error;

        const ratingsByEducator: Record<string, EducatorRating> = {};
        
        // Initialize ratings for all educators
        educatorIds.forEach(id => {
          ratingsByEducator[id] = {
            educatorId: id,
            averageRating: 0,
            reviewCount: 0
          };
        });

        // Calculate ratings
        data.forEach(review => {
          const current = ratingsByEducator[review.educator_id] || {
            educatorId: review.educator_id,
            averageRating: 0,
            reviewCount: 0
          };

          current.averageRating = (current.averageRating * current.reviewCount + review.rating) / (current.reviewCount + 1);
          current.reviewCount += 1;
          ratingsByEducator[review.educator_id] = current;
        });

        // Round average ratings
        Object.values(ratingsByEducator).forEach(rating => {
          rating.averageRating = Math.round(rating.averageRating * 10) / 10;
        });

        setRatings(ratingsByEducator);
      } catch (error) {
        console.error('Error fetching educator ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [educatorIds.join(',')]);

  return { ratings, loading };
};
