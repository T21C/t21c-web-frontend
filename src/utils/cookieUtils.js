/**
 * Cookie utility functions for managing browser cookies
 */

/**
 * Set a cookie with the given name, value, and optional expiration days
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Number of days until expiration (default: 30)
 */
export const setCookie = (name, value, days = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
export const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

/**
 * Delete a cookie by name
 * @param {string} name - Cookie name
 */
export const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

/**
 * Check if a cookie exists and has a specific value
 * @param {string} name - Cookie name
 * @param {string} value - Expected value
 * @returns {boolean} - True if cookie exists and matches value
 */
export const hasCookieValue = (name, value) => {
  const cookieValue = getCookie(name);
  return cookieValue === value;
};
