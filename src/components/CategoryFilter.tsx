import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getCategoryColors } from "@/lib/category-colors";

export const categories = ["Всички", "Любов и Секс", "Образование", "Семейство", "Спорт и Здраве", "Тийн", "Други"];

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onSelectCategory }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="w-full max-w-2xl mx-auto mb-6">
        <Select value={selectedCategory} onValueChange={onSelectCategory}>
          <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700">
            <SelectValue placeholder="Избери категория" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700">
            {categories.map((category) => {
              const { bg, darkBg } = getCategoryColors(category);
              return (
                <SelectItem key={category} value={category} className="flex items-center">
                  <div className={cn("w-3 h-3 rounded-full mr-2", bg, darkBg)} />
                  <span>{category}</span> {/* Wrapped category text in span */}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 flex flex-wrap justify-center items-start gap-2">
      {categories.map((category) => {
        const { bg, lightBg, text, darkBg, darkLightBg, darkText, hoverBg, darkHoverBg } = getCategoryColors(category);
        const isSelected = selectedCategory === category;

        return (
          <div
            key={category}
            role="button"
            tabIndex={0}
            onClick={() => onSelectCategory(category)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectCategory(category)}
            className="flex flex-col items-center cursor-pointer"
          >
            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-xs h-auto border-transparent transition-colors shadow",
                text,
                darkText,
                isSelected
                  ? [bg, darkBg] // Selected: solid, no hover change
                  : [lightBg, darkLightBg, hoverBg, darkHoverBg] // Inactive: light, solid on hover
              )}
            >
              {category}
            </div>
            <div className="h-3 flex items-center justify-center pt-1"> {/* Container for the arrow */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={cn(
                  "w-2.5 h-2.5 text-gray-900 dark:text-white transition-all duration-300",
                  isSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
              >
                <path d="M12 8l6 6H6l6-6z" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;