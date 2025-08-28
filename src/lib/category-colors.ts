// src/lib/category-colors.ts

export const categoryColorMap: Record<string, { 
    bg: string;
    lightBg: string;
    text: string; 
    darkBg: string;
    darkLightBg: string;
    darkText: string; 
}> = {
  "Любов и Секс": { 
      bg: "bg-category-love-sex",
      lightBg: "bg-category-love-sex-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-love-sex",
      darkLightBg: "dark:bg-category-love-sex-light",
      darkText: "dark:text-gray-900", 
  },
  "Образование": { 
      bg: "bg-category-education",
      lightBg: "bg-category-education-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-education",
      darkLightBg: "dark:bg-category-education-light",
      darkText: "dark:text-gray-900", 
  },
  "Семейство": { 
      bg: "bg-category-family",
      lightBg: "bg-category-family-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-family",
      darkLightBg: "dark:bg-category-family-light",
      darkText: "dark:text-gray-900", 
  },
  "Спорт и Здраве": { 
      bg: "bg-category-sport-health",
      lightBg: "bg-category-sport-health-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-sport-health",
      darkLightBg: "dark:bg-category-sport-health-light",
      darkText: "dark:text-gray-900", 
  },
  "Тийн": { 
      bg: "bg-category-teen",
      lightBg: "bg-category-teen-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-teen",
      darkLightBg: "dark:bg-category-teen-light",
      darkText: "dark:text-gray-900", 
  },
  "Други": { 
      bg: "bg-category-neutral",
      lightBg: "bg-category-neutral-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-gray-700",
      darkLightBg: "dark:bg-gray-600",
      darkText: "dark:text-gray-200", 
  },
  "Всички": { 
      bg: "bg-gray-900",
      lightBg: "bg-gray-700",
      text: "text-white", 
      darkBg: "dark:bg-white",
      darkLightBg: "dark:bg-gray-300",
      darkText: "dark:text-gray-900", 
  },
};

export const getCategoryColors = (category: string) => {
  return categoryColorMap[category] || categoryColorMap["Други"];
};