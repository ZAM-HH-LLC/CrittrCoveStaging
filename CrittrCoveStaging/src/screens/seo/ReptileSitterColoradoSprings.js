import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const ReptileSitterColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Expert reptile sitting services in Colorado Springs. Connect with specialized reptile caretakers 
        who understand the complex needs of snakes, lizards, geckos, and other cold-blooded companions.
      </Text>
      <Text style={styles.introText}>
        Our reptile specialists have different levels of experience and expertise including maintaining proper temperatures, humidity levels, feeding schedules, and 
        habitat conditions to keep your scaly friends healthy and comfortable.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Reptile Expertise:</Text> Reptiles require precise environmental 
        conditions and species-specific care. Many professionals on our platform have knowledge of heating, lighting, humidity, 
        and feeding requirements for various reptile species, though expertise levels vary. We recommend discussing your specific reptile's needs 
        with potential caregivers to ensure they have the appropriate experience.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Temperature Management:</Text> Proper temperature gradients are 
        critical for reptile health. Reptile caregivers on our platform often have experience with monitoring heating systems, 
        but each professional has different levels of expertise. It's important to verify that your chosen caregiver understands 
        your specific setup and temperature requirements.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Species-Specific Care:</Text> From ball pythons to bearded dragons, 
        each reptile species has unique requirements. The professionals on our platform have varying experience with different species, 
        so we encourage you to thoroughly vet potential caregivers to ensure they're comfortable with your particular reptile's needs.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "What types of reptiles do you care for?",
      answer: "Reptile sitters on our platform in Colorado Springs often have experience with various species including snakes (ball pythons, corn snakes, boas), lizards (bearded dragons, geckos, iguanas), turtles, and other reptilian pets. We recommend verifying with your chosen professional about their specific experience with your reptile species."
    },
    {
      question: "How do you maintain proper temperatures?",
      answer: "Many reptile sitters on our platform have knowledge of monitoring heating systems, checking thermostats, and maintaining proper temperature gradients. However, expertise levels vary, so it's important to discuss your specific setup with potential caregivers to ensure they understand the importance of basking spots and cool areas for your reptile."
    },
    {
      question: "What about feeding live prey?",
      answer: "Some reptile sitters on our platform may be comfortable handling live feeding requirements including mice, crickets, and other prey items. We recommend discussing feeding protocols and schedules with your chosen professional to verify they can accommodate your reptile's specific dietary needs."
    }
  ];

  const internalLinks = [
    { text: "Exotic Pet Care Colorado Springs", route: "ExoticPetCareColoradoSprings" },
    { text: "Bird Boarding Colorado Springs", route: "BirdBoardingColoradoSprings" },
    { text: "Ferret Sitter Colorado Springs", route: "FerretSitterColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.reptileSitter}
      mainHeading="Professional Reptile Sitting in Colorado Springs"
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

export default ReptileSitterColoradoSprings; 