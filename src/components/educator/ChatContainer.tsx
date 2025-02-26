import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getChatResponse } from "@/integrations/gemini/client";
import type { EducatorProfile } from "./types";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContainerProps {
  profile: EducatorProfile;
}

const getSuggestedQuestions = (profile: EducatorProfile) => [
  "What services do you offer?",
  "Where are you located?",
  profile.website ? "Do you have a website?" : null,
  (profile.facebook_url || profile.instagram_url) ? "How can I follow you on social media?" : null,
  "How can I contact you?",
].filter(Boolean);

const WELCOME_MESSAGE = (profile: EducatorProfile) => `Hi! I'm Skill Directory, ${profile.name}'s AI assistant. I can help you learn more about their educational services, expertise, and teaching approach. Feel free to ask me anything about their offerings!\n\nHere are some questions you might be interested in:\n${getSuggestedQuestions(profile).map(q => `• ${q}`).join('\n')}`;

export function ChatContainer({ profile }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: WELCOME_MESSAGE(profile) 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    try {
      setLoading(true);
      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const response = await getChatResponse(input, profile);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response from AI');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try asking your question again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[80%] p-4 rounded-lg",
                message.role === 'user' 
                  ? "ml-auto bg-primary text-primary-foreground" 
                  : "bg-white border shadow-sm"
              )}
            >
              {message.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about the educator's services..."
            className="pr-20"
          />
          <Button 
            type="submit" 
            size="sm" 
            className="absolute right-1 top-1"
            disabled={loading}
          >
            {loading ? (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              </div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
