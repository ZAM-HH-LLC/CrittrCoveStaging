import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const DogBoardingColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Find trusted dog boarding professionals in Colorado Springs with CrittrCove. Our network connects you with 
        experienced pet sitters who may provide overnight care and companionship for your furry friends in the 
        comfort of their own homes or in loving host families.
      </Text>
      <Text style={styles.introText}>
        Whether you need short-term boarding for a weekend getaway or extended care for business travel, 
        Colorado Springs dog boarding professionals on our platform aim to provide personalized attention and care.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Professional Overnight Care:</Text> Unlike traditional kennels, the dog boarding 
        professionals on our platform provide home-like environments where your dog receives individual attention and maintains their 
        regular routine. These experienced sitters offer overnight stays in comfortable, safe settings.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Local Colorado Springs Knowledge:</Text> Many boarding professionals on our platform are familiar with the 
        local area, including dog-friendly parks, emergency veterinary clinics, and exercise locations 
        specific to Colorado Springs. We recommend discussing local knowledge with potential caregivers.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>No Platform Fees During Beta:</Text> During our beta period, professionals 
        collect payment directly from you (typically via Venmo, cash, or their preferred method) rather than through 
        the app. This eliminates payment processor fees and platform charges, keeping costs lower for everyone.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "How much does dog boarding cost in Colorado Springs?",
      answer: "Estimated dog boarding rates in Colorado Springs typically range from $35-75 per night, as professionals set their own pricing based on care level and services included. Factors like dog size, special needs, and additional services affect pricing. No platform fees during beta - professionals collect payment directly."
    },
    {
      question: "What's included in overnight dog boarding services?",
      answer: "Dog boarding services often include overnight supervision, regular feeding, exercise, playtime, and companionship. Many professionals also offer additional services like walks, medication administration, and daily photo updates. Since each professional sets their own service packages, we recommend discussing specific care needs and confirming what's included before booking."
    },
    {
      question: "How do I choose the right boarding sitter for my dog?",
      answer: "Review professional profiles to find experience matching your dog's needs, read reviews from other Colorado Springs pet owners, and schedule a meet-and-greet before booking. Look for caregivers with experience handling your dog's size, breed, and temperament, and verify their comfort level with your specific dog's needs."
    }
  ];

  const internalLinks = [
    { text: "Dog Sitting Colorado Springs", route: "DogSittingColoradoSprings" },
    { text: "Dog Walker Colorado Springs", route: "DogWalkerColoradoSprings" },
    { text: "Pet Boarding Colorado Springs", route: "PetBoardingColoradoSprings" },
    { text: "Cat Sitting Colorado Springs", route: "CatSittingColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.dogBoarding}
      mainHeading="Trusted Dog Boarding in Colorado Springs"
      introContent={introContent}
      whyCrittrCoveContent={whyCrittrCoveContent}
      faqItems={faqItems}
      internalLinks={internalLinks}
    />
  );
};

const styles = {
  introContent: {
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
  },
  introText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: theme.colors.textSecondary,
    lineHeight: Platform.OS === 'web' ? 28 : 24,
    marginBottom: 16,
    textAlign: Platform.OS === 'web' ? 'center' : 'left',
  },
  contentSection: {
    // Content styling
  },
  paragraph: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: theme.colors.textSecondary,
    lineHeight: Platform.OS === 'web' ? 26 : 22,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '600',
    color: theme.colors.text,
  },
};

export default DogBoardingColoradoSprings; 