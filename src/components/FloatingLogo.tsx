import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const SCROLL_THRESHOLD = 200;

interface FloatingLogoProps {
  onClick: () => void;
}

const FloatingLogo: React.FC<FloatingLogoProps> = ({ onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (isMobile) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed top-8 right-8 z-50 h-12 w-12 transition-all duration-300 ease-in-out cursor-pointer',
        'hover:scale-110 active:scale-95',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-16 pointer-events-none'
      )}
      aria-label="Go to homepage"
    >
      <img src="/images/logo2.png" alt="Floating Logo" className="h-full w-full object-contain dark:invert" />
    </button>
  );
};

export default FloatingLogo;