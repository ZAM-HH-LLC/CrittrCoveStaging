import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AuthContext, debugLog } from '../../context/AuthContext';

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
  
  const { screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;

  debugLog("MBA1234 - Screen width:", screenWidth);
  debugLog("MBA1234 - Is desktop:", isDesktop);
  debugLog("MBA1234 - Steps:", steps);
  debugLog("MBA1234 - Current step:", currentStep);

  // Helper function to determine what type of line to render between steps
  const renderLine = (stepIndex) => {
    if (stepIndex < currentStep) {
      // Line between completed steps
      return (
        <View style={[styles.line, styles.completedLine]} />
      );
    } else if (stepIndex === currentStep) {
      // Line after the active step - show progress indicator
      return (
        <View style={styles.progressLine}>
          <View style={styles.progressFilled} />
          <View style={styles.progressEmpty} />
        </View>
      );
    } else {
      // Line between future steps
      return (
        <View style={styles.line} />
      );
    }
  };

  // Render a single step
  const renderStep = (stepName, index) => {
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;

    return (
      <View key={`step-${index}`} style={styles.step}>
        <View style={[
          styles.stepCircle,
          isActive && styles.activeStepCircle,
          isCompleted && styles.completedStepCircle
        ]}>
          <Text style={[
            styles.stepNumber,
            isActive && styles.activeStepNumber,
            isCompleted && styles.completedStepNumber,
          ]}>{index + 1}</Text>
        </View>
        
        {(isActive || isDesktop) && (
          <Text style={[
            styles.stepName,
            isActive && styles.activeStepName,
          ]}>{stepName}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.container}>
        {steps.map((step, index) => (
          <React.Fragment key={`step-fragment-${index}`}>
            {renderStep(step, index)}
            {index < steps.length - 1 && renderLine(index)}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    width: '100%',
    zIndex: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    zIndex: 3,
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
  },
  activeStepName: {
    color: theme.colors.mainColors.main,
    opacity: 1,
  },
  line: {
    height: 2,
    backgroundColor: theme.colors.border,
    opacity: 0.2,
    flex: 1,
    marginHorizontal: 4,
    zIndex: 1,
  },
  completedLine: {
    backgroundColor: theme.colors.mainColors.main,
    opacity: 1,
  },
  progressLine: {
    flex: 1,
    flexDirection: 'row',
    height: 2,
    marginHorizontal: 4,
    zIndex: 1,
  },
  progressFilled: {
    flex: 1,
    backgroundColor: theme.colors.mainColors.main,
    height: 2,
  },
  progressEmpty: {
    flex: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.2,
    height: 2,
  },
});

export default StepProgressIndicator; 