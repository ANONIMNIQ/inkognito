import { useEffect, useRef } from 'react';

export const useScrollLock = () => {
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lockScroll = (durationMs: number = 0) => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none'; // Prevent touch scrolling on mobile

    if (durationMs > 0) {
      lockTimeoutRef.current = setTimeout(() => {
        unlockScroll();
      }, durationMs);
    }
  };

  const unlockScroll = () => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unlockScroll();
    };
  }, []);

  return { lockScroll, unlockScroll };
};