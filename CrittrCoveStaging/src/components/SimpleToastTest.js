import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useToast } from './ToastProvider';

const SimpleToastTest = () => {
  const showToast = useToast();
  
  useEffect(() => {
    // Show a toast automatically when the component mounts
    showToast({
      message: 'Toast component is working!',
      type: 'success',
      duration: 3000
    });
  }, []);
  
  return (
    <View style={styles.container} />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 1,
    height: 1,
  }
});

export default SimpleToastTest; 