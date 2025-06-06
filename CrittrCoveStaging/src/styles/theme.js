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
    medium: {
      fontFamily: 'PlayfairDisplay-Medium',
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
      main: '#6A6C51', // #6A6C51
      secondary: '#5D6C51', // #5D6C51
      tertiary: '#516C53', // #516C53
      quaternary: '#516C61', // #516C61
      quinary: '#516A6C', // #516A6C
      senary: '#515D6C', // #515D6C
    },
    proDashboard: {
      main: '#F0F9E5', // #F0F9E5
      secondary: '#E7F3F8', // #E7F3F8
      tertiary: '#FEF0DA', // #FEF0DA
      quaternary: '#E1E2DB', // #E1E2DB
    },
    mybookings: {
      main: '#FFF7ED', // #FFF7ED Pending indicator background
      secondary: '#EA580E', // #EA580E Pending indicator text
      tertiary: '#6A6C51', // #6A6C51
      ownerName: '#4B4C3B', // #4B4C3B Owner name text color
      metaText: '#959885', // #959885 Date/time/service text color
      confirmedBg: '#E8E9E2', // #E8E9E2 Confirmed button background
      confirmedText: '#898974', // #898974 Confirmed button text
      completedBg: '#F5F5F4', // #F5F5F4 Completed button background
      completedText: '#898983', // #898983 Completed button text
      searchBar: 'rgb(183, 183, 183)', // Search bar text color
    },
    primary: '#6A6C51', // #6A6C51
    secondary: '#516C61', // #516C61
    background: '#f6f6f6', // #f6f6f6
    backgroundContrast: '#F6F3FC', // #F6F3FC
    calendarColor: '#A99E6B', // #A99E6B
    calendarColorYellowBrown: '#8A8C6D', // #8A8C6D
    text: 'black', // #000000
    whiteText: 'white', // #FFFFFF
    placeHolderText: '#A9A9A9', // #A9A9A9
    accent: '#03dac4', // #03dac4
    error: '#B00020', // #B00020
    warning: '#FFA726', // Orange warning color
    info: '#29B6F6', // Light blue info color
    surface: '#F9FAFB', // #F9FAFB
    surfaceContrast: '#FFFFFF', // #FFFFFF
    border: 'rgb(183, 183, 183)', // 'rgb(183, 183, 183)'
    bgColorModern: 'rgb(239, 239, 239)',
    modernBorder: '#E0E0E0', // #E0E0E0
    inputBackground: '#f6f6f6', // #f6f6f6
    receivedMessage: '#e7eae6', // #e7eae6
    danger: '#A52A2A', // #A52A2A
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