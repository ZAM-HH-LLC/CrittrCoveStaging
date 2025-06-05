import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { useToast } from '../components/ToastProvider';
import { theme } from '../styles/theme';
import { acceptInvitation, verifyInvitation } from '../api/API';
import { API_BASE_URL } from '../config/config';
import axios from 'axios';
import { debugLog } from '../context/AuthContext';

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

      {/* Invitation debugging section */}
      <View style={{ marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Invitation API Debug</Text>
        
        <TouchableOpacity 
          style={{ 
            backgroundColor: '#3498db', 
            padding: 10, 
            borderRadius: 5, 
            alignItems: 'center',
            marginBottom: 10
          }}
          onPress={async () => {
            try {
              // Get token from input or use a test token
              const token = '29a05c7f-bde2-4e57-8a86-8f6e8062812a'; // Replace with a valid token
              debugLog('MBAnb23ou4bf954 TEST: Verifying invitation token:', token);
              
              // First verify the invitation
              const verifyResult = await verifyInvitation(token);
              debugLog('MBAnb23ou4bf954 TEST: Verification result:', verifyResult);
              
              if (verifyResult.valid) {
                // Try to accept the invitation using the simplified approach
                debugLog('MBAnb23ou4bf954 TEST: Trying to accept invitation with authenticated request');
                try {
                  const acceptResult = await acceptInvitation(token);
                  debugLog('MBAnb23ou4bf954 TEST: Accept result:', acceptResult);
                  
                  showToast({
                    message: 'Invitation accepted successfully!',
                    type: 'success',
                    duration: 3000
                  });
                } catch (acceptError) {
                  debugLog('MBAnb23ou4bf954 TEST: Accept error:', acceptError.message);
                  if (acceptError.response) {
                    debugLog('MBAnb23ou4bf954 TEST: Accept error details:', acceptError.response.data);
                  }
                  
                  showToast({
                    message: `Error: ${acceptError.message}`,
                    type: 'error',
                    duration: 3000
                  });
                }
              } else {
                debugLog('MBAnb23ou4bf954 TEST: Invitation is not valid:', verifyResult.error);
                
                showToast({
                  message: `Invalid invitation: ${verifyResult.error || 'Unknown error'}`,
                  type: 'error',
                  duration: 3000
                });
              }
            } catch (error) {
              debugLog('MBAnb23ou4bf954 TEST: Overall error:', error.message);
              
              showToast({
                message: `Error: ${error.message}`,
                type: 'error',
                duration: 3000
              });
            }
          }}
        >
          <Text style={{ color: 'white' }}>Test Invitation API</Text>
        </TouchableOpacity>
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