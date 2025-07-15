import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

/**
 * Toast notification component that slides in from the right corner
 * 
 * @param {Object} props Component props
 * @param {boolean} props.visible Whether the toast is visible
 * @param {string} props.message The message to display in the toast
 * @param {string} props.type The type of toast: 'success', 'error', 'info', 'warning'
 * @param {Function} props.onDismiss Callback when toast is dismissed
 * @param {number} props.duration Duration in ms to show toast before auto-dismissing (default: 3000ms)
 */
const Toast = ({ 
  visible, 
  message, 
  type = 'success', 
  onDismiss,
  addMarginBottom,
  duration = 3000
}) => {
  const animation = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning || '#FFA726';
      case 'info':
        return theme.colors.info || '#29B6F6';
      case 'success':
      default:
        return theme.colors.primary;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      case 'info':
        return 'information';
      case 'success':
      default:
        return 'check-circle';
    }
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const animateOut = (callback) => {
    Animated.parallel([
      Animated.timing(animation, {
        toValue: Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(callback);
  };

  useEffect(() => {
    if (visible) {
      // Clear any existing timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Animate in
      animateIn();
      
      // Set timer to automatically dismiss
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    animateOut(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: getBackgroundColor(),
            transform: [{ translateX: animation }],
            opacity: opacity,
            marginBottom: addMarginBottom
          }
        ]}
      >
        <View style={styles.content}>
          <MaterialCommunityIcons name={getIcon()} size={24} color="white" style={styles.icon} />
          <Text style={styles.message} numberOfLines={3} ellipsizeMode="tail">{message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="close" size={18} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 20,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'flex-end'
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12, 
    borderRadius: 8,
    minWidth: 200,
    maxWidth: 300,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? undefined : theme.fonts?.regular?.fontFamily,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  }
});

export default Toast; 