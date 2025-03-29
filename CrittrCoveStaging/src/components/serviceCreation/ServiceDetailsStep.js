import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';
import { theme } from '../../styles/theme';

const ServiceDetailsStep = ({ serviceData, setServiceData }) => {
  const handleServiceNameChange = (text) => {
    setServiceData(prev => ({
      ...prev,
      serviceName: text
    }));
  };

  const handleDescriptionChange = (text) => {
    setServiceData(prev => ({
      ...prev,
      serviceDescription: text
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
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Premium Pet Grooming"
          placeholderTextColor={theme.colors.placeHolderText}
          value={serviceData.serviceName}
          onChangeText={handleServiceNameChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your service in detail..."
          placeholderTextColor={theme.colors.placeHolderText}
          value={serviceData.serviceDescription}
          onChangeText={handleDescriptionChange}
          multiline={true}
          numberOfLines={6}
          textAlignVertical="top"
        />
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
});

export default ServiceDetailsStep; 