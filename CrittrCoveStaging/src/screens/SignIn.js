import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Platform, Keyboard, SafeAreaView, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/config';
import { navigateToFrom } from '../components/Navigation';
import { validateEmail, validatePassword, sanitizeInput } from '../validation/validation';
import { debugLog } from '../context/AuthContext';
import { updateTimeSettings } from '../api/API';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import platformNavigation from '../utils/platformNavigation';

const { width: screenWidth } = Dimensions.get('window');

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigation = useNavigation();
  const { signIn, is_prototype, is_DEBUG } = useContext(AuthContext);
  const route = useRoute();

  const validateForm = () => {
    let isValid = true;
    
    // Validate email
    const emailValidation = validateEmail(email.trim());
    setEmailError(emailValidation.message);
    if (!emailValidation.isValid) isValid = false;
    
    // Validate password
    const passwordValidation = validatePassword(password);
    setPasswordError(passwordValidation.message);
    if (!passwordValidation.isValid) isValid = false;
    
    return isValid;
  };

  // Enhanced input handlers with real-time sanitization
  const handleEmailChange = (text) => {
    debugLog('MBA7777: Email input change:', text);
    
    const sanitizedText = sanitizeInput(text, 'email');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 20 && text.length > 5) {
      debugLog('MBA7777: Potentially malicious email input detected in SignIn:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      // Still update with sanitized version, don't block completely
    }
    
    // Always update with sanitized version to ensure UI reflects sanitization
    setEmail(sanitizedText);
    setEmailError('');
  };

  const handlePasswordChange = (text) => {
    debugLog('MBA7777: Password input change:', text);
    
    const sanitizedText = sanitizeInput(text, 'password');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 8) {
      debugLog('MBA7777: Potentially malicious password input detected in SignIn:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      // Still update with sanitized version, don't block completely
    }
    
    // Always update with sanitized version to ensure UI reflects sanitization
    setPassword(sanitizedText);
    setPasswordError('');
  };

  const handleLogin = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Keyboard.dismiss();
    }

    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      debugLog('MBA67890 Starting login process');
      debugLog('MBA67890 API Base URL:', API_BASE_URL);
      debugLog('MBA67890 Login request details:', {
        url: `${API_BASE_URL}/api/token/`,
        method: 'POST',
        data: {
          email: email.trim().toLowerCase(),
          password: '***' // masked for security
        }
      });

      debugLog('MBA67890 Attempting to authenticate with backend');
      
      // Sanitize inputs before sending to API
      const sanitizedEmail = sanitizeInput(email, 'email');
      const sanitizedPassword = sanitizeInput(password, 'password');
      
      debugLog('MBA9876: Login attempt with sanitized inputs', {
        originalEmail: email,
        sanitizedEmail,
        passwordChanged: password !== sanitizedPassword
      });
      
      // Create a direct axios instance without interceptors for login
      const directAxios = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await directAxios.post('/api/token/', {
        email: sanitizedEmail.toLowerCase(),
        password: sanitizedPassword,
      });

      const { access, refresh } = response.data;
      
      debugLog('MBA67890 Authentication successful, received tokens');
      
      // Use the signIn function from AuthContext to properly set up authentication
      await signIn(access, refresh);

      // Update time settings after successful login
      try {
        let userTimezone = 'UTC';
        try {
          userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
          debugLog('MBA9876: Error detecting timezone', error);
        }
        
        await updateTimeSettings(userTimezone, false);
        debugLog('MBA9876: Time settings updated successfully');
      } catch (timeError) {
        debugLog('MBA9876: Error updating time settings (non-critical)', timeError);
      }

      // Navigate to the appropriate screen
      const fromScreen = route.params?.from;
      if (fromScreen) {
        navigateToFrom(navigation, fromScreen);
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      debugLog('MBA9876: Login error:', error.response?.data || error.message);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.response) {
        const errorData = error.response.data;
        if (errorData) {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      }
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Login Failed', errorMessage);
      } else {
        setSuccessMessage(errorMessage);
      }

      setEmailError('Invalid email or password');
      setPasswordError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to handle document-wide keyboard events
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleDocumentKeyPress = (e) => {
        if (e.key === 'Enter') {
          handleLogin();
        }
      };

      document.addEventListener('keydown', handleDocumentKeyPress);

      // Cleanup listener when component unmounts
      return () => {
        document.removeEventListener('keydown', handleDocumentKeyPress);
      };
    }
  }, [email, password]); // Dependencies ensure we have latest state values

  // Keep the existing handleKeyPress for input fields
  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handleLogin();
    }
  };

  // Add this inside the SignIn component, after any existing useEffect
  useEffect(() => {
    // Check if we're on web and have an invitation token in the URL
    if (Platform.OS === 'web') {
      const currentRouteInfo = platformNavigation.getCurrentRoute();
      const url = currentRouteInfo.path;
      debugLog('MBA5555 SignIn screen - Current URL path:', url);
      
      if (url.includes('/invite/')) {
        // Extract token and redirect to signup
        const pathParts = url.split('/');
        const inviteIndex = pathParts.findIndex(part => part === 'invite');
        if (inviteIndex !== -1 && pathParts.length > inviteIndex + 1) {
          const token = pathParts[inviteIndex + 1];
          debugLog('MBA5555 SignIn detected invite token, redirecting to SignUp:', token);
          // Navigate to SignUp with the token
          navigation.navigate('SignUp', { token });
        }
      }
    }
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Log in</Text>
        
        {is_prototype && (
          <Text style={styles.prototypeWarning}>
            Prototype Mode: You can sign in with anything for email and password
          </Text>
        )}
        
        <View style={styles.createAccountContainer}>
          <Text style={styles.createAccountText}>Need a CrittrCove account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.createAccountLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputLabelContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={[styles.input, emailError ? styles.errorInput : null]}
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>
        
        <View style={styles.inputLabelContainer}>
          <View style={styles.passwordLabelContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TouchableOpacity onPress={togglePasswordVisibility}>
              <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, passwordError ? styles.errorInput : null]}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={handlePasswordChange}
            onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>
        
        <View style={styles.rememberMeContainer}>
          <TouchableOpacity 
            style={styles.checkbox} 
            onPress={() => setRememberMe(!rememberMe)}
          >
            {rememberMe && (
              <View style={styles.checkboxInner}>
                <MaterialCommunityIcons name="check" size={14} color={theme.colors.whiteText} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.rememberMeText}>Keep me logged in</Text>
        </View>
        
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>
        
        {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}
        {successMessage ? <Text style={styles.message}>{successMessage}</Text> : null}
        
        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')} style={styles.forgotPasswordContainer}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.medium,
  },
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: theme.spacing.large * 1.5,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: theme.fontSizes.extraLarge * 1.4,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.medium,
    textAlign: 'left',
  },
  createAccountContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.large,
  },
  createAccountText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginRight: 5,
  },
  createAccountLink: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  inputLabelContainer: {
    marginBottom: theme.spacing.medium,
  },
  inputLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    fontWeight: '500',
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  showHideText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.smallMedium,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingHorizontal: theme.spacing.small * 1.5,
    fontSize: theme.fontSizes.medium,
    backgroundColor: theme.colors.surfaceContrast,
  },
  errorInput: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.smallMedium,
    marginTop: 4,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.large,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 20,
    height: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.small * 1.75,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
  },
  loginButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.small,
  },
  link: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.smallMedium,
  },
  message: {
    marginTop: theme.spacing.small,
    color: theme.colors.error,
    fontSize: theme.fontSizes.smallMedium,
    textAlign: 'center',
  },
  prototypeWarning: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
    padding: theme.spacing.small * 1.5,
    marginBottom: theme.spacing.medium,
    borderRadius: 4,
    textAlign: 'center',
  },
});
