import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const Footer = ({ navigation }) => {
  const handleLinkPress = (url) => {
    Linking.openURL(url);
  };

  const handleNavigation = (route, tab) => {
    navigation.navigate(route, { tab });
  };

  return (
    <View style={styles.footer}>
      <View style={styles.footerContent}>
        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>Legal</Text>
          <TouchableOpacity onPress={() => handleNavigation('PrivacyPolicy', 'Overview')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNavigation('TermsOfService', 'Overview')}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNavigation('ContactUs', 'Overview')}>
            <Text style={styles.footerLink}>Contact Us</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>Social</Text>
          <View style={styles.socialIcons}>
            <TouchableOpacity 
              style={styles.socialIcon} 
              onPress={() => handleLinkPress('https://discord.gg/crittrcove')}
            >
              <MaterialCommunityIcons name="discord" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialIcon} 
              onPress={() => handleLinkPress('https://instagram.com/crittrcove')}
            >
              <MaterialCommunityIcons name="instagram" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <View style={styles.copyright}>
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()} CrittrCove. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: theme.colors.surfaceContrast,
    padding: 20,
    marginTop: 'auto',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  footerSection: {
    marginBottom: 20,
  },
  footerTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  footerLink: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  socialIcon: {
    padding: 8,
  },
  copyright: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 20,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default Footer; 