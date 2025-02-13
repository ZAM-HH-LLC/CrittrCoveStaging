// theme.js
import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  // the regular and header fonts are the fonts used in the app
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'PlayfairDisplay',
    },
    header: {
      fontFamily: 'Futura',
    }
  },
  typography: {
    header: {
      fontFamily: 'Futura',
    },
    body: {
      fontFamily: 'PlayfairDisplay',
    }
  },
  colors: {
    ...DefaultTheme.colors,
    mainColors: {
      main: '#6A6C51',
      secondary: '#5D6C51',
      tertiary: '#516C53',
      quaternary: '#516C61',
      quinary: '#516A6C',
      senary: '#515D6C',
    },
    primary: '#6A6C51', // Primary color for buttons and header background
    secondary: '#516C61',
    background: '#f6f6f6',
    backgroundContrast: '#F6F3FC',
    calendarColor: '#A99E6B', // Olive (yellowish) color for calendar (partially unavailable, available)
    calendarColorYellowBrown: '#8A8C6D', // Yellow-brown color for calendar (booked today, but time is available)
    text: 'black', // Text color for text bodies
    whiteText: 'white', // Text color for headers and buttons
    placeHolderText: '#A9A9A9',
    accent: '#03dac4', // Accent color if needed
    error: '#B00020',
    surface: '#f6f6f6',
    border: '#6A6C51',
    inputBackground: '#f6f6f6',
    receivedMessage: '#e7eae6',
    // headerBorder: '#e0e0e0',
    danger: '#A52A2A',
  },
  fontSizes: {
    small: 12,
    smallMedium: 14,
    medium: 16,
    mediumLarge: 18,
    large: 20,
    largeLarge: 24,
    extraLarge: 26,
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
};