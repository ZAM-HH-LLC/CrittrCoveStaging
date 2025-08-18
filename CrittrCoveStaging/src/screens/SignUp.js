import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { API_BASE_URL } from '../config/config';
import { AuthContext, debugLog } from '../context/AuthContext'; // Import AuthContext
import { validateEmail, validateName, validatePassword, validatePasswordMatch, validatePhoneNumber, sanitizeInput } from '../validation/validation';
import { verifyInvitation } from '../api/API';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TermsOfServiceModal from '../components/modals/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/modals/PrivacyPolicyModal';

const { width: screenWidth } = Dimensions.get('window');

export default function SignUp() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signIn, is_DEBUG } = useContext(AuthContext); // Use AuthContext to update auth state

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [verifyingInvite, setVerifyingInvite] = useState(false);
  
  // Location state
  const [location, setLocation] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  
  // How did you hear about us state
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [showHowDidYouHearDropdown, setShowHowDidYouHearDropdown] = useState(false);
  const [howDidYouHearOther, setHowDidYouHearOther] = useState('');
  const [howDidYouHearError, setHowDidYouHearError] = useState('');
  
  // Terms of Service and Privacy Policy state
  const [termsAndPrivacyAccepted, setTermsAndPrivacyAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAndPrivacyError, setTermsAndPrivacyError] = useState('');
  
  // Fallback locations in case API fails
  const fallbackLocations = [
    { name: 'Colorado Springs', supported: true },
    { name: 'Denver', supported: false },
    { name: 'Other', supported: false }
  ];
  
  // How did you hear about us options
  const howDidYouHearOptions = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'google', label: 'Google' },
    { value: 'reddit', label: 'Reddit' },
    { value: 'nextdoor', label: 'Nextdoor' },
    { value: 'other', label: 'Other' }
  ];
  
  // Validation states
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Form refs for better autofill handling
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  
  // Autofill protection state
  const [isAutofilling, setIsAutofilling] = useState(false);
  const autofillTimeoutRef = useRef(null);
  const lastPhoneNumberRef = useRef('');

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

  // Handle autofill interference prevention
  useEffect(() => {
    // Log when phone number changes unexpectedly (potential autofill interference)
    if (phoneNumber && phoneNumber.length > 0) {
      debugLog('MBA7777: Phone number state updated:', phoneNumber);
      lastPhoneNumberRef.current = phoneNumber;
    }
  }, [phoneNumber]);

  // Protect phone number from autofill interference
  useEffect(() => {
    if (isAutofilling && phoneNumber && phoneNumber.length > 0) {
      debugLog('MBA7777: Autofill protection active, preserving phone number:', phoneNumber);
    }
  }, [isAutofilling, phoneNumber]);

  // Cleanup autofill timeout on unmount
  useEffect(() => {
    return () => {
      if (autofillTimeoutRef.current) {
        clearTimeout(autofillTimeoutRef.current);
      }
    };
  }, []);

  // Fetch supported locations from backend
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        // Fetch locations from backend
        const response = await axios.get(`${API_BASE_URL}/api/locations/v1/supported/`);
        debugLog('MBA6789: Locations fetched from backend', response.data);
        
        if (response.data && Array.isArray(response.data.locations)) {
          setLocations(response.data.locations);
        } else {
          // Fallback to hardcoded locations if response format is unexpected
          debugLog('MBA6789: Using fallback locations due to unexpected response format', response.data);
          setLocations(fallbackLocations);
        }
      } catch (error) {
        debugLog('MBA6789: Error fetching locations', error);
        // Use fallback locations if API call fails
        setLocations(fallbackLocations);
      } finally {
        setLoadingLocations(false);
      }
    };
    
    fetchLocations();
  }, []);

  const validateForm = () => {
    let isValid = true;
    
    // Validate location only if not invited
    if (!inviteVerified && !location) {
      setLocationError('Please select your location');
      isValid = false;
    }
    
    // Validate how did you hear about us
    if (!howDidYouHear) {
      setHowDidYouHearError('Please select how you heard about us');
      isValid = false;
    } else if (howDidYouHear === 'other' && !howDidYouHearOther.trim()) {
      setHowDidYouHearError('Please specify how you heard about us');
      isValid = false;
    } else {
      setHowDidYouHearError('');
    }
    
    // Validate first name with sanitization
    const firstNameValidation = validateName(firstName);
    setFirstNameError(firstNameValidation.message);
    if (!firstNameValidation.isValid) isValid = false;
    
    // Validate last name with sanitization
    const lastNameValidation = validateName(lastName);
    setLastNameError(lastNameValidation.message);
    if (!lastNameValidation.isValid) isValid = false;
    
    // Validate email with sanitization
    const emailValidation = validateEmail(email);
    setEmailError(emailValidation.message);
    if (!emailValidation.isValid) isValid = false;
    
    // Validate phone number with sanitization
    const phoneNumberValidation = validatePhoneNumber(phoneNumber);
    setPhoneNumberError(phoneNumberValidation.message);
    if (!phoneNumberValidation.isValid) isValid = false;
    
    // Validate password with sanitization
    const passwordValidation = validatePassword(password);
    setPasswordError(passwordValidation.message);
    if (!passwordValidation.isValid) isValid = false;
    
    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
    setConfirmPasswordError(passwordMatchValidation.message);
    if (!passwordMatchValidation.isValid) isValid = false;
    
    // Validate Terms of Service and Privacy Policy acceptance
    if (!termsAndPrivacyAccepted) {
      setTermsAndPrivacyError('You must accept the Terms of Service and Privacy Policy to continue');
      isValid = false;
    } else {
      setTermsAndPrivacyError('');
    }
    
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
      
      // Sanitize all inputs before sending to backend
      const sanitizedFirstName = sanitizeInput(firstName, 'name');
      const sanitizedLastName = sanitizeInput(lastName, 'name');
      const sanitizedEmail = sanitizeInput(email, 'email');
      const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, ''); // Only digits for phone number
      const sanitizedPassword = sanitizeInput(password, 'password');
      const sanitizedLocation = sanitizeInput(location, 'general');
      const sanitizedHowDidYouHearOther = sanitizeInput(howDidYouHearOther, 'general');
      
      debugLog('MBA12345 Input sanitization completed', {
        originalFirstName: firstName,
        sanitizedFirstName,
        originalLastName: lastName,
        sanitizedLastName,
        originalEmail: email,
        sanitizedEmail,
        originalPhoneNumber: phoneNumber,
        sanitizedPhoneNumber,
        originalLocation: location,
        sanitizedLocation,
        originalHowDidYouHearOther: howDidYouHearOther,
        sanitizedHowDidYouHearOther,
        passwordChanged: password !== sanitizedPassword
      });
      
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
      
      // Updated data structure with sanitized inputs
      const userData = {
        name: `${sanitizedFirstName.trim().charAt(0).toUpperCase() + sanitizedFirstName.trim().slice(1).toLowerCase()} ${sanitizedLastName.trim().charAt(0).toUpperCase() + sanitizedLastName.trim().slice(1).toLowerCase()}`, // Combine first and last name with first letter capitalized and all other letters lowercase
        email: sanitizedEmail.trim().toLowerCase(),
        password: sanitizedPassword,
        password2: confirmPassword, // Note: We don't sanitize confirm password as it needs to match exactly
        phone_number: sanitizedPhoneNumber.trim(), // Add sanitized phone number
        location: inviteVerified ? 'Colorado Springs' : sanitizedLocation, // Use default location for invited users
        how_did_you_hear: howDidYouHear,
        how_did_you_hear_other: howDidYouHear === 'other' ? sanitizedHowDidYouHearOther.trim() : '',
        ...(inviteToken && { invitation_token: inviteToken }) // Only include invitation_token if it exists
      };
      
      // Prepare user data with time settings and invitation token
      const registrationData = {
        ...userData,
        timezone: userTimezone,
        use_military_time: useMilitaryTime,
        invitation_token: inviteToken, // Add invitation token here for backend to handle
        terms_and_privacy_accepted_at: new Date().toISOString(),
        terms_and_privacy_version: '1.1'
      };
      
      debugLog('MBA12345 Registration data:', registrationData);
      
      // Create a direct axios instance without interceptors for registration
      const directAxios = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // First register the user with the direct axios instance
      const registerResponse = await directAxios.post('/api/users/v1/register/', registrationData);
      
      debugLog('MBA12345 User registration successful', registerResponse.data);
      
      // The backend already handles invitation acceptance during registration
      // No need to manually accept it again
      
      // After successful registration, log the user in to get authentication tokens
      debugLog('MBA12345 Attempting to log in with new credentials');
      
      const loginResponse = await directAxios.post('/api/token/', {
        email: sanitizedEmail.trim().toLowerCase(),
        password: sanitizedPassword,
      });
      
      debugLog('MBA12345 Login successful, received tokens');
      
      const { access, refresh } = loginResponse.data;
      
      // Use the signIn function from AuthContext to properly set up authentication
      debugLog('MBA12345 Calling signIn function from AuthContext');
      
      await signIn(access, refresh);
      
      debugLog('MBA12345 Authentication setup complete');
      
      // NOTE: We don't need to manually accept the invitation since the backend handles it during registration
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
        ]);
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      debugLog('MBA12345 Error during signup process', error.response?.data || error.message);
      
      let errorMessage = 'Signup Failed: An error occurred during signup.';
      if (error.response) {
        const errorData = error.response.data;
        // Handle specific field errors
        if (errorData) {
          if (typeof errorData === 'object') {
            // Handle field-specific errors
            const firstError = Object.entries(errorData)[0];
            if (firstError) {
              const [field, messages] = firstError;
              errorMessage = `${field}: ${Array.isArray(messages) ? messages[0] : messages}`;
            }
          } else if (typeof errorData === 'string') {
            // Handle string error responses
            errorMessage = errorData;
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

  // Enhanced input handlers with real-time sanitization
  const handleFirstNameChange = (text) => {
    debugLog('MBA7777: First name input change:', text);
    
    // Apply real-time sanitization for names
    const sanitizedText = sanitizeInput(text, 'name');
    
    // Check if sanitization removed too much content (potential attack)
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 30 && text.length > 3) {
      debugLog('MBA7777: Potentially malicious first name input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      // Still update with sanitized version, don't block completely
    }
    
    // Always update with sanitized version to ensure UI reflects sanitization
    setFirstName(sanitizedText);
    setFirstNameError('');
  };

  const handleLastNameChange = (text) => {
    debugLog('MBA7777: Last name input change:', text);
    
    // Apply real-time sanitization for names
    const sanitizedText = sanitizeInput(text, 'name');
    
    // Check if sanitization removed too much content (potential attack)
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 30 && text.length > 3) {
      debugLog('MBA7777: Potentially malicious last name input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      // Still update with sanitized version, don't block completely
    }
    
    // Always update with sanitized version to ensure UI reflects sanitization
    setLastName(sanitizedText);
    setLastNameError('');
  };

  const handleEmailChange = (text) => {
    debugLog('MBA7777: Email input change:', text);
    
    // Check if this might be an autofill event (sudden large change)
    const isAutofillEvent = text.length > 0 && (Math.abs(text.length - email.length) > 3 || !email.includes(text) && !text.includes(email));
    
    if (isAutofillEvent) {
      debugLog('MBA7777: Autofill event detected for email');
      setIsAutofilling(true);
      
      // Clear any existing timeout
      if (autofillTimeoutRef.current) {
        clearTimeout(autofillTimeoutRef.current);
      }
      
      // Set timeout to clear autofill mode after a short delay
      autofillTimeoutRef.current = setTimeout(() => {
        setIsAutofilling(false);
        debugLog('MBA7777: Autofill mode cleared');
      }, 1000);
    }
    
    // Apply real-time sanitization for emails
    const sanitizedText = sanitizeInput(text, 'email');
    
    // For emails, we're more strict about changes since they have a specific format
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 20 && text.length > 5) {
      debugLog('MBA7777: Potentially malicious email input detected:', {
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

  const handlePhoneNumberChange = useCallback((text) => {
    debugLog('MBA7777: Phone number input change:', text);
    
    // If we're in autofill mode, ignore changes to prevent interference
    if (isAutofilling) {
      debugLog('MBA7777: Autofill mode active, ignoring phone number change');
      return;
    }
    
    // Handle autofill interference - if text is empty or null, don't clear the field
    if (!text || text === '') {
      debugLog('MBA7777: Empty text detected, preserving current phone number');
      return;
    }
    
    // Only allow digits for phone numbers
    const digitsOnly = text.replace(/\D/g, '');
    
    // Limit to 10 digits
    const sanitizedText = digitsOnly.substring(0, 10);
    
    // Only update if the sanitized text is different from current value and not empty
    if (sanitizedText !== phoneNumber && sanitizedText !== '') {
      debugLog('MBA7777: Updating phone number from', phoneNumber, 'to', sanitizedText);
      setPhoneNumber(sanitizedText);
      setPhoneNumberError('');
      lastPhoneNumberRef.current = sanitizedText;
    } else if (sanitizedText === '' && lastPhoneNumberRef.current !== '') {
      // If autofill is trying to clear the field, preserve the last known value
      debugLog('MBA7777: Autofill trying to clear phone number, preserving:', lastPhoneNumberRef.current);
      setPhoneNumber(lastPhoneNumberRef.current);
    }
  }, [isAutofilling, phoneNumber]);

  const handlePasswordChange = (text) => {
    debugLog('MBA7777: Password input change:', text);
    
    // Check if this might be an autofill event (sudden large change)
    const isAutofillEvent = text.length > 0 && (Math.abs(text.length - password.length) > 3 || !password.includes(text) && !text.includes(password));
    
    if (isAutofillEvent) {
      debugLog('MBA7777: Autofill event detected for password');
      setIsAutofilling(true);
      
      // Clear any existing timeout
      if (autofillTimeoutRef.current) {
        clearTimeout(autofillTimeoutRef.current);
      }
      
      // Set timeout to clear autofill mode after a short delay
      autofillTimeoutRef.current = setTimeout(() => {
        setIsAutofilling(false);
        debugLog('MBA7777: Autofill mode cleared');
      }, 1000);
    }
    
    // For passwords, we're more lenient with sanitization during typing
    // Full validation happens on form submission
    const sanitizedText = sanitizeInput(text, 'password');
    
    // Only block if obvious malicious content
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 8) {
      debugLog('MBA7777: Potentially malicious password input detected:', {
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

  const handleConfirmPasswordChange = (text) => {
    debugLog('MBA7777: Confirm password input change:', text);
    
    // For confirm password, we don't sanitize as much since it needs to match exactly
    // But we still prevent obvious XSS attempts
    const sanitizedText = sanitizeInput(text, 'password');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 8) {
      debugLog('MBA7777: Potentially malicious confirm password input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      // Still update with sanitized version, don't block completely
    }
    
    // Always update with sanitized version to ensure UI reflects sanitization
    setConfirmPassword(sanitizedText);
    setConfirmPasswordError('');
  };

  // Navigate to the sign in page
  const navigateToSignIn = () => {
    navigation.navigate('SignIn');
  };

  // Navigate to the waitlist page
  const navigateToWaitlist = () => {
    navigation.navigate('Waitlist');
  };

  // Handle location selection 
  const selectLocation = (selectedLocation) => {
    console.log("Location selected:", selectedLocation);
    debugLog('MBA6789: Location selected', selectedLocation);
    setLocation(selectedLocation);
    setShowLocationDropdown(false);
    setLocationError('');
  };

  // Handle how did you hear selection
  const selectHowDidYouHear = (selectedOption) => {
    debugLog('MBA9999: How did you hear selected', selectedOption);
    setHowDidYouHear(selectedOption);
    setShowHowDidYouHearDropdown(false);
    setHowDidYouHearError('');
    
    // Clear other input if not "other" is selected
    if (selectedOption !== 'other') {
      setHowDidYouHearOther('');
    }
  };

  // Handle how did you hear other input change
  const handleHowDidYouHearOtherChange = (text) => {
    debugLog('MBA9999: How did you hear other input change:', text);
    
    // Apply real-time sanitization
    const sanitizedText = sanitizeInput(text, 'general');
    
    // Check if sanitization removed too much content (potential attack)
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 30 && text.length > 3) {
      debugLog('MBA9999: Potentially malicious how did you hear other input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
    }
    
    // Always update with sanitized version
    setHowDidYouHearOther(sanitizedText);
    setHowDidYouHearError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign Up</Text>
          <View style={styles.subtitleContainer}>
            <View style={styles.signInLinkContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToSignIn}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
          
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
          
          {/* Location Dropdown - Only show if not invited */}
          {!inviteVerified && (
            <View style={styles.locationContainer}>
              <Text style={styles.label}>Where are you located?</Text>
              {loadingLocations ? (
                <View style={[styles.input, styles.dropdown, styles.loadingContainer]}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.placeholderText}>Loading locations...</Text>
                </View>
              ) : (
                <View style={styles.dropdownWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.dropdown,
                      locationError ? styles.errorInput : null
                    ]}
                    onPress={() => setShowLocationDropdown(!showLocationDropdown)}
                  >
                    <Text style={location ? styles.inputText : styles.placeholderText}>
                      {location || 'Select your location'}
                    </Text>
                    <MaterialCommunityIcons
                      name={showLocationDropdown ? "chevron-up" : "chevron-down"}
                      size={24}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                  
                  {showLocationDropdown && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {locations.map((loc) => (
                          <TouchableOpacity
                            key={loc.name}
                            style={styles.dropdownItem}
                            onPress={() => selectLocation(loc.name)}
                          >
                            <Text style={styles.dropdownItemText}>
                              {loc.name} {!loc.supported && "(Coming Soon)"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
              {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
            </View>
          )}
          
          {/* How did you hear about us dropdown - Always show */}
          <View style={styles.howDidYouHearContainer}>
            <Text style={styles.label}>How did you hear about us?</Text>
            <View style={styles.howDidYouHearDropdownWrapper}>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dropdown,
                  howDidYouHearError ? styles.errorInput : null
                ]}
                onPress={() => setShowHowDidYouHearDropdown(!showHowDidYouHearDropdown)}
              >
                <Text style={howDidYouHear ? styles.inputText : styles.placeholderText}>
                  {howDidYouHear ? howDidYouHearOptions.find(opt => opt.value === howDidYouHear)?.label : 'Select an option'}
                </Text>
                <MaterialCommunityIcons
                  name={showHowDidYouHearDropdown ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              
              {showHowDidYouHearDropdown && (
                <View style={styles.dropdownMenu}>
                  <ScrollView 
                    style={styles.dropdownScrollView}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {howDidYouHearOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.dropdownItem}
                        onPress={() => selectHowDidYouHear(option.value)}
                      >
                        <Text style={styles.dropdownItemText}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            {howDidYouHearError ? <Text style={styles.errorText}>{howDidYouHearError}</Text> : null}
          </View>

          {/* Other input field - only show if "other" is selected */}
          {howDidYouHear === 'other' && (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, howDidYouHearError ? styles.errorInput : null]}
                placeholder="Please specify how you heard about us"
                value={howDidYouHearOther}
                onChangeText={handleHowDidYouHearOtherChange}
              />
              {howDidYouHearError ? <Text style={styles.errorText}>{howDidYouHearError}</Text> : null}
            </View>
          )}
          
          {/* Regular form fields */}
          {(inviteVerified || !location || locations.find(loc => loc.name === location && loc.supported)) ? (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, firstNameError ? styles.errorInput : null]}
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                />
                {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, lastNameError ? styles.errorInput : null]}
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={handleLastNameChange}
                />
                {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}
              </View>
              
              
              <View style={styles.inputContainer}>
                <TextInput
                  ref={phoneRef}
                  key="phone-input"
                  name="phone"
                  style={[styles.input, phoneNumberError ? styles.errorInput : null]}
                  placeholder="Phone Number (10 digits)"
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  keyboardType="numeric"
                  maxLength={10}
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="none"
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {phoneNumberError ? <Text style={styles.errorText}>{phoneNumberError}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={emailRef}
                  key="email-input"
                  name="email"
                  style={[styles.input, emailError ? styles.errorInput : null]}
                  placeholder="Email"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={true}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  ref={passwordRef}
                  key="password-input"
                  name="password"
                  style={[styles.input, passwordError ? styles.errorInput : null]}
                  placeholder="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  ref={confirmPasswordRef}
                  key="confirm-password-input"
                  name="confirmPassword"
                  style={[styles.input, confirmPasswordError ? styles.errorInput : null]}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  blurOnSubmit={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
              </View>
              
              {/* Combined Terms of Service and Privacy Policy Checkbox */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity 
                  style={styles.checkboxWrapper}
                  onPress={() => setTermsAndPrivacyAccepted(!termsAndPrivacyAccepted)}
                >
                  <View style={[styles.checkbox, termsAndPrivacyAccepted && styles.checkboxChecked]}>
                    {termsAndPrivacyAccepted && (
                      <MaterialCommunityIcons name="check" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text 
                      style={styles.linkText}
                      onPress={() => setShowTermsModal(true)}
                    >
                      Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text 
                      style={styles.linkText}
                      onPress={() => setShowPrivacyModal(true)}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
                {termsAndPrivacyError ? <Text style={styles.errorText}>{termsAndPrivacyError}</Text> : null}
              </View>
              
              <TouchableOpacity 
                style={[styles.signupButton, loading && styles.signupButtonDisabled]} 
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="white" style={styles.buttonLoader} />
                    <Text style={styles.buttonText}>Signing Up...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* Show waitlist button if unsupported location is selected */
            <View style={styles.waitlistContainer}>
              <Text style={styles.waitlistMessage}>
                CrittrCove isn't available in {location} yet, but we're expanding soon!
              </Text>
              <Text style={styles.waitlistSubMessage}>
                Join our waitlist to be notified when we launch in your area.
              </Text>
              <CustomButton
                title="Join Waitlist"
                onPress={navigateToWaitlist}
                style={styles.waitlistButton}
              />
            </View>
          )}
          
          {successMessage ? <Text style={styles.message}>{successMessage}</Text> : null}
        </View>
      </ScrollView>
      
      {/* Terms of Service Modal */}
      <TermsOfServiceModal 
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  formContainer: {
    backgroundColor: theme.colors.surfaceContrast,
    padding: 30,
    borderRadius: 10,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 32,
    color: theme.colors.text,
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  signInLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
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
  signupButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  signupButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoader: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  signInLink: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
  },
  placeholderText: {
    color: theme.colors.placeHolderText,
    fontSize: 16,
  },
  inputText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1002,
    marginTop: 4,
    maxHeight: 200,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  label: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 8,
  },
  locationContainer: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1002,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1003,
  },
  loadingContainer: {
    justifyContent: 'center',
  },
  // How did you hear container with lower z-index than location
  howDidYouHearContainer: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
  // How did you hear dropdown wrapper with lower z-index than location
  howDidYouHearDropdownWrapper: {
    position: 'relative',
    zIndex: 1001,
  },
  waitlistContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  waitlistMessage: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  waitlistSubMessage: {
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  waitlistButton: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#6B7280',
  },
  checkboxContainer: {
    marginVertical: 10,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});