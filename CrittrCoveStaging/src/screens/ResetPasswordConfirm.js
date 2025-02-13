import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { navigateToFrom } from '../components/Navigation';

const { width: screenWidth } = Dimensions.get('window');

export default function ResetPasswordConfirm({ route }) {
  const { uid, token } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigation = useNavigation();

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Error', 'Passwords do not match.');
      } else {
        setSuccessMessage('Passwords do not match.');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/reset-password-confirm/${uid}/${token}/`, {
        new_password: newPassword,
      });
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Success', 'Your password has been reset.', [
          { text: 'OK', onPress: () => navigateToFrom(navigation, 'SignIn', 'ResetPasswordConfirm') }
        ]);
      } else {
        setSuccessMessage('Your password has been reset.');
        setTimeout(() => {
          navigateToFrom(navigation, 'SignIn', 'ResetPasswordConfirm');
        }, 2000); // Navigate after 2 seconds
      }
    } catch (error) {
      const errorMessage = 'Failed to reset password. Please try again later.';
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
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <CustomButton title="Reset Password" onPress={handlePasswordReset} />
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
  message: {
    marginTop: theme.spacing.small,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
});