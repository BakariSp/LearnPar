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
  
  try {
    const path = window.location.pathname;
    console.log('🔍 URL UTILS - Getting locale from path:', path);
    
    const localeMatch = path.match(/^\/([a-z]{2})\//);
    const locale = localeMatch && localeMatch[1] ? localeMatch[1] : defaultLocale;
    
    console.log('🔍 URL UTILS - Detected locale:', locale);
    return locale;
  } catch (e) {
    console.error('🔍 URL UTILS - Error getting locale:', e);
    return defaultLocale;
  }
};

/**
 * Generates a URL with the current locale prefix
 * @param path The path to prefix with locale
 * @returns The locale-prefixed URL
 */
export const getLocalizedUrl = (path: string): string => {
  try {
    const locale = getCurrentLocale();
    // Remove any leading slash from the path
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    const localizedUrl = `/${locale}/${cleanPath}`;
    console.log('🔍 URL UTILS - Generated localized URL:', localizedUrl);
    return localizedUrl;
  } catch (e) {
    console.error('🔍 URL UTILS - Error generating localized URL:', e);
    // Fallback to a basic locale/path format
    return `/en/${path.startsWith('/') ? path.substring(1) : path}`;
  }
};

/**
 * Gets the base URL of the application
 * @returns The base URL of the application
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const baseUrl = window.location.origin;
      console.log('🔍 URL UTILS - Base URL:', baseUrl);
      return baseUrl;
    } catch (e) {
      console.error('🔍 URL UTILS - Error getting base URL:', e);
      return '';
    }
  }
  return '';
};

/**
 * Creates a full URL including origin and locale
 * @param path The path to include in the URL
 * @returns The complete URL with origin and locale
 */
export const getFullUrl = (path: string): string => {
  try {
    const baseUrl = getBaseUrl();
    const localizedPath = getLocalizedUrl(path);
    
    const fullUrl = `${baseUrl}${localizedPath}`;
    console.log('🔍 URL UTILS - Generated full URL:', fullUrl);
    return fullUrl;
  } catch (e) {
    console.error('🔍 URL UTILS - Error generating full URL:', e);
    // Just return the path if something goes wrong
    return path;
  }
}; 