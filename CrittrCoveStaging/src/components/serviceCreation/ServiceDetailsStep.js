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
import InputSelect from '../ServiceTypeSelect';
import { SERVICE_TYPES } from '../../data/mockData';
import { sanitizeInput } from '../../validation/validation';

const MAX_SERVICE_NAME_LENGTH = 35;
const MAX_DESCRIPTION_LENGTH = 300;

const ServiceDetailsStep = ({ serviceData, setServiceData }) => {
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const handleServiceNameChange = (text) => {
    debugLog('MBA7777', 'Service name input change:', text);
    
    // Sanitize the input using DOMPurify-based sanitizer with service_name type
    const sanitized = sanitizeInput(text, 'service_name', { maxLength: MAX_SERVICE_NAME_LENGTH });
    
    // Business logic validation
    if (sanitized.length > 0 && sanitized.length < 3) {
      setNameError('Service name must be at least 3 characters long');
    } else if (sanitized.length > MAX_SERVICE_NAME_LENGTH) {
      setNameError(`Service name must be no more than ${MAX_SERVICE_NAME_LENGTH} characters long`);
    } else {
      setNameError('');
    }
    
    // Auto-toggle overnight service if "Overnight" is mentioned
    const shouldToggleOvernight = sanitized.toLowerCase().includes("overnight") || sanitized.toLowerCase().includes("over night");
    
    setServiceData(prev => ({
      ...prev,
      serviceName: sanitized,
      isOvernight: shouldToggleOvernight || prev.isOvernight
    }));
  };

  const handleDescriptionChange = (text) => {
    debugLog('MBA7777', 'Service description input change:', text);
    
    // Sanitize the input using DOMPurify-based sanitizer with service_description type
    const sanitized = sanitizeInput(text, 'service_description', { maxLength: MAX_DESCRIPTION_LENGTH });
    
    // Business logic validation
    if (sanitized.length > 0 && sanitized.length < 10) {
      setDescriptionError('Service description must be at least 10 characters long');
    } else if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
      setDescriptionError(`Service description must be no more than ${MAX_DESCRIPTION_LENGTH} characters long`);
    } else {
      setDescriptionError('');
    }
    
    setServiceData(prev => ({
      ...prev,
      serviceDescription: sanitized
    }));
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
      
      <View style={[styles.inputGroup, styles.dropdownContainer]}>
        <Text style={styles.label}>Service Name</Text>
        <InputSelect
          value={serviceData.serviceName}
          onChange={handleServiceNameChange}
          suggestions={SERVICE_TYPES}
          placeholder="e.g. Dog Walking"
          placeHolderTextColor={theme.colors.placeHolderText}
          zIndex={1000}
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, descriptionError ? styles.inputError : null]}
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
  inputError: {
    borderColor: theme.colors.error,
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
  dropdownContainer: {
    zIndex: 1000,
  },
});

export default ServiceDetailsStep; 