import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
  position = 'bottomRight', // bottomRight, bottomLeft, topRight, topLeft
  userRole,
  is_DEBUG = false
}) => {
  const isFirstStep = step === 1;
  const isLastStep = step === totalSteps;
  const [isVisible, setIsVisible] = useState(true);
  const [currentScreen, setCurrentScreen] = useState(null);
  const navigation = useNavigation();

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

  return (
    <View style={[styles.container, getPositionStyles()]}>
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

          {!isLastStep && (
            <TouchableOpacity style={styles.navigationButton} onPress={handleNext}>
              <Text style={styles.navigationText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    width: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
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
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.header.fontFamily,
  },
  description: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 20,
    lineHeight: 20,
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