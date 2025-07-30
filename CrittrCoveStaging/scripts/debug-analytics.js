/**
 * Debug script to troubleshoot Google Analytics issues
 * Copy and paste this entire function into your browser console
 */

function debugAnalytics() {
  console.log('🔍 Debugging Google Analytics...');
  
  // Check environment
  const hostname = window.location.hostname;
  console.log('🌐 Hostname:', hostname);
  console.log('🔗 Full URL:', window.location.href);
  
  // Check if we're on a domain that should have analytics
  const shouldHaveAnalytics = hostname !== 'localhost' && hostname !== '127.0.0.1';
  console.log('📊 Should have analytics:', shouldHaveAnalytics);
  
  // Check if gtag is available
  const gtagAvailable = typeof window.gtag === 'function';
  console.log('✅ gtag available:', gtagAvailable);
  
  // Check if dataLayer exists
  const dataLayerExists = Array.isArray(window.dataLayer);
  console.log('📦 dataLayer exists:', dataLayerExists);
  
  if (dataLayerExists) {
    console.log('📊 dataLayer contents:', window.dataLayer);
  }
  
  // Test sending a page view event
  if (gtagAvailable && shouldHaveAnalytics) {
    console.log('🧪 Testing page view event...');
    
    try {
      window.gtag('event', 'page_view', {
        page_path: '/debug-test',
        page_title: 'Debug Test'
      });
      console.log('✅ Page view event sent successfully');
    } catch (error) {
      console.error('❌ Error sending page view event:', error);
    }
  }
  
  // Check for any console errors
  console.log('🔍 Check the Network tab for any failed requests to googletagmanager.com');
  
  // Provide next steps
  console.log('\n📋 Next steps:');
  console.log('1. Make sure you\'re on staging.crittrcove.com or production domain');
  console.log('2. Check browser console for any errors');
  console.log('3. Check Network tab for failed requests');
  console.log('4. Wait 1-2 minutes for data to appear in GA4');
  console.log('5. Check Real-time reports in GA4 dashboard');
}

// Export for use in browser console
window.debugAnalytics = debugAnalytics;

// Auto-run debug if this script is loaded
if (typeof window !== 'undefined') {
  console.log('🔍 Analytics debug script loaded');
  console.log('💡 Run debugAnalytics() in console to diagnose issues');
} 