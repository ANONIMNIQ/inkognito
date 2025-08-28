import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import FullScreenMenuContent from "./FullScreenMenu"; // Import the new component
import { Sheet, SheetTrigger } from "@/components/ui/sheet"; // Import Sheet and SheetTrigger

interface FloatingMenuProps {}

const FloatingMenu: React.FC<FloatingMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return null; // Don't render on mobile
  }

  const menuItems = [
    { label: "ЗА НАС" },
    { label: "ПОВЕРИТЕЛНОСТ" },
    { label: "ПРАВИЛА И УСЛОВИЯ" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          className={cn(
            "fixed top-8 left-8 z-50 h-10 w-10 rounded-full bg-gray-900/50 dark:bg-gray-800/50 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out",
            "hover:scale-110 active:scale-95",
            "text-white dark:text-gray-200 hover:bg-gray-700/50 dark:hover:bg-gray-700/50"
          )}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <X className="h-5 w-5 transition-transform duration-300" />
          ) : (
            <Menu className="h-5 w-5 transition-transform duration-300" />
          )}
        </Button>
      </SheetTrigger>
      <FullScreenMenuContent menuItems={menuItems} />
    </Sheet>
  );
};

export default FloatingMenu;