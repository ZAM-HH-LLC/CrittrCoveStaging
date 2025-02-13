import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { API_BASE_URL } from '../config/config';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

const { width: screenWidth } = Dimensions.get('window');

export default function SignUp() {
  const navigation = useNavigation();
  const { setIsSignedIn } = useContext(AuthContext); // Use AuthContext to update auth state

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Error', 'Passwords do not match.');
      } else {
        setSuccessMessage('Passwords do not match.');
      }
      return;
    }

    // Updated data structure to match new backend expectations
    const userData = {
      name: `${firstName.trim()} ${lastName.trim()}`, // Combine first and last name
      email: email.trim().toLowerCase(),
      password: password,
      password2: confirmPassword, // Add confirmation password
      phone_number: '', // Add empty phone number for now
    };

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/register/`, userData);
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('MyProfile') }
        ]);
      } else {
        setSuccessMessage('Account created successfully!');
        setTimeout(() => {
          navigation.navigate('MyProfile');
        }, 1500);
      }
      setIsSignedIn(true);
    } catch (error) {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Sign Up</Text>
        {[
          { placeholder: "First Name", value: firstName, onChangeText: setFirstName },
          { placeholder: "Last Name", value: lastName, onChangeText: setLastName },
          { placeholder: "Email", value: email, onChangeText: setEmail, keyboardType: "email-address", autoCapitalize: "none" },
          { placeholder: "Password", value: password, onChangeText: setPassword, secureTextEntry: true },
          { placeholder: "Confirm Password", value: confirmPassword, onChangeText: setConfirmPassword, secureTextEntry: true }
        ].map((input, index) => (
          <TextInput
            key={index}
            style={styles.input}
            placeholder={input.placeholder}
            value={input.value}
            onChangeText={input.onChangeText}
            keyboardType={input.keyboardType}
            autoCapitalize={input.autoCapitalize}
            secureTextEntry={input.secureTextEntry}
          />
        ))}
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
  input: {
    width: screenWidth > 600 ? 600 : '100%',
    maxWidth: 600,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: theme.spacing.small,
    paddingHorizontal: theme.spacing.small,
  },
  message: {
    marginTop: theme.spacing.small,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
});