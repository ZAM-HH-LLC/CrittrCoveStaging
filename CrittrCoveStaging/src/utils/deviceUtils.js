import { Platform } from 'react-native';

/**
 * Detects if the device supports hover interactions properly
 * Returns false for touch devices (mobile, tablets) even when on web browsers
 */
export const supportsHover = () => {
  // Return false for React Native app
  if (Platform.OS !== 'web') {
    return false;
  }

  // For web, check if device supports hover
  if (typeof window !== 'undefined') {
    // Check for touch capability
    const hasTouchScreen = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 || 
                          navigator.msMaxTouchPoints > 0;
    
    // Use CSS media query to check hover capability
    const supportsHoverQuery = window.matchMedia('(hover: hover)').matches;
    
    // Return true only if device supports hover AND is not primarily a touch device
    return supportsHoverQuery && !hasTouchScreen;
  }

  return false;
};

/**
 * Hook to get hover support status
 */
export const useHoverSupport = () => {
  return supportsHover();
}; 