
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatContainer } from "./ChatContainer";

interface ChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatModal({ isOpen, onOpenChange }: ChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat with AI Assistant</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ChatContainer />
        </div>
      </DialogContent>
    </Dialog>
  );
}
