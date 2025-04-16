import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { API_BASE_URL } from '../config/config';
import { AuthContext, debugLog } from '../context/AuthContext'; // Import AuthContext
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from '../validation/validation';
import { verifyInvitation } from '../api/API';

const { width: screenWidth } = Dimensions.get('window');

export default function SignUp() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signIn, is_DEBUG } = useContext(AuthContext); // Use AuthContext to update auth state

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [verifyingInvite, setVerifyingInvite] = useState(false);
  
  // Validation states
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Check for invitation token when component mounts
  useEffect(() => {
    // Check if we have an invitation token in the route params or URL
    const checkInvitation = async () => {
      try {
        // First check if we're on the 'Invite' screen
        const isInviteScreen = route.name === 'Invite';
        debugLog('MBA4321 Current route name:', route.name);
        
        // Check route params
        let token = route.params?.token;
        debugLog('MBA4321 Token from route params:', token);
        
        // If not in route params, check if we're on web and have it in the URL
        if (!token && Platform.OS === 'web') {
          const url = window.location.pathname;
          debugLog('MBA4321 Current URL path:', url);
          debugLog('MBA4321 Full location object:', {
            pathname: window.location.pathname,
            href: window.location.href,
            search: window.location.search,
            hash: window.location.hash
          });
          
          if (url.includes('/invite/')) {
            // Extract token from invite URL format
            const pathParts = url.split('/');
            const inviteIndex = pathParts.findIndex(part => part === 'invite');
            if (inviteIndex !== -1 && pathParts.length > inviteIndex + 1) {
              token = pathParts[inviteIndex + 1];
              debugLog('MBA4321 Found invitation token from invite URL path:', token);
            }
          } else if (url.includes('/signup/')) {
            // Extract token from signup URL format
            const pathParts = url.split('/');
            const signupIndex = pathParts.findIndex(part => part === 'signup');
            if (signupIndex !== -1 && pathParts.length > signupIndex + 1) {
              token = pathParts[signupIndex + 1];
              debugLog('MBA4321 Found invitation token from signup URL path:', token);
            }
          }
        }
        
        // If we still don't have a token, check the URL search params
        if (!token && Platform.OS === 'web') {
          const searchParams = new URLSearchParams(window.location.search);
          const searchToken = searchParams.get('token');
          if (searchToken) {
            token = searchToken;
            debugLog('MBA4321 Found invitation token from URL search params:', token);
          }
        }
        
        if (token) {
          debugLog('MBA4321 Processing invitation token:', token);
          setInviteToken(token);
          setVerifyingInvite(true);
          
          try {
            // Verify the token with the backend
            const inviteInfo = await verifyInvitation(token);
            debugLog('MBA4321 Invitation verification result:', inviteInfo);
            
            if (inviteInfo.valid) {
              setInviteVerified(true);
              setInviterName(inviteInfo.inviter_name);
              
              // If it's an email invitation, set the email field
              if (inviteInfo.email) {
                setEmail(inviteInfo.email);
              }
              
              setSuccessMessage(`You've been invited by ${inviteInfo.inviter_name}!`);
            } else {
              setSuccessMessage(`This invitation is no longer valid: ${inviteInfo.error}`);
            }
          } catch (error) {
            debugLog('MBA4321 Error verifying invitation:', error);
            setSuccessMessage('This invitation link is invalid or has expired.');
          } finally {
            setVerifyingInvite(false);
          }
        }
      } catch (error) {
        debugLog('MBA4321 Error processing invitation:', error);
        setVerifyingInvite(false);
      }
    };
    
    checkInvitation();
  }, [route.params, route.name]);

  const validateForm = () => {
    let isValid = true;
    
    // Validate first name
    const firstNameValidation = validateName(firstName);
    setFirstNameError(firstNameValidation.message);
    if (!firstNameValidation.isValid) isValid = false;
    
    // Validate last name
    const lastNameValidation = validateName(lastName);
    setLastNameError(lastNameValidation.message);
    if (!lastNameValidation.isValid) isValid = false;
    
    // Validate email
    const emailValidation = validateEmail(email);
    setEmailError(emailValidation.message);
    if (!emailValidation.isValid) isValid = false;
    
    // Validate password
    const passwordValidation = validatePassword(password);
    setPasswordError(passwordValidation.message);
    if (!passwordValidation.isValid) isValid = false;
    
    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
    setConfirmPasswordError(passwordMatchValidation.message);
    if (!passwordMatchValidation.isValid) isValid = false;
    
    return isValid;
  };

  const handleSignUp = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      debugLog('MBA12345 Starting user registration process');
      
      // Get user's timezone and time format preferences
      let userTimezone = 'UTC';
      try {
        // Try to get the timezone using Intl API
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        debugLog('MBA12345 User timezone detected using Intl API', { userTimezone });
      } catch (error) {
        debugLog('MBA12345 Error detecting timezone using Intl API', error);
        // Fallback to a default timezone
        userTimezone = 'UTC';
      }
      
      const useMilitaryTime = false; // Default to non-military time
      
      debugLog('MBA12345 User timezone and preferences', { userTimezone, useMilitaryTime });
      
      // Prepare user data with time settings and invitation token
      const registrationData = {
        ...userData,
        timezone: userTimezone,
        use_military_time: useMilitaryTime,
        invitation_token: inviteToken
      };
      
      // First register the user
      const registerResponse = await axios.post(`${API_BASE_URL}/api/users/v1/register/`, registrationData);
      
      debugLog('MBA12345 User registration successful', registerResponse.data);
      
      // After successful registration, log the user in to get authentication tokens
      debugLog('MBA12345 Attempting to log in with new credentials');
      
      const loginResponse = await axios.post(`${API_BASE_URL}/api/token/`, {
        email: email.toLowerCase(),
        password: password,
      });
      
      debugLog('MBA12345 Login successful, received tokens');
      
      const { access, refresh } = loginResponse.data;
      
      // Use the signIn function from AuthContext to properly set up authentication
      debugLog('MBA12345 Calling signIn function from AuthContext');
      
      await signIn(access, refresh);
      
      debugLog('MBA12345 Authentication setup complete');
      
      // If the user came from an invitation, accept the invitation
      if (inviteToken && inviteVerified) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/users/v1/invitations/${inviteToken}/accept/`,
            {},
            {
              headers: {
                Authorization: `Bearer ${access}`,
                'Content-Type': 'application/json'
              }
            }
          );
          debugLog('MBA12345 Invitation accepted successfully');
        } catch (error) {
          debugLog('MBA12345 Error accepting invitation:', error);
          // Continue even if this fails
        }
      }
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('MyProfile') }
        ]);
      } else {
        navigation.navigate('MyProfile');
      }
    } catch (error) {
      debugLog('MBA12345 Error during signup process', error.response?.data || error.message);
      
      let errorMessage = 'Signup Failed: An error occurred during signup.';
      if (error.response) {
        const errorData = error.response.data;
        // Handle specific field errors
        if (errorData) {
          const firstError = Object.entries(errorData)[0];
          if (firstError) {
            const [field, messages] = firstError;
            errorMessage = `${field}: ${Array.isArray(messages) ? messages[0] : messages}`;
          }
        }
      }
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Error', errorMessage);
      } else {
        setSuccessMessage(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Updated data structure to match new backend expectations
  const userData = {
    name: `${firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase()} ${lastName.trim().charAt(0).toUpperCase() + lastName.trim().slice(1).toLowerCase()}`, // Combine first and last name with first letter capitalized and all other letters lowercase
    email: email.trim().toLowerCase(),
    password: password,
    password2: confirmPassword, // Add confirmation password
    phone_number: '', // Add empty phone number for now
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Sign Up</Text>
        
        {verifyingInvite && (
          <View style={styles.inviteContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.inviteText}>Verifying invitation...</Text>
          </View>
        )}
        
        {inviteVerified && (
          <View style={styles.inviteContainer}>
            <Text style={styles.inviteText}>
              You've been invited by {inviterName}!
            </Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, firstNameError ? styles.errorInput : null]}
            placeholder="First Name"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setFirstNameError('');
            }}
          />
          {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, lastNameError ? styles.errorInput : null]}
            placeholder="Last Name"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setLastNameError('');
            }}
          />
          {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError ? styles.errorInput : null]}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={true}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, passwordError ? styles.errorInput : null]}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
            secureTextEntry
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, confirmPasswordError ? styles.errorInput : null]}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmPasswordError('');
            }}
            secureTextEntry
          />
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
        </View>
        
        <CustomButton title="Sign Up" onPress={handleSignUp} />
        {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}
        {successMessage ? <Text style={styles.message}>{successMessage}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    color: theme.colors.text,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
  },
  errorInput: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 5,
  },
  message: {
    marginTop: 20,
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 16,
  },
  inviteContainer: {
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inviteText: {
    color: theme.colors.primary,
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
});