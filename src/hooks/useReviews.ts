import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Review {
  id: string;
  educator_id: string;
  student_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export const useReviews = (educatorId?: string) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);

  const fetchReviews = async () => {
    if (!educatorId) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          student_profiles(name)
        `)
        .eq('educator_id', educatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reviewsWithNames = data.map(review => ({
        ...review,
        student_name: review.student_profiles?.name
      }));

      setReviews(reviewsWithNames);

      // Calculate average rating
      if (reviewsWithNames.length > 0) {
        const avg = reviewsWithNames.reduce((acc, curr) => acc + curr.rating, 0) / reviewsWithNames.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }

      // Find user's review if they're a student
      if (user) {
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (studentProfile) {
          const userReview = reviewsWithNames.find(
            review => review.student_id === studentProfile.id
          );
          setUserReview(userReview || null);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (rating: number, reviewText: string) => {
    if (!user) {
      toast.error('You must be logged in to leave a review');
      return;
    }

    try {
      // First get the student profile id
      const { data: studentProfile, error: studentError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError || !studentProfile) {
        throw new Error('Student profile not found');
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          educator_id: educatorId,
          student_id: studentProfile.id,
          rating,
          review_text: reviewText
        })
        .select(`
          *,
          student_profiles(name)
        `)
        .single();

      if (error) throw error;

      const newReview = {
        ...data,
        student_name: data.student_profiles?.name
      };

      setReviews(prev => [newReview, ...prev]);
      setUserReview(newReview);
      toast.success('Review added successfully');
      
      // Update average rating
      const newAvg = (averageRating * reviews.length + rating) / (reviews.length + 1);
      setAverageRating(Math.round(newAvg * 10) / 10);
    } catch (error) {
      console.error('Error adding review:', error);
      toast.error('Failed to add review');
    }
  };

  const updateReview = async (rating: number, reviewText: string) => {
    if (!userReview) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating,
          review_text: reviewText,
          updated_at: new Date().toISOString()
        })
        .eq('id', userReview.id)
        .select(`
          *,
          student_profiles(name)
        `)
        .single();

      if (error) throw error;

      const updatedReview = {
        ...data,
        student_name: data.student_profiles?.name
      };

      setReviews(prev => 
        prev.map(review => 
          review.id === updatedReview.id ? updatedReview : review
        )
      );
      setUserReview(updatedReview);
      
      // Update average rating
      const newAvg = reviews.reduce((acc, curr) => 
        curr.id === updatedReview.id ? acc + rating : acc + curr.rating, 0
      ) / reviews.length;
      setAverageRating(Math.round(newAvg * 10) / 10);
      
      toast.success('Review updated successfully');
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    }
  };

  const deleteReview = async () => {
    if (!userReview) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      setReviews(prev => prev.filter(review => review.id !== userReview.id));
      setUserReview(null);
      
      // Update average rating
      const remainingReviews = reviews.filter(review => review.id !== userReview.id);
      if (remainingReviews.length > 0) {
        const newAvg = remainingReviews.reduce((acc, curr) => acc + curr.rating, 0) / remainingReviews.length;
        setAverageRating(Math.round(newAvg * 10) / 10);
      } else {
        setAverageRating(0);
      }
      
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [educatorId, user]);

  return {
    reviews,
    userReview,
    averageRating,
    loading,
    addReview,
    updateReview,
    deleteReview,
    isStudent: !!user && user.id ? true : false 
  };
};
