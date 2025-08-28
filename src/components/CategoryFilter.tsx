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
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 flex flex-wrap justify-center gap-1">
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
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-xs h-auto border-transparent transition-colors",
              text,
              darkText,
              isSelected
                ? [bg, darkBg] // Selected: solid, no hover change
                : [lightBg, darkLightBg, hoverBg, darkHoverBg] // Inactive: light, solid on hover
            )}
          >
            {category}
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;