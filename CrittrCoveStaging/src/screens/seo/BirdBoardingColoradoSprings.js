import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const BirdBoardingColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Professional bird boarding and avian care services in Colorado Springs. Connect with experienced bird 
        sitters who understand the complex needs of parrots, cockatiels, canaries, and other feathered companions.
      </Text>
      <Text style={styles.introText}>
        Our avian specialists provide a variety of services including proper diet mitigation, social interaction, and environmental enrichment to keep 
        your birds healthy and stimulated during your absence.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Avian Care Knowledge:</Text> Birds require specialized knowledge of diet, 
        social needs, and environmental factors. Many bird caregivers on our platform are familiar with species-specific requirements 
        and behavioral patterns, but we recommend verifying each professional's bird experience.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Social Interaction:</Text> Many birds are highly social and need regular 
        interaction to prevent stress and behavioral issues. Bird caregivers on our platform often understand the importance of providing appropriate socialization 
        and mental stimulation, but discuss your bird's specific social needs with potential caregivers.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Safe Environment:</Text> Bird boarding requires secure, appropriate 
        environments with proper ventilation, lighting, and safety measures. Our professionals ensure 
        optimal conditions for your feathered friends.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "What types of birds do you care for?",
      answer: "Bird boarding professionals on our platform in Colorado Springs often have experience with various species including parrots, cockatiels, canaries, finches, conures, and other pet birds. Each professional's profile lists their specific avian experience, so we recommend verifying their comfort level with your bird species."
    },
    {
      question: "How much does bird boarding cost?",
      answer: "Bird boarding rates range from $30-60 per day (estimated costs that are set by each individual professional), depending on the species, care complexity, and services required. Larger parrots or birds with special dietary needs may cost more than smaller birds."
    },
    {
      question: "Do bird sitters provide social interaction?",
      answer: "Many bird caregivers on our platform understand the importance of social interaction for pet birds. They often provide appropriate talking, training reinforcement, and companionship, but we recommend discussing your bird's specific social needs and verifying each professional's comfort level with bird interaction."
    }
  ];

  const internalLinks = [
    { text: "Exotic Pet Care Colorado Springs", route: "ExoticPetCareColoradoSprings" },
    { text: "Ferret Sitter Colorado Springs", route: "FerretSitterColoradoSprings" },
    { text: "Reptile Sitter Colorado Springs", route: "ReptileSitterColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.birdBoarding}
      mainHeading="Professional Bird Boarding in Colorado Springs"
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

export default BirdBoardingColoradoSprings; 