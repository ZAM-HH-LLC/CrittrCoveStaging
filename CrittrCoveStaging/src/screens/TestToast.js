import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useToast } from '../components/ToastProvider';
import { theme } from '../styles/theme';

const TestToast = () => {
  const showToast = useToast();

  const showSuccessToast = () => {
    showToast({
      message: 'Success! Operation completed successfully.',
      type: 'success',
      duration: 3000
    });
  };

  const showErrorToast = () => {
    showToast({
      message: 'Error! Something went wrong.',
      type: 'error',
      duration: 3000
    });
  };

  const showInfoToast = () => {
    showToast({
      message: 'Info: This is an informational message.',
      type: 'info',
      duration: 3000
    });
  };

  const showWarningToast = () => {
    showToast({
      message: 'Warning: This action may have consequences.',
      type: 'warning',
      duration: 3000
    });
  };

  const showLongToast = () => {
    showToast({
      message: 'This is a longer toast message that will stay visible for 5 seconds to demonstrate how longer messages look.',
      type: 'info',
      duration: 5000
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Toast Notification Test</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Show Success Toast" 
          onPress={showSuccessToast}
          color={theme.colors.primary}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Show Error Toast" 
          onPress={showErrorToast}
          color={theme.colors.error}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Show Info Toast" 
          onPress={showInfoToast}
          color={theme.colors.info || '#29B6F6'}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Show Warning Toast" 
          onPress={showWarningToast}
          color={theme.colors.warning || '#FFA726'}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Show Long Toast" 
          onPress={showLongToast}
          color="#9C27B0"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: theme.colors.text,
    fontFamily: theme.fonts?.medium?.fontFamily || undefined,
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
    maxWidth: 300,
  }
});

export default TestToast; 