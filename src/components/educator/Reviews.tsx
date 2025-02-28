import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useReviews, Review } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import { ReviewForm } from './ReviewForm';
import { toast } from 'sonner';

interface ReviewsProps {
  educatorId: string;
}

export const Reviews = ({ educatorId }: ReviewsProps) => {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { 
    reviews, 
    loading, 
    currentUserReview,
    calculateAverageRating,
    addReview,
    updateReview,
    deleteReview 
  } = useReviews(educatorId);

  const isStudent = user?.user_metadata?.user_type === 'student';
  const averageRating = calculateAverageRating();

  const handleSubmitReview = async (rating: number, reviewText: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to leave a review');
        return;
      }

      const studentId = user.user_metadata?.student_id;
      if (!studentId) {
        toast.error('Student profile not found');
        return;
      }

      const reviewData = {
        educator_id: educatorId,
        student_id: studentId,
        rating,
        review_text: reviewText
      };

      if (currentUserReview) {
        await updateReview(currentUserReview.id, reviewData);
        toast.success('Review updated successfully');
      } else {
        await addReview(reviewData);
        toast.success('Review added successfully');
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    }
  };

  const handleDeleteReview = async () => {
    try {
      if (!currentUserReview) return;
      await deleteReview(currentUserReview.id);
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <span className="ml-2 text-2xl font-semibold">{averageRating}</span>
            <span className="ml-2 text-gray-600">({reviews.length} reviews)</span>
          </div>
        </div>
        {isStudent && !currentUserReview && (
          <Button onClick={() => setIsFormOpen(true)}>Write a Review</Button>
        )}
      </div>

      {isFormOpen && (
        <ReviewForm
          onSubmit={handleSubmitReview}
          onCancel={() => setIsFormOpen(false)}
          initialRating={currentUserReview?.rating}
          initialReviewText={currentUserReview?.review_text}
        />
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white p-4 rounded-lg shadow border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{review.student_name}</span>
                </div>
                <p className="mt-2 text-gray-600">{review.review_text}</p>
              </div>
              {currentUserReview?.id === review.id && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFormOpen(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteReview}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
