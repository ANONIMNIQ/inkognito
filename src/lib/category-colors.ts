// src/lib/category-colors.ts

export const categoryColorMap: Record<string, { 
    bg: string;
    lightBg: string;
    text: string; 
    darkBg: string;
    darkLightBg: string;
    darkText: string; 
    hoverBg: string;
    darkHoverBg: string;
    hoverLightBg: string;
    darkHoverLightBg: string;
    floatingText: string;
}> = {
  "Любов и Секс": { 
      bg: "bg-category-love-sex",
      lightBg: "bg-category-love-sex-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-love-sex",
      darkLightBg: "dark:bg-category-love-sex-light",
      darkText: "dark:text-gray-900", 
      hoverBg: "hover:bg-category-love-sex",
      darkHoverBg: "dark:hover:bg-category-love-sex",
      hoverLightBg: "hover:bg-category-love-sex-light",
      darkHoverLightBg: "dark:hover:bg-category-love-sex-light",
      floatingText: "text-pink-300",
  },
  "Образование": { 
      bg: "bg-category-education",
      lightBg: "bg-category-education-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-education",
      darkLightBg: "dark:bg-category-education-light",
      darkText: "dark:text-gray-900", 
      hoverBg: "hover:bg-category-education",
      darkHoverBg: "dark:hover:bg-category-education",
      hoverLightBg: "hover:bg-category-education-light",
      darkHoverLightBg: "dark:hover:bg-category-education-light",
      floatingText: "text-yellow-400",
  },
  "Семейство": { 
      bg: "bg-category-family",
      lightBg: "bg-category-family-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-family",
      darkLightBg: "dark:bg-category-family-light",
      darkText: "dark:text-gray-900", 
      hoverBg: "hover:bg-category-family",
      darkHoverBg: "dark:hover:bg-category-family",
      hoverLightBg: "hover:bg-category-family-light",
      darkHoverLightBg: "dark:hover:bg-category-family-light",
      floatingText: "text-teal-300",
  },
  "Спорт и Здраве": { 
      bg: "bg-category-sport-health",
      lightBg: "bg-category-sport-health-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-sport-health",
      darkLightBg: "dark:bg-category-sport-health-light",
      darkText: "dark:text-gray-900", 
      hoverBg: "hover:bg-category-sport-health",
      darkHoverBg: "dark:hover:bg-category-sport-health",
      hoverLightBg: "hover:bg-category-sport-health-light",
      darkHoverLightBg: "dark:hover:bg-category-sport-health-light",
      floatingText: "text-green-400",
  },
  "Тийн": { 
      bg: "bg-category-teen",
      lightBg: "bg-category-teen-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-category-teen",
      darkLightBg: "dark:bg-category-teen-light",
      darkText: "dark:text-gray-900", 
      hoverBg: "hover:bg-category-teen",
      darkHoverBg: "dark:hover:bg-category-teen",
      hoverLightBg: "hover:bg-category-teen-light",
      darkHoverLightBg: "dark:hover:bg-category-teen-light",
      floatingText: "text-purple-300",
  },
  "Други": { 
      bg: "bg-category-neutral",
      lightBg: "bg-category-neutral-light",
      text: "text-gray-900", 
      darkBg: "dark:bg-gray-700",
      darkLightBg: "dark:bg-gray-600",
      darkText: "dark:text-gray-200", 
      hoverBg: "hover:bg-category-neutral",
      darkHoverBg: "dark:hover:bg-gray-700",
      hoverLightBg: "hover:bg-category-neutral-light",
      darkHoverLightBg: "dark:hover:bg-gray-600",
      floatingText: "text-gray-400",
  },
  "Всички": { 
      bg: "bg-gray-900",
      lightBg: "bg-gray-700",
      text: "text-white", 
      darkBg: "dark:bg-white",
      darkLightBg: "dark:bg-gray-300",
      darkText: "dark:text-gray-900", 
      hoverBg: "hover:bg-gray-900",
      darkHoverBg: "dark:hover:bg-white",
      hoverLightBg: "hover:bg-gray-700",
      darkHoverLightBg: "dark:hover:bg-gray-300",
      floatingText: "text-transparent",
  },
};

export const getCategoryColors = (category: string) => {
  return categoryColorMap[category] || categoryColorMap["Други"];
};