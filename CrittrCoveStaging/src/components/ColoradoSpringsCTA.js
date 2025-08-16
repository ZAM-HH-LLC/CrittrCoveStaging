import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { navigateToFrom } from './Navigation';
import { isInColorado } from '../utils/geocoding';
import * as Location from 'expo-location';
import { AuthContext } from '../context/AuthContext';
import { trackBlogVisitor } from '../api/API';

const ColoradoSpringsCTA = ({ navigation, variant = 'default' }) => {
  const { isSignedIn, loading: authLoading } = useContext(AuthContext);
  const [showCTA, setShowCTA] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Don't show CTA for authenticated users
    if (isSignedIn) {
      setShowCTA(false);
      setLoading(false);
      return;
    }

    if (!authLoading) {
      checkUserLocationAndTrack();
    }
  }, [isSignedIn, authLoading]);

  const checkUserLocationAndTrack = async () => {
    try {
      // First check if we can detect Colorado Springs from browser geolocation
      if (Platform.OS === 'web' && navigator.geolocation) {
        // Try to get user's location with a timeout
        const timeoutId = setTimeout(() => {
          // If geolocation takes too long, assume Colorado Springs user
          setShowCTA(true);
          setLoading(false);
        }, 3000);

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            clearTimeout(timeoutId);
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            
            // Track visitor location for analytics
            try {
              // Get the full URL with query parameters for blog post identification
              const pageUrl = window.location.pathname + window.location.search;
              const externalReferrer = document.referrer && !document.referrer.includes(window.location.hostname) 
                ? document.referrer 
                : '';
              
              await trackBlogVisitor({
                latitude,
                longitude,
                page: pageUrl,
                user_agent: navigator.userAgent,
                referrer: externalReferrer
              });
            } catch (trackingError) {
              console.log('Blog visitor tracking failed (non-critical):', trackingError.message);
            }
            
            // Check if user is in Colorado
            if (isInColorado(latitude, longitude)) {
              setShowCTA(true);
            } else {
              // Still show CTA for non-Colorado users but with different messaging
              setShowCTA(true);
            }
            setLoading(false);
          },
          () => {
            clearTimeout(timeoutId);
            // If geolocation fails, still show CTA (assume they might be in Colorado Springs)
            setShowCTA(true);
            setLoading(false);
          },
          { timeout: 3000, enableHighAccuracy: false }
        );
      } else if (Platform.OS !== 'web') {
        // Mobile: use expo-location
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
              timeout: 3000
            });
            
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });
            
            // Track visitor location for analytics (mobile)
            try {
              await trackBlogVisitor({
                latitude,
                longitude,
                page: 'mobile_blog_app',
                user_agent: 'mobile_app',
                referrer: ''
              });
            } catch (trackingError) {
              console.log('Mobile blog visitor tracking failed (non-critical):', trackingError.message);
            }
            
            if (isInColorado(latitude, longitude)) {
              setShowCTA(true);
            } else {
              setShowCTA(true); // Show anyway
            }
          } else {
            setShowCTA(true); // Show CTA if permission denied
          }
        } catch (error) {
          setShowCTA(true); // Show CTA if error
        }
        setLoading(false);
      } else {
        // Fallback: always show CTA
        setShowCTA(true);
        setLoading(false);
      }
    } catch (error) {
      // Fallback: always show CTA
      setShowCTA(true);
      setLoading(false);
    }
  };

  const handleClientSignup = () => {
    if (isSignedIn) {
      // If user is already signed in, navigate to search or home instead
      navigateToFrom(navigation, 'Search', 'Blog');
    } else {
      navigateToFrom(navigation, 'SignUp', 'Blog', { userType: 'client' });
    }
  };

  const handleProfessionalSignup = () => {
    if (isSignedIn) {
      // If user is already signed in, navigate to profile or professional dashboard
      navigateToFrom(navigation, 'MyProfile', 'Blog');
    } else {
      navigateToFrom(navigation, 'SignUp', 'Blog', { userType: 'professional' });
    }
  };

  const isInColoradoSprings = userLocation && isInColorado(userLocation.latitude, userLocation.longitude);

  if (loading || !showCTA) {
    return null;
  }

  // Different variants for different placements
  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.colors.primary + '10' }]}>
        <View style={styles.compactContent}>
          <MaterialCommunityIcons name="paw" size={24} color={theme.colors.primary} />
          <Text style={[styles.compactText, { color: theme.colors.text }]}>
            {isInColoradoSprings ? 'Join CrittrCove in Colorado Springs!' : 'Join CrittrCove today!'}
          </Text>
        </View>
        <View style={styles.compactButtons}>
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleClientSignup}
          >
            <Text style={[styles.compactButtonText, { color: theme.colors.surface }]}>Find Care</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compactButton, styles.compactButtonSecondary, { borderColor: theme.colors.primary }]}
            onPress={handleProfessionalSignup}
          >
            <Text style={[styles.compactButtonText, { color: theme.colors.primary }]}>Provide Care</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default full CTA
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary + '08' }]}>
      <View style={[styles.ctaCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="paw" size={32} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            {isInColoradoSprings ? 'Join Colorado Springs Pet Community!' : 'Join CrittrCove Today!'}
          </Text>
        </View>

        <Text style={[styles.description, { color: theme.colors.text }]}>
          {isInColoradoSprings 
            ? 'Connect with trusted pet care professionals in your Colorado Springs neighborhood.'
            : 'Connect with trusted pet care professionals in Colorado Springs and beyond.'
          }
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleClientSignup}
          >
            <MaterialCommunityIcons name="heart-outline" size={20} color={theme.colors.surface} />
            <Text style={[styles.buttonText, { color: theme.colors.surface }]}>
              Find Pet Care
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary }]}
            onPress={handleProfessionalSignup}
          >
            <MaterialCommunityIcons name="account-plus-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              Become a Professional
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <MaterialCommunityIcons name="shield-check" size={16} color={theme.colors.secondary} />
            <Text style={[styles.featureText, { color: theme.colors.placeHolderText }]}>
              Background Checked professionals (optional)
            </Text>
          </View>
          <View style={styles.feature}>
            <MaterialCommunityIcons name="message-text" size={16} color={theme.colors.secondary} />
            <Text style={[styles.featureText, { color: theme.colors.placeHolderText }]}>
              Direct messaging
            </Text>
          </View>
          <View style={styles.feature}>
            <MaterialCommunityIcons name="calendar-check" size={16} color={theme.colors.secondary} />
            <Text style={[styles.featureText, { color: theme.colors.placeHolderText }]}>
              Easy booking
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  ctaCard: {
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    fontFamily: theme.fonts.header.fontFamily,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: Platform.OS === 'web' ? 1 : 0,
  },
  primaryButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: Platform.OS === 'web' ? 1 : 0,
    minWidth: '30%',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 6,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  // Compact variant styles
  compactContainer: {
    marginVertical: 16,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  compactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  compactButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ColoradoSpringsCTA;