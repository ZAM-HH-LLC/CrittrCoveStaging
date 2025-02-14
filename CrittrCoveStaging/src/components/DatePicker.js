import React, { useState } from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';

// Called in DefaultSettingsModal.js
// Called in MyProfile.js
// Called in BookingDetails.js

const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = 'Select Date',
  displayFormat = (date) => date, // Optional custom display format
  disabled = false,
  isInModal = false // New prop to handle modal context differently
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  const handleChange = (event, selectedDate) => {
    const currentDate = selectedDate || dateValue;
    
    // Only close picker on Android after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      onChange(currentDate.toISOString().split('T')[0]);
    }
  };

  if (Platform.OS === 'web') {
    const handleInputClick = (e) => {
      if (isInModal) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleInputChange = (e) => {
      if (isInModal) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!disabled) {
        onChange(e.target.value);
      }
    };

    return (
      <input
        type="date"
        value={value || ''}
        onClick={handleInputClick}
        onMouseDown={handleInputClick}
        onChange={handleInputChange}
        style={{
          ...styles.webDatePicker,
          ...(disabled ? styles.disabledInput : {})
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  } else if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={dateValue}
        mode="date"
        display="default"
        onChange={handleChange}
        disabled={disabled}
      />
    );
  } else {
    return (
      <>
        <TouchableOpacity 
          onPress={() => !disabled && setShowDatePicker(true)}
          style={[
            styles.androidButton,
            disabled && styles.disabledInput
          ]}
          disabled={disabled}
        >
          <Text style={[
            styles.dateText,
            disabled && styles.disabledText
          ]}>
            {value ? displayFormat(value) : placeholder}
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={handleChange}
            disabled={disabled}
          />
        )}
      </>
    );
  }
};

const styles = StyleSheet.create({
  webDatePicker: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSizes.medium,
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  androidButton: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  dateText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  disabledInput: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.7,
  },
  disabledText: {
    color: theme.colors.placeholder,
  }
});

export default DatePicker;