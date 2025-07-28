import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const HorseSittingColorado = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Professional horse sitting and equine care services throughout Colorado. Connect with experienced 
        horse caretakers who provide reliable barn management and equine care.
      </Text>
      <Text style={styles.introText}>
        Our equine specialists handle feeding, turnout, stall cleaning, and basic health monitoring to 
        keep your horses healthy and comfortable while you're away.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Equine Experience:</Text> Horse care requires specific knowledge of 
        equine behavior, feeding schedules, and health monitoring. Many horse caregivers on our platform have hands-on 
        experience with equine management, but we recommend verifying each professional's equine experience and comfort level.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Reliable Barn Care:</Text> From daily feeding and turnout to stall 
        maintenance and water checks, our horse sitters ensure your equine companions receive consistent, 
        quality care.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Emergency Preparedness:</Text> Many horse caregivers on our platform are familiar with 
        recognizing signs of equine health issues and often maintain contact information for local veterinarians 
        and farriers. We recommend discussing emergency protocols and verifying each professional's comfort level with equine health monitoring.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "What areas of Colorado do you serve for horse sitting?",
      answer: "We provide horse sitting services throughout Colorado including Denver metro, Colorado Springs, Fort Collins, Boulder, and rural areas. Check with individual sitters for their specific service radius."
    },
    {
      question: "What's included in horse sitting services?",
      answer: "Horse care services often include feeding, hay and water provision, turnout, stall cleaning, basic health checks, and grooming if requested. Many professionals also offer additional services like exercise, medication administration, and blanket changes. Since each professional sets their own service offerings, we recommend discussing specific care requirements and confirming what's included before booking."
    },
    {
      question: "Do horse sitters have insurance?",
      answer: "We recommend all horse sitters carry appropriate liability insurance. Many of our equine professionals have experience working at boarding facilities and understand insurance requirements for horse care."
    }
  ];

  const internalLinks = [
    { text: "Exotic Pet Care Colorado Springs", route: "ExoticPetCareColoradoSprings" },
    { text: "Dog Boarding Colorado Springs", route: "DogBoardingColoradoSprings" },
    { text: "Pet Boarding Colorado Springs", route: "PetBoardingColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.horseSitting}
      mainHeading="Professional Horse Sitting Services in Colorado"
      introContent={introContent}
      whyCrittrCoveContent={whyCrittrCoveContent}
      faqItems={faqItems}
      internalLinks={internalLinks}
    />
  );
};

const styles = {
  introContent: { maxWidth: Platform.OS === 'web' ? 800 : undefined },
  introText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: theme.colors.textSecondary,
    lineHeight: Platform.OS === 'web' ? 28 : 24,
    marginBottom: 16,
    textAlign: Platform.OS === 'web' ? 'center' : 'left',
  },
  paragraph: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: theme.colors.textSecondary,
    lineHeight: Platform.OS === 'web' ? 26 : 22,
    marginBottom: 16,
  },
  bold: { fontWeight: '600', color: theme.colors.text },
};

export default HorseSittingColorado; 