import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { API_BASE_URL } from '../config/config';
import { AuthContext, debugLog } from '../context/AuthContext'; // Import AuthContext
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from '../validation/validation';
import { verifyInvitation } from '../api/API';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  
  // Location state
  const [location, setLocation] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  
  // Fallback locations in case API fails
  const fallbackLocations = [
    { name: 'Colorado Springs', supported: true },
    { name: 'Denver', supported: false },
    { name: 'Other', supported: false }
  ];
  
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
        invitation_token: inviteToken // Add invitation token here for backend to handle
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
        email: email.toLowerCase(),
        password: password,
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

  // Updated data structure to match new backend expectations
  const userData = {
    name: `${firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase()} ${lastName.trim().charAt(0).toUpperCase() + lastName.trim().slice(1).toLowerCase()}`, // Combine first and last name with first letter capitalized and all other letters lowercase
    email: email.trim().toLowerCase(),
    password: password,
    password2: confirmPassword, // Add confirmation password
    phone_number: '', // Add empty phone number for now
    location: inviteVerified ? 'Colorado Springs' : location, // Use default location for invited users
    ...(inviteToken && { invitation_token: inviteToken }) // Only include invitation_token if it exists
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
          <Text style={styles.subtitle}>Sign up to continue</Text>
          
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
                    </View>
                  )}
                </View>
              )}
              {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
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
              
              <CustomButton title="Sign Up" onPress={handleSignUp} style={styles.signupButton} />
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
          
          {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}
          {successMessage ? <Text style={styles.message}>{successMessage}</Text> : null}
        </View>
        
        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToSignIn}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 24,
    textAlign: 'center',
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
    marginTop: 24,
    width: '100%',
  },
  loader: {
    marginTop: 20,
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
    zIndex: 1000,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1001,
  },
  loadingContainer: {
    justifyContent: 'center',
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
});