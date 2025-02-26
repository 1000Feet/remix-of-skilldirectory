
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChatContainer } from "./ChatContainer";

interface ChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatModal({ isOpen, onOpenChange }: ChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col" aria-describedby="chat-dialog-description">
        <DialogHeader>
          <DialogTitle>Chat with AI Assistant</DialogTitle>
          <DialogDescription id="chat-dialog-description">
            Ask questions and get helpful responses from our AI assistant.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ChatContainer />
        </div>
      </DialogContent>
    </Dialog>
  );
}
