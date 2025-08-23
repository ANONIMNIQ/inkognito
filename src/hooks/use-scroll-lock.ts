import { useEffect, useRef } from 'react';

export const useScrollLock = () => {
  const lockCountRef = useRef(0); // Track how many times scroll is locked

  const lockScroll = () => {
    lockCountRef.current += 1;
    if (lockCountRef.current === 1) { // Only apply styles if it's the first lock
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; // Prevent touch scrolling on mobile
    }
  };

  const unlockScroll = () => {
    lockCountRef.current = Math.max(0, lockCountRef.current - 1); // Decrement, but not below 0
    if (lockCountRef.current === 0) { // Only remove styles if all locks are released
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure scroll is unlocked on component unmount
      lockCountRef.current = 0;
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  return { lockScroll, unlockScroll };
};