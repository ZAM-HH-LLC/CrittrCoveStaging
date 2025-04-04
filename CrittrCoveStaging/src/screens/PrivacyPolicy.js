import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { handleBack } from '../components/Navigation';

const appName = 'Zen Exotics';

const privacy_policy_info = [
  {sectionTitle: "Information We Collect", 
    paragraph: "When you use {appName}, we collect several types of information to ensure the best experience for both professionals and pet owners. This includes:", 
    listItems: {listItem: "Personal Information: Name, email, phone number, address, and service preferences.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Health Data: Medical information about your pets (e.g., medical history, medications, vaccinations, behavioral traits). By using this service, you consent to our use of this health data as we deem necessary for analytics, research, marketing, or any other purpose related to improving our services.",
                listItem: "Device Data: We collect information about your device, including IP address, browser type, operating system, and other usage data.",
                listItem: "Location Data: With your permission, we collect location information to match professionals and owners more effectively. Disabling location services may limit certain app features.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
                listItem: "Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.",
    }},
  {}
];

const PrivacyPolicy = () => {
  const navigation = useNavigation();

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Privacy Policy" 
        onBackPress={() => handleBack(navigation)} 
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Privacy Policy for {appName}</Text>
        <Text style={styles.date}>Effective Date: 10/21/2024</Text>
        
        <Text style={styles.paragraph}>
          By accessing or using {appName}, you agree to the practices described in this Privacy Policy. If you do not agree with these terms, please discontinue the use of our services immediately.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>
        <Text style={styles.paragraph}>
          When you use {appName}, we collect several types of information to ensure the best experience for both professionals and pet owners. This includes:
        </Text>
        <Text style={styles.listItem}>• Personal Information: Name, email, phone number, address, and service preferences.</Text>
        <Text style={styles.listItem}>• Payment Information: Card type, expiration date, and the last four digits of your payment card. Complete payment details are managed by third-party processors, and we do not store full card numbers.</Text>
        <Text style={styles.listItem}>• Health Data: Medical information about your pets (e.g., medical history, medications, vaccinations, behavioral traits). By using this service, you consent to our use of this health data as we deem necessary for analytics, research, marketing, or any other purpose related to improving our services.</Text>
        <Text style={styles.listItem}>• Device Data: We collect information about your device, including IP address, browser type, operating system, and other usage data.</Text>
        <Text style={styles.listItem}>• Location Data: With your permission, we collect location information to match professionals and owners more effectively. Disabling location services may limit certain app features.</Text>
        <Text style={styles.listItem}>• Cookies and Tracking: We use cookies and tracking technologies to improve user experience and monitor traffic patterns. You can disable cookies in your browser settings.</Text>

        <Text style={styles.sectionTitle}>How We Use Your Data</Text>
        <Text style={styles.paragraph}>We use the data we collect to:</Text>
        <Text style={styles.listItem}>• Facilitate bookings and transactions between professionals and owners.</Text>
        <Text style={styles.listItem}>• Verify professional eligibility through background checks.</Text>
        <Text style={styles.listItem}>• Provide customer support and resolve disputes between users.</Text>
        <Text style={styles.listItem}>• Improve app functionality through analytics and feedback.</Text>
        <Text style={styles.listItem}>• Manage communications between professionals and owners.</Text>
        <Text style={styles.listItem}>• Use health data for internal analysis and marketing purposes. We retain control over how this data is used.</Text>

        <Text style={styles.sectionTitle}>Sharing of Information</Text>
        <Text style={styles.paragraph}>We may share your data in the following ways:</Text>
        <Text style={styles.listItem}>• With Other Users: For bookings, we share relevant information between professionals and pet owners.</Text>
        <Text style={styles.listItem}>• With Third-Party Providers: Payment processors, analytics providers, and background check services may access limited information to perform their services.</Text>
        <Text style={styles.listItem}>• Legal and Compliance Purposes: We may disclose information if required by law or to protect the safety and security of our users.</Text>
        <Text style={styles.listItem}>• Business Transfers: In case of a merger, sale, or acquisition, your data may be transferred to a new owner.</Text>
        <Text style={styles.listItem}>• Aggregated Data: We may share non-identifiable, aggregated data for research or business purposes.</Text>

        <Text style={styles.sectionTitle}>Your Rights and Choices</Text>
        <Text style={styles.listItem}>• Account Management: You can update or delete your account information through the app settings.</Text>
        <Text style={styles.listItem}>• Health Data Access: You may review the health data associated with your pets but agree that we control its use.</Text>
        <Text style={styles.listItem}>• Location Services: Manage your location preferences through your device settings.</Text>
        <Text style={styles.listItem}>• Cookie Preferences: You can opt out of personalized ads and tracking through your browser settings.</Text>

        <Text style={styles.sectionTitle}>Security and Data Retention</Text>
        <Text style={styles.paragraph}>
          We implement reasonable security measures to protect your data, though no system is entirely secure. We retain your data as long as needed for operational purposes or as required by law.
        </Text>

        <Text style={styles.sectionTitle}>International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your data may be processed or stored in countries outside your own. By using the app, you agree to these transfers, even if those countries have different data protection laws.
        </Text>

        <Text style={styles.sectionTitle}>Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this policy from time to time to reflect changes in our practices or services. We will notify you of significant changes through the app or via email. Continued use of the app constitutes acceptance of the revised policy.
        </Text>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions or concerns about this policy, please contact us:
        </Text>
        <Text style={styles.listItem}>Email: zam.hh.llc@gmail.com</Text>
        <Text style={styles.listItem}>Phone: 7195106341</Text>
      </ScrollView>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'web' ? 16 : 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
  },
  date: {
    fontSize: 16,
    marginBottom: 20,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: theme.colors.primary,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 10,
    color: theme.colors.text,
  },
  listItem: {
    fontSize: 16,
    marginBottom: 5,
    marginLeft: 10,
    color: theme.colors.text,
  },
});

export default PrivacyPolicy;
