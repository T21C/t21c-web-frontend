/**
 * Local storage utility (replaces cookie-based preference storage).
 * Same API as before for compatibility; values persist until cleared.
 *
 * @param {string} name - Key name
 * @param {string} value - Value
 * @param {number} days - Ignored; kept for API compatibility
 */
export const setCookie = (name, value, days = 30) => {
  try {
    localStorage.setItem(name, value);
  } catch (e) {
    console.warn('Failed to set storage:', e);
  }
};

/**
 * Get a value by key
 * @param {string} name - Key name
 * @returns {string|null} - Value or null if not found
 */
export const getCookie = (name) => {
  try {
    return localStorage.getItem(name);
  } catch (e) {
    return null;
  }
};

/**
 * Delete a key
 * @param {string} name - Key name
 */
export const deleteCookie = (name) => {
  try {
    localStorage.removeItem(name);
  } catch (e) {
    console.warn('Failed to remove storage:', e);
  }
};

/**
 * Check if key exists and has a specific value
 * @param {string} name - Key name
 * @param {string} value - Expected value
 * @returns {boolean}
 */
export const hasCookieValue = (name, value) => {
  const stored = getCookie(name);
  return stored === value;
};
