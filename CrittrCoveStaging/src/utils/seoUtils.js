import { Platform } from 'react-native';
import { useEffect } from 'react';
import { debugLog } from './logging';

/**
 * SEO utility for React Native Web
 * Provides cross-platform meta tag and document title management
 */

/**
 * Custom hook to set document title and meta description for SEO
 * Only works on web platform, no-op on mobile
 * @param {string} title - Page title
 * @param {string} description - Meta description
 * @param {Object} additionalMeta - Additional meta tags
 */
export const useSEO = (title, description, additionalMeta = {}) => {
  useEffect(() => {
    debugLog("MBA2iovno5rn: useSEO hook triggered", {
      platform: Platform.OS,
      title,
      description,
      additionalMeta,
      hasDocument: typeof document !== 'undefined'
    });
    
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Set document title
      if (title) {
        document.title = title;
      }
      
      // Set meta description
      if (description) {
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.setAttribute('name', 'description');
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description);
      }
      
      // Set additional meta tags
      Object.entries(additionalMeta).forEach(([name, content]) => {
        let metaTag = document.querySelector(`meta[name="${name}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', name);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      });
      
      // Set Twitter Card meta tags
      const twitterTags = {
        'twitter:card': 'summary_large_image',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': 'https://crittrcove.com/og-image.jpg',
        'twitter:site': '@crittrcove' // Add your Twitter handle if you have one
      };
      
      Object.entries(twitterTags).forEach(([name, content]) => {
        if (content) {
          let twitterTag = document.querySelector(`meta[name="${name}"]`);
          if (!twitterTag) {
            twitterTag = document.createElement('meta');
            twitterTag.setAttribute('name', name);
            document.head.appendChild(twitterTag);
          }
          twitterTag.setAttribute('content', content);
        }
      });
      
      // Set Open Graph meta tags for social sharing
      const ogTags = {
        'og:title': title,
        'og:description': description,
        'og:type': 'website',
        'og:site_name': 'CrittrCove',
        'og:url': window.location.href,
        'og:image': 'https://crittrcove.com/og-image.jpg', // Add your logo/featured image
        'og:locale': 'en_US'
      };
      
      Object.entries(ogTags).forEach(([property, content]) => {
        if (content) {
          let ogTag = document.querySelector(`meta[property="${property}"]`);
          if (!ogTag) {
            ogTag = document.createElement('meta');
            ogTag.setAttribute('property', property);
            document.head.appendChild(ogTag);
          }
          ogTag.setAttribute('content', content);
        }
      });
    }
  }, [title, description, additionalMeta]);
};

/**
 * Generate structured data for local business (JSON-LD)
 * @param {Object} businessData - Business information
 */
export const addStructuredData = (businessData) => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "CrittrCove",
      "description": "Professional pet care services specializing in exotic pets in Colorado Springs",
      "url": "https://crittrcove.com",
      "telephone": "+1-555-CRITTR",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Colorado Springs",
        "addressRegion": "CO",
        "addressCountry": "US"
      },
      "areaServed": "Colorado Springs, CO",
      "priceRange": "$",
      "category": "Pet Care Service",
      ...businessData
    };
    
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }
};

/**
 * Common SEO configurations for landing pages
 */
export const seoConfigs = {
  dogBoarding: {
    title: "Dog Boarding Colorado Springs | Trusted Pet Care | CrittrCove",
    description: "Find reliable dog boarding professionals in Colorado Springs. Connect with experienced pet sitters providing overnight care for your furry friends. Book trusted local dog boarding today.",
    keywords: "dog boarding colorado springs, pet boarding, overnight dog care, dog sitters, pet care colorado springs"
  },
  dogWalker: {
    title: "Dog Walker Colorado Springs | Professional Pet Walking | CrittrCove", 
    description: "Professional dog walking services in Colorado Springs. Reliable pet walkers for daily exercise and care. Book dog walkers in your neighborhood today.",
    keywords: "dog walker colorado springs, pet walking, dog exercise, professional dog walkers, pet care services"
  },
  catSitting: {
    title: "Cat Sitting Colorado Springs | Professional Cat Care | CrittrCove",
    description: "Trusted cat sitting services in Colorado Springs. Professional cat sitters providing in-home care for your feline friends. Book reliable cat care today.",
    keywords: "cat sitting colorado springs, cat sitters, feline care, in-home cat care, pet sitting services"
  },
  exoticPetCare: {
    title: "Exotic Pet Care Colorado Springs | Specialized Pet Services | CrittrCove",
    description: "Expert exotic pet care in Colorado Springs. Specialized services for reptiles, birds, ferrets, and unique pets. Professional exotic animal care you can trust.",
    keywords: "exotic pet care colorado springs, reptile care, bird care, ferret care, unusual pet services, specialized pet care"
  },
  ferretSitter: {
    title: "Ferret Sitter Colorado Springs | Specialized Ferret Care | CrittrCove",
    description: "Professional ferret sitting services in Colorado Springs. Experienced ferret sitters providing specialized care for your furry friends. Book trusted ferret care.",
    keywords: "ferret sitter colorado springs, ferret care, small animal care, exotic pet sitting, professional ferret services"
  },
  birdBoarding: {
    title: "Bird Boarding Colorado Springs | Avian Care Services | CrittrCove",
    description: "Professional bird boarding and avian care in Colorado Springs. Experienced bird sitters for parrots, canaries, and all feathered friends. Trusted bird care services.",
    keywords: "bird boarding colorado springs, avian care, parrot sitting, bird sitters, feathered pet care, professional bird services"
  },
  horseSitting: {
    title: "Horse Sitting Colorado | Equine Care Services | CrittrCove",
    description: "Professional horse sitting and equine care throughout Colorado. Experienced horse sitters providing quality care for your horses. Trusted equine services.",
    keywords: "horse sitting colorado, equine care, horse sitters, large animal care, professional equine services, horse care colorado"
  },
  reptileSitter: {
    title: "Reptile Sitter Colorado Springs | Specialized Reptile Care | CrittrCove", 
    description: "Expert reptile sitting services in Colorado Springs. Professional reptile sitters for snakes, lizards, and all cold-blooded pets. Specialized reptile care.",
    keywords: "reptile sitter colorado springs, snake care, lizard care, reptile services, cold-blooded pet care, exotic reptile sitting"
  },
  petBoarding: {
    title: "Pet Boarding Colorado Springs | All Pet Types Welcome | CrittrCove",
    description: "Comprehensive pet boarding services in Colorado Springs. Professional care for dogs, cats, exotic pets, and more. Trusted overnight pet care services.",
    keywords: "pet boarding colorado springs, all pet types, overnight pet care, professional pet boarding, animal care services"
  },
  dogSitting: {
    title: "Dog Sitting Colorado Springs | In-Home Dog Care | CrittrCove",
    description: "Professional dog sitting services in Colorado Springs. Reliable dog sitters providing in-home care and companionship for your dogs. Book trusted dog sitting.",
    keywords: "dog sitting colorado springs, in-home dog care, dog sitters, pet sitting services, canine care, professional dog care"
  }
}; 