import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Platform, Keyboard, SafeAreaView, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/config';
import { navigateToFrom } from '../components/Navigation';
import { validateEmail, validatePassword } from '../validation/validation';
import { debugLog } from '../context/AuthContext';
import { updateTimeSettings } from '../api/API';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigation = useNavigation();
  const { signIn, is_prototype, is_DEBUG } = useContext(AuthContext);

  const validateForm = () => {
    let isValid = true;
    
    // Validate email
    const emailValidation = validateEmail(email);
    setEmailError(emailValidation.message);
    if (!emailValidation.isValid) isValid = false;
    
    // Validate password
    const passwordValidation = validatePassword(password);
    setPasswordError(passwordValidation.message);
    if (!passwordValidation.isValid) isValid = false;
    
    return isValid;
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

      debugLog('MBA67890 Attempting to authenticate with backend');
      
      const response = await axios.post(`${API_BASE_URL}/api/token/`, {
        email: email.toLowerCase(),
        password: password,
      });

      const { access, refresh } = response.data;
      
      debugLog('MBA67890 Authentication successful, received tokens');
      
      // Pass both tokens to signIn and get the status
      const status = await signIn(access, refresh, navigation);
      debugLog('MBA67890 Sign in status:', status);
      
      // After successful login, detect and send timezone to backend
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        debugLog('MBA67890 Detected timezone:', timezone);
        console.log('MBA67890 Detected timezone:', timezone);
        // Pass only the timezone parameter, useMilitaryTime is optional
        await updateTimeSettings(timezone);
        debugLog('MBA67890 Successfully updated timezone in backend');
      } catch (timezoneError) {
        debugLog('MBA67890 Error updating timezone:', timezoneError);
        // Continue with login process even if timezone update fails
      }
      
      // Check if user needs to complete tutorial
      try {
        const tutorialResponse = await axios.get(`${API_BASE_URL}/api/users/v1/tutorial-status/current/`);
        const needsTutorial = tutorialResponse.data.first_time_logging_in || 
                             tutorialResponse.data.first_time_logging_in_after_signup;
        
        debugLog('MBA67890 Tutorial status:', tutorialResponse.data);
        debugLog('MBA67890 Needs tutorial:', needsTutorial);
        
        // Navigate based on tutorial status
        if (needsTutorial) {
          debugLog('MBA67890 Navigating to MyProfile for tutorial');
          navigateToFrom(navigation, 'MyProfile', 'SignIn');
        } else {
          debugLog('MBA67890 Navigating to Dashboard');
          navigateToFrom(navigation, 'Dashboard', 'SignIn');
        }
      } catch (tutorialError) {
        debugLog('MBA67890 Error checking tutorial status:', tutorialError);
        // Default to Dashboard if tutorial check fails
        navigateToFrom(navigation, 'Dashboard', 'SignIn');
      }
    } catch (error) {
      debugLog('MBA67890 Login failed', error.response?.data || error.message);
      
      const errorMessage = error.response && error.response.status === 401
        ? 'Invalid credentials. Please try again.'
        : 'An unexpected error occurred.';

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Login Failed', errorMessage);
      } else {
        setSuccessMessage(`Login Failed: ${errorMessage}`);
      }

      setEmailError('Invalid email or password');
      setPasswordError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to handle document-wide keyboard events
  useEffect(() => {
    if (Platform.OS === 'web') {
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
      const url = window.location.pathname;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      {is_prototype && (
        <Text style={styles.prototypeWarning}>
          Prototype Mode: You can sign in with anything for email and password
        </Text>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, emailError ? styles.errorInput : null]}
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError('');
          }}
          autoCapitalize="none"
          onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, passwordError ? styles.errorInput : null]}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError('');
          }}
          onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>
      
      <CustomButton title="Login" onPress={handleLogin} />
      {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}
      {successMessage ? <Text style={styles.message}>{successMessage}</Text> : null}
      <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.link}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', // Center the content horizontally
  },
  title: {
    fontSize: theme.fontSizes.large,
    color: theme.colors.primary,
    marginBottom: theme.spacing.medium,
  },
  inputContainer: {
    width: screenWidth > 600 ? 600 : '100%',
    maxWidth: 600,
    marginBottom: theme.spacing.small,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: theme.spacing.small,
    borderRadius: 4,
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  link: {
    color: theme.colors.primary,
    marginTop: theme.spacing.small,
    textAlign: 'center',
  },
  message: {
    marginTop: theme.spacing.small,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
  prototypeWarning: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
    padding: theme.spacing.small,
    marginBottom: theme.spacing.medium,
    borderRadius: 4,
    textAlign: 'center',
    width: screenWidth > 600 ? 600 : '100%',
    maxWidth: 600,
  },
});
