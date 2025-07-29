import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { debugLog } from '../utils/logging';

const SiteMap = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const navigation = useNavigation();

  // Handle navigation for SEO pages
  const handleSEONavigation = (url) => {
    // Map URLs to React Navigation route names
    const routeMap = {
      '/dog-boarding-colorado-springs': 'DogBoardingColoradoSprings',
      '/dog-walker-colorado-springs': 'DogWalkerColoradoSprings',
      '/dog-sitting-colorado-springs': 'DogSittingColoradoSprings',
      '/cat-sitting-colorado-springs': 'CatSittingColoradoSprings',
      '/pet-boarding-colorado-springs': 'PetBoardingColoradoSprings',
      '/exotic-pet-care-colorado-springs': 'ExoticPetCareColoradoSprings',
      '/ferret-sitter-colorado-springs': 'FerretSitterColoradoSprings',
      '/reptile-sitter-colorado-springs': 'ReptileSitterColoradoSprings',
      '/bird-boarding-colorado-springs': 'BirdBoardingColoradoSprings',
      '/horse-sitting-colorado': 'HorseSittingColorado'
    };
    
    const routeName = routeMap[url];
    if (routeName) {
      navigation.navigate(routeName);
    }
  };

  // Debug logging to track component lifecycle
  React.useEffect(() => {
    debugLog("MBA1001: SiteMap component mounted", {
      platform: Platform.OS,
      pathname: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : 'mobile'
    });
    
    // Set the page title for SEO
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CrittrCove Sitemap';
      
      // Add meta description for SEO
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = 'Complete sitemap of CrittrCove - Find all pages including pet care services, dog boarding, cat sitting, and more across Colorado Springs.';
    }
    
    // Set loading to false after a short delay to ensure component mounts properly
    const timer = setTimeout(() => {
      debugLog("MBA1001: SiteMap setting loading to false");
      setIsLoading(false);
    }, 100);
    
    return () => {
      debugLog("MBA1001: SiteMap component unmounting");
      clearTimeout(timer);
    };
  }, []);

  // Ensure consistent styling on every focus
  useFocusEffect(
    React.useCallback(() => {
      debugLog("MBA1001: SiteMap component focused", {
        platform: Platform.OS
      });
      
      return () => {
        debugLog("MBA1001: SiteMap component unfocused");
      };
    }, [])
  );

  // Organized page sections to match original structure
  const mainPages = [
    { url: '/', title: 'Home' },
    { url: '/signin', title: 'Sign In' },
    { url: '/signup', title: 'Sign Up' },
    { url: '/SearchProfessionalsListing', title: 'Search Professionals' },
    { url: '/contact-us', title: 'Contact Us' },
    { url: '/privacy-policy', title: 'Privacy Policy' },
    { url: '/terms-of-service', title: 'Terms of Service' }
  ];

  const seoPages = [
    { url: '/dog-boarding-colorado-springs', title: 'Dog Boarding Colorado Springs' },
    { url: '/dog-walker-colorado-springs', title: 'Dog Walker Colorado Springs' },
    { url: '/dog-sitting-colorado-springs', title: 'Dog Sitting Colorado Springs' },
    { url: '/cat-sitting-colorado-springs', title: 'Cat Sitting Colorado Springs' },
    { url: '/pet-boarding-colorado-springs', title: 'Pet Boarding Colorado Springs' },
    { url: '/exotic-pet-care-colorado-springs', title: 'Exotic Pet Care Colorado Springs' },
    { url: '/ferret-sitter-colorado-springs', title: 'Ferret Sitter Colorado Springs' },
    { url: '/reptile-sitter-colorado-springs', title: 'Reptile Sitter Colorado Springs' },
    { url: '/bird-boarding-colorado-springs', title: 'Bird Boarding Colorado Springs' },
    { url: '/horse-sitting-colorado', title: 'Horse Sitting Colorado' }
  ];

  const blogPages = [
    { url: '/blog', title: 'Blog' },
    { url: '/blog-post?postId=blog_1', title: 'Blog Post 1' },
    { url: '/blog-post?postId=blog_2', title: 'Blog Post 2' },
    { url: '/blog-post?postId=blog_3', title: 'Blog Post 3' }
  ];

  const totalPages = mainPages.length + seoPages.length + blogPages.length;

  // Early return with loading state if needed
  if (isLoading) {
    debugLog("MBA1001: SiteMap showing loading state");
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Site Map - CrittrCove</Text>
          <Text style={styles.description}>Loading site map...</Text>
        </View>
      </View>
    );
  }

  debugLog("MBA1001: SiteMap rendering full content with", { urlCount: totalPages });

  // On web, render with proper HTML semantics for SEO
  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <div style={webStyles.sitemapContainer}>
          <h1 style={webStyles.title}>Site Map - CrittrCove</h1>
          <p style={webStyles.description}>
            CrittrCove is a comprehensive pet care platform connecting pet owners with professional 
            pet sitters, walkers, and caregivers across Colorado. Find reliable care for dogs, cats, 
            exotic pets, horses, and more.
          </p>
          
          <div style={webStyles.linksContainer}>
            <h2 style={webStyles.sectionTitle}>Main Pages ({mainPages.length})</h2>
            <p style={webStyles.sectionDescription}>Core pages for user interaction and platform functionality</p>
            <ul style={webStyles.linksList}>
              {mainPages.map((item, index) => (
                <li key={index} style={webStyles.linkItem}>
                  <a 
                    href={item.url} 
                    style={webStyles.link}
                    title={`Navigate to ${item.title}`}
                  >
                    {item.title}
                  </a>
                  <span style={webStyles.urlPath}>{item.url}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={webStyles.linksContainer}>
            <h2 style={webStyles.sectionTitle}>SEO Pages ({seoPages.length})</h2>
            <p style={webStyles.sectionDescription}>Specialized pages for different pet care services in Colorado Springs</p>
            <ul style={webStyles.linksList}>
              {seoPages.map((item, index) => (
                <li key={index} style={webStyles.linkItem}>
                  <a 
                    href="#" 
                    style={webStyles.link}
                    title={`Navigate to ${item.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSEONavigation(item.url);
                    }}
                  >
                    {item.title}
                  </a>
                  <span style={webStyles.urlPath}>{item.url}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={webStyles.linksContainer}>
            <h2 style={webStyles.sectionTitle}>Blog Pages ({blogPages.length})</h2>
            <p style={webStyles.sectionDescription}>Educational content and blog posts about pet care</p>
            <ul style={webStyles.linksList}>
              {blogPages.map((item, index) => (
                <li key={index} style={webStyles.linkItem}>
                  <a 
                    href={item.url} 
                    style={webStyles.link}
                    title={`Navigate to ${item.title}`}
                  >
                    {item.title}
                  </a>
                  <span style={webStyles.urlPath}>{item.url}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <footer style={webStyles.footer}>
            <p style={webStyles.footerText}>
              Last updated: {new Date().toLocaleDateString()} | Total pages: {totalPages}
            </p>
          </footer>
        </div>
      </ScrollView>
    );
  }

  // Mobile fallback with React Native components
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Site Map - CrittrCove</Text>
        <Text style={styles.description}>
          CrittrCove is a comprehensive pet care platform connecting pet owners with professional 
          pet sitters, walkers, and caregivers across Colorado.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Main Pages ({mainPages.length})</Text>
        {mainPages.map((item, index) => (
          <View key={index} style={styles.linkItem}>
            <Text style={styles.linkTitle}>{item.title}</Text>
            <Text style={styles.linkPath}>{item.url}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SEO Pages ({seoPages.length})</Text>
        {seoPages.map((item, index) => (
          <View key={index} style={styles.linkItem}>
            <Text style={styles.linkTitle}>{item.title}</Text>
            <Text style={styles.linkPath}>{item.url}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blog Pages ({blogPages.length})</Text>
        {blogPages.map((item, index) => (
          <View key={index} style={styles.linkItem}>
            <Text style={styles.linkTitle}>{item.title}</Text>
            <Text style={styles.linkPath}>{item.url}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleDateString()} | Total pages: {totalPages}
        </Text>
      </View>
    </ScrollView>
  );
};

// Web-specific styles for proper HTML rendering
const webStyles = {
  sitemapContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    color: '#333'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '20px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    padding: '30px',
    borderRadius: '10px',
    margin: '0 0 40px 0'
  },
  description: {
    fontSize: '1.1rem',
    color: '#6c757d',
    marginBottom: '40px',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '0 auto 40px auto'
  },
  linksContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e9ecef'
  },
  sectionDescription: {
    fontSize: '0.9rem',
    color: '#6c757d',
    marginBottom: '15px',
    fontStyle: 'italic'
  },
  linksList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  linkItem: {
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    transition: 'all 0.3s ease'
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    display: 'block',
    marginBottom: '5px'
  },
  urlPath: {
    color: '#6c757d',
    fontSize: '13px',
    fontFamily: 'Courier New, monospace',
    display: 'block'
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid #e9ecef',
    marginTop: '40px'
  },
  footerText: {
    color: '#6c757d',
    fontSize: '14px'
  }
};

// React Native styles for mobile fallback
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#667eea',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 25,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  linkItem: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 10,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#667eea',
    marginBottom: 5,
  },
  linkPath: {
    fontSize: 13,
    color: '#6c757d',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 20,
  },
  footerText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SiteMap; 