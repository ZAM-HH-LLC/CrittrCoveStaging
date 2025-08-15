import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

const DogWalkerColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Professional dog walking services in Colorado Springs. Connect with local 5-star dog walkers who provide 
        reliable exercise and companionship for your furry friend while you're at work or away.
      </Text>
      <Text style={styles.introText}>
        Our dog walkers in Colorado Springs offer flexible scheduling, GPS tracking, and detailed walk reports 
        to keep you connected with your pet's daily exercise routine.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Reliable Daily Exercise:</Text> Professional dog walkers on our platform aim to provide your pet with 
        consistent exercise and mental stimulation, helping maintain their health and happiness even with your busy schedule.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Local Area Knowledge:</Text> Many dog walking professionals on our platform are familiar with the best routes, 
        dog-friendly areas, and weather considerations specific to our beautiful mountain community. We recommend discussing 
        local area familiarity with potential walkers.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Flexible Scheduling:</Text> Whether you need daily walks, occasional services, 
        or emergency coverage, our network provides reliable dog walking when you need it most.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "How much do dog walkers charge in Colorado Springs?",
      answer: "Estimated dog walking rates in Colorado Springs typically range from $20-40 per walk, as professionals set their own pricing based on duration, group size, and additional services. Most walks are 30-60 minutes and often include basic care and attention, though specific services vary by professional."
    },
    {
      question: "What areas of Colorado Springs do you serve?",
      answer: "The dog walking professionals on our platform serve all areas of Colorado Springs including downtown, Old Colorado City, Broadmoor, Security-Widefield, and surrounding neighborhoods. Check individual professional profiles for specific service areas."
    },
    {
      question: "Do dog walkers provide updates during walks?",
      answer: "Many professional dog walkers on our platform provide photo updates, GPS tracking, and walk reports detailing your dog's activity, bathroom breaks, and overall behavior during their exercise session. We recommend discussing reporting preferences with potential walkers."
    }
  ];

  const internalLinks = [
    { text: "Dog Boarding Colorado Springs", route: "DogBoardingColoradoSprings" },
    { text: "Dog Sitting Colorado Springs", route: "DogSittingColoradoSprings" },
    { text: "Pet Boarding Colorado Springs", route: "PetBoardingColoradoSprings" }
  ];

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.dogWalker}
      mainHeading="Professional Dog Walker Services in Colorado Springs"
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

export default DogWalkerColoradoSprings; 