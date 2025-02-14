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
  displayFormat = (date) => date // Optional custom display format
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
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => {
          e.preventDefault();
          onChange(e.target.value);
        }}
        style={styles.webDatePicker}
        placeholder={placeholder}
      />
    );
  } else if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={dateValue}
        mode="date"
        display="default"
        onChange={handleChange}
      />
    );
  } else {
    return (
      <>
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)}
          style={styles.androidButton}
        >
          <Text style={styles.dateText}>
            {value ? displayFormat(value) : placeholder}
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={handleChange}
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
  },
  androidButton: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
});

export default DatePicker;