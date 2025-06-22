import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { theme } from '../styles/theme';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { AuthContext, debugLog } from '../context/AuthContext';
import { useForm, ValidationError } from '@formspree/react';
import { validateEmail, validateName, validateMessage, sanitizeInput } from '../validation/validation';

const ContactUs = () => {
  const navigation = useNavigation();
  const { screenWidth, isCollapsed } = useContext(AuthContext);
  const [state, handleFormspreeSubmit] = useForm("mkgobpro");
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Validation error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');

  // Calculate responsive widths
  const isMobile = screenWidth < 900;
  const contentWidth = isMobile ? '90%' : '600px';
  const maxContentWidth = isMobile ? '100%' : '800px';

  // Enhanced input handlers with real-time sanitization
  const handleNameChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'name');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 30 && text.length > 3) {
      debugLog('MBA1234: Potentially malicious name input detected in ContactUs:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setName(sanitizedText);
    setNameError('');
    setSuccessMessage('');
  };

  const handleEmailChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'email');
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 20 && text.length > 5) {
      debugLog('MBA1234: Potentially malicious email input detected in ContactUs:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setEmail(sanitizedText);
    setEmailError('');
    setSuccessMessage('');
  };

  const handleMessageChange = (text) => {
    const sanitizedText = sanitizeInput(text, 'message', { maxLength: 2000 });
    
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 30 && text.length > 10) {
      debugLog('MBA1234: Potentially malicious message input detected in ContactUs:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      return;
    }
    
    setMessage(sanitizedText);
    setMessageError('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    const nameValidation = validateName(name);
    setNameError(nameValidation.message);
    if (!nameValidation.isValid) isValid = false;
    
    // Validate email
    const emailValidation = validateEmail(email);
    setEmailError(emailValidation.message);
    if (!emailValidation.isValid) isValid = false;
    
    // Validate message
    const messageValidation = validateMessage(message, { 
      maxLength: 2000, 
      minLength: 10,
      allowEmpty: false 
    });
    setMessageError(messageValidation.message);
    if (!messageValidation.isValid) isValid = false;
    
    return isValid;
  };

  const handleSubmit = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    
    try {
      // Sanitize all inputs before sending to backend
      const sanitizedName = sanitizeInput(name, 'name');
      const sanitizedEmail = sanitizeInput(email, 'email');
      const sanitizedMessage = sanitizeInput(message, 'message', { maxLength: 2000 });
      
      debugLog('MBA1234: Contact form submission with sanitized inputs', {
        originalName: name,
        sanitizedName,
        originalEmail: email,
        sanitizedEmail,
        originalMessage: message,
        sanitizedMessage
      });
      
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/contact/`, {
        name: sanitizedName,
        email: sanitizedEmail,
        message: sanitizedMessage
      });

      if (response.status === 200) {
        setSuccessMessage('Your message has been sent successfully!');
        setName('');
        setEmail('');
        setMessage('');
        setNameError('');
        setEmailError('');
        setMessageError('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      debugLog('MBA1234: Error sending contact form:', error);
      
      let errorMessage = 'Failed to send message. Please try again later.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      setSuccessMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message from either Formspree or backend
  if (state.succeeded) {
    return (
      <CrossPlatformView 
        fullWidthHeader={false} 
        contentWidth={maxContentWidth}
        style={!isMobile && Platform.OS === 'web' ? {
          marginLeft: isCollapsed ? '70px' : '250px',
          width: `calc(100% - ${isCollapsed ? '70px' : '250px'})`,
          transition: 'margin-left 0.3s ease, width 0.3s ease'
        } : {}}
      >
        <View style={styles.container}>
          <View style={[styles.contentWrapper, { width: contentWidth }]}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>
              Thanks for reaching out!
            </Text>
            <Text style={styles.successMessage}>
              We'll get back to you soon.
            </Text>
          </View>
        </View>
      </CrossPlatformView>
    );
  }

  return (
    <CrossPlatformView 
      fullWidthHeader={false}
      contentWidth={maxContentWidth}
      style={!isMobile && Platform.OS === 'web' ? {
        marginLeft: isCollapsed ? '70px' : '250px',
        width: `calc(100% - ${isCollapsed ? '70px' : '250px'})`,
        transition: 'margin-left 0.3s ease, width 0.3s ease'
      } : {}}
    >
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { width: contentWidth }]}>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>Get in touch with our support team</Text>
          
          <TextInput
            style={[styles.input, nameError ? styles.errorInput : null]}
            placeholder="Your Name"
            value={name}
            onChangeText={handleNameChange}
            name="name"
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          
          <TextInput
            style={[styles.input, emailError ? styles.errorInput : null]}
            placeholder="Your Email"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            name="email"
            autoCapitalize="none"
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          
          <TextInput
            style={[styles.input, styles.messageInput, messageError ? styles.errorInput : null]}
            placeholder="Your Message (minimum 10 characters)"
            value={message}
            onChangeText={handleMessageChange}
            multiline
            name="message"
          />
          {messageError ? <Text style={styles.errorText}>{messageError}</Text> : null}
          
          {successMessage ? (
            <Text style={[styles.successMessage, successMessage.includes('Failed') && styles.errorMessage]}>
              {successMessage}
            </Text>
          ) : null}
          
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    minHeight: '80vh',
  },
  contentWrapper: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '100%',
  },
  title: {
    fontSize: theme.fontSizes.largeLarge,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSizes.medium,
    marginBottom: 20,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
    fontSize: theme.fontSizes.medium,
    width: '100%',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  successMessage: {
    color: theme.colors.success,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorInput: {
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  submitButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorMessage: {
    color: theme.colors.error,
  },
});

export default ContactUs;
