import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { AuthContext } from '../context/AuthContext';
import { useForm, ValidationError } from '@formspree/react';

const ContactUs = () => {
  const navigation = useNavigation();
  const { screenWidth } = useContext(AuthContext);
  const [state, handleFormspreeSubmit] = useForm("mkgobpro");
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Calculate responsive widths
  const isMobile = screenWidth < 768;
  const contentWidth = isMobile ? '90%' : '600px';
  const maxContentWidth = isMobile ? '100%' : '800px';

  const handleSubmit = async () => {
    if (!name || !email || !message) {
      setSuccessMessage('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    
    // Use backend API in production mode
    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/contact/`, {
        name,
        email,
        message
      });

      if (response.status === 200) {
        setSuccessMessage('Your message has been sent successfully!');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      setSuccessMessage(error.response?.data?.error || 'Failed to send message. Please try again later.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message from either Formspree or backend
  if (state.succeeded) {
    return (
      <CrossPlatformView fullWidthHeader={true} contentWidth={maxContentWidth}>
        <BackHeader title="Contact Us" onBackPress={() => navigation.navigate('More')} />
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
      fullWidthHeader={true}
      contentWidth={maxContentWidth}
    >
      <BackHeader 
        title="Contact Us" 
        onBackPress={() => navigation.navigate('More')} 
      />
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { width: contentWidth }]}>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>Get in touch with our support team</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            value={name}
            onChangeText={setName}
            name="name"
          />
          <ValidationError prefix="Name" field="name" errors={state.errors} />
          <TextInput
            style={styles.input}
            placeholder="Your Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            name="email"
            autoCapitalize="none"
          />
          <ValidationError prefix="Email" field="email" errors={state.errors} />
          
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Your Message"
            value={message}
            onChangeText={setMessage}
            multiline
            name="message"
          />
          <ValidationError prefix="Message" field="message" errors={state.errors} />
          
          {successMessage ? (
            <Text style={styles.successMessage}>
              {successMessage}
            </Text>
          ) : null}
          
          <TouchableOpacity 
            style={[styles.button, isSubmitting && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isSubmitting || (state.submitting)}
          >
            <Text style={styles.buttonText}>
              {isSubmitting || (state.submitting) ? 'Sending...' : 'Send Message'}
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
    justifyContent: 'flex-start',
    paddingVertical: 20,
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
});

export default ContactUs;
