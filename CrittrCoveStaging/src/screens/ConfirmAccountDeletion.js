import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useToast } from '../components/ToastProvider';
import { API_BASE_URL } from '../config/config';
import axios from 'axios';
import { AuthContext, SCREEN_WIDTH } from '../context/AuthContext';

const ConfirmAccountDeletion = ({ route, navigation }) => {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const showToast = useToast();
  const { signOut, screenWidth, isCollapsed } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
    };
    updateLayout();
  }, [screenWidth]);

  useEffect(() => {
    // Get token from URL parameters or route params
    let tokenFromUrl = null;
    
    if (Platform.OS === 'web') {
      // Parse token from URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      tokenFromUrl = urlParams.get('token');
    } else {
      // Get from route params for mobile
      tokenFromUrl = route.params?.token;
    }
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Invalid confirmation link. The deletion token is missing.');
    }
  }, [route.params]);

  const handleConfirmDeletion = async () => {
    if (!token) {
      setError('No deletion token provided.');
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/confirm-deletion/`, {
        token: token
      });

      setConfirmed(true);
      
      showToast({
        message: 'Account deletion completed successfully.',
        type: 'success',
        duration: 3000
      });

      // Log out the user after successful deletion
      setTimeout(() => {
        signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }, 3000);

    } catch (error) {
      console.error('Error confirming account deletion:', error);
      
      let errorMessage = 'Failed to confirm account deletion.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      
      showToast({
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('Settings');
  };

  const dynamicStyles = createStyles(screenWidth, isCollapsed);

  if (confirmed) {
    return (
      <View style={dynamicStyles.container}>
        <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
          <View style={dynamicStyles.successContainer}>
            <MaterialCommunityIcons name="check-circle" size={80} color="#4caf50" />
            
            <Text style={dynamicStyles.successTitle}>Account Deletion Confirmed</Text>
            <Text style={dynamicStyles.successMessage}>
              Your CrittrCove account has been successfully deleted.
            </Text>
            
            <View style={dynamicStyles.infoContainer}>
              <Text style={dynamicStyles.infoTitle}>What happened:</Text>
              <Text style={dynamicStyles.infoItem}>• Your profile and personal information have been anonymized</Text>
              <Text style={dynamicStyles.infoItem}>• Any future bookings have been cancelled and other parties notified</Text>
              <Text style={dynamicStyles.infoItem}>• Your name in existing conversations will show as "Deleted User"</Text>
              <Text style={dynamicStyles.infoItem}>• Some data may be retained for legal compliance</Text>
            </View>

            <Text style={dynamicStyles.logoutMessage}>
              You will be logged out automatically in a few seconds.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.header}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={60} 
            color={theme.colors.error} 
          />
          <Text style={dynamicStyles.title}>Confirm Account Deletion</Text>
          <Text style={dynamicStyles.subtitle}>This action cannot be undone</Text>
        </View>

        {error ? (
          <View style={dynamicStyles.errorContainer}>
            <MaterialCommunityIcons name="close-circle" size={40} color={theme.colors.error} />
            <Text style={dynamicStyles.errorTitle}>Error</Text>
            <Text style={dynamicStyles.errorMessage}>{error}</Text>
            
            <TouchableOpacity 
              style={dynamicStyles.backButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={dynamicStyles.backButtonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={dynamicStyles.content}>
            <Text style={dynamicStyles.confirmationText}>
              You're about to permanently delete your CrittrCove account. Are you sure you want to proceed?
            </Text>

            <View style={dynamicStyles.warningContainer}>
              <Text style={dynamicStyles.warningTitle}>⚠️ This will:</Text>
              <Text style={dynamicStyles.warningItem}>• Remove your profile and personal information</Text>
              <Text style={dynamicStyles.warningItem}>• Cancel all future bookings (other parties will be notified)</Text>
              <Text style={dynamicStyles.warningItem}>• Anonymize your name in existing conversations</Text>
              <Text style={dynamicStyles.warningItem}>• Process deletion within 60 days</Text>
            </View>

            <View style={dynamicStyles.retentionInfo}>
              <Text style={dynamicStyles.retentionText}>
                Some data may be retained for legal compliance (financial records, booking history) 
                as outlined in our Terms of Service.
              </Text>
            </View>

            <View style={dynamicStyles.buttonContainer}>
              <TouchableOpacity 
                style={dynamicStyles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[dynamicStyles.confirmButton, loading && dynamicStyles.disabledButton]}
                onPress={handleConfirmDeletion}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={dynamicStyles.confirmButtonText}>Delete My Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (screenWidth, isCollapsed) => {
  const isMobile = screenWidth <= 900;
  const sidebarWidth = isCollapsed ? 60 : 250;
  const leftOffset = !isMobile ? sidebarWidth + 20 : 0;

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginLeft: leftOffset,
    paddingRight: !isMobile ? 40 : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    maxWidth: isMobile ? '100%' : 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '600',
  },
  content: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 15,
    padding: 25,
  },
  confirmationText: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  warningItem: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
    lineHeight: 20,
  },
  retentionInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
  },
  retentionText: {
    fontSize: 12,
    color: theme.colors.secondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: 10,
    marginBottom: 15,
  },
  errorMessage: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  successContainer: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    marginBottom: 25,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 5,
    lineHeight: 20,
  },
  logoutMessage: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  });
};

export default ConfirmAccountDeletion;