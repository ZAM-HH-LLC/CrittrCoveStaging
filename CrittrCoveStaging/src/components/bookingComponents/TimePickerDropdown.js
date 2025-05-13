import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { debugLog } from '../../context/AuthContext';

const HOURS = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i).filter(m => m % 5 === 0);
const PERIODS = ['AM', 'PM'];

const TimePickerDropdown = ({
  initialTime,
  onTimeSelect,
  isOpen,
  onClose,
  label = 'Time',
  uniqueId = 'default',
  showInlinePicker = false
}) => {
  // Create references for scrolling to right position
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const periodScrollRef = useRef(null);
  
  // Need to deep copy initialTime to prevent reference issues
  const initTime = JSON.parse(JSON.stringify(initialTime || { hours: 9, minutes: 0 }));
  
  // Convert 24h to 12h format for UI
  const init12Hour = () => {
    const hours24 = initTime.hours;
    
    // Find the closest 5-minute interval
    const minute = Math.round(initTime.minutes / 5) * 5;
    
    return {
      hour: hours24 % 12 === 0 ? 12 : hours24 % 12,
      minute: minute >= 60 ? 0 : minute, // Handle case where rounding gives 60
      period: hours24 >= 12 ? 'PM' : 'AM'
    };
  };
  
  // State for the selected time
  const [selectedTime, setSelectedTime] = useState(init12Hour());
  
  // Keep track of the last confirmed time
  const [lastConfirmedTime, setLastConfirmedTime] = useState(init12Hour());
  
  // Add error state
  const [timeError, setTimeError] = useState(null);
  
  // Reset the selected time when the initial time changes
  useEffect(() => {
    if (initialTime) {
      const newTime = init12Hour();
      setSelectedTime(newTime);
      setLastConfirmedTime(newTime);
      setTimeError(null);
    }
  }, [initialTime?.hours, initialTime?.minutes]);
  
  // Clear error after 5 seconds
  useEffect(() => {
    if (timeError) {
      const timer = setTimeout(() => {
        setTimeError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [timeError]);
  
  // Scroll to the right positions when the picker is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToSelections();
      }, 50);
    }
  }, [isOpen, selectedTime]);

  // Function to handle hour selection
  const handleHourSelect = (hour) => {
    setSelectedTime(prev => ({ ...prev, hour }));
    setTimeError(null);
  };

  // Function to handle minute selection
  const handleMinuteSelect = (minute) => {
    setSelectedTime(prev => ({ ...prev, minute }));
    setTimeError(null);
  };

  // Function to handle AM/PM selection
  const handlePeriodSelect = (period) => {
    setSelectedTime(prev => ({ ...prev, period }));
    setTimeError(null);
  };

  // Convert 12h time to 24h and call the onTimeSelect callback
  const triggerTimeChange = (time12h) => {
    const { hour, minute, period } = time12h;
    
    // Convert to 24-hour format
    let hours24 = hour;
    if (period === 'PM' && hour !== 12) hours24 += 12;
    if (period === 'AM' && hour === 12) hours24 = 0;
    
    const newTime = {
      hours: hours24,
      minutes: minute
    };
    
    debugLog(`MBAoi9uv43d: TimePickerDropdown selected time (${uniqueId}):`, {
      time12h, 
      time24h: newTime
    });
    
    // Update the last confirmed time
    setLastConfirmedTime(time12h);
    
    // Pass the new time up to the parent component
    const isValid = onTimeSelect(newTime);
    
    // If time validation failed (parent returned false), show an error
    if (isValid === false) {
      // Show error alert
      Alert.alert(
        "Invalid Time Selection", 
        uniqueId.includes('start') ? 
          "Start time cannot be later than end time." :
          "End time cannot be earlier than start time.",
        [{ text: "OK" }]
      );
      
      // Set error message for visual indicator
      setTimeError(uniqueId.includes('start') ? 
        "Start time cannot be later than end time." :
        "End time cannot be earlier than start time."
      );
      
      return false;
    }
    
    // Only close the picker if validation passed
    onClose();
    return true;
  };

  // Handle confirm button press
  const handleConfirm = () => {
    triggerTimeChange(selectedTime);
  };
  
  // Handle cancel button press
  const handleCancel = () => {
    // Reset the selected time to the last confirmed time
    setSelectedTime(lastConfirmedTime);
    setTimeError(null);
    onClose();
  };

  // Scroll to the selected values
  const scrollToSelections = () => {
    if (hourScrollRef.current) {
      const hourIndex = HOURS.indexOf(selectedTime.hour);
      const hourOffset = hourIndex * 40;
      hourScrollRef.current.scrollTo({ y: Math.max(0, hourOffset - 40), animated: true });
    }
    
    if (minuteScrollRef.current) {
      const minuteIndex = MINUTES.indexOf(selectedTime.minute);
      const minuteOffset = minuteIndex * 40;
      minuteScrollRef.current.scrollTo({ y: Math.max(0, minuteOffset - 40), animated: true });
    }
    
    if (periodScrollRef.current) {
      const periodIndex = PERIODS.indexOf(selectedTime.period);
      const periodOffset = periodIndex * 40;
      periodScrollRef.current.scrollTo({ y: Math.max(0, periodOffset - 20), animated: true });
    }
  };

  // Format the time for display
  const formatTimeDisplay = (hour, minute, period) => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Render the dropdown content
  const renderDropdownContent = () => (
    <View>
      <View style={styles.dropdownContent}>
        {/* Hours */}
        <ScrollView 
          ref={hourScrollRef} 
          style={styles.column}
          showsVerticalScrollIndicator={false}
        >
          {HOURS.map((hour) => (
            <TouchableOpacity
              key={`hour-${hour}`}
              style={[
                styles.option,
                selectedTime.hour === hour && styles.selectedOption
              ]}
              onPress={() => handleHourSelect(hour)}
            >
              <Text style={[
                styles.optionText,
                selectedTime.hour === hour && styles.selectedOptionText
              ]}>
                {hour}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Minutes */}
        <ScrollView 
          ref={minuteScrollRef} 
          style={styles.column}
          showsVerticalScrollIndicator={false}
        >
          {MINUTES.map((minute) => (
            <TouchableOpacity
              key={`minute-${minute}`}
              style={[
                styles.option,
                selectedTime.minute === minute && styles.selectedOption
              ]}
              onPress={() => handleMinuteSelect(minute)}
            >
              <Text style={[
                styles.optionText,
                selectedTime.minute === minute && styles.selectedOptionText
              ]}>
                {minute.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* AM/PM */}
        <ScrollView 
          ref={periodScrollRef} 
          style={styles.column}
          showsVerticalScrollIndicator={false}
        >
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={`period-${period}`}
              style={[
                styles.option,
                selectedTime.period === period && styles.selectedOption
              ]}
              onPress={() => handlePeriodSelect(period)}
            >
              <Text style={[
                styles.optionText,
                selectedTime.period === period && styles.selectedOptionText
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Error message */}
      {timeError && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={16} color={theme.colors.error || '#D32F2F'} />
          <Text style={styles.errorText}>{timeError}</Text>
        </View>
      )}
      
      {/* Buttons row */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.confirmButton]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // For inline mode (shown directly in the UI)
  if (showInlinePicker) {
    return (
      <View style={styles.inlineContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {renderDropdownContent()}
      </View>
    );
  }

  // For dropdown mode (shown when button is clicked)
  return (
    <>
      <TouchableOpacity
        style={styles.timeDisplay}
        onPress={isOpen ? onClose : () => {}}
      >
        <MaterialIcons name="access-time" size={18} color={theme.colors.mainColors.main} />
        <Text style={styles.timeText}>
          {formatTimeDisplay(selectedTime.hour, selectedTime.minute, selectedTime.period)}
        </Text>
        <MaterialIcons 
          name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={20} 
          color={theme.colors.text} 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownContainer}>
          {renderDropdownContent()}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    marginVertical: 5,
  },
  timeText: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: theme.fontSizes.medium,
    marginLeft: 8,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    marginTop: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inlineContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 4,
  },
  label: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: theme.fontSizes.small,
    marginBottom: 8,
  },
  dropdownContent: {
    flexDirection: 'row',
    padding: 4,
  },
  column: {
    flex: 1,
    height: 160,
  },
  option: {
    padding: 8,
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: `${theme.colors.mainColors.main}20`,
    borderRadius: 4,
  },
  optionText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: theme.fontSizes.medium,
  },
  selectedOptionText: {
    color: theme.colors.mainColors.main,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: theme.colors.mainColors.main,
  },
  cancelButton: {
    backgroundColor: theme.colors.modernBorder,
  },
  confirmButtonText: {
    color: 'white',
    fontFamily: theme.fonts.medium.fontFamily,
    fontSize: theme.fontSizes.small,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: theme.fontSizes.small,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    marginHorizontal: 4,
    marginTop: 4,
    borderRadius: 4,
  },
  errorText: {
    color: theme.colors.error || '#D32F2F',
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.regular.fontFamily,
    marginLeft: 4,
    flex: 1,
  }
});

export default TimePickerDropdown; 