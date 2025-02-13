import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { theme } from '../styles/theme';

const FloatingSaveButton = ({ visible, onSave, btnText }) => {
  if (!visible) return null;
//   console.log('visible: ', visible)

  return (
    <View style={[
      styles.floatingButtonContainer,
      Platform.OS === 'web' ? styles.webButton : styles.mobileButton
    ]}>
      <Button 
        mode="contained" 
        onPress={onSave}
        style={styles.floatingButton}
      >
        {btnText}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButtonContainer: {
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  webButton: {
    position: 'sticky',
    bottom: 20,
    backgroundColor: 'transparent',
  },
  mobileButton: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 80 : 100,
    paddingBottom: Platform.OS === 'web' ? 20 : 20,
  },
  floatingButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 25,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: 600,
  },
});

export default FloatingSaveButton;