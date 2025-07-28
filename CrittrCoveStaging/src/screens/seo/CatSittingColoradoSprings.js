import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const CatSittingColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Professional cat sitting services in Colorado Springs. Find trusted cat sitters who may provide in-home care, 
        aiming to maintain your feline's routine and comfort while you're away.
      </Text>
      <Text style={styles.introText}>
        Experienced cat sitters on our platform often understand feline behavior and may provide personalized care including feeding, 
        litter box maintenance, playtime, and companionship for your beloved cats.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>In-Home Comfort:</Text> Cats thrive in familiar environments. Our cat sitters 
        provide care in your home, reducing stress and maintaining your cat's established routines and territorial comfort.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Feline Behavior Knowledge:</Text> Many cat caregivers on our platform in Colorado Springs are familiar with 
        cat behavior, body language, and health indicators. We recommend discussing each professional's cat experience 
        to ensure they're comfortable with your pet's specific needs.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Flexible Care Options:</Text> Whether you need daily visits, overnight stays, 
        or extended care, many cat caregivers on our platform can adapt to your cat's specific needs and your travel schedule. 
        Discuss scheduling flexibility with potential professionals.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "How much does cat sitting cost in Colorado Springs?",
      answer: "Estimated cat sitting rates in Colorado Springs range from $20-45 per visit, as professionals set their own pricing based on duration and services. Overnight stays typically cost $50-80 per night. Multiple cats may have additional fees."
    },
    {
      question: "What services are included in cat sitting?",
      answer: "Cat sitting services often include feeding, fresh water, litter box cleaning, playtime, and companionship. Many professionals also offer additional services like medication administration, plant watering, and mail collection. Since each professional creates their own service offerings, we recommend discussing your specific needs and confirming what's included before booking."
    },
    {
      question: "How often will the sitter visit my cat?",
      answer: "Visit frequency depends on your cat's needs. Most cats do well with daily 30-60 minute visits, but we can arrange multiple visits per day or overnight stays for cats requiring more attention or medical care."
    }
  ];

  const internalLinks = [
    { text: "Dog Sitting Colorado Springs", route: "DogSittingColoradoSprings" },
    { text: "Exotic Pet Care Colorado Springs", route: "ExoticPetCareColoradoSprings" },
    { text: "Pet Boarding Colorado Springs", route: "PetBoardingColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.catSitting}
      mainHeading="Professional Cat Sitting Services in Colorado Springs"
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

export default CatSittingColoradoSprings; 