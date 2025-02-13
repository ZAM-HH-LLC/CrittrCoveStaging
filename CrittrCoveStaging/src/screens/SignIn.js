import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Platform, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/config';

const { width: screenWidth } = Dimensions.get('window');

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigation = useNavigation();
  const { signIn, is_prototype } = useContext(AuthContext);

  const handleLogin = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Keyboard.dismiss();
    }

    setLoading(true);
    try {
      if (is_prototype) {
        // Mock tokens for prototype mode
        const mockAccess = 'mock_access_token';
        const mockRefresh = 'mock_refresh_token';
        
        // Pass mock tokens to signIn and get the status
        const status = await signIn(mockAccess, mockRefresh);
        console.log('Sign in status (prototype):', status);
        
        // Navigate based on status
        if (status && status.userRole === 'professional') {
          navigation.navigate('ProfessionalDashboard');
        } else {
          navigation.navigate('Dashboard');
        }
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/token/`, {
        email: email.toLowerCase(),
        password: password,
      });

      const { access, refresh } = response.data;
      
      // Pass both tokens to signIn and get the status
      const status = await signIn(access, refresh);
      console.log('Sign in status:', status);
      
      // Navigate based on status
      if (status && status.userRole === 'professional') {
        navigation.navigate('ProfessionalDashboard');
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      console.error('Login failed', error);
      const errorMessage = error.response && error.response.status === 401
        ? 'Invalid credentials. Please try again.'
        : 'An unexpected error occurred.';

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Login Failed', errorMessage);
      } else {
        setSuccessMessage(`Login Failed: ${errorMessage}`);
      }

      setIsEmailValid(false);
      setIsPasswordValid(false);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      {is_prototype && (
        <Text style={styles.prototypeWarning}>
          Prototype Mode: You can sign in with anything for email and password
        </Text>
      )}
      <TextInput
        style={[styles.input, !isEmailValid && styles.invalidInput]}
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setIsEmailValid(true);
        }}
        autoCapitalize="none"
        onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
      />
      <TextInput
        style={[styles.input, !isPasswordValid && styles.invalidInput]}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setIsPasswordValid(true);
        }}
        onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
      />
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
  input: {
    width: screenWidth > 600 ? 600 : '100%',
    maxWidth: 600,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: theme.spacing.small,
    paddingHorizontal: theme.spacing.small,
  },
  invalidInput: {
    borderColor: 'red',
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
