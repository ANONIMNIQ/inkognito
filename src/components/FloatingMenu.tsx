import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingMenuProps {}

const FloatingMenu: React.FC<FloatingMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // New state for closing animation
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const ANIMATION_DURATION = 300; // Match Tailwind animation duration

  // Close menu when clicking outside or on the X button
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        if (isOpen && !isClosing) { // Only trigger close if currently open and not already closing
          handleCloseMenu();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isClosing]);

  const handleToggleMenu = () => {
    if (isOpen) {
      handleCloseMenu();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, ANIMATION_DURATION + 200); // Add a small buffer for cascade
  };

  if (isMobile) {
    return null; // Don't render on mobile
  }

  const menuItems = [
    { label: "ЗА НАС", delay: 0 },
    { label: "ПОВЕРИТЕЛНОСТ", delay: 100 },
    { label: "ПРАВИЛА И УСЛОВИЯ", delay: 200 },
  ];

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={handleToggleMenu}
        variant="secondary"
        className={cn(
          "fixed top-8 left-8 z-50 h-14 w-14 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out",
          "hover:scale-110 active:scale-95"
        )}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300" />
        ) : (
          <Menu className="h-6 w-6 transition-transform duration-300" />
        )}
      </Button>

      {(isOpen || isClosing) && ( // Render menu if open or closing
        <div
          ref={menuRef}
          className="fixed top-24 left-8 z-40 flex flex-col space-y-2"
        >
          {menuItems.map((item, index) => (
            <Button
              key={item.label}
              variant="secondary"
              className={cn(
                "w-auto justify-start rounded-full bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-300", // Darker buttons
                isClosing
                  ? "animate-slide-fade-out-top opacity-0"
                  : "animate-slide-fade-in-top opacity-0"
              )}
              style={{
                animationDelay: isClosing
                  ? `${(menuItems.length - 1 - index) * 100}ms` // Reverse delay for closing
                  : `${item.delay}ms`,
                animationDuration: `${ANIMATION_DURATION}ms`,
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </>
  );
};

export default FloatingMenu;