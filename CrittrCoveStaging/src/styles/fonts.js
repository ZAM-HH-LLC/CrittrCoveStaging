import * as Font from 'expo-font';
import { Platform } from 'react-native';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

// Font configuration
export const customFonts = {
  'PlayfairDisplay': PlayfairDisplay_400Regular,
  'PlayfairDisplay-Medium': PlayfairDisplay_500Medium,
  'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
  'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
};

// Load fonts function
export const loadFonts = async () => {
  try {
    await Font.loadAsync(customFonts);
    return true;
  } catch (error) {
    console.warn('Error loading fonts:', error);
    return false;
  }
};

// Consistent header font across all platforms (Futura-like)
const getHeaderFont = () => {
  return Platform.select({
    ios: 'Avenir-Heavy', // Avenir is similar to Futura and available on iOS
    android: 'sans-serif-medium', // Clean sans-serif for Android
    web: 'Avenir, "Helvetica Neue", Arial, sans-serif', // Avenir with fallbacks for web
    default: 'sans-serif'
  });
};

// Font family names for use in styles - standardized across all platforms
export const fontFamilies = {
  regular: 'PlayfairDisplay',
  medium: 'PlayfairDisplay-Medium',
  semiBold: 'PlayfairDisplay-SemiBold',
  bold: 'PlayfairDisplay-Bold',
  header: getHeaderFont(), // Consistent Futura-like font across platforms
}; 