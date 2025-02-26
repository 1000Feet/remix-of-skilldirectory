import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChatContainer } from "./ChatContainer";
import type { EducatorProfile } from "./types";

interface ChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EducatorProfile;
}

export function ChatModal({ isOpen, onOpenChange, profile }: ChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col" aria-describedby="chat-dialog-description">
        <DialogHeader>
          <DialogTitle>Chat with {profile.name}'s AI Assistant</DialogTitle>
          <DialogDescription id="chat-dialog-description">
            Ask questions about {profile.name}'s services and expertise.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ChatContainer profile={profile} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
