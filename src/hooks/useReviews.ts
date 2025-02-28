import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  educator_id: string;
  student_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

type ReviewWithProfile = {
  id: string;
  educator_id: string;
  student_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at: string;
  student_profiles: {
    name: string;
  } | null;
}

export const useReviews = (educatorId: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserReview, setCurrentUserReview] = useState<Review | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('reviews')
        .select(`
          id,
          educator_id,
          student_id,
          rating,
          review_text,
          created_at,
          updated_at,
          student_profiles (
            name
          )
        `)
        .eq('educator_id', educatorId)
        .order('created_at', { ascending: false }) as { data: ReviewWithProfile[] | null; error: any };

      if (queryError) throw queryError;

      if (data) {
        const formattedReviews: Review[] = data.map(review => ({
          id: review.id,
          educator_id: review.educator_id,
          student_id: review.student_id,
          rating: review.rating,
          review_text: review.review_text,
          created_at: review.created_at,
          updated_at: review.updated_at,
          student_name: review.student_profiles?.name || 'Anonymous'
        }));
        setReviews(formattedReviews);

        // Update current user review if it exists
        const user = supabase.auth.getUser();
        if (user) {
          const studentId = (await user).data.user?.user_metadata?.student_id;
          if (studentId) {
            const userReview = formattedReviews.find(r => r.student_id === studentId);
            setCurrentUserReview(userReview || null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Error fetching reviews');
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (review: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'student_name'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert([review])
        .select(`
          id,
          educator_id,
          student_id,
          rating,
          review_text,
          created_at,
          updated_at,
          student_profiles (
            name
          )
        `)
        .single() as { data: ReviewWithProfile | null; error: any };

      if (insertError) throw insertError;

      if (data) {
        const newReview: Review = {
          id: data.id,
          educator_id: data.educator_id,
          student_id: data.student_id,
          rating: data.rating,
          review_text: data.review_text,
          created_at: data.created_at,
          updated_at: data.updated_at,
          student_name: data.student_profiles?.name || 'Anonymous'
        };

        setReviews(prev => [newReview, ...prev]);
        setCurrentUserReview(newReview);
      }
    } catch (err) {
      console.error('Error adding review:', err);
      throw err;
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<Omit<Review, 'id' | 'created_at' | 'updated_at' | 'student_name'>>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', reviewId)
        .select(`
          id,
          educator_id,
          student_id,
          rating,
          review_text,
          created_at,
          updated_at,
          student_profiles (
            name
          )
        `)
        .single() as { data: ReviewWithProfile | null; error: any };

      if (updateError) throw updateError;

      if (data) {
        const updatedReview: Review = {
          id: data.id,
          educator_id: data.educator_id,
          student_id: data.student_id,
          rating: data.rating,
          review_text: data.review_text,
          created_at: data.created_at,
          updated_at: data.updated_at,
          student_name: data.student_profiles?.name || 'Anonymous'
        };

        setReviews(prev => prev.map(review => review.id === reviewId ? updatedReview : review));
        setCurrentUserReview(updatedReview);
      }
    } catch (err) {
      console.error('Error updating review:', err);
      throw err;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (deleteError) throw deleteError;

      setReviews(prev => prev.filter(review => review.id !== reviewId));
      setCurrentUserReview(null);
    } catch (err) {
      console.error('Error deleting review:', err);
      throw err;
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  };

  useEffect(() => {
    fetchReviews();
  }, [educatorId]);

  return {
    reviews,
    loading,
    error,
    currentUserReview,
    addReview,
    updateReview,
    deleteReview,
    calculateAverageRating
  };
};
