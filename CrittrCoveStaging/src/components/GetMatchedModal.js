import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { debugLog } from '../context/AuthContext';

const GetMatchedModal = ({ visible, onClose, searchQuery, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    
    if (text.trim() === '') {
      setEmailError('');
      setIsEmailValid(false);
    } else if (!validateEmail(text)) {
      setEmailError('Please enter a valid email address');
      setIsEmailValid(false);
    } else {
      setEmailError('');
      setIsEmailValid(true);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!isEmailValid) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      debugLog('MBA8001', 'Submitting get matched request', {
        email: email,
        searchQuery: searchQuery
      });

      await onSubmit(email, searchQuery);
      
      debugLog('MBA8001', 'Get matched request submitted successfully');
      
      // Close modal immediately after successful submission
      handleClose();
      
      // Show success message after modal is closed
      setTimeout(() => {
        Alert.alert(
          'Request Submitted!', 
          'Thank you for your interest! We\'ll reach out when we have matching professionals in your area.'
        );
      }, 100);
    } catch (error) {
      debugLog('MBA8001', 'Error submitting get matched request', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailError('');
    setIsEmailValid(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Get Matched with a Professional</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <View style={styles.content}>
              <MaterialCommunityIcons 
                name="heart-plus" 
                size={60} 
                color={theme.colors.primary} 
                style={styles.icon}
              />
              
              <Text style={styles.message}>
                We don't have professionals offering your specific service yet, but we're actively recruiting!
              </Text>
              
              <Text style={styles.submessage}>
                Leave your email and we'll notify you when we find the perfect match for:
              </Text>
              
              <Text style={styles.searchQuery}>"{searchQuery}"</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    emailError ? styles.inputError : null,
                    isEmailValid ? styles.inputValid : null
                  ]}
                  placeholder="Enter your email address"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailError ? (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={theme.colors.error} />
                    <Text style={styles.errorText}>{emailError}</Text>
                  </View>
                ) : null}
                {isEmailValid && !emailError ? (
                  <View style={styles.successContainer}>
                    <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.successText}>Valid email address</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.buttons}>
                <TouchableOpacity 
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Get Matched'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.medium,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.small,
    marginLeft: theme.spacing.small,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: theme.spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: theme.spacing.medium,
  },
  message: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.medium,
    lineHeight: 22,
  },
  submessage: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.small,
  },
  searchQuery: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing.large,
  },
  inputContainer: {
    width: '100%',
    marginBottom: theme.spacing.large,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.medium,
    fontSize: theme.fontSizes.medium,
    backgroundColor: theme.colors.background,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  inputValid: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.small,
    paddingHorizontal: theme.spacing.small,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.small,
    marginLeft: theme.spacing.small,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.small,
    paddingHorizontal: theme.spacing.small,
  },
  successText: {
    color: '#4CAF50',
    fontSize: theme.fontSizes.small,
    marginLeft: theme.spacing.small,
    flex: 1,
  },
  buttons: {
    width: '100%',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.medium,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
  },
});

export default GetMatchedModal;