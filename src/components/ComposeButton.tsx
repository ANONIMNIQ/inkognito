import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposeButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

const ComposeButton: React.FC<ComposeButtonProps> = ({ onClick, isVisible }) => {
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      className={cn(
        "fixed bottom-8 right-8 z-50 h-14 w-14 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out",
        "hover:scale-110 active:scale-95",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
      aria-label="Compose new confession"
    >
      <Pencil className="h-6 w-6" />
    </Button>
  );
};

export default ComposeButton;