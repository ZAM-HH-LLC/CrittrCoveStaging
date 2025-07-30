/**
 * Test script to verify Google Analytics tracking
 * Run this in the browser console to test analytics functionality
 */

// Test function to verify analytics tracking
function testAnalytics() {
  console.log('🧪 Testing Google Analytics tracking...');
  
  // Check if gtag is available
  if (typeof window.gtag === 'function') {
    console.log('✅ gtag is available');
    
    // Test page view tracking
    window.gtag('event', 'page_view', {
      page_path: '/test-analytics',
      page_title: 'Analytics Test'
    });
    
    console.log('✅ Page view tracking test completed');
    console.log('📊 Check Google Analytics dashboard for test event');
  } else {
    console.log('❌ gtag is not available');
    console.log('🔍 Make sure you are on a production/staging domain (not localhost)');
  }
  
  // Check if we're on a domain that should have analytics
  const hostname = window.location.hostname;
  console.log('🌐 Current hostname:', hostname);
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('⚠️  Analytics disabled on localhost for development');
  } else {
    console.log('✅ Analytics should be enabled on this domain');
  }
}

// Export for use in browser console
window.testAnalytics = testAnalytics;

// Auto-run test if this script is loaded
if (typeof window !== 'undefined') {
  console.log('📊 Analytics test script loaded');
  console.log('💡 Run testAnalytics() in console to test tracking');
} 