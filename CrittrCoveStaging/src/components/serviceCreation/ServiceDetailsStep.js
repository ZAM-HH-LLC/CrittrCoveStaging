import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch
} from 'react-native';
import { theme } from '../../styles/theme';
import { debugLog } from '../../context/AuthContext';

const MAX_SERVICE_NAME_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 300;

const ServiceDetailsStep = ({ serviceData, setServiceData }) => {
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const validateInput = (text, isName = true) => {
    // Allow only letters, numbers, spaces and & symbol
    const validRegex = /^[a-zA-Z0-9\s&]*$/;
    
    if (!validRegex.test(text)) {
      if (isName) {
        setNameError('Service name can only contain letters, numbers, spaces, and &');
      } else {
        setDescriptionError('Description can only contain letters, numbers, spaces, and &');
      }
      return false;
    }
    
    if (isName) {
      setNameError('');
    } else {
      setDescriptionError('');
    }
    return true;
  };

  const handleServiceNameChange = (text) => {
    // Limit to MAX_SERVICE_NAME_LENGTH characters
    const truncatedText = text.slice(0, MAX_SERVICE_NAME_LENGTH);
    
    if (validateInput(truncatedText, true)) {
      setServiceData(prev => ({
        ...prev,
        serviceName: truncatedText
      }));
    }
  };

  const handleDescriptionChange = (text) => {
    // Limit to MAX_DESCRIPTION_LENGTH characters
    const truncatedText = text.slice(0, MAX_DESCRIPTION_LENGTH);
    
    if (validateInput(truncatedText, false)) {
      setServiceData(prev => ({
        ...prev,
        serviceDescription: truncatedText
      }));
    }
  };

  const handleOvernightToggle = (value) => {
    setServiceData(prev => ({
      ...prev,
      isOvernight: value
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Name</Text>
        <TextInput
          style={styles.input}
          value={serviceData.serviceName}
          onChangeText={handleServiceNameChange}
          placeholder="e.g. Premium Pet Grooming"
          placeholderTextColor={theme.colors.placeHolderText}
          maxLength={MAX_SERVICE_NAME_LENGTH}
        />
        <Text style={styles.characterCount}>
          {serviceData.serviceName.length}/{MAX_SERVICE_NAME_LENGTH}
        </Text>
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={serviceData.serviceDescription}
          onChangeText={handleDescriptionChange}
          placeholder="Describe your service in detail..."
          placeholderTextColor={theme.colors.placeHolderText}
          multiline={true}
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={MAX_DESCRIPTION_LENGTH}
        />
        <Text style={styles.characterCount}>
          {serviceData.serviceDescription.length}/{MAX_DESCRIPTION_LENGTH}
        </Text>
        {descriptionError ? <Text style={styles.errorText}>{descriptionError}</Text> : null}
      </View>
      
      <View style={styles.switchContainer}>
        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Overnight Service</Text>
          <Text style={styles.switchSubLabel}>Does this service require overnight stay?</Text>
        </View>
        <Switch
          value={serviceData.isOvernight}
          onValueChange={handleOvernightToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.mainColors.main }}
          thumbColor={theme.colors.surface}
          ios_backgroundColor={theme.colors.border}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 24,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchGroup: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  characterCount: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ServiceDetailsStep; 