import React from 'react';
import { View, Text, StyleSheet, Animated, Platform, Dimensions } from 'react-native';
import { theme } from '../styles/theme';

const SnackBar = ({ visible, message, type = 'success' }) => {
  const [animation] = React.useState(new Animated.Value(0));
  const windowHeight = Dimensions.get('window').height;

  React.useEffect(() => {
    let showAnimation;
    let hideAnimation;
    let hideTimer;

    if (visible) {
      // Show snackbar
      showAnimation = Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      });
      showAnimation.start();

      // Hide after 3 seconds
      hideTimer = setTimeout(() => {
        hideAnimation = Animated.timing(animation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        });
        hideAnimation.start();
      }, 3000);
    }

    return () => {
      if (showAnimation) showAnimation.stop();
      if (hideAnimation) hideAnimation.stop();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { height: windowHeight }]}>
      <Animated.View
        style={[
          styles.container,
          { 
            backgroundColor: type === 'error' ? theme.colors.error : theme.colors.primary,
            opacity: animation,
            transform: [{
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    zIndex: 9999,
    pointerEvents: 'none'
  },
  container: {
    width: '90%',
    maxWidth: 300,
    padding: 16,
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  message: {
    color: theme.colors.whiteText,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default SnackBar; 