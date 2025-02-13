import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChangePassword = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isSignedIn } = useContext(AuthContext);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);
    };
    getToken();
  }, []);

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!isSignedIn || !token) {
      setError('You are not authenticated. Please log in again.');
      return;
    }

    try {
      console.log('Sending request to:', `${API_BASE_URL}/api/users/change-password/`);
      console.log('Request payload:', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      console.log('Auth token:', token);

      const response = await axios.post(
        `${API_BASE_URL}/api/users/change-password/`,
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Response:', response);

      if (response.status === 200) {
        setSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error details:', error);
      setError(error.response?.data?.error || 'Failed to change password');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerText}>Change Password</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={Platform.OS === 'web' ? styles.webContent : styles.content}>
        <TextInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
        <Button mode="contained" onPress={handleChangePassword} style={styles.button}>
          Change Password
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  webContent: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 20,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 10,
  },
  successText: {
    color: theme.colors.success,
    marginBottom: 10,
  },
});

export default ChangePassword;
