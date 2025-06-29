import { Platform } from 'react-native';
import { debugLog } from './logging';

/**
 * Platform-aware navigation utilities
 * Provides consistent navigation APIs across web and mobile platforms
 */

/**
 * Get current route information in a platform-safe way
 * @param {Object} navigation - React Navigation object (optional for web)
 * @param {Object} route - React Navigation route object (optional for web)
 * @returns {Object} Current route information
 */
export const getCurrentRoute = (navigation = null, route = null) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    try {
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/').filter(Boolean);
      const routeName = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'Home';
      
      return {
        name: routeName,
        path: currentPath,
        params: getURLParams(),
        href: window.location.href
      };
    } catch (error) {
      debugLog('MBA9999: Error accessing window.location:', error);
      return {
        name: 'Home',
        path: '/',
        params: {},
        href: 'web://error'
      };
    }
  } else if (route) {
    return {
      name: route.name || 'home',
      path: `/${route.name || 'home'}`,
      params: route.params || {},
      href: `app://${route.name || 'home'}`
    };
  } else {
    // Mobile fallback when no route is provided
    return {
      name: 'Home',
      path: '/home',
      params: {},
      href: 'app://home'
    };
  }
};

/**
 * Get URL parameters in a platform-safe way
 * @returns {Object} URL parameters
 */
export const getURLParams = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }
  return {};
};

/**
 * Navigate back in a platform-aware way
 * @param {Object} navigation - React Navigation object
 * @returns {boolean} Whether back navigation was successful
 */
export const goBack = (navigation) => {
  if (!navigation) {
    debugLog('MBA9999: goBack called without navigation object');
    return false;
  }

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // On web, try browser history first
      if (window.history.length > 1) {
        window.history.back();
        return true;
      }
    }
    
    // For mobile or fallback, use React Navigation
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    
    // If can't go back, navigate to Dashboard
    navigation.navigate('Dashboard');
    return true;
  } catch (error) {
    debugLog('MBA9999: Error in goBack:', error);
    return false;
  }
};

/**
 * Navigate to a specific route in a platform-aware way
 * @param {Object} navigation - React Navigation object
 * @param {string} routeName - Name of the route to navigate to
 * @param {Object} params - Navigation parameters
 */
export const navigateTo = (navigation, routeName, params = {}) => {
  if (!navigation) {
    debugLog('MBA9999: navigateTo called without navigation object');
    return;
  }

  try {
    navigation.navigate(routeName, params);
  } catch (error) {
    debugLog('MBA9999: Error in navigateTo:', error);
  }
};

/**
 * Replace current route in a platform-aware way (like browser replaceState)
 * @param {Object} navigation - React Navigation object
 * @param {string} routeName - Name of the route to replace with
 * @param {Object} params - Navigation parameters
 */
export const replaceRoute = (navigation, routeName, params = {}) => {
  if (!navigation) {
    debugLog('MBA9999: replaceRoute called without navigation object');
    return;
  }

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        // On web, update the URL without adding to history
        const newUrl = new URL(window.location.href);
        newUrl.pathname = `/${routeName.toLowerCase()}`;
        
        // Add params to URL
        Object.keys(params).forEach(key => {
          if (params[key] !== null && params[key] !== undefined) {
            newUrl.searchParams.set(key, params[key]);
          }
        });
        
        window.history.replaceState({}, '', newUrl.toString());
      } catch (error) {
        debugLog('MBA9999: Error in replaceRoute web logic:', error);
      }
    }
    
    // Use React Navigation replace
    navigation.replace(routeName, params);
  } catch (error) {
    debugLog('MBA9999: Error in replaceRoute:', error);
  }
};

/**
 * Update URL parameters without navigation (web only)
 * @param {Object} params - Parameters to set in URL
 * @param {boolean} replace - Whether to replace current history entry
 */
export const updateURLParams = (params = {}, replace = true) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location) {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    
    // Update search parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        currentUrl.searchParams.set(key, params[key]);
      } else {
        currentUrl.searchParams.delete(key);
      }
    });

    // Update the URL
    if (replace) {
      window.history.replaceState({}, '', currentUrl.toString());
    } else {
      window.history.pushState({}, '', currentUrl.toString());
    }
  } catch (error) {
    debugLog('MBA9999: Error in updateURLParams:', error);
  }
};

/**
 * Get URL hash in a platform-safe way
 * @returns {string} URL hash without the # symbol
 */
export const getURLHash = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hash.substring(1); // Remove the #
  }
  return '';
};

/**
 * Set URL hash in a platform-safe way (web only)
 * @param {string} hash - Hash to set (without #)
 */
export const setURLHash = (hash) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.hash = hash ? `#${hash}` : '';
  }
};

/**
 * Listen for navigation changes in a platform-aware way
 * @param {Function} callback - Function to call when navigation changes
 * @returns {Function} Cleanup function
 */
export const addNavigationListener = (callback) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const handlePopState = (event) => {
      const routeInfo = getCurrentRoute();
      callback(routeInfo, event);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }
  
  // For mobile, navigation listeners should be handled by React Navigation
  return () => {};
};

/**
 * Check if running on web platform
 * @returns {boolean}
 */
export const isWeb = () => Platform.OS === 'web';

/**
 * Check if running on mobile platform
 * @returns {boolean}
 */
export const isMobile = () => Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Get platform-safe user agent string
 * @returns {string}
 */
export const getUserAgent = () => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return `React Native ${Platform.OS} ${Platform.Version || 'unknown'}`;
};

/**
 * Redirect to signin page in a platform-aware way
 * @param {Object} navigation - React Navigation object
 */
export const redirectToSignIn = (navigation) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    try {
      // On web, use URL navigation
      if (window.location.hash) {
        window.location.hash = '#/signin';
      } else {
        window.location.href = '/signin';
      }
    } catch (error) {
      debugLog('MBA9999: Error in web redirectToSignIn:', error);
    }
  } else if (navigation) {
    // On mobile, use React Navigation
    navigation.navigate('SignIn');
  }
};

export default {
  getCurrentRoute,
  getURLParams,
  goBack,
  navigateTo,
  replaceRoute,
  updateURLParams,
  getURLHash,
  setURLHash,
  addNavigationListener,
  isWeb,
  isMobile,
  getUserAgent,
  redirectToSignIn
}; 