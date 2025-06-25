import React, { useContext } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';

const TermsOfServiceModal = ({ visible, onClose, termsData }) => {
  const { screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;

  // Default terms data if none provided
  const defaultTermsData = [
    {
      header: "Terms of Service",
      body: "By using CrittrCove's services, you agree to the following terms and conditions. Please read these terms carefully before proceeding with your booking."
    },
    {
      header: "Service Agreement",
      body: "This agreement is between you (the client) and the professional pet care provider. CrittrCove acts as a platform to facilitate this connection but is not directly responsible for the services provided."
    },
    {
      header: "Payment Terms",
      body: "Payment is due as agreed upon between the client and professional. CrittrCove may process payments on behalf of professionals. All fees and charges are clearly displayed before booking confirmation."
    },
    {
      header: "Cancellation Policy",
      body: "Cancellation policies vary by professional and service type. Please review the specific cancellation terms with your chosen professional before confirming your booking."
    },
    {
      header: "Liability and Insurance",
      body: "Professionals are responsible for maintaining appropriate insurance coverage. Clients are responsible for ensuring their pets are properly vaccinated and disclosed any behavioral or health concerns."
    },
    {
      header: "Platform Fees",
      body: "CrittrCove charges platform fees to both clients and professionals to maintain and improve our services. These fees are clearly disclosed during the booking process."
    },
    {
      header: "User Conduct",
      body: "All users must conduct themselves professionally and respectfully. Any inappropriate behavior, harassment, or violation of these terms may result in account suspension or termination."
    },
    {
      header: "Privacy and Data Protection",
      body: "Your privacy is important to us. We collect and use personal information in accordance with our Privacy Policy. By using our services, you consent to our data collection and use practices."
    },
    {
      header: "Dispute Resolution",
      body: "Any disputes should first be addressed directly between the client and professional. If resolution cannot be reached, CrittrCove may assist in mediation. Legal disputes will be resolved according to applicable law."
    },
    {
      header: "Modifications to Terms",
      body: "CrittrCove reserves the right to modify these terms at any time. Users will be notified of significant changes and continued use of the platform constitutes acceptance of updated terms."
    }
  ];

  const terms = termsData || defaultTermsData;

  const renderTermsContent = () => {
    return terms.map((section, index) => (
      <View key={index} style={styles.section}>
        <Text style={styles.sectionHeader}>{section.header}</Text>
        <Text style={styles.sectionBody}>{section.body}</Text>
      </View>
    ));
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[
          styles.container, 
          isDesktop ? styles.desktopContainer : {}
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Terms of Service</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {renderTermsContent()}
          </ScrollView>
          
          {/* Footer */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[styles.button, styles.closeFooterButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    margin: Platform.OS === 'web' ? 0 : 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  desktopContainer: {
    maxWidth: 800,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  closeButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFooterButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default TermsOfServiceModal; 