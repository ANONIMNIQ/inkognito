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
    if (category === 'Всички') {
      setIsVisible(false);
    } else {
      // If the category changes, fade out, update, then fade in
      if (category !== displayCategory) {
        setIsVisible(false);
        setTimeout(() => {
          setDisplayCategory(category);
          setIsVisible(true);
        }, 300); // duration of fade out
      } else {
        // If it's the first render with a valid category
        setIsVisible(true);
      }
    }
  }, [category, displayCategory]);

  if (isMobile) {
    return null;
  }

  const { floatingText } = getCategoryColors(displayCategory);

  return (
    <div
      className={cn(
        'fixed bottom-24 right-[calc((100vw-48rem)/2-2rem)] z-0 transform -rotate-90 origin-bottom-right',
        'transition-opacity duration-300 ease-in-out',
        'pointer-events-none',
        isVisible ? 'opacity-100' : 'opacity-0'
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