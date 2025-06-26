import * as Font from 'expo-font';
import { Platform } from 'react-native';

// Platform-specific font configurations
const getFontConfig = () => {
  return Platform.select({
    ios: {
      regular: 'System', // iOS System font (SF Pro)
      medium: 'System', // iOS System font medium weight
      header: 'Avenir-Heavy', // Distinctive header font
    },
    android: {
      regular: 'Roboto', // Android default
      medium: 'Roboto', // Use same font with different weights
      header: 'Roboto', // Use Roboto for headers too, with bold weight
    },
    web: {
      regular: 'PlayfairDisplay', // DO NOT CHANGE
      medium: 'PlayfairDisplay-Medium', // DO NOT CHANGE
      header: 'Futura', // DO NOT CHANGE
    },
    default: {
      regular: 'System',
      medium: 'System', 
      header: 'System',
    }
  });
};

// Load fonts function - no custom fonts needed since we're using system fonts
export const loadFonts = async () => {
  try {
    // No custom fonts to load - using system fonts for better performance and consistency
    return true;
  } catch (error) {
    console.warn('Error in font loading process:', error);
    return false;
  }
};

// Font family names for use in styles - optimized for each platform
export const fontFamilies = getFontConfig();

// Font weight configurations for cross-platform consistency
export const fontWeights = {
  regular: Platform.select({
    ios: '400',
    android: 'normal',
    web: '400',
    default: 'normal'
  }),
  medium: Platform.select({
    ios: '500',
    android: '500',
    web: '500', 
    default: '500'
  }),
  semiBold: Platform.select({
    ios: '600',
    android: '600',
    web: '600',
    default: '600'
  }),
  bold: Platform.select({
    ios: '700',
    android: 'bold',
    web: '700',
    default: 'bold'
  }),
  header: Platform.select({
    ios: '800',
    android: '900',
    web: '700',
    default: 'bold'
  })
};
