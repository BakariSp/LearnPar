/**
 * Fallback implementation of canUseDom
 * This provides a simple implementation for environments where the original module cannot be loaded
 */
export default function canUseDom() {
  return !!(
    typeof window !== 'undefined' &&
    window.document &&
    window.document.createElement
  );
} 