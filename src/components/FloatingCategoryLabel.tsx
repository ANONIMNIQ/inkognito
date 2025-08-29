import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCategoryColors } from '@/lib/category-colors';
import { cn } from '@/lib/utils';

interface FloatingCategoryLabelProps {
  category: string;
}

const FloatingCategoryLabel: React.FC<FloatingCategoryLabelProps> = ({ category }) => {
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = useState(false);
  const [displayCategory, setDisplayCategory] = useState(category);

  useEffect(() => {
    // If the category changes, fade out, update, then fade in
    if (category !== displayCategory) {
      setIsVisible(false);
      setTimeout(() => {
        setDisplayCategory(category);
        setIsVisible(true);
      }, 300); // duration of fade out
    } else if (!isVisible) {
      // If it's the first render, just make it visible
      setIsVisible(true);
    }
  }, [category, displayCategory, isVisible]);

  if (isMobile) {
    return null;
  }

  const { floatingText } = getCategoryColors(displayCategory);

  return (
    <div
      className={cn(
        'fixed bottom-4 left-[calc(50%+24rem+1rem)] z-0 transform -rotate-90 origin-bottom-left',
        'transition-all duration-500 ease-in-out', // Updated for smooth transform
        'pointer-events-none',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5' // Added slide effect
      )}
    >
      <h1
        className={cn(
          'text-6xl font-extrabold uppercase tracking-widest whitespace-nowrap',
          'opacity-40 dark:opacity-20',
          floatingText
        )}
      >
        {displayCategory}
      </h1>
    </div>
  );
};

export default FloatingCategoryLabel;