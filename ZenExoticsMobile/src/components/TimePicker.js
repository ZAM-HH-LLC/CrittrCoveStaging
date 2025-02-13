import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TimePicker = ({ label, value, onChange, fullWidth = false, containerStyle }) => {
  const [showPicker, setShowPicker] = React.useState(false);

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
      style={[styles.timeButton, !fullWidth && styles.compactTimeButton]}
    >
      <Text style={styles.timeText}>
        {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.text} />
    </TouchableOpacity>
  );

  if (Platform.OS === 'web') {
    const webInputStyle = {
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.whiteText,
      fontSize: theme.fontSizes.medium,
      width: fullWidth ? '' : '90%',
    };

    return (
      <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <input
          type="time"
          value={value.toTimeString().slice(0, 5)}
          onChange={(e) => onChange(new Date(`2000-01-01T${e.target.value}`))}
          style={webInputStyle}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      {renderTimeDisplay()}
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginVertical: 8,
  },
  fullWidth: {
    // width: '100%',
  },
  label: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.placeholder,
    marginBottom: 4,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    // backgroundColor: 'black',
    minHeight: 48,
  },
  compactTimeButton: {
    width: 150,
  },
  timeText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  }
});

export default TimePicker;

