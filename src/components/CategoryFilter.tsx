import React from "react";
import { Button } from "@/components/ui/button";
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
        const { bg, text, darkBg, darkText, hoverBg, darkHoverBg } = getCategoryColors(category);
        return (
          <Button
            key={category}
            variant="ghost" // Use a base variant with minimal styles to avoid conflicts
            onClick={() => onSelectCategory(category)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-colors h-auto",
              selectedCategory === category
                ? cn(bg, text, darkBg, darkText, hoverBg, darkHoverBg) // Active state with its own hover effect
                : cn(
                    "border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300",
                    hoverBg, // Apply colored hover background
                    darkHoverBg // Apply colored dark hover background
                  )
            )}
          >
            {category}
          </Button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;