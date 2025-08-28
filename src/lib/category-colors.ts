// src/lib/category-colors.ts

export const categoryColorMap: Record<string, { bg: string; text: string; darkBg: string; darkText: string; hoverBg: string; darkHoverBg: string; }> = {
  "Любов и Секс": { bg: "bg-category-love-sex", text: "text-gray-900", darkBg: "dark:bg-category-love-sex", darkText: "dark:text-gray-900", hoverBg: "hover:bg-category-love-sex-hover", darkHoverBg: "dark:hover:bg-category-love-sex-hover" },
  "Образование": { bg: "bg-category-education", text: "text-gray-900", darkBg: "dark:bg-category-education", darkText: "dark:text-gray-900", hoverBg: "hover:bg-category-education-hover", darkHoverBg: "dark:hover:bg-category-education-hover" },
  "Семейство": { bg: "bg-category-family", text: "text-gray-900", darkBg: "dark:bg-category-family", darkText: "dark:text-gray-900", hoverBg: "hover:bg-category-family-hover", darkHoverBg: "dark:hover:bg-category-family-hover" },
  "Спорт и Здраве": { bg: "bg-category-sport-health", text: "text-gray-900", darkBg: "dark:bg-category-sport-health", darkText: "dark:text-gray-900", hoverBg: "hover:bg-category-sport-health-hover", darkHoverBg: "dark:hover:bg-category-sport-health-hover" },
  "Тийн": { bg: "bg-category-teen", text: "text-gray-900", darkBg: "dark:bg-category-teen", darkText: "dark:text-gray-900", hoverBg: "hover:bg-category-teen-hover", darkHoverBg: "dark:hover:bg-category-teen-hover" },
  "Други": { bg: "bg-category-neutral", text: "text-gray-900", darkBg: "dark:bg-gray-700", darkText: "dark:text-gray-200", hoverBg: "hover:bg-category-neutral-hover", darkHoverBg: "dark:hover:bg-gray-600" },
  "Всички": { bg: "bg-gray-900", text: "text-white", darkBg: "dark:bg-white", darkText: "dark:text-gray-900", hoverBg: "hover:bg-gray-700", darkHoverBg: "dark:hover:bg-gray-300" },
};

export const getCategoryColors = (category: string) => {
  return categoryColorMap[category] || categoryColorMap["Други"]; // Default to 'Други' if category not found
};