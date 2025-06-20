/**
 * SupportButton Component
 * 
 * A reusable button component that opens a modal with donation options.
 * 
 * Setup Instructions:
 * 1. For Venmo: Replace 'YOUR_VENMO_USERNAME' in handleVenmoDonation with your actual Venmo username
 * 2. For Credit Card: Uncomment the code in handleCreditCardDonation and replace 'YOUR_PAYMENT_LINK_HERE' 
 *    with your Stripe payment link after setting up your Stripe account
 * 
 * Props:
 * - style: Custom container styling
 * - buttonStyle: Custom button styling  
 * - showTitle: Show/hide section title (default: true)
 * - title: Custom title text (default: "Support CrittrCove")
 * - subtitle: Custom subtitle text (default: "Help us keep costs low for everyone")
 * - size: Button size variant - "default", "compact", or "large" (default: "default")
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Modal } from 'react-native';
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
  const [showDonateModal, setShowDonateModal] = useState(false);

  // Handle donate button press - now opens modal instead of direct link
  const handleDonatePress = () => {
    debugLog('MBA9902', 'Opening donate modal from SupportButton component');
    setShowDonateModal(true);
  };

  // Handle credit card donation
  const handleCreditCardDonation = () => {
    debugLog('MBA9902', 'Credit card donation selected');
    setShowDonateModal(false);
    
    // TODO: Uncomment and replace with your actual Stripe payment link once created
    // To create: Go to Stripe Dashboard > Products > Add Product > Create Payment Link
    // Set it as a donation with "Customer chooses price" option enabled
    /*
    const donateUrl = 'https://buy.stripe.com/YOUR_PAYMENT_LINK_HERE';
    
    Linking.openURL(donateUrl).catch((err) => {
      debugLog('MBA9902', 'Error opening donate link:', err);
      showToast({
        message: 'Unable to open donation page. Please try again later.',
        type: 'error',
        duration: 3000
      });
    });
    */
    
    // Temporary message while Stripe is being set up
    showToast({
      message: 'Credit card donations coming soon! Please use Venmo for now.',
      type: 'info',
      duration: 4000
    });
  };

  // Handle Venmo donation
  const handleVenmoDonation = () => {
    debugLog('MBA9902', 'Venmo donation selected');
    setShowDonateModal(false);
    
    // TODO: Replace with your actual Venmo username
    const venmoUrl = 'https://venmo.com/u/matt-aertker';
    
    Linking.openURL(venmoUrl).catch((err) => {
      debugLog('MBA9902', 'Error opening Venmo link:', err);
      showToast({
        message: 'Unable to open Venmo. Please try again later.',
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
    <>
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
            name="chevron-right" 
            size={sizeStyles.arrowSize} 
            color={theme.colors.background} 
          />
        </TouchableOpacity>
      </View>

      {/* Donation Options Modal */}
      <Modal
        visible={showDonateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDonateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Support CrittrCove</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDonateModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Choose your preferred way to support us and help keep CrittrCove running!
            </Text>

            <View style={styles.donationOptionsContainer}>
              {/* Credit Card Option - Commented out functionality */}
              <TouchableOpacity 
                style={[styles.donationOption, styles.disabledOption]}
                onPress={handleCreditCardDonation}
              >
                <View style={styles.donationOptionIcon}>
                  <MaterialCommunityIcons 
                    name="credit-card" 
                    size={28} 
                    color={theme.colors.placeHolderText} 
                  />
                </View>
                <View style={styles.donationOptionContent}>
                  <Text style={[styles.donationOptionTitle, styles.disabledText]}>
                    Credit Card
                  </Text>
                  <Text style={[styles.donationOptionSubtitle, styles.disabledText]}>
                    Coming soon - secure payment via Stripe
                  </Text>
                </View>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              </TouchableOpacity>

              {/* Venmo Option */}
              <TouchableOpacity 
                style={styles.donationOption}
                onPress={handleVenmoDonation}
              >
                <View style={styles.donationOptionIcon}>
                  <MaterialCommunityIcons 
                    name="cash" 
                    size={28} 
                    color={theme.colors.primary} 
                  />
                </View>
                <View style={styles.donationOptionContent}>
                  <Text style={styles.donationOptionTitle}>Venmo</Text>
                  <Text style={styles.donationOptionSubtitle}>
                    Quick and easy mobile payments
                  </Text>
                </View>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={20} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>
                Your support helps us keep costs low for everyone in the CrittrCove community!
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  modalDescription: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    padding: 20,
    paddingBottom: 10,
    textAlign: 'center',
    fontFamily: theme.fonts?.regular?.fontFamily,
  },

  // Donation options styles
  donationOptionsContainer: {
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  donationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  disabledOption: {
    opacity: 0.6,
    backgroundColor: theme.colors.surface,
  },
  donationOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  donationOptionContent: {
    flex: 1,
  },
  donationOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  donationOptionSubtitle: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
  disabledText: {
    color: theme.colors.placeHolderText,
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.warning,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },

  // Modal footer styles
  modalFooter: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalFooterText: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
});

export default SupportButton; 