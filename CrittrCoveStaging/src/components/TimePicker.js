import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const windowWidth = Dimensions.get('window').width;
  const isMobileWeb = Platform.OS === 'web' && windowWidth < 768;

  const handleChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const showTimepicker = () => {
    setShowPicker(true);
  };

  const renderTimeDisplay = () => (
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
      <MaterialCommunityIcons 
        name="clock-outline" 
        size={24} 
        color={disabled ? theme.colors.placeholder : theme.colors.text} 
      />
    </TouchableOpacity>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
        {label && <Text style={[styles.label, error && styles.errorText]}>{label}</Text>}
        <View style={[
          styles.webInputContainer,
          !fullWidth && styles.compactTimeButton,
          error && styles.errorBorder,
          disabled && styles.disabled
        ]}>
          <input
            type="time"
            value={value.toTimeString().slice(0, 5)}
            onChange={(e) => onChange(new Date(`2000-01-01T${e.target.value}`))}
            style={styles.webInput}
            disabled={disabled}
          />
          <MaterialCommunityIcons 
            name="clock-outline" 
            size={24} 
            color={disabled ? theme.colors.placeholder : theme.colors.text}
            style={styles.webIcon}
          />
        </View>
        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
      {label && <Text style={[styles.label, error && styles.errorText]}>{label}</Text>}
      {renderTimeDisplay()}
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
  },
  webInput: {
    padding: 8,
    paddingRight: 36,
    fontSize: theme.fontSizes.medium,
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: theme.colors.text,
  },
  webIcon: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
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

