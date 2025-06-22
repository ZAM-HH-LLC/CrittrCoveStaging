import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, ActivityIndicator, Dimensions, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext, debugLog } from '../context/AuthContext';
import CustomButton from '../components/CustomButton';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { validateEmail, sanitizeInput } from '../validation/validation';

const { width: screenWidth } = Dimensions.get('window');

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigation = useNavigation();
  const { screenWidth: contextScreenWidth, isCollapsed, isSignedIn } = useContext(AuthContext);

  // Enhanced input handler with real-time sanitization
  const handleEmailChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'email');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 20 && text.length > 5) {
      debugLog('MBA1234: Potentially malicious email input detected in ResetPassword:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setEmail(sanitizedText);
    setEmailError('');
    setSuccessMessage('');
  };

  const handleResetPassword = async () => {
    // Validate email before proceeding
    const emailValidation = validateEmail(email);
    setEmailError(emailValidation.message);
    
    if (!emailValidation.isValid) {
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      // Sanitize email before sending to API
      const sanitizedEmail = sanitizeInput(email, 'email');
      
      debugLog('MBA1234: Password reset request for sanitized email:', {
        originalEmail: email,
        sanitizedEmail
      });

      const response = await axios.post(`${API_BASE_URL}/api/users/v1/reset-password/`, {
        email: sanitizedEmail.toLowerCase(),
      });

      if (response.status === 200) {
        setSuccessMessage('If an account with this email exists, you will receive a password reset link shortly.');
        setEmail('');
      }
    } catch (error) {
      debugLog('MBA1234: Error during password reset:', error);
      
      let errorMessage = 'Error: Unable to process password reset request.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      }
      
      setSuccessMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(contextScreenWidth, isCollapsed, isSignedIn);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {isSignedIn && (
            <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
              <Text style={styles.backText}>Reset Password</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.placeHolderText}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            
            <CustomButton 
              title="Reset Password" 
              onPress={handleResetPassword}
              disabled={loading}
              style={styles.button}
            />
            
            {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}
            {successMessage ? <Text style={[styles.message, successMessage.includes('Error') && styles.errorMessage]}>{successMessage}</Text> : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (screenWidth, isCollapsed, isSignedIn) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginLeft: (screenWidth > 900 && isSignedIn) ? (isCollapsed ? 70 : 250) : 0,
    transition: 'margin-left 0.3s ease',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  backText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 12,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  button: {
    marginBottom: 20,
  },
  loader: {
    marginTop: 10,
  },
  message: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontSize: 14,
    marginTop: 10,
  },
  errorMessage: {
    color: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 10,
  },
});
