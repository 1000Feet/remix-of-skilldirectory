import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SocialMediaSectionProps {
  facebook: string;
  instagram: string;
  youtube?: string;
  onChange: (values: { facebook: string; instagram: string; youtube?: string }) => void;
}

export function SocialMediaSection({ facebook, instagram, youtube, onChange }: SocialMediaSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Social Media</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Facebook URL"
            value={facebook}
            onChange={(e) => onChange({ facebook: e.target.value, instagram, youtube })}
          />
          <Input
            placeholder="Instagram URL"
            value={instagram}
            onChange={(e) => onChange({ facebook, instagram: e.target.value, youtube })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Introduction Video</Label>
        <Input
          placeholder="YouTube Video URL"
          value={youtube}
          onChange={(e) => onChange({ facebook, instagram, youtube: e.target.value })}
        />
        <p className="text-sm text-gray-600">Add the URL of your introductory video from YouTube</p>
      </div>
    </div>
  );
}
