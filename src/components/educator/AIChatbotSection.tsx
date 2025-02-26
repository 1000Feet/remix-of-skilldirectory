import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AIChatbotSectionProps {
  chatbot: string;
  onChange: (value: string) => void;
}

export function AIChatbotSection({ chatbot, onChange }: AIChatbotSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI Chatbot Knowledge Base</Label>
        <Textarea
          placeholder="Enter chatbot knowledge base content..."
          value={chatbot || ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[150px] resize-y"
        />
      </div>
    </div>
  );
}
