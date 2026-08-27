/**
 * Determines the text direction (RTL or LTR) based on content.
 * @param {string} text - The text to check.
 * @returns {string} - 'rtl' or 'ltr'.
 */
export const getDirection = (text = "") => {
  if (!text) return "ltr";
  const rtlRegex = /[\u0591-\u07FF\u0600-\u06FF]/;
  return rtlRegex.test(text) ? "rtl" : "ltr";
};

/**
 * Generates a random 9-digit numeric ID.
 * @returns {string} - A random 9-digit ID.
 */
export const generateID = () =>
  String(Math.floor(100000000 + Math.random() * 900000000));

/**
 * Truncates text to a specified length.
 * @param {string} text - The text to truncate.
 * @param {number} length - Maximum length.
 * @returns {string} - Truncated text.
 */
export const truncateText = (text, length = 100) => {
  if (!text || text.length <= length) return text;
  return text.slice(0, length) + "...";
};

/**
 * Formats a date string (placeholder for actual implementation).
 * @param {string|Date} date - The date to format.
 * @returns {string} - Formatted date string.
 */
export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString();
};
