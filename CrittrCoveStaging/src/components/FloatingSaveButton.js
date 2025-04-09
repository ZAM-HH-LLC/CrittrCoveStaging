import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { theme } from '../styles/theme';
import { AuthContext, debugLog } from '../context/AuthContext';

const FloatingSaveButton = ({ visible, onSave, btnText = "Save Changes" }) => {
  const { screenWidth, isCollapsed } = React.useContext(AuthContext);
  
  // Don't render anything if not visible
  if (!visible) {
    return null;
  }
  
  // Simple logging only when visible
  React.useEffect(() => {
    if (visible) {
      debugLog('MBA230uvj0834h9', 'FloatingSaveButton is visible');
    }
  }, [visible]);

  // Calculate marginLeft to match sidebar on desktop
  const marginLeft = screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0;

  return (
    <View 
      style={[
        styles.floatingButtonContainer,
        Platform.OS === 'web' ? styles.webButton : styles.mobileButton,
        { marginLeft }
      ]}
    >
      <Button 
        mode="contained" 
        onPress={onSave}
        style={styles.floatingButton}
        labelStyle={styles.buttonLabel}
      >
        {btnText}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'fixed',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  webButton: {
    position: 'fixed',
    bottom: 20,
    backgroundColor: 'transparent',
  },
  mobileButton: {
    position: 'fixed',
    bottom: 20,
    backgroundColor: 'transparent',
    width: '100%',
  },
  floatingButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: 600,
    minWidth: 200,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default FloatingSaveButton;