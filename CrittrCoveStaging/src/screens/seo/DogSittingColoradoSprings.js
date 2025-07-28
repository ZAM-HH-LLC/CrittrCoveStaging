import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const DogSittingColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Professional dog sitting services in Colorado Springs. Find trusted dog sitters who provide 
        in-home care and companionship for your canine friends while you're away.
      </Text>
      <Text style={styles.introText}>
        Our experienced dog sitters offer personalized care including feeding, walks, playtime, and 
        companionship to keep your dog happy and comfortable in familiar surroundings.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>In-Home Comfort:</Text> Dog sitting takes place in your home, allowing 
        your pet to maintain their routine and stay in familiar surroundings, reducing stress and anxiety.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Personalized Attention:</Text> Unlike group boarding facilities, 
        dog sitting provides one-on-one attention and care tailored to your dog's specific needs and personality.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Flexible Scheduling:</Text> Many dog caregivers on our platform can accommodate various schedules 
        from daily visits to overnight stays, adapting to your travel plans and your dog's care requirements. 
        Discuss scheduling flexibility with potential professionals.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "What's the difference between dog sitting and dog boarding?",
      answer: "Dog sitting typically takes place in your home with your dog maintaining their familiar routine, while boarding involves taking your dog to another location. Dog sitting often provides more personalized, one-on-one attention."
    },
    {
      question: "How much does dog sitting cost in Colorado Springs?",
      answer: "Dog sitting rates in Colorado Springs range from $25-60 per visit or $50-150 per overnight stay, depending on professional, duration, services included, and your dog's specific needs. Our beta platform has no booking fees."
    },
    {
      question: "What services are included with dog sitting?",
      answer: "Dog sitting services often include feeding, walks, playtime, companionship, and basic care. Many professionals also offer additional services like grooming, medication administration, plant watering, and mail collection. Since each professional creates their own service packages, we recommend discussing your specific needs and confirming what's included before booking."
    }
  ];

  const internalLinks = [
    { text: "Dog Boarding Colorado Springs", route: "DogBoardingColoradoSprings" },
    { text: "Dog Walker Colorado Springs", route: "DogWalkerColoradoSprings" },
    { text: "Cat Sitting Colorado Springs", route: "CatSittingColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.dogSitting}
      mainHeading="Professional Dog Sitting Services in Colorado Springs"
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

export default DogSittingColoradoSprings; 