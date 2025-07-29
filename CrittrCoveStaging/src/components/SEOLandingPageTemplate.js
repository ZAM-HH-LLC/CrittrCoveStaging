import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { useSEO, addStructuredData } from '../utils/seoUtils';
import { debugLog } from '../utils/logging';

/**
 * Reusable SEO Landing Page Template
 * Provides consistent structure and styling for all landing pages
 */
const SEOLandingPageTemplate = ({
  seoConfig,
  mainHeading,
  introContent,
  whyCrittrCoveContent,
  faqItems,
  internalLinks,
  structuredData
}) => {
  const navigation = useNavigation();

  debugLog("MBA2iovno5rn: SEOLandingPageTemplate component rendering", {
    platform: Platform.OS,
    seoConfigTitle: seoConfig?.title,
    mainHeading,
    hasIntroContent: !!introContent,
    hasWhyCrittrCoveContent: !!whyCrittrCoveContent,
    faqItemsCount: faqItems?.length || 0,
    internalLinksCount: internalLinks?.length || 0,
    hasStructuredData: !!structuredData
  });

  // Ensure we have valid data to prevent white screens
  if (!seoConfig || !mainHeading) {
    debugLog("MBA2iovno5rn: Missing required props for SEO template", {
      hasSeoConfig: !!seoConfig,
      hasMainHeading: !!mainHeading
    });
    
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.mainHeading}>Loading...</Text>
          <Text>Please wait while we load the page content.</Text>
        </View>
      </View>
    );
  }

  // Apply SEO meta tags
  useSEO(seoConfig.title, seoConfig.description, {
    keywords: seoConfig.keywords,
    robots: 'index, follow',
    'viewport': 'width=device-width, initial-scale=1'
  });

  // Add structured data for local business
  React.useEffect(() => {
    debugLog("MBA2iovno5rn: SEOLandingPageTemplate useEffect triggered", {
      hasStructuredData: !!structuredData,
      structuredDataType: typeof structuredData
    });
    
    if (structuredData) {
      addStructuredData(structuredData);
    }
  }, [structuredData]);

  const handleCTAPress = (route) => {
    debugLog("MBA2iovno5rn: CTA button pressed", { route });
    navigation.navigate(route);
  };

  const handleInternalLinkPress = (route) => {
    debugLog("MBA2iovno5rn: Internal link pressed", { route });
    navigation.navigate(route);
  };

  debugLog("MBA2iovno5rn: SEOLandingPageTemplate about to render ScrollView", {
    containerStyle: styles.container,
    contentContainerStyle: styles.contentContainer,
    accessibilityRole: Platform.OS === 'web' ? 'main' : undefined
  });

    try {
    debugLog("MBA2iovno5rn: Rendering SEO template with ScrollView", {
      containerStyle: styles.container,
      contentContainerStyle: styles.contentContainer
    });
    
    return (
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        accessibilityRole={Platform.OS === 'web' ? 'main' : undefined}
      >
        {debugLog("MBA2iovno5rn: ScrollView children starting to render", {
          mainHeading,
          hasIntroContent: !!introContent,
          hasWhyCrittrCoveContent: !!whyCrittrCoveContent
        })}
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {debugLog("MBA2iovno5rn: Hero section rendering", {
            mainHeading,
            heroSectionStyle: styles.heroSection
          })}
          
          <Text 
            style={styles.mainHeading}
            accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
            accessibilityLevel={1}
          >
            {mainHeading}
          </Text>
          
          {debugLog("MBA2iovno5rn: Main heading rendered, now rendering intro container", {
            introContainerStyle: styles.introContainer
          })}
          
          <View style={styles.introContainer}>
            {introContent}
          </View>
        </View>

      {debugLog("MBA2iovno5rn: Hero section completed, now rendering Why CrittrCove section", {
        sectionStyle: styles.section,
        hasWhyCrittrCoveContent: !!whyCrittrCoveContent
      })}
      
      {/* Why CrittrCove Section */}
      <View 
        style={styles.section}
        accessibilityRole={Platform.OS === 'web' ? 'region' : undefined}
        accessibilityLabel="Why Choose CrittrCove"
      >
        <Text 
          style={styles.sectionHeading}
          accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
          accessibilityLevel={2}
        >
          Why Choose CrittrCove?
        </Text>
        <View style={styles.sectionContent}>
          {whyCrittrCoveContent}
        </View>
      </View>

      {debugLog("MBA2iovno5rn: Why CrittrCove section completed, now rendering FAQ section", {
        faqItemsCount: faqItems?.length || 0
      })}
      
      {/* FAQ Section */}
      <View 
        style={styles.section}
        accessibilityRole={Platform.OS === 'web' ? 'region' : undefined}
        accessibilityLabel="Frequently Asked Questions"
      >
        <Text 
          style={styles.sectionHeading}
          accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
          accessibilityLevel={2}
        >
          Frequently Asked Questions
        </Text>
        <View style={styles.faqContainer}>
          {faqItems.map((faq, index) => {
            debugLog(`MBA2iovno5rn: Rendering FAQ item ${index}`, {
              question: faq.question,
              answerLength: faq.answer?.length || 0
            });
            return (
              <View key={index} style={styles.faqItem}>
                <Text 
                  style={styles.faqQuestion}
                  accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
                  accessibilityLevel={3}
                >
                  {faq.question}
                </Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Internal Links Section */}
      {internalLinks && internalLinks.length > 0 && (
        <View 
          style={styles.section}
          accessibilityRole={Platform.OS === 'web' ? 'navigation' : undefined}
          accessibilityLabel="Related Services"
        >
          <Text 
            style={styles.sectionHeading}
            accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
            accessibilityLevel={2}
          >
            Other Pet Care Services
          </Text>
          <View style={styles.internalLinksContainer}>
            {internalLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.internalLink}
                onPress={() => handleInternalLinkPress(link.route)}
                accessibilityRole="link"
                accessibilityLabel={`View ${link.text}`}
              >
                <Text style={styles.internalLinkText}>{link.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* CTA Section */}
      <View 
        style={styles.ctaSection}
        accessibilityRole={Platform.OS === 'web' ? 'region' : undefined}
        accessibilityLabel="Get Started"
      >
        <Text 
          style={styles.ctaHeading}
          accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
          accessibilityLevel={2}
        >
          Ready to Get Started?
        </Text>
        <Text style={styles.ctaSubtext}>
          Join the CrittrCove community today and connect with trusted pet care professionals.
        </Text>
        <View style={styles.ctaButtons}>
          <TouchableOpacity
            style={[styles.ctaButton, styles.primaryCTA]}
            onPress={() => handleCTAPress('SignUp')}
            accessibilityRole="button"
            accessibilityLabel="Sign up as a pet owner"
          >
            <Text style={styles.primaryCTAText}>Sign Up Today</Text>
          </TouchableOpacity>
        </View>
              </View>
      </ScrollView>
    );
  } catch (error) {
    debugLog("MBA2iovno5rn: Error rendering SEOLandingPageTemplate", {
      error: error.message,
      stack: error.stack
    });
    
    // Fallback simple view
    return (
      <View style={styles.container}>
        <Text style={styles.mainHeading}>Error Loading Page</Text>
        <Text>Please try refreshing the page.</Text>
      </View>
    );
  }
  };

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingVertical: 32,
    maxWidth: Platform.OS === 'web' ? 1200 : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: '100%',
  },
  heroSection: {
    marginBottom: 48,
    textAlign: Platform.OS === 'web' ? 'center' : 'left',
  },
  mainHeading: {
    fontSize: Platform.OS === 'web' ? 42 : 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
    lineHeight: Platform.OS === 'web' ? 50 : 38,
    textAlign: Platform.OS === 'web' ? 'center' : 'left',
  },
  introContainer: {
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
  },
  section: {
    marginBottom: 40,
  },
  sectionHeading: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    lineHeight: Platform.OS === 'web' ? 38 : 28,
  },
  sectionContent: {
    // Content styling handled by parent
  },
  faqContainer: {
    // FAQ items container
  },
  faqItem: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
  },
  faqQuestion: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: Platform.OS === 'web' ? 26 : 22,
  },
  faqAnswer: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: theme.colors.textSecondary,
    lineHeight: Platform.OS === 'web' ? 24 : 20,
  },
  internalLinksContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
    gap: 12,
  },
  internalLink: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: Platform.OS === 'web' ? 12 : 0,
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  internalLinkText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
  },
  ctaSection: {
    backgroundColor: '#f8f9fa',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaHeading: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtext: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: Platform.OS === 'web' ? 26 : 22,
  },
  ctaButtons: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    width: '100%',
    maxWidth: 500,
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: Platform.OS === 'web' ? 1 : 0,
  },
  primaryCTA: {
    backgroundColor: theme.colors.primary,
  },
  primaryCTAText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryCTA: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryCTAText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
};

export default SEOLandingPageTemplate; 