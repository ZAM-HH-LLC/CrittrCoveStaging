import { Platform } from 'react-native';
import { debugLog } from './logging';

/**
 * Pre-rendering utilities for SEO optimization
 * These functions help ensure proper rendering during the pre-rendering process
 */

/**
 * Check if we're in a pre-rendering environment
 * @returns {boolean}
 */
export const isPreRendering = () => {
  if (Platform.OS !== 'web') return false;
  
  return (
    typeof window !== 'undefined' && 
    (window.navigator.userAgent.includes('ReactSnap') || 
     window.navigator.userAgent.includes('Puppeteer') ||
     window.navigator.userAgent.includes('Headless'))
  );
};

/**
 * Check if we're being crawled by a search engine bot
 * @returns {boolean}
 */
export const isSearchEngineBot = () => {
  if (Platform.OS !== 'web') return false;
  
  if (typeof window === 'undefined' || !window.navigator) return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot',
    'discordbot',
    'slackbot',
    'curl',
    'wget',
    'python',
    'reactsnap',
    'puppeteer',
    'headless'
  ];
  
  return botPatterns.some(pattern => userAgent.includes(pattern));
};

/**
 * Get the current route path for pre-rendering
 * @returns {string}
 */
export const getCurrentRoutePath = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '/';
  
  return window.location.pathname;
};

/**
 * Check if the current route is an SEO landing page
 * @returns {boolean}
 */
export const isSEOLandingPage = () => {
  const path = getCurrentRoutePath();
  const seoPaths = [
    '/dog-boarding-colorado-springs',
    '/dog-walker-colorado-springs',
    '/cat-sitting-colorado-springs',
    '/exotic-pet-care-colorado-springs',
    '/ferret-sitter-colorado-springs',
    '/bird-boarding-colorado-springs',
    '/horse-sitting-colorado',
    '/reptile-sitter-colorado-springs',
    '/pet-boarding-colorado-springs',
    '/dog-sitting-colorado-springs'
  ];
  
  return seoPaths.includes(path);
};

/**
 * Get SEO metadata for a specific route
 * @param {string} routePath - The route path
 * @returns {Object} SEO metadata
 */
export const getSEOMetadata = (routePath) => {
  const seoConfigs = {
    '/dog-boarding-colorado-springs': {
      title: 'Dog Boarding Colorado Springs | Trusted Pet Care | CrittrCove',
      description: 'Find reliable dog boarding services in Colorado Springs. Professional pet sitters providing overnight care for your furry friends. Book trusted local dog boarding today.',
      keywords: 'dog boarding colorado springs, pet boarding, overnight dog care, dog sitters, pet care colorado springs'
    },
    '/dog-walker-colorado-springs': {
      title: 'Dog Walker Colorado Springs | Professional Pet Walking | CrittrCove',
      description: 'Professional dog walking services in Colorado Springs. Reliable pet walkers for daily exercise and care. Book trusted dog walkers in your neighborhood today.',
      keywords: 'dog walker colorado springs, pet walking, dog exercise, professional dog walkers, pet care services'
    },
    '/cat-sitting-colorado-springs': {
      title: 'Cat Sitting Colorado Springs | Professional Cat Care | CrittrCove',
      description: 'Trusted cat sitting services in Colorado Springs. Professional cat sitters providing in-home care for your feline friends. Book reliable cat care today.',
      keywords: 'cat sitting colorado springs, cat sitters, feline care, in-home cat care, pet sitting services'
    },
    '/exotic-pet-care-colorado-springs': {
      title: 'Exotic Pet Care Colorado Springs | Specialized Pet Services | CrittrCove',
      description: 'Expert exotic pet care in Colorado Springs. Specialized services for reptiles, birds, ferrets, and unique pets. Professional exotic animal care you can trust.',
      keywords: 'exotic pet care colorado springs, reptile care, bird care, ferret care, unusual pet services, specialized pet care'
    },
    '/ferret-sitter-colorado-springs': {
      title: 'Ferret Sitter Colorado Springs | Specialized Ferret Care | CrittrCove',
      description: 'Professional ferret sitting services in Colorado Springs. Experienced ferret sitters providing specialized care for your furry friends. Book trusted ferret care.',
      keywords: 'ferret sitter colorado springs, ferret care, specialized pet care, exotic pet sitting'
    },
    '/bird-boarding-colorado-springs': {
      title: 'Bird Boarding Colorado Springs | Avian Care Services | CrittrCove',
      description: 'Professional bird boarding and avian care in Colorado Springs. Experienced bird sitters for parrots, canaries, and all feathered friends. Trusted bird care services.',
      keywords: 'bird boarding colorado springs, avian care, bird sitters, parrot care, bird sitting services'
    },
    '/horse-sitting-colorado': {
      title: 'Horse Sitting Colorado | Equine Care Services | CrittrCove',
      description: 'Professional horse sitting and equine care throughout Colorado. Experienced horse sitters providing quality care for your horses. Trusted equine services.',
      keywords: 'horse sitting colorado, equine care, horse sitters, horse boarding, equine services'
    },
    '/reptile-sitter-colorado-springs': {
      title: 'Reptile Sitter Colorado Springs | Specialized Reptile Care | CrittrCove',
      description: 'Expert reptile sitting services in Colorado Springs. Professional reptile sitters for snakes, lizards, and all cold-blooded pets. Specialized reptile care.',
      keywords: 'reptile sitter colorado springs, snake care, lizard care, reptile sitting, specialized reptile care'
    },
    '/pet-boarding-colorado-springs': {
      title: 'Pet Boarding Colorado Springs | All Pet Types Welcome | CrittrCove',
      description: 'Comprehensive pet boarding services in Colorado Springs. Professional care for dogs, cats, exotic pets, and more. Trusted overnight pet care services.',
      keywords: 'pet boarding colorado springs, all pet types, overnight pet care, professional pet boarding, animal care services'
    },
    '/dog-sitting-colorado-springs': {
      title: 'Dog Sitting Colorado Springs | In-Home Dog Care | CrittrCove',
      description: 'Professional dog sitting services in Colorado Springs. Reliable dog sitters providing in-home care and companionship for your dogs. Book trusted dog sitting.',
      keywords: 'dog sitting colorado springs, in-home dog care, dog sitters, pet sitting services, canine care, professional dog care'
    }
  };
  
  return seoConfigs[routePath] || {
    title: 'CrittrCove - Professional Pet Care Services in Colorado Springs',
    description: 'Find trusted pet care professionals in Colorado Springs. Dog walking, cat sitting, and exotic pet care services.',
    keywords: 'pet care colorado springs, dog walking, cat sitting, exotic pet care, pet sitters'
  };
};

/**
 * Update document metadata for SEO
 * @param {string} routePath - The current route path
 */
export const updateDocumentMetadata = (routePath) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  
  const metadata = getSEOMetadata(routePath);
  
  // Update title
  if (document.title !== metadata.title) {
    document.title = metadata.title;
  }
  
  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    document.head.appendChild(metaDescription);
  }
  metaDescription.content = metadata.description;
  
  // Update meta keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement('meta');
    metaKeywords.name = 'keywords';
    document.head.appendChild(metaKeywords);
  }
  metaKeywords.content = metadata.keywords;
  
  debugLog('MBA9999: Updated document metadata for SEO', {
    routePath,
    title: metadata.title,
    description: metadata.description
  });
};

/**
 * Initialize pre-rendering optimizations
 */
export const initializePreRendering = () => {
  if (Platform.OS !== 'web') return;
  
  const isPreRenderingEnv = isPreRendering();
  const isBot = isSearchEngineBot();
  const currentPath = getCurrentRoutePath();
  
  debugLog('MBA9999: Pre-rendering initialization', {
    isPreRendering: isPreRenderingEnv,
    isBot,
    currentPath,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
  });
  
  // Update metadata for SEO
  if (isPreRenderingEnv || isBot) {
    updateDocumentMetadata(currentPath);
  }
  
  return {
    isPreRendering: isPreRenderingEnv,
    isBot,
    currentPath
  };
};

export default {
  isPreRendering,
  isSearchEngineBot,
  getCurrentRoutePath,
  isSEOLandingPage,
  getSEOMetadata,
  updateDocumentMetadata,
  initializePreRendering
}; 