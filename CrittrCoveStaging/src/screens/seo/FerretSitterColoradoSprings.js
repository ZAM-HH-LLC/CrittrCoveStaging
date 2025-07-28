import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const FerretSitterColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Specialized ferret sitting services in Colorado Springs. Connect with experienced ferret sitters who 
        understand the unique needs of these playful, intelligent pets.
      </Text>
      <Text style={styles.introText}>
        Ferret care specialists on our platform often provide proper supervision, playtime, feeding, and habitat maintenance 
        to help keep your ferrets happy and healthy while you're away.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Ferret-Specific Knowledge:</Text> Ferrets require specialized care including 
        frequent feeding, secure play areas, and understanding of their unique behaviors. Professionals on our platform 
        often have experience with ferret care requirements, but we recommend verifying each caregiver's specific 
        ferret experience during your initial consultation.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Safe Play Supervision:</Text> Ferrets are curious and can get into trouble 
        quickly. Many experienced professionals on our platform understand ferret behavior and can provide proper supervision during playtime, but always discuss safety protocols with potential caregivers.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Health Monitoring:</Text> Many ferret caregivers on our platform are familiar with signs of common ferret 
        health issues, but we recommend discussing each professional's experience level and ensuring they're comfortable 
        recognizing when immediate attention is needed.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "Do you have experience with ferret care?",
      answer: "Ferret caregivers on our platform in Colorado Springs often have experience with ferret behavior, dietary needs, and safety requirements. Many understand ferret-proofing, proper feeding schedules, and enrichment activities, but we recommend verifying each professional's specific ferret experience and comfort level during your consultation."
    },
    {
      question: "How much does ferret sitting cost?",
      answer: "Ferret sitting rates typically range from $25-50 per visit, depending on the number of ferrets and care complexity. Specialized exotic pet care may cost more than standard pet sitting due to specific requirements."
    },
    {
      question: "What's included in ferret care services?",
      answer: "Ferret sitting services often include feeding on proper schedules, supervised playtime, litter box cleaning, cage maintenance, and social interaction. Many professionals also offer health monitoring and emergency contact protocols. Since each professional sets their own service offerings, we recommend discussing specific care tasks and confirming what's included before booking."
    }
  ];

  const internalLinks = [
    { text: "Exotic Pet Care Colorado Springs", route: "ExoticPetCareColoradoSprings" },
    { text: "Reptile Sitter Colorado Springs", route: "ReptileSitterColoradoSprings" },
    { text: "Bird Boarding Colorado Springs", route: "BirdBoardingColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.ferretSitter}
      mainHeading="Professional Ferret Sitting in Colorado Springs"
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

export default FerretSitterColoradoSprings; 