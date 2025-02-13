import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import CustomButton from '../components/CustomButton';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';

const { width: screenWidth } = Dimensions.get('window');

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigation = useNavigation();

  const handleResetPassword = async () => {
    if (!email) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Error', 'Please enter your email address.');
      } else {
        setSuccessMessage('Error: Please enter your email address.');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/reset-password/`, { email });
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Success', 'A reset password link has been sent to your email.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } else {
        setSuccessMessage('A reset password link has been sent to your email.');
        setTimeout(() => {
          navigation.navigate('Home');
        }, 2000); // Navigate after 2 seconds
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setEmailError(true);
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert('Error', 'Email is not associated with any user.');
        } else {
          setSuccessMessage('Error: Email is not associated with any user.');
        }
      } else {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert('Error', 'Failed to send reset password email. Please try again later.');
        } else {
          setSuccessMessage('Error: Failed to send reset password email. Please try again later.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        style={[styles.input, emailError && styles.inputError]}
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setEmailError(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <CustomButton title="Reset Password" onPress={handleResetPassword} />
      {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}
      {successMessage ? <Text style={styles.message}>{successMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputError: {
    borderColor: 'red',
  },
  message: {
    marginTop: theme.spacing.small,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
});
