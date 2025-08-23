import { useState, useEffect, RefObject } from 'react';

export const useInView = (ref: RefObject<HTMLElement>, options: IntersectionObserverInit = {}) => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(element); // Stop observing once it's in view.
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isInView;
};