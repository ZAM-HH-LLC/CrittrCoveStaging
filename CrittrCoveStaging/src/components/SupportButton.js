import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useToast } from './ToastProvider';
import { debugLog } from '../context/AuthContext';

const SupportButton = ({ 
  style, 
  buttonStyle, 
  showTitle = true, 
  title = "Support CrittrCove",
  subtitle = "Help us keep costs low for everyone",
  size = "default" // "default", "compact", "large"
}) => {
  const showToast = useToast();

  // Handle donate button press
  const handleDonatePress = () => {
    debugLog('MBA9902', 'Opening donate link from SupportButton component');
    // TODO: Replace this URL with your actual Stripe payment link once created
    // To create: Go to Stripe Dashboard > Products > Add Product > Create Payment Link
    // Set it as a donation with "Customer chooses price" option enabled
    const donateUrl = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_HERE';
    
    Linking.openURL(donateUrl).catch((err) => {
      debugLog('MBA9902', 'Error opening donate link:', err);
      showToast({
        message: 'Unable to open donation page. Please try again later.',
        type: 'error',
        duration: 3000
      });
    });
  };

  const getSizeStyles = () => {
    switch (size) {
      case "compact":
        return {
          button: styles.donateButtonCompact,
          icon: styles.donateButtonIconCompact,
          title: styles.donateButtonTitleCompact,
          subtitle: styles.donateButtonSubtitleCompact,
          iconSize: 20,
          arrowSize: 16
        };
      case "large":
        return {
          button: styles.donateButtonLarge,
          icon: styles.donateButtonIconLarge,
          title: styles.donateButtonTitleLarge,
          subtitle: styles.donateButtonSubtitleLarge,
          iconSize: 28,
          arrowSize: 24
        };
      default:
        return {
          button: styles.donateButton,
          icon: styles.donateButtonIcon,
          title: styles.donateButtonTitle,
          subtitle: styles.donateButtonSubtitle,
          iconSize: 24,
          arrowSize: 20
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.donateSection, style]}>
      {showTitle && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      <TouchableOpacity 
        style={[sizeStyles.button, buttonStyle]}
        onPress={handleDonatePress}
      >
        <View style={sizeStyles.icon}>
          <MaterialCommunityIcons 
            name="heart" 
            size={sizeStyles.iconSize} 
            color={theme.colors.background} 
          />
        </View>
        <View style={styles.donateButtonContent}>
          <Text style={sizeStyles.title}>Support CrittrCove</Text>
          <Text style={sizeStyles.subtitle}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons 
          name="open-in-new" 
          size={sizeStyles.arrowSize} 
          color={theme.colors.background} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  donateSection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts?.header?.fontFamily,
  },

  // Default size styles
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.mainColors.tertiary,
    padding: 16,
    borderRadius: 12,
    shadowColor: theme.colors.mainColors.tertiary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donateButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donateButtonContent: {
    flex: 1,
  },
  donateButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
    marginBottom: 2,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  donateButtonSubtitle: {
    fontSize: 12,
    color: theme.colors.background,
    opacity: 0.9,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },

  // Compact size styles
  donateButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.mainColors.tertiary,
    padding: 12,
    borderRadius: 8,
    shadowColor: theme.colors.mainColors.tertiary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  donateButtonIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  donateButtonTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.background,
    marginBottom: 1,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  donateButtonSubtitleCompact: {
    fontSize: 11,
    color: theme.colors.background,
    opacity: 0.9,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },

  // Large size styles
  donateButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.mainColors.tertiary,
    padding: 20,
    borderRadius: 16,
    shadowColor: theme.colors.mainColors.tertiary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  donateButtonIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  donateButtonTitleLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.background,
    marginBottom: 3,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  donateButtonSubtitleLarge: {
    fontSize: 14,
    color: theme.colors.background,
    opacity: 0.9,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
});

export default SupportButton; 