import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, TouchableOpacity, StatusBar, Text, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, debugLog } from '../context/AuthContext';
import CustomButton from '../components/CustomButton';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { changePassword } from '../api/API';
import { validatePassword, validatePasswordMatch, sanitizeInput } from '../validation/validation';

const { width: screenWidth } = Dimensions.get('window');

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isSignedIn, screenWidth: contextScreenWidth, isCollapsed } = useContext(AuthContext);
  const [token, setToken] = useState(null);
  
  // Validation error states
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const navigation = useNavigation();

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);
    };
    getToken();
  }, []);

  // Enhanced input handlers with real-time sanitization
  const handleCurrentPasswordChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'password');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 8) {
      debugLog('MBA1234: Potentially malicious current password input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setCurrentPassword(sanitizedText);
    setCurrentPasswordError('');
    setError('');
    setSuccess('');
  };

  const handleNewPasswordChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'password');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 8) {
      debugLog('MBA1234: Potentially malicious new password input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setNewPassword(sanitizedText);
    setNewPasswordError('');
    setError('');
    setSuccess('');
  };

  const handleConfirmPasswordChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'password');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 8) {
      debugLog('MBA1234: Potentially malicious confirm password input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setConfirmPassword(sanitizedText);
    setConfirmPasswordError('');
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    let isValid = true;
    
    // Validate current password (basic check)
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      isValid = false;
    }
    
    // Validate new password
    const newPasswordValidation = validatePassword(newPassword);
    setNewPasswordError(newPasswordValidation.message);
    if (!newPasswordValidation.isValid) isValid = false;
    
    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(newPassword, confirmPassword);
    setConfirmPasswordError(passwordMatchValidation.message);
    if (!passwordMatchValidation.isValid) isValid = false;
    
    return isValid;
  };

  const handleChangePassword = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Sanitize inputs before sending to API
      const sanitizedCurrentPassword = sanitizeInput(currentPassword, 'password');
      const sanitizedNewPassword = sanitizeInput(newPassword, 'password');
      
      debugLog('MBA1234: Password change request with sanitized inputs');
      
      await changePassword(sanitizedCurrentPassword, sanitizedNewPassword);
      setSuccess('Password changed successfully!');
      
      // Clear form after successful change
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.navigate('MyProfile', { initialTab: 'settings_payments' });
      }, 2000);
      
    } catch (error) {
      debugLog('MBA1234: Error changing password:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ResetPassword');
  };

  const styles = createStyles(contextScreenWidth, isCollapsed);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.navigate('MyProfile', { initialTab: 'settings_payments' })} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
            <Text style={styles.backText}>Change Password</Text>
          </TouchableOpacity>
          
          <View style={styles.card}>
            <Text style={styles.title}>Change Password</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, currentPasswordError ? styles.errorInput : null]}
                placeholder="Current Password"
                value={currentPassword}
                onChangeText={handleCurrentPasswordChange}
                secureTextEntry={!showCurrentPassword}
                placeholderTextColor={theme.colors.placeHolderText}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <MaterialCommunityIcons
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.placeHolderText}
                />
              </TouchableOpacity>
              {currentPasswordError ? <Text style={styles.errorText}>{currentPasswordError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, newPasswordError ? styles.errorInput : null]}
                placeholder="New Password"
                value={newPassword}
                onChangeText={handleNewPasswordChange}
                secureTextEntry={!showNewPassword}
                placeholderTextColor={theme.colors.placeHolderText}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <MaterialCommunityIcons
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.placeHolderText}
                />
              </TouchableOpacity>
              {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, confirmPasswordError ? styles.errorInput : null]}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={theme.colors.placeHolderText}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MaterialCommunityIcons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.placeHolderText}
                />
              </TouchableOpacity>
              {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <CustomButton 
              title="Change Password" 
              onPress={handleChangePassword}
              disabled={loading}
              style={styles.button}
            />
            
            {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
    transition: 'margin-left 0.3s ease',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  successText: {
    color: theme.colors.success || '#4CAF50',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  loader: {
    marginTop: 10,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default ChangePassword;
