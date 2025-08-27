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
    }, ANIMATION_DURATION); // No extra buffer for all-at-once close
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
          "fixed top-8 left-8 z-50 h-14 w-14 rounded-full bg-gray-900/50 dark:bg-gray-800/50 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out",
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
                "w-auto justify-start rounded-full px-4 py-2 transition-colors",
                "bg-gray-900/50 text-white hover:bg-gray-700/50", // Light mode
                "dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-700/50", // Dark mode
                "backdrop-blur-lg shadow-lg", // Translucency and shadow
                isClosing
                  ? "animate-slide-fade-out-top" // No opacity-0 here, animation handles it
                  : "animate-slide-fade-in-top opacity-0" // opacity-0 for initial state before fade-in
              )}
              style={{
                animationDelay: isClosing
                  ? `0ms` // No cascade for closing, all at once
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