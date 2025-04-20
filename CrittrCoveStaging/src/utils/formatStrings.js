/**
 * Capitalizes the first letter of each word in a string, with all other letters lowercase
 * @param {string} str - The string to format
 * @returns {string} - Formatted string with first letter of each word capitalized
 * 
 * Examples:
 * 1. "DOG" -> "Dog"
 * 2. "HouSE CAt" -> "House Cat"
 */
export const capitalizeWords = (str) => {
  if (!str) return str;
  
  return str
    .split(' ')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
};
