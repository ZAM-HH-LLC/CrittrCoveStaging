import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { API_BASE_URL } from '../config/config';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import { debugLog } from '../context/AuthContext'; // Import debugLog
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from '../validation/validation';

const { width: screenWidth } = Dimensions.get('window');

export default function SignUp() {
  const navigation = useNavigation();
  const { signIn, is_DEBUG } = useContext(AuthContext); // Use AuthContext to update auth state

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Validation states
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

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
      
      // First register the user
      const registerResponse = await axios.post(`${API_BASE_URL}/api/users/v1/register/`, userData);
      
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
    padding: theme.spacing.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1, // Ensure the ScrollView takes up the full height
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
  message: {
    marginTop: theme.spacing.small,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
});