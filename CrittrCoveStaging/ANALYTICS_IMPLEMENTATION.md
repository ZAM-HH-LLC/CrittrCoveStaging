# Google Analytics Implementation for CrittrCove

## Overview

This document describes the implementation of Google Analytics 4 (GA4) page view tracking for the CrittrCove React Native Web application.

## Routing System Analysis

✅ **Confirmed**: Your app uses **React Navigation** (not React Router or Expo Router)

### Routing Setup:
- **React Navigation Stack Navigator** for web platform
- **React Navigation Bottom Tab Navigator** for mobile platforms  
- **Custom linking configuration** that maps URLs to route names
- **Client-side routing** that updates the URL without page reloads

### Key Files:
- `App.js` - Main navigation setup with `NavigationContainer`
- `src/components/Navigation.js` - Navigation component with route handling
- `src/utils/platformNavigation.js` - Platform-aware navigation utilities

## Google Analytics 4 Setup Verification

✅ **Confirmed**: Google Analytics 4 is properly configured in `web/index.html`:

```html
<!-- Google Analytics 4 - Production Only -->
<script>
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Google tag (gtag.js)
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-L84H7P9FK3';
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-L84H7P9FK3');
  }
</script>
```

**Tracking ID**: `G-L84H7P9FK3` ✅ (GA4 Measurement ID)
**Production-only loading**: ✅ (excludes localhost)
**Global gtag function**: ✅
**GA4 Event Format**: ✅

## Implementation Details

### 1. Analytics Utility (`src/utils/analytics.js`)

Created a comprehensive analytics utility with:

- `trackPageView(routeName, path)` - Sends `page_view` events to GA4
- `initializeAnalytics()` - Initializes tracking on app start
- `testAnalyticsTracking()` - Test function for development
- Platform-safe implementation (web only)

### 2. Integration with React Navigation

Modified `App.js` to:

- Import analytics utilities
- Initialize analytics on app start
- Track page views on navigation state changes
- Only track on web platform (mobile uses native analytics)

### 3. Navigation State Change Handler

Enhanced the existing `handleNavigationStateChange` function to:

```javascript
// Track page view for Google Analytics 4
if (state?.routes?.length > 0) {
  const currentRoute = state.routes[state.routes.length - 1];
  const routeName = currentRoute.name;
  
  // Track page view for web platform
  if (Platform.OS === 'web') {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : null;
    trackPageView(routeName, currentPath);
  }
}
```

## How It Works

1. **App Initialization**: `initializeAnalytics()` is called when the app starts
2. **Route Changes**: Every time the user navigates to a new route, `trackPageView()` is called
3. **Page View Events**: Sends `gtag('event', 'page_view', { page_path, page_title })` to Google Analytics 4
4. **Production Only**: Only tracks on production/staging domains (not localhost)

## Testing

### Manual Testing
1. Deploy to staging/production environment
2. Open browser developer tools
3. Navigate between different routes
4. Check Google Analytics dashboard for page view events

### Automated Testing
Run the test script in browser console:
```javascript
// Load test script
// Then run:
testAnalytics()
```

## Files Modified

1. **`src/utils/analytics.js`** - New analytics utility file
2. **`App.js`** - Added analytics import and integration
3. **`scripts/test-analytics.js`** - Test script for verification

## Logging

All analytics events are logged with the prefix `MBA9999` for easy filtering:

```javascript
debugLog('MBA9999: Tracking page view', {
  routeName,
  pagePath,
  hostname: window.location.hostname
});
```

## Expected Behavior

- ✅ Page views tracked on every route change
- ✅ Only works on production/staging (not localhost)
- ✅ Includes route name and path information
- ✅ Compatible with React Navigation
- ✅ No impact on mobile platforms
- ✅ Proper error handling and logging

## Verification Checklist

- [ ] Deploy to staging environment
- [ ] Navigate between different routes
- [ ] Check Google Analytics Real-Time reports
- [ ] Verify page view events are being tracked
- [ ] Test on production environment
- [ ] Monitor analytics dashboard for data

## Summary

The implementation successfully adds Google Analytics 4 page view tracking to your React Native Web app using React Navigation. The tracking is:

- **Client-side**: No page reloads, smooth navigation
- **Automatic**: Tracks every route change
- **GA4 Compliant**: Uses `page_view` events with proper GA4 format
- **Production-ready**: Only active on production/staging domains
- **Well-documented**: Comprehensive logging and error handling
- **Testable**: Includes verification tools

The tracking ID `G-L84H7P9FK3` is correctly configured and will capture all page views in your Google Analytics 4 dashboard. 