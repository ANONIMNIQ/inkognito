import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingMenuProps {}

const FloatingMenu: React.FC<FloatingMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the sub-menu container
  const buttonRef = useRef<HTMLButtonElement>(null); // Ref for the main toggle button
  const isMobile = useIsMobile();

  const ANIMATION_DURATION_OPEN = 300; // Slower opening animation
  const ANIMATION_DURATION_CLOSE = 200; // Faster closing animation

  // Function to open the menu (used by click and hover)
  const openMenu = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  // Function to close the menu (used by click and outside click)
  const closeMenu = () => {
    if (isOpen && !isClosing) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, ANIMATION_DURATION_CLOSE);
    }
  };

  // Handles click on the main button (toggle open/close)
  const handleToggleClick = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside both the main button and the menu items
      if (
        isOpen &&
        !isClosing &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
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
        // No onMouseLeave here, menu stays open after hover
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
          // No onMouseEnter/onMouseLeave here, menu stays open once activated
          className="fixed top-20 left-8 z-40 flex flex-col space-y-1.5"
        >
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant="secondary"
              className={cn(
                "inline-flex w-fit justify-start items-center rounded-full px-3 py-1.5 text-[0.7rem] transition-colors min-w-0", // Adjusted padding to px-3 py-1.5
                "bg-gray-900/50 text-white hover:bg-gray-700/50",
                "dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-700/50",
                "backdrop-blur-lg shadow-lg",
                isClosing
                  ? "animate-slide-fade-out-left"
                  : "animate-slide-fade-in-left opacity-0"
              )}
              style={{
                animationDelay: isClosing
                  ? `0ms`
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