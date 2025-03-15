import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';

/**
 * @typedef {Object} StepProgressIndicatorProps
 * @property {string[]} steps - Array of step names
 * @property {number} currentStep - Current active step (0-based index)
 * @property {function} [onStepPress] - Optional callback when a step is pressed
 * @property {Object} [style] - Optional style overrides
 */

const StepProgressIndicator = props => {
  const {
    steps,
    currentStep,
    onStepPress,
    style,
  } = props;
  
  const { screenWidth, is_DEBUG } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;

  if (is_DEBUG) {
    console.log("MBA1234 - Screen width:", screenWidth);
    console.log("MBA1234 - Is desktop:", isDesktop);
  }

  /**
   * Renders a single step in the progress indicator
   * @param {string} stepName - The name of the step
   * @param {number} index - The index of the step
   * @returns {React.ReactElement} The rendered step
   */
  const renderStep = (stepName, index) => {
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;
    
    // Only show step name if it's the active step (on mobile) or if we're in desktop view
    const shouldShowStepName = isActive || isDesktop;

    return (
      <View 
        key={index} 
        style={[
          styles.stepRow,
          isDesktop && styles.desktopStepRow
        ]}
      >
        <View style={styles.stepNumberAndName}>
          <View style={[
            styles.stepCircle,
            isActive && styles.activeStepCircle,
            isCompleted && styles.completedStepCircle
          ]}>
            <Text style={[
              styles.stepNumber,
              isActive && styles.activeStepNumber,
              isCompleted && styles.completedStepNumber,
            ]}>
              {index + 1}
            </Text>
          </View>

          {shouldShowStepName && (
            <Text style={[
              styles.stepName,
              isActive && styles.activeStepName,
              isDesktop ? styles.desktopStepName : styles.mobileStepName
            ]}>
              {stepName}
            </Text>
          )}
        </View>

        {index < steps.length - 1 && (
          <View style={[
            styles.stepProgressContainer,
            isDesktop && styles.desktopProgressContainer
          ]}>
            {isActive ? (
              <View style={styles.progressIndicator}>
                <View style={styles.progressLine} />
                <View style={styles.remainingLine} />
              </View>
            ) : (
              <View style={[
                styles.stepLine,
                isCompleted && styles.completedStepLine
              ]} />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, style]}>
      {isDesktop ? (
        <View style={[
          styles.container,
          styles.desktopContainer
        ]}>
          {steps.map((step, index) => renderStep(step, index))}
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollContainer}
        >
          <View style={styles.container}>
            {steps.map((step, index) => renderStep(step, index))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.background,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mobileScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: '100%',
  },
  desktopContainer: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 40,
  },
  desktopStepRow: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 16,
  },
  stepNumberAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  activeStepCircle: {
    backgroundColor: theme.colors.mainColors.main,
    borderColor: theme.colors.mainColors.main,
  },
  completedStepCircle: {
    backgroundColor: theme.colors.mainColors.main,
    borderColor: theme.colors.mainColors.main,
    opacity: 0.8,
  },
  stepNumber: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.5,
  },
  activeStepNumber: {
    color: theme.colors.surface,
    opacity: 1,
  },
  completedStepNumber: {
    color: theme.colors.surface,
  },
  stepName: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    marginLeft: 8,
    flexShrink: 1,
  },
  mobileStepName: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 120,
  },
  desktopStepName: {
    whiteSpace: 'nowrap',
  },
  activeStepName: {
    color: theme.colors.mainColors.main,
    opacity: 1,
  },
  stepProgressContainer: {
    flex: 0,
    minWidth: 40,
    maxWidth: 60,
    paddingHorizontal: 8,
  },
  desktopProgressContainer: {
    width: 60,
  },
  progressIndicator: {
    flexDirection: 'row',
    height: 2,
    width: '100%',
  },
  progressLine: {
    flex: 1,
    backgroundColor: theme.colors.mainColors.main,
  },
  remainingLine: {
    flex: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.2,
  },
  stepLine: {
    height: 1,
    width: '100%',
    backgroundColor: theme.colors.border,
    opacity: 0.2,
  },
  completedStepLine: {
    backgroundColor: theme.colors.mainColors.main,
    opacity: 1,
  },
});

export default StepProgressIndicator; 