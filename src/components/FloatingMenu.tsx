import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingMenuProps {}

const FloatingMenu: React.FC<FloatingMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For hover delay
  const isMobile = useIsMobile();

  const ANIMATION_DURATION_OPEN = 300; // Slower opening animation
  const ANIMATION_DURATION_CLOSE = 200; // Faster closing animation
  const HOVER_CLOSE_DELAY = 200; // Delay before closing on mouse leave

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const openMenu = () => {
    clearHoverTimeout();
    if (!isOpen) {
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  const closeMenu = () => {
    clearHoverTimeout();
    if (isOpen && !isClosing) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, ANIMATION_DURATION_CLOSE); // Use close duration for the state change
    }
  };

  const startCloseTimer = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      closeMenu();
    }, HOVER_CLOSE_DELAY);
  };

  const handleToggleClick = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        if (isOpen && !isClosing) {
          closeMenu();
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
  }, [isOpen, isClosing]); // Dependencies for useEffect

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
        onClick={handleToggleClick}
        onMouseEnter={openMenu} // Open on hover
        onMouseLeave={startCloseTimer} // Start close timer on leave
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

      {(isOpen || isClosing) && ( // Render menu if open or closing
        <div
          ref={menuRef}
          onMouseEnter={openMenu} // Keep open on hover over menu items
          onMouseLeave={startCloseTimer} // Start close timer on leave
          className="fixed top-20 left-8 z-40 flex flex-col space-y-2" // Adjusted top position for smaller button
        >
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant="secondary"
              className={cn(
                "w-auto justify-start rounded-full px-2 py-1 text-xs transition-colors", // Smaller buttons, text size
                "bg-gray-900/50 text-white hover:bg-gray-700/50", // Light mode
                "dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-700/50", // Dark mode
                "backdrop-blur-lg shadow-lg", // Translucency and shadow
                isClosing
                  ? "animate-slide-fade-out-left"
                  : "animate-slide-fade-in-left opacity-0"
              )}
              style={{
                animationDelay: isClosing
                  ? `0ms` // No cascade for closing, all at once
                  : `${item.delay}ms`,
                animationDuration: isClosing ? `${ANIMATION_DURATION_CLOSE}ms` : `${ANIMATION_DURATION_OPEN}ms`,
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