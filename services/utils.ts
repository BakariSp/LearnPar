/**
 * Utility functions for handling URLs, locales, and other common operations
 */

/**
 * Gets the current locale from the pathname or returns the default
 * @param defaultLocale The default locale to return if no locale is found
 * @returns The current locale
 */
export const getCurrentLocale = (defaultLocale = 'en'): string => {
  if (typeof window === 'undefined') return defaultLocale;
  
  const path = window.location.pathname;
  const localeMatch = path.match(/^\/([a-z]{2})\//);
  
  return localeMatch && localeMatch[1] ? localeMatch[1] : defaultLocale;
};

/**
 * Generates a URL with the current locale prefix
 * @param path The path to prefix with locale
 * @returns The locale-prefixed URL
 */
export const getLocalizedUrl = (path: string): string => {
  const locale = getCurrentLocale();
  // Remove any leading slash from the path
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  return `/${locale}/${cleanPath}`;
};

/**
 * Gets the base URL of the application
 * @returns The base URL of the application
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

/**
 * Creates a full URL including origin and locale
 * @param path The path to include in the URL
 * @returns The complete URL with origin and locale
 */
export const getFullUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  const localizedPath = getLocalizedUrl(path);
  
  return `${baseUrl}${localizedPath}`;
}; 