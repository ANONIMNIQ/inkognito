// src/lib/category-colors.ts

export const categoryColorMap: Record<string, { 
    bg: string; // solid bg
    text: string; 
    darkBg: string; // solid dark bg
    darkText: string; 
    lightBg: string; // light bg
    darkLightBg: string; // light dark bg
}> = {
  "Любов и Секс": { 
      bg: "bg-category-love-sex", text: "text-gray-900", 
      darkBg: "dark:bg-category-love-sex", darkText: "dark:text-gray-900", 
      lightBg: "bg-category-love-sex-hover", 
      darkLightBg: "dark:bg-category-love-sex-hover" 
  },
  "Образование": { 
      bg: "bg-category-education", text: "text-gray-900", 
      darkBg: "dark:bg-category-education", darkText: "dark:text-gray-900", 
      lightBg: "bg-category-education-hover", 
      darkLightBg: "dark:bg-category-education-hover" 
  },
  "Семейство": { 
      bg: "bg-category-family", text: "text-gray-900", 
      darkBg: "dark:bg-category-family", darkText: "dark:text-gray-900", 
      lightBg: "bg-category-family-hover", 
      darkLightBg: "dark:bg-category-family-hover" 
  },
  "Спорт и Здраве": { 
      bg: "bg-category-sport-health", text: "text-gray-900", 
      darkBg: "dark:bg-category-sport-health", darkText: "dark:text-gray-900", 
      lightBg: "bg-category-sport-health-hover", 
      darkLightBg: "dark:bg-category-sport-health-hover" 
  },
  "Тийн": { 
      bg: "bg-category-teen", text: "text-gray-900", 
      darkBg: "dark:bg-category-teen", darkText: "dark:text-gray-900", 
      lightBg: "bg-category-teen-hover", 
      darkLightBg: "dark:bg-category-teen-hover" 
  },
  "Други": { 
      bg: "bg-category-neutral", text: "text-gray-900", 
      darkBg: "dark:bg-gray-700", darkText: "dark:text-gray-200", 
      lightBg: "bg-category-neutral-hover", 
      darkLightBg: "dark:bg-gray-600" 
  },
  "Всички": { 
      bg: "bg-gray-900", text: "text-white", 
      darkBg: "dark:bg-white", darkText: "dark:text-gray-900", 
      lightBg: "bg-gray-700", 
      darkLightBg: "dark:bg-gray-300" 
  },
};

export const getCategoryColors = (category: string) => {
  return categoryColorMap[category] || categoryColorMap["Други"]; // Default to 'Други' if category not found
};