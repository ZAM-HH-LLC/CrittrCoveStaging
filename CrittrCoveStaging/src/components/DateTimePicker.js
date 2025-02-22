import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Animated } from 'react-native';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DateTimePicker = ({
  value,
  onChange,
  error,
  disabled = false,
  containerStyle,
  isMilitary = true,
  onPickerStateChange
}) => {
  const { is_DEBUG, screenWidth } = useContext(AuthContext);
  const [inputs, setInputs] = useState({
    month: '',
    day: '',
    year: '',
    hours: '',
    minutes: '',
    period: isMilitary ? null : 'AM'
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const containerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const animatePickerVisibility = (show) => {
    Animated.timing(fadeAnim, {
      toValue: show ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animatePickerVisibility(showCalendar || showTimeSelector);
  }, [showCalendar, showTimeSelector]);

  useEffect(() => {
    if (value instanceof Date && !isNaN(value)) {
      if (is_DEBUG) {
        console.log('MBA1234 Received date value:', value.toISOString());
      }
      
      const hours24 = value.getHours();
      const hours12 = hours24 % 12 || 12;
      const period = isMilitary ? null : (hours24 >= 12 ? 'PM' : 'AM');
      
      if (is_DEBUG) {
        console.log('MBA1234 Time format detection:', {
          hours24,
          hours12,
          period,
          isMilitary
        });
      }
      
      setInputs({
        month: String(value.getMonth() + 1).padStart(2, '0'),
        day: String(value.getDate()).padStart(2, '0'),
        year: String(value.getFullYear()),
        hours: isMilitary ? String(hours24).padStart(2, '0') : String(hours12).padStart(2, '0'),
        minutes: String(value.getMinutes()).padStart(2, '0'),
        period
      });
    }
  }, [value, isMilitary]);

  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA5678 DateTimePicker picker states:', {
        showCalendar,
        showTimeSelector,
        isPickerActive: showCalendar || showTimeSelector
      });
    }
    onPickerStateChange?.(showCalendar || showTimeSelector);
  }, [showCalendar, showTimeSelector]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (is_DEBUG) {
          console.log('MBA5678 Click outside - closing pickers');
        }
        setShowCalendar(false);
        setShowTimeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTwoDigitInput = (input, field, currentValue) => {
    // Remove any non-numeric characters
    const numbers = input.replace(/[^0-9]/g, '');
    
    if (is_DEBUG) {
      console.log('MBA1234 Formatting input:', {
        field,
        input,
        numbers,
        currentValue
      });
    }

    // Handle backspace (empty input)
    if (numbers.length === 0) {
      return '00';
    }

    // If we only have one digit
    if (numbers.length === 1) {
      return `0${numbers}`;
    }

    // If we have two digits
    if (numbers.length >= 2) {
      const firstDigit = parseInt(numbers[0], 10);
      const secondDigit = parseInt(numbers[1], 10);
      
      if (field === 'month') {
        if (firstDigit > 1 || (firstDigit === 1 && secondDigit > 2)) {
          return '12';
        }
        return `${firstDigit}${secondDigit}`;
      }
      
      if (field === 'day') {
        if (firstDigit > 3 || (firstDigit === 3 && secondDigit > 1)) {
          return '31';
        }
        return `${firstDigit}${secondDigit}`;
      }
      
      if (field === 'hours') {
        if (!currentValue.period) {
          // 24-hour format
          if (firstDigit > 2 || (firstDigit === 2 && secondDigit > 3)) {
            return '23';
          }
        } else {
          // 12-hour format
          if (firstDigit > 1 || (firstDigit === 1 && secondDigit > 2)) {
            return '12';
          }
        }
        return `${firstDigit}${secondDigit}`;
      }
      
      if (field === 'minutes') {
        if (firstDigit > 5) {
          return '59';
        }
        return `${firstDigit}${secondDigit}`;
      }
    }
    
    return numbers.slice(0, 2);
  };

  const formatYearInput = (input) => {
    const numbers = input.replace(/[^0-9]/g, '');
    if (numbers.length === 0) return '0000';
    return numbers.padStart(4, '0').slice(0, 4);
  };

  const handleInputChange = (field, value) => {
    let formattedValue = value;

    if (is_DEBUG) {
      console.log('MBA1234 Input change:', {
        field,
        value,
        currentInputs: inputs
      });
    }

    switch (field) {
      case 'month':
        formattedValue = formatTwoDigitInput(value, 'month', inputs);
        break;
      case 'day':
        formattedValue = formatTwoDigitInput(value, 'day', inputs);
        break;
      case 'year':
        formattedValue = formatYearInput(value);
        break;
      case 'hours':
        formattedValue = formatTwoDigitInput(value, 'hours', inputs);
        break;
      case 'minutes':
        formattedValue = formatTwoDigitInput(value, 'minutes', inputs);
        break;
      case 'period':
        formattedValue = value;
        break;
    }

    if (is_DEBUG) {
      console.log('MBA1234 Formatted value:', {
        field,
        formattedValue
      });
    }

    const newInputs = { ...inputs, [field]: formattedValue };
    setInputs(newInputs);

    // Only create new date if we have all required fields
    if (newInputs.month && newInputs.day && newInputs.year && 
        newInputs.hours && newInputs.minutes) {
      createNewDate(newInputs);
    }
  };

  const createNewDate = (currentInputs) => {
    try {
      let hours = parseInt(currentInputs.hours, 10);
      if (currentInputs.period) {
        // Only convert hours if we're using AM/PM
        if (currentInputs.period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (currentInputs.period === 'AM' && hours === 12) {
          hours = 0;
        }
      }

      const newDate = new Date(
        parseInt(currentInputs.year, 10),
        parseInt(currentInputs.month, 10) - 1,
        parseInt(currentInputs.day, 10),
        hours,
        parseInt(currentInputs.minutes, 10)
      );

      if (is_DEBUG) {
        console.log('MBA1234 Created new date:', {
          inputs: currentInputs,
          newDate: newDate.toISOString()
        });
      }

      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBA1234 Error creating date:', error);
      }
    }
  };

  const handleDatePress = () => {
    if (is_DEBUG) {
      console.log('MBA5678 Date press - toggling calendar');
    }
    setShowCalendar(prev => !prev);
    setShowTimeSelector(false);
  };

  const handleTimePress = () => {
    if (is_DEBUG) {
      console.log('MBA5678 Time press - toggling time selector');
    }
    setShowTimeSelector(prev => !prev);
    setShowCalendar(false);
  };

  const handleDaySelect = (day) => {
    handleInputChange('day', String(day));
    setShowCalendar(false);
  };

  if (is_DEBUG) {
    console.log('MBA1234 Current state:', {
      inputs,
      isMilitary
    });
  }

  return (
    <View style={[styles.container, containerStyle]} ref={containerRef}>
      <View style={[
        styles.dateTimeContainer,
        error && styles.errorBorder,
        disabled && styles.disabled
      ]}>
        {/* Date Inputs */}
        <Pressable 
          style={styles.dateInputGroup}
          onPress={() => !disabled && handleDatePress()}
        >
          <TextInput
            style={styles.numberInput}
            value={inputs.month}
            maxLength={2}
            keyboardType="number-pad"
            onChangeText={(text) => handleInputChange('month', text)}
            placeholder="MM"
            editable={!disabled}
          />
          <Text style={styles.separator}>/</Text>
          <TextInput
            style={styles.numberInput}
            value={inputs.day}
            maxLength={2}
            keyboardType="number-pad"
            onChangeText={(text) => handleInputChange('day', text)}
            placeholder="DD"
            editable={!disabled}
          />
          <Text style={styles.separator}>/</Text>
          <TextInput
            style={styles.yearInput}
            value={inputs.year}
            maxLength={4}
            keyboardType="number-pad"
            onChangeText={(text) => handleInputChange('year', text)}
            placeholder="YYYY"
            editable={!disabled}
          />
          {screenWidth > 410 && (
            <MaterialCommunityIcons 
              name="calendar" 
              size={20} 
              color={theme.colors.text} 
              style={styles.icon} 
            />
          )}
        </Pressable>
        
        <Text style={styles.divider}>|</Text>
        
        {/* Time Inputs */}
        <Pressable 
          style={styles.timeInputGroup}
          onPress={() => !disabled && handleTimePress()}
        >
          <TextInput
            style={styles.numberInput}
            value={inputs.hours}
            maxLength={2}
            keyboardType="number-pad"
            onChangeText={(text) => handleInputChange('hours', text)}
            placeholder="HH"
            editable={!disabled}
          />
          <Text style={styles.separator}>:</Text>
          <TextInput
            style={styles.numberInput}
            value={inputs.minutes}
            maxLength={2}
            keyboardType="number-pad"
            onChangeText={(text) => handleInputChange('minutes', text)}
            placeholder="MM"
            editable={!disabled}
          />
          
          {/* AM/PM Toggle - only show if not military time */}
          {!isMilitary && (
            <Pressable
              style={styles.periodButton}
              onPress={() => !disabled && handleInputChange('period', inputs.period)}
              disabled={disabled}
            >
              <Text style={styles.periodText}>{inputs.period}</Text>
            </Pressable>
          )}
          {screenWidth > 410 && (
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={20} 
              color={theme.colors.text} 
              style={styles.icon} 
            />
          )}
        </Pressable>
      </View>

      <Animated.View style={[
        styles.pickerContainer,
        { opacity: fadeAnim },
        { display: (showCalendar || showTimeSelector) ? 'flex' : 'none' }
      ]}>
        {showCalendar && !disabled && (
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderText}>
                {value.toLocaleString('default', { month: 'long' })} {value.getFullYear()}
              </Text>
            </View>
            <View style={styles.calendarWeekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
              ))}
            </View>
            {/* Calendar grid */}
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.calendarWeek}>
                {Array.from({ length: 7 }).map((__, dayIndex) => {
                  const dayNumber = weekIndex * 7 + dayIndex - value.getDay() + 1;
                  const isCurrentMonth = dayNumber > 0 && dayNumber <= new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
                  const isSelected = parseInt(inputs.day) === dayNumber;
                  
                  return (
                    <Pressable
                      key={`day-${dayIndex}`}
                      style={[
                        styles.calendarDay,
                        isSelected && styles.selectedDay,
                        !isCurrentMonth && styles.disabledDay
                      ]}
                      onPress={() => isCurrentMonth && handleDaySelect(dayNumber)}
                    >
                      {isCurrentMonth && (
                        <Text style={[
                          styles.calendarDayText,
                          isSelected && styles.selectedDayText
                        ]}>
                          {dayNumber}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {showTimeSelector && !disabled && (
          <View style={styles.timeSelector}>
            <View style={styles.timeSelectorColumn}>
              <Text style={styles.timeSelectorLabel}>Hour</Text>
              <ScrollView style={styles.timeSelectorScroll}>
                {Array.from({ length: isMilitary ? 24 : 12 }, (_, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.timeSelectorItem,
                      parseInt(inputs.hours) === (isMilitary ? i : i + 1) && styles.selectedTime
                    ]}
                    onPress={() => {
                      handleInputChange('hours', String(isMilitary ? i : i + 1).padStart(2, '0'));
                    }}
                  >
                    <Text style={[
                      styles.timeSelectorText,
                      parseInt(inputs.hours) === (isMilitary ? i : i + 1) && styles.selectedTimeText
                    ]}>
                      {String(isMilitary ? i : i + 1).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timeSelectorColumn}>
              <Text style={styles.timeSelectorLabel}>Minute</Text>
              <ScrollView style={styles.timeSelectorScroll}>
                {Array.from({ length: 60 }, (_, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.timeSelectorItem,
                      parseInt(inputs.minutes) === i && styles.selectedTime
                    ]}
                    onPress={() => handleInputChange('minutes', String(i).padStart(2, '0'))}
                  >
                    <Text style={[
                      styles.timeSelectorText,
                      parseInt(inputs.minutes) === i && styles.selectedTimeText
                    ]}>
                      {String(i).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {!isMilitary && (
              <View style={styles.timeSelectorColumn}>
                <Text style={styles.timeSelectorLabel}>Period</Text>
                <View style={styles.periodContainer}>
                  <Pressable
                    style={[
                      styles.timeSelectorItem,
                      inputs.period === 'AM' && styles.selectedTime
                    ]}
                    onPress={() => handleInputChange('period', 'AM')}
                  >
                    <Text style={[
                      styles.timeSelectorText,
                      inputs.period === 'AM' && styles.selectedTimeText
                    ]}>
                      AM
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.timeSelectorItem,
                      inputs.period === 'PM' && styles.selectedTime
                    ]}
                    onPress={() => handleInputChange('period', 'PM')}
                  >
                    <Text style={[
                      styles.timeSelectorText,
                      inputs.period === 'PM' && styles.selectedTimeText
                    ]}>
                      PM
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 40,
    width: '100%',
    justifyContent: 'space-between',
  },
  dateInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  numberInput: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    width: 24,
    textAlign: 'center',
    padding: 0,
  },
  yearInput: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    width: 42,
    textAlign: 'center',
    padding: 0,
  },
  separator: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginHorizontal: 2,
  },
  divider: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.border,
    marginHorizontal: 8,
  },
  periodButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  periodText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontWeight: '500',
  },
  errorBorder: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.small,
    marginTop: 4,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.7,
  },
  icon: {
    marginLeft: 8,
  },
  pickerContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  calendar: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarHeaderText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarWeekDay: {
    width: 36,
    textAlign: 'center',
    fontSize: theme.fontSizes.small,
    color: theme.colors.placeholder,
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calendarDay: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  calendarDayText: {
    fontSize: theme.fontSizes.medium,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
  },
  selectedDayText: {
    color: theme.colors.surface,
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
    padding: 12,
    gap: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  timeSelectorColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeSelectorLabel: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.placeholder,
    marginBottom: 8,
  },
  timeSelectorScroll: {
    height: 200,
    width: '100%',
  },
  timeSelectorItem: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 4,
    width: '100%',
  },
  timeSelectorText: {
    fontSize: theme.fontSizes.medium,
  },
  selectedTime: {
    backgroundColor: theme.colors.primary,
  },
  selectedTimeText: {
    color: theme.colors.surface,
  },
  periodContainer: {
    width: '100%',
  },
  disabledDay: {
    opacity: 0.3,
  },
});

export default DateTimePicker; 