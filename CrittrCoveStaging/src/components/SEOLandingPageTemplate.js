import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { useSEO, addStructuredData } from '../utils/seoUtils';

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

  // Apply SEO meta tags
  useSEO(seoConfig.title, seoConfig.description, {
    keywords: seoConfig.keywords,
    robots: 'index, follow',
    'viewport': 'width=device-width, initial-scale=1'
  });

  // Add structured data for local business
  React.useEffect(() => {
    if (structuredData) {
      addStructuredData(structuredData);
    }
  }, [structuredData]);

  const handleCTAPress = (route) => {
    navigation.navigate(route);
  };

  const handleInternalLinkPress = (route) => {
    navigation.navigate(route);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityRole={Platform.OS === 'web' ? 'main' : undefined}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text 
          style={styles.mainHeading}
          accessibilityRole={Platform.OS === 'web' ? 'heading' : 'header'}
          accessibilityLevel={1}
        >
          {mainHeading}
        </Text>
        <View style={styles.introContainer}>
          {introContent}
        </View>
      </View>

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
          {faqItems.map((faq, index) => (
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
          ))}
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