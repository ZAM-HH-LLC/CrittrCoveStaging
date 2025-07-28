import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';
import { theme } from '../../styles/theme';

/**
 * Exotic Pet Care Colorado Springs Landing Page
 * Fully optimized for SEO and search engine visibility
 */
const ExoticPetCareColoradoSprings = () => {
  const introContent = (
    <View style={styles.introContent}>
      <Text style={styles.introText}>
        Looking for specialized exotic pet care in Colorado Springs? CrittrCove connects you with experienced 
        professionals who may understand the unique needs of reptiles, birds, ferrets, and other exotic companions. 
        Our network of trusted exotic pet sitters often provides expert care tailored to your pet's specific requirements.
      </Text>
      <Text style={styles.introText}>
        From temperature-controlled environments for reptiles to specialized diets for exotic birds, 
        Colorado Springs exotic pet sitters on our platform often have the knowledge and experience to help keep your unique pets happy and healthy.
      </Text>
    </View>
  );

  const whyCrittrCoveContent = (
    <View style={styles.contentSection}>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Specialized Exotic Pet Expertise:</Text> Unlike general pet sitting services, 
        CrittrCove focuses on connecting you with professionals who have real experience caring for exotic animals. 
        The professional network on our platform often includes reptile specialists, avian care experts, and small mammal enthusiasts 
        who may have experience with the complex needs of non-traditional pets.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Local Colorado Springs Knowledge:</Text> Many exotic pet professionals on our platform are familiar 
        with Colorado Springs' climate and how it affects exotic pets. Some know local exotic veterinarians 
        and may be able to provide emergency care coordination specific to your area. We recommend verifying local knowledge with potential caregivers.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>No Platform Fees During Beta:</Text> We're currently in beta testing, which means 
        professionals collect payment directly from you (typically via Venmo, cash, or their preferred method) rather than through 
        the app. This eliminates payment processor fees and platform charges, keeping exotic pet care more affordable.
      </Text>
      
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Ethical Care Standards:</Text> The exotic pet professionals on our platform typically follow 
        species-appropriate care guidelines and maintain proper habitat conditions. We prioritize connecting you with caregivers who put the welfare 
        of your exotic pets above all else. As a marketplace, each professional sets their own care standards and service offerings, so we recommend thoroughly discussing care protocols during your consultation.
      </Text>
    </View>
  );

  const faqItems = [
    {
      question: "What types of exotic pets do Colorado Springs sitters care for?",
      answer: "The exotic pet professionals on our platform in Colorado Springs specialize in a wide range of non-traditional pets including reptiles (snakes, lizards, geckos, bearded dragons), birds (parrots, cockatiels, canaries), small mammals (ferrets, chinchillas, sugar gliders), amphibians, and other unique companions. Each professional's profile lists their specific expertise and experience."
    },
    {
      question: "How much does exotic pet sitting cost in Colorado Springs?",
      answer: "Estimated exotic pet sitting rates in Colorado Springs typically range from $25-50 per visit, as professionals set their own pricing based on care complexity. Specialized care for reptiles with specific temperature/humidity needs or birds requiring medication may cost more. During our beta period, professionals collect payment directly (no platform fees)."
    },
    {
      question: "Do exotic pet sitters handle emergency situations?",
      answer: "Yes, the professional exotic pet caregivers on our platform typically have experience recognizing signs of distress in exotic animals. While each caregiver has their own level of expertise, pet owners provide specific emergency instructions and veterinary contacts during the initial consultation. Many caregivers in Colorado Springs have familiarity with local exotic veterinarians, but we recommend discussing emergency protocols with potential caregivers to ensure they're comfortable handling your pet's specific needs. It's important to thoroughly vet caregivers regarding their knowledge of emergency situations for your particular exotic pet."
    },
    {
      question: "How do I ensure my exotic pet's specific needs are met?",
      answer: "Before any sitting arrangement, you'll have a detailed conversation with your chosen professional to discuss your pet's specific requirements including diet, habitat maintenance, lighting schedules, temperature/humidity controls, and any medications. The professionals on our platform create customized care plans and provide daily updates with photos and observations."
    }
  ];

  const internalLinks = [
    { text: "Reptile Sitting Services", route: "ReptileSitterColoradoSprings" },
    { text: "Bird Boarding Colorado Springs", route: "BirdBoardingColoradoSprings" },
    { text: "Ferret Sitting Services", route: "FerretSitterColoradoSprings" },
    { text: "Dog Boarding Colorado Springs", route: "DogBoardingColoradoSprings" }
  ];

  const structuredData = {
    "@type": "PetService",
    "name": "Exotic Pet Care Colorado Springs - CrittrCove",
    "description": "Professional exotic pet care services in Colorado Springs specializing in reptiles, birds, ferrets and unique pets",
    "serviceType": "Exotic Pet Care",
    "areaServed": {
      "@type": "City",
      "name": "Colorado Springs",
      "containedInPlace": {
        "@type": "State",
        "name": "Colorado"
      }
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Exotic Pet Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Reptile Care",
            "description": "Specialized care for snakes, lizards, and other reptiles"
          }
        },
        {
          "@type": "Offer", 
          "itemOffered": {
            "@type": "Service",
            "name": "Avian Care",
            "description": "Expert bird care and boarding services"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service", 
            "name": "Small Exotic Mammal Care",
            "description": "Care for ferrets, chinchillas, and other small exotic pets"
          }
        }
      ]
    }
  };

  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.exoticPetCare}
      mainHeading="Expert Exotic Pet Care in Colorado Springs"
      introContent={introContent}
      whyCrittrCoveContent={whyCrittrCoveContent}
      faqItems={faqItems}
      internalLinks={internalLinks}
      structuredData={structuredData}
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

export default ExoticPetCareColoradoSprings; 