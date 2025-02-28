import { Star } from 'lucide-react';

interface RatingDisplayProps {
  rating: number;
  reviewCount: number;
  showCount?: boolean;
  className?: string;
}

export const RatingDisplay = ({ rating, reviewCount, showCount = true, className = '' }: RatingDisplayProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center">
        <Star className="h-4 w-4 text-yellow-400 fill-current" />
        <span className="ml-1 text-sm font-medium">{rating || 0}</span>
      </div>
      {showCount && (
        <span className="text-sm text-gray-500">
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};
