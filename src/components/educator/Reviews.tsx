import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReviews } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

interface ReviewsProps {
  educatorId: string;
}

export const Reviews = ({ educatorId }: ReviewsProps) => {
  const { user } = useAuth();
  const { reviews, userReview, averageRating, loading, addReview, updateReview, deleteReview, isStudent } = useReviews(educatorId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 5);
  const [reviewText, setReviewText] = useState(userReview?.review_text || '');
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (userReview) {
      await updateReview(rating, reviewText);
    } else {
      await addReview(rating, reviewText);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    await deleteReview();
    setIsDialogOpen(false);
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(null) : undefined}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${
              star <= (hoveredRating || rating) ? 'text-yellow-400' : 'text-gray-300'
            }`}
            disabled={!interactive}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-400 fill-current" />
            <span className="text-2xl font-bold">{averageRating || 0}</span>
          </div>
          <span className="text-gray-600">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
        </div>
        
        {user && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant={userReview ? "outline" : "default"}>
                {userReview ? 'Edit Review' : 'Write Review'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{userReview ? 'Edit Your Review' : 'Write a Review'}</DialogTitle>
                <DialogDescription>
                  Share your experience with this educator
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex justify-center">
                  {renderStars(rating, true)}
                </div>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your review here..."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  {userReview && (
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  )}
                  <Button onClick={handleSubmit}>
                    {userReview ? 'Update' : 'Submit'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{review.student_name || 'Anonymous'}</span>
                {renderStars(review.rating)}
              </div>
              <span className="text-sm text-gray-500">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            {review.review_text && (
              <p className="text-gray-700">{review.review_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
