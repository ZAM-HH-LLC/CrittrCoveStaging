// Utility to fix viewport height issues on mobile browsers (especially iOS)
// This helps with the "100vh" problem on mobile browsers where the address bar affects viewport height

export const applyViewportFix = () => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Only apply on web
    const setVh = () => {
      // First we get the viewport height and multiply it by 1% to get a value for a vh unit
      const vh = window.innerHeight * 0.01;
      // Then we set the value in the --vh custom property to the root of the document
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // We listen to the resize event
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    
    // Initial call
    setVh();

    // Return cleanup function
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }
  
  return () => {}; // Return empty cleanup function for non-web platforms
};

// CSS equivalent to use in stylesheets:
// height: calc(var(--vh, 1vh) * 100); 