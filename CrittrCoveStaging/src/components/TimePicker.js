import React, { useContext } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';

const TimePicker = ({ 
  label, 
  value, 
  onChange, 
  fullWidth = false, 
  containerStyle,
  error,
  disabled = false 
}) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const { screenWidth } = useContext(AuthContext);
  const showClockIcon = screenWidth > 400;

  const handleChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const showTimepicker = () => {
    setShowPicker(true);
  };

  if (Platform.OS === 'web') {
    // Add browser detection for Chrome
    const isChrome = typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

    // Create style element using React.createElement to avoid JSX parsing on mobile
    const styleElement = React.createElement('style', {}, `
      input[type="time"]::-webkit-calendar-picker-indicator {
        display: ${showClockIcon && isChrome ? 'block' : 'none'};
      }
      input[type="time"]::-webkit-inner-spin-button,
      input[type="time"]::-webkit-clear-button {
        display: none;
      }
    `);

    // Create input element using React.createElement
    const inputElement = React.createElement('input', {
      type: 'time',
      value: value.toTimeString().slice(0, 5),
      onChange: (e) => onChange(new Date(`2000-01-01T${e.target.value}`)),
      style: {
        ...styles.webInput,
        paddingRight: '12px',
      },
      disabled: disabled
    });

    const handleIconPress = () => {
      if (!disabled && typeof document !== 'undefined') {
        const input = document.querySelector('input[type="time"]');
        if (input && typeof input.showPicker === 'function') {
          input.showPicker();
        }
      }
    };

    return (
      <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
        {label && <Text style={[styles.label, error && styles.errorText]}>{label}</Text>}
        <View style={[
          styles.webInputContainer,
          !fullWidth && styles.compactTimeButton,
          error && styles.errorBorder,
          disabled && styles.disabled
        ]}>
          {styleElement}
          {inputElement}
          {showClockIcon && !isChrome && (
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={24} 
              color={disabled ? theme.colors.placeholder : theme.colors.text}
              style={styles.webIcon}
              onPress={disabled ? null : handleIconPress}
            />
          )}
        </View>
        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
      {label && <Text style={[styles.label, error && styles.errorText]}>{label}</Text>}
      <TouchableOpacity 
        onPress={showTimepicker}
        style={[
          styles.timeButton, 
          !fullWidth && styles.compactTimeButton,
          error && styles.errorBorder,
          disabled && styles.disabled
        ]}
        disabled={disabled}
      >
        <Text style={[styles.timeText, disabled && styles.disabledText]}>
          {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {showClockIcon && (
          <MaterialCommunityIcons 
            name="clock-outline" 
            size={24} 
            color={disabled ? theme.colors.placeholder : theme.colors.text} 
          />
        )}
      </TouchableOpacity>
      {error && <Text style={styles.errorMessage}>{error}</Text>}
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleChange}
          disabled={disabled}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginVertical: 8,
    // marginBottom: 8,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.placeholder,
    fontWeight: '500',
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: theme.colors.background,
    minHeight: 20,
  },
  compactTimeButton: {
    width: 150,
  },
  timeText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  webInputContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
    height: 40,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  webInput: {
    // padding: '8px 36px 8px 12px',
    fontSize: theme.fontSizes.medium,
    marginLeft: 12,
    width: '90%',
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: theme.colors.text,
  },
  webIcon: {
    position: 'absolute',
    right: 12,
    cursor: 'pointer',
    pointerEvents: 'auto',
  },
  errorBorder: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
  },
  errorMessage: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.small,
    marginTop: 4,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.7,
  },
  disabledText: {
    color: theme.colors.placeholder,
  },
});

export default TimePicker;

