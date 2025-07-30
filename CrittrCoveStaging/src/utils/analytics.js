import { Platform } from 'react-native';
import { debugLog } from './logging';

/**
 * Google Analytics page view tracking for React Navigation
 * Tracks page views when routes change in the app
 */

/**
 * Send page view to Google Analytics 4
 * @param {string} routeName - Name of the route
 * @param {string} path - URL path (optional)
 */
export const trackPageView = (routeName, path = null) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    // Check if gtag is available
    if (typeof window.gtag === 'function') {
      const pagePath = path || window.location.pathname;
      
      debugLog('MBA9999: Tracking page view', {
        routeName,
        pagePath,
        hostname: window.location.hostname
      });

      // Send page_view event to Google Analytics 4
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: routeName
      });
    } else {
      debugLog('MBA9999: gtag not available for page view tracking');
    }
  } catch (error) {
    debugLog('MBA9999: Error tracking page view', error);
  }
};

/**
 * Custom hook to track page views on navigation state changes
 * @param {Object} navigationState - React Navigation state object
 */
export const usePageViewTracking = (navigationState) => {
  const { useEffect, useRef } = require('react');
  
  const previousRouteRef = useRef(null);
  
  useEffect(() => {
    if (!navigationState || !navigationState.routes || navigationState.routes.length === 0) {
      return;
    }

    const currentRoute = navigationState.routes[navigationState.routes.length - 1];
    const currentRouteName = currentRoute.name;
    
    // Only track if route has changed
    if (previousRouteRef.current !== currentRouteName) {
      previousRouteRef.current = currentRouteName;
      
      // Get the current path for web
      let currentPath = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        currentPath = window.location.pathname;
      }
      
      trackPageView(currentRouteName, currentPath);
    }
  }, [navigationState]);
};

/**
 * Initialize analytics tracking
 * Call this once when the app starts
 */
export const initializeAnalytics = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    debugLog('MBA9999: Initializing Google Analytics tracking');
    
    // Track initial page view
    const initialPath = window.location.pathname;
    const initialRoute = initialPath === '/' ? 'Home' : initialPath.split('/').pop() || 'Home';
    
    trackPageView(initialRoute, initialPath);
  }
};

/**
 * Test function to verify analytics tracking is working
 * Call this in development to test the tracking
 */
export const testAnalyticsTracking = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    debugLog('MBA9999: Testing analytics tracking');
    
    // Test page view tracking
    trackPageView('TestRoute', '/test');
    
    // Check if gtag is available
    if (typeof window.gtag === 'function') {
      debugLog('MBA9999: ✅ gtag is available and working');
    } else {
      debugLog('MBA9999: ❌ gtag is not available');
    }
  }
}; 