import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const PetBoardingColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Comprehensive pet boarding services in Colorado Springs for all types of pets. From dogs and cats 
        to exotic animals, find trusted boarding professionals who welcome all companions.
      </Text>
      <Text style={styles.introText}>
        Our diverse network of pet boarding specialists provides overnight care, feeding, exercise, and 
        companionship for pets of all shapes and sizes in the Colorado Springs area.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>All Pet Types Welcome:</Text> Unlike facilities that only accept certain 
        animals, the boarding professionals on our platform often have experience with dogs, cats, exotic pets, birds, reptiles, 
        and other unique companions. We recommend verifying each professional's experience with your specific pet type.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Home-Like Environment:</Text> Many pet boarding professionals on our platform offer care 
        in home environments rather than institutional settings, providing comfort and reducing stress for your pets. 
        Discuss care location preferences with potential professionals.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Flexible Duration:</Text> Whether you need overnight boarding for a weekend 
        or extended care for longer trips, many boarding professionals on our platform can accommodate various timeframes and schedules. 
        Discuss scheduling needs with potential caregivers.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "What types of pets can be boarded?",
      answer: "The pet boarding professionals on our platform in Colorado Springs often have experience with dogs, cats, birds, reptiles, small mammals, and various exotic pets. Each boarding provider lists their specific experience and pet type specializations, so we recommend verifying their comfort level with your particular pet type."
    },
    {
      question: "How much does pet boarding cost in Colorado Springs?",
      answer: "Pet boarding costs vary by animal type and care requirements. Dogs typically range $35-75/night, cats $25-50/night, and exotic pets $30-60/night depending on specialized care needs. No platform fees during our beta period."
    },
    {
      question: "What's included in pet boarding services?",
      answer: "Pet boarding services often include feeding, exercise (when appropriate), companionship, and basic care. Many professionals also offer additional services like grooming, medication administration, and daily photo updates. Since each professional sets their own service packages, we recommend discussing your specific pet's needs and confirming what's included before booking."
    }
  ];

  const internalLinks = [
    { text: "Dog Boarding Colorado Springs", route: "DogBoardingColoradoSprings" },
    { text: "Cat Sitting Colorado Springs", route: "CatSittingColoradoSprings" },
    { text: "Exotic Pet Care Colorado Springs", route: "ExoticPetCareColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.petBoarding}
      mainHeading="Pet Boarding Services in Colorado Springs - All Pets Welcome"
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

export default PetBoardingColoradoSprings; 