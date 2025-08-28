// src/lib/category-colors.ts

export const categoryColorMap: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  "Любов и Секс": { bg: "bg-category-love-sex", text: "text-gray-900", darkBg: "dark:bg-category-love-sex", darkText: "dark:text-gray-900" },
  "Образование": { bg: "bg-category-education", text: "text-gray-900", darkBg: "dark:bg-category-education", darkText: "dark:text-gray-900" },
  "Семейство": { bg: "bg-category-family", text: "text-gray-900", darkBg: "dark:bg-category-family", darkText: "dark:text-gray-900" },
  "Спорт и Здраве": { bg: "bg-category-sport-health", text: "text-gray-900", darkBg: "dark:bg-category-sport-health", darkText: "dark:text-gray-900" },
  "Тийн": { bg: "bg-category-teen", text: "text-gray-900", darkBg: "dark:bg-category-teen", darkText: "dark:text-gray-900" },
  "Други": { bg: "bg-category-neutral", text: "text-gray-900", darkBg: "dark:bg-gray-700", darkText: "dark:text-gray-200" },
  "Всички": { bg: "bg-category-neutral", text: "text-gray-900", darkBg: "dark:bg-gray-700", darkText: "dark:text-gray-200" },
};

export const getCategoryColors = (category: string) => {
  return categoryColorMap[category] || categoryColorMap["Други"]; // Default to 'Други' if category not found
};