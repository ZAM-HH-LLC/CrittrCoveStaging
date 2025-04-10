import React, { createContext, useState, useContext, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from './Toast';

// Create context
const ToastContext = createContext();

/**
 * Hook to use the toast functionality
 * @returns {Function} showToast - Function to show a toast
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Provider component that wraps your app and provides toast functionality
 */
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
    duration: 3000,
  });

  // Function to show a toast notification
  const showToast = useCallback(({ message, type = 'success', duration = 3000 }) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
    });
  }, []);

  // Function to hide the toast
  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      <View style={styles.container}>
        {children}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onDismiss={hideToast}
        />
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  }
});

export default ToastProvider; 