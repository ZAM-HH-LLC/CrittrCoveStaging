import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import { handleBack } from '../components/Navigation';
import { AuthContext } from '../context/AuthContext';

const appName = 'Zen Exotics';

const TermsOfService = () => {
  const navigation = useNavigation();

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Terms of Service" 
        onBackPress={() => handleBack(navigation)} 
      />
      <Text>Terms of Service coming soon. Right now we are in prototype mode, so no data is saved except for email/name if you choose to contact us through this platform, then it is saved for marketing purposes.</Text>
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Terms of Service for {appName}</Text>

        <Text style={styles.date}>Effective Date: 10/21/2024</Text>
        
        <Text style={styles.paragraph}>
          Welcome to {appName}! By using our platform, mobile application, or any services offered through our platform (collectively, "the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must discontinue use of the Service immediately.
        </Text>

        <Text style={styles.sectionTitle}>1. Description of Service</Text>
        <Text style={styles.paragraph}>
          {appName} provides an online platform for connecting pet owners with professionals specializing in exotic animals, as well as dogs and cats. Users can book services, communicate with professionals, and manage pet-related services, including payments and reviews.
        </Text>

        <Text style={styles.sectionTitle}>2. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use certain features of the Service, you must create an account. You are responsible for keeping your account information accurate and secure.
        </Text>
        <Text style={styles.listItem}>• Eligibility: Users must be at least 18 years old to create an account.</Text>
        <Text style={styles.listItem}>• Account Security: You are responsible for all activities under your account. Notify us immediately if you suspect unauthorized use.</Text>
        <Text style={styles.listItem}>• Account Termination: We reserve the right to suspend or terminate accounts at our sole discretion for violations of these Terms.</Text>

        <Text style={styles.sectionTitle}>3. User Conduct and Acceptable Use</Text>
        <Text style={styles.paragraph}>By using the Service, you agree:</Text>
        <Text style={styles.listItem}>• To provide accurate and complete information.</Text>
        <Text style={styles.listItem}>• Not to engage in fraudulent or unlawful activities.</Text>
        <Text style={styles.listItem}>• Not to use the Service for spam, harassment, or abusive behavior toward other users.</Text>
        <Text style={styles.listItem}>• To comply with all local, national, and international laws applicable to your activities on the platform.</Text>
        <Text style={styles.paragraph}>Failure to comply with these rules may result in account suspension or termination.</Text>

        <Text style={styles.sectionTitle}>4. Pet and Health Information</Text>
        <Text style={styles.paragraph}>
          You acknowledge that the Service involves the collection and sharing of health-related data for pets. By using the Service, you agree to provide accurate medical information for your animals and grant us permission to use and share this data as outlined in our Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>5. Payment Terms</Text>
        <Text style={styles.paragraph}>
          All transactions between pet owners and professionals must be processed through the platform's payment system, powered by Stripe. You agree to the following:
        </Text>
        <Text style={styles.listItem}>• Booking Fees: You will be charged the agreed-upon amount at the time of booking.</Text>
        <Text style={styles.listItem}>• Cancellations and Refunds: Cancellations are subject to our cancellation policy, which may result in partial or no refunds.</Text>
        <Text style={styles.listItem}>• Payouts to Professionals: Professionals must provide accurate payment information and comply with local tax regulations.</Text>

        <Text style={styles.sectionTitle}>6. Liability and Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          You acknowledge that {appName} does not guarantee the quality or safety of services provided by professionals. Our platform only facilitates connections between users.
        </Text>
        <Text style={styles.listItem}>• We are not liable for any injury, damage, or loss caused during the provision of pet care services.</Text>
        <Text style={styles.listItem}>• The Service is provided "as is" and "as available" without warranties of any kind, express or implied.</Text>

        <Text style={styles.sectionTitle}>7. Dispute Resolution Between Users</Text>
        <Text style={styles.paragraph}>
          Disputes between users (e.g., pet owners and professionals) must first be addressed directly between the parties. If no resolution is reached, {appName} may mediate but is not responsible for the outcome.
        </Text>

        <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
        <Text style={styles.paragraph}>In no event shall {appName}, its affiliates, officers, employees, or partners be liable for:</Text>
        <Text style={styles.listItem}>• Indirect, incidental, or consequential damages arising from the use of the Service.</Text>
        <Text style={styles.listItem}>• Any claims exceeding the amount you paid through the Service within the last six months.</Text>

        <Text style={styles.sectionTitle}>9. Termination and Suspension</Text>
        <Text style={styles.paragraph}>We reserve the right to suspend or terminate access to the Service at any time without notice if:</Text>
        <Text style={styles.listItem}>• You breach these Terms.</Text>
        <Text style={styles.listItem}>• Your actions jeopardize the safety or security of the platform or other users.</Text>

        <Text style={styles.sectionTitle}>10. Modifications to the Service and Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these Terms or the Service at any time. Significant changes will be communicated via email or in-app notifications. Continued use of the Service after changes constitutes acceptance of the revised Terms.
        </Text>

        <Text style={styles.sectionTitle}>11. Intellectual Property Rights</Text>
        <Text style={styles.paragraph}>
          All content, trademarks, and logos on the platform are owned by or licensed to {appName}. You may not copy, modify, or distribute content without express permission.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law and Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by the laws of El Paso County, Colorado, without regard to conflict of law principles.
        </Text>
        <Text style={styles.listItem}>• Arbitration Clause: All disputes arising under these Terms shall be resolved through binding arbitration in Colorado Springs, Colorado.</Text>
        <Text style={styles.listItem}>• Class Action Waiver: You agree to waive your right to participate in class action lawsuits.</Text>

        <Text style={styles.sectionTitle}>13. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify and hold harmless {appName}, its affiliates, officers, and employees from any claims, damages, or liabilities arising from your use of the Service or breach of these Terms.
        </Text>

        <Text style={styles.sectionTitle}>14. Third-Party Links and Services</Text>
        <Text style={styles.paragraph}>
          The platform may contain links to third-party websites or services. {appName} is not responsible for the content or actions of those third parties.
        </Text>

        <Text style={styles.sectionTitle}>15. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms, please contact us:
        </Text>
        <Text style={styles.listItem}>Email: zam.hh.llc@gmail.com</Text>
        <Text style={styles.listItem}>Phone: 7195106341</Text>

        <Text style={styles.sectionTitle}>Acknowledgment of Agreement</Text>
        <Text style={styles.paragraph}>
          By accessing or using {appName}, you acknowledge that you have read, understood, and agreed to these Terms of Service.
        </Text>
      </ScrollView>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 80,
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
  testSection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    borderRadius: 4,
  },
});

export default TermsOfService;
