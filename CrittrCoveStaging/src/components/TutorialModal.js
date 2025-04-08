import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { debugLog } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const TutorialModal = ({
  step,
  totalSteps,
  title,
  description,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  onFinish,
  position = 'bottomRight', // bottomRight, bottomLeft, topRight, topLeft
  userRole,
  is_DEBUG = false
}) => {
  const isFirstStep = step === 1;
  const isLastStep = step === totalSteps;
  const [isVisible, setIsVisible] = useState(true);
  const [currentScreen, setCurrentScreen] = useState(null);
  const navigation = useNavigation();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(1)).current;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (is_DEBUG) {
      debugLog('MBA54321 TutorialModal mounted/updated', {
        isVisible,
        currentStep: step,
        userRole,
        screen: currentScreen
      });
    }
  }, [isVisible, step, userRole, currentScreen]);

  useEffect(() => {
    // Ensure the tutorial stays visible during screen changes
    if (isVisible) {
      debugLog('MBA54321 Tutorial is visible, ensuring it stays visible on screen change');
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Add a focus listener to ensure the tutorial stays visible when the screen changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isVisible) {
        debugLog('MBA54321 Screen focused, ensuring tutorial stays visible');
        setIsVisible(true);
      }
    });

    return unsubscribe;
  }, [navigation, isVisible]);

  // Animation effect
  useEffect(() => {
    // Fade in animation for modal
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Animate from center to final position
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Fade out the overlay as the modal slides
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleNext = () => {
    if (is_DEBUG) {
      debugLog('MBA54321 TutorialModal handleNext called', { step, totalSteps });
    }
    onNext();
  };

  const handlePrevious = () => {
    if (is_DEBUG) {
      debugLog('MBA54321 TutorialModal handlePrevious called', { step, totalSteps });
    }
    onPrevious();
  };

  const handleSkip = () => {
    if (is_DEBUG) {
      debugLog('MBA54321 TutorialModal handleSkip called');
    }
    onSkip();
  };

  const handleClose = () => {
    if (is_DEBUG) {
      debugLog('MBA54321 TutorialModal handleClose called');
    }
    onClose();
  };

  const handleFinish = () => {
    if (is_DEBUG) {
      debugLog('MBA54321 TutorialModal handleFinish called');
    }
    onFinish();
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'bottomRight':
        return {
          bottom: 20,
          right: 20,
        };
      case 'bottomLeft':
        return {
          bottom: 20,
          left: 20,
        };
      case 'topRight':
        return {
          top: 20,
          right: 20,
        };
      case 'topLeft':
        return {
          top: 20,
          left: 20,
        };
      default:
        return {
          bottom: 20,
          right: 20,
        };
    }
  };

  // Calculate the initial position (center of screen)
  const initialPosition = {
    top: (height + 60) / 2 - 150,
    left: (width - 15) / 2 - 160,
  };

  // Get the final position
  const finalPosition = getPositionStyles();

  // Calculate the slide animation values
  const slideStyle = {
    transform: [
      {
        translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, finalPosition.right ? width/2 - 160 : -width/2 + 160],
        }),
      },
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, finalPosition.bottom ? height/2 - 150 : -height/2 + 150],
        }),
      },
    ],
  };

  return (
    <>
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayAnim }
        ]}
        pointerEvents="none"
      />
      <Animated.View 
        style={[
          styles.container, 
          initialPosition,
          { opacity: fadeAnim },
          slideStyle
        ]}
      >
        <View style={styles.pulseBorder} />
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.footer}>
            <View style={styles.leftButtons}>
              {isFirstStep ? (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipText}>Skip Tutorial</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.navigationButton} onPress={handlePrevious}>
                  <MaterialCommunityIcons name="chevron-left" size={20} color={theme.colors.primary} />
                  <Text style={styles.navigationText}>Previous</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>{step}/{totalSteps}</Text>
            </View>

            {isLastStep ? (
              <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                <Text style={styles.finishText}>Finish Tutorial</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.navigationButton} onPress={handleNext}>
                <Text style={styles.navigationText}>Next</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    width: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 1000,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  pulseBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 14,
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  content: {
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
    fontFamily: theme.fonts.header.fontFamily,
  },
  description: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
    lineHeight: 22,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  leftButtons: {
    flex: 1,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navigationText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  finishButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  finishText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  stepIndicator: {
    paddingHorizontal: 12,
  },
  stepText: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default TutorialModal; 