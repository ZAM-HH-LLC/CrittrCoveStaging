import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, ActivityIndicator, Dimensions, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
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
  const { screenWidth: contextScreenWidth, isCollapsed, isSignedIn } = useContext(AuthContext);

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
          { text: 'OK', onPress: () => navigation.navigate('SignIn') }
        ]);
      } else {
        setSuccessMessage('A reset password link has been sent to your email.');
        setTimeout(() => {
          navigation.navigate('SignIn');
        }, 2000);
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

  const styles = createStyles(contextScreenWidth, isCollapsed, isSignedIn);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {isSignedIn && (
            <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
              <Text style={styles.backText}>Reset Password</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(false);
                setSuccessMessage('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.placeHolderText}
            />
            
            <CustomButton 
              title="Reset Password" 
              onPress={handleResetPassword}
              disabled={loading}
              style={styles.button}
            />
            
            {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}
            {successMessage ? <Text style={[styles.message, successMessage.includes('Error') && styles.errorMessage]}>{successMessage}</Text> : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (screenWidth, isCollapsed, isSignedIn) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginLeft: (screenWidth > 900 && isSignedIn) ? (isCollapsed ? 70 : 250) : 0,
    transition: 'margin-left 0.3s ease',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  backText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 12,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  button: {
    marginBottom: 20,
  },
  loader: {
    marginTop: 10,
  },
  message: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontSize: 14,
    marginTop: 10,
  },
  errorMessage: {
    color: theme.colors.error,
  },
});
