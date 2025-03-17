import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';
import TimeSlider from './TimeSlider';

const THUMB_SIZE = 20;
const TRACK_HEIGHT = 4;
const MINUTES_STEP = 15;

const TimeSelectionCard = ({ 
  onTimeSelect,
  initialTimes = {},
  dateRange = null,
}) => {
  const { is_DEBUG, screenWidth } = useContext(AuthContext);
  const sliderContainerRef = useRef(null);
  const [sliderWidth, setSliderWidth] = useState(0);

  const [timeValues, setTimeValues] = useState([9, 17]);
  const [timeMinutes, setTimeMinutes] = useState([0, 0]);
  const [isOvernightForced, setIsOvernightForced] = useState(false);
  const [showIndividualDays, setShowIndividualDays] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeType, setActiveTimeType] = useState(null);

  const startThumbX = useRef(new Animated.Value(0)).current;
  const endThumbX = useRef(new Animated.Value(0)).current;

  // Add ref for click outside detection
  const timePickerRef = useRef(null);
  const timePickerStartRef = useRef(null);
  const timePickerEndRef = useRef(null);

  useEffect(() => {
    updateThumbPositions();
  }, [sliderWidth, timeValues, timeMinutes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showTimePicker) return;

      // Get the clicked element
      const target = event.target;

      // Function to check if an element is a child of a ref
      const isChildOf = (element, ref) => {
        if (!ref.current || !element) return false;
        return ref.current.contains(element);
      };

      // Check if click was inside either time picker
      const isInsideStart = isChildOf(target, timePickerStartRef);
      const isInsideEnd = isChildOf(target, timePickerEndRef);

      if (!isInsideStart && !isInsideEnd) {
        setShowTimePicker(false);
        setActiveTimeType(null);
      }
    };

    if (Platform.OS === 'web') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTimePicker]);

  // Update slider width when container size changes
  useEffect(() => {
    if (!sliderContainerRef.current) return;

    const updateSliderWidth = () => {
      if (sliderContainerRef.current) {
        const containerWidth = sliderContainerRef.current.offsetWidth;
        // Account for thumb size in width calculation
        setSliderWidth(Math.min(containerWidth - THUMB_SIZE, 736));
      }
    };

    // Initial width calculation
    updateSliderWidth();

    // Add resize observer for dynamic updates
    const resizeObserver = new ResizeObserver(updateSliderWidth);
    resizeObserver.observe(sliderContainerRef.current);

    return () => {
      if (sliderContainerRef.current) {
        resizeObserver.unobserve(sliderContainerRef.current);
      }
    };
  }, []);

  const updateThumbPositions = () => {
    if (!sliderWidth) return;
    
    const startPos = ((timeValues[0] + timeMinutes[0] / 60) / 24) * sliderWidth;
    const endPos = ((timeValues[1] + timeMinutes[1] / 60) / 24) * sliderWidth;
    
    if (!isNaN(startPos)) {
      startThumbX.setValue(startPos);
      if (is_DEBUG) console.log('MBA54321 Setting start thumb to:', startPos);
    }
    if (!isNaN(endPos)) {
      endThumbX.setValue(endPos);
      if (is_DEBUG) console.log('MBA54321 Setting end thumb to:', endPos);
    }
  };

  const createPanResponder = (isStart) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const thumbX = isStart ? startThumbX : endThumbX;
        const currentValue = thumbX._value;
        thumbX.setOffset(currentValue);
        thumbX.setValue(0);
        if (is_DEBUG) console.log('MBA54321 Started dragging:', isStart ? 'start' : 'end', 'at:', currentValue);
      },
      onPanResponderMove: (_, gesture) => {
        if (!sliderWidth) return;

        const thumbX = isStart ? startThumbX : endThumbX;
        const otherThumbX = isStart ? endThumbX : startThumbX;
        
        // Calculate new position
        let newX = thumbX._offset + gesture.dx;
        newX = Math.max(0, Math.min(newX, sliderWidth));

        // Check constraints between thumbs
        if (isStart) {
          if (newX >= otherThumbX._value) return;
        } else {
          if (newX <= startThumbX._value) return;
        }

        // Update thumb position
        thumbX.setValue(newX - thumbX._offset);

        // Calculate time from position
        const timeInHours = (newX / sliderWidth) * 24;
        const hours = Math.floor(timeInHours);
        const minutes = Math.round((timeInHours - hours) * 60 / MINUTES_STEP) * MINUTES_STEP;

        if (!isNaN(hours) && !isNaN(minutes)) {
          if (isStart) {
            setTimeValues(prev => [hours, prev[1]]);
            setTimeMinutes(prev => [minutes, prev[1]]);
          } else {
            setTimeValues(prev => [prev[0], hours]);
            setTimeMinutes(prev => [prev[0], minutes]);
          }
          if (is_DEBUG) console.log('MBA54321 Dragging:', isStart ? 'start' : 'end', { newX, hours, minutes });
        }
      },
      onPanResponderRelease: () => {
        const thumbX = isStart ? startThumbX : endThumbX;
        const finalValue = Math.max(0, Math.min(thumbX._offset + thumbX._value, sliderWidth));
        
        // Calculate final time
        const timeInHours = (finalValue / sliderWidth) * 24;
        const hours = Math.floor(timeInHours);
        const minutes = Math.round((timeInHours - hours) * 60 / MINUTES_STEP) * MINUTES_STEP;

        // Update the thumb position to the final value
        thumbX.setOffset(0);
        thumbX.setValue(finalValue);

        if (!isNaN(hours) && !isNaN(minutes)) {
          if (isStart) {
            setTimeValues(prev => [hours, prev[1]]);
            setTimeMinutes(prev => [minutes, prev[1]]);
            updateTimeSelection(hours, minutes, timeValues[1], timeMinutes[1]);
          } else {
            setTimeValues(prev => [prev[0], hours]);
            setTimeMinutes(prev => [prev[0], minutes]);
            updateTimeSelection(timeValues[0], timeMinutes[0], hours, minutes);
          }
          if (is_DEBUG) console.log('MBA54321 Released:', isStart ? 'start' : 'end', { position: finalValue, hours, minutes });
        }
      },
      onPanResponderTerminate: () => {
        const thumbX = isStart ? startThumbX : endThumbX;
        const finalValue = Math.max(0, Math.min(thumbX._offset + thumbX._value, sliderWidth));
        thumbX.setOffset(0);
        thumbX.setValue(finalValue);
      },
    });
  };

  const updateTimeSelection = (startHour, startMinutes, endHour, endMinutes) => {
    if (is_DEBUG) {
      console.log('MBA54321 Time range changed:', [
        formatTime(startHour, startMinutes),
        formatTime(endHour, endMinutes)
      ]);
    }
    if (onTimeSelect) {
      onTimeSelect({
        startTime: { hour: startHour, minutes: startMinutes },
        endTime: { hour: endHour, minutes: endMinutes },
        isOvernightForced,
      });
    }
  };

  const toggleOvernight = () => {
    setIsOvernightForced(!isOvernightForced);
    if (is_DEBUG) {
      console.log('MBA54321 Overnight mode toggled:', !isOvernightForced);
    }
    updateTimeSelection(timeValues[0], timeMinutes[0], timeValues[1], timeMinutes[1]);
  };

  const handlePresetSelect = (preset) => {
    let newValues, newMinutes;
    switch (preset) {
      case 'morning':
        newValues = [9, 12];
        newMinutes = [0, 0];
        break;
      case 'afternoon':
        newValues = [13, 17];
        newMinutes = [0, 0];
        break;
      case 'fullDay':
        newValues = [9, 17];
        newMinutes = [0, 0];
        break;
      default:
        return;
    }
    setTimeValues(newValues);
    setTimeMinutes(newMinutes);
    updateTimeSelection(newValues[0], newMinutes[0], newValues[1], newMinutes[1]);
  };

  const startPanResponder = useRef(createPanResponder(true)).current;
  const endPanResponder = useRef(createPanResponder(false)).current;

  const handleTimePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    if (selectedDate) {
      const hours = selectedDate.getHours();
      const minutes = Math.round(selectedDate.getMinutes() / MINUTES_STEP) * MINUTES_STEP;

      if (activeTimeType === 'start') {
        setTimeValues(prev => [hours, prev[1]]);
        setTimeMinutes(prev => [minutes, prev[1]]);
        updateTimeSelection(hours, minutes, timeValues[1], timeMinutes[1]);
      } else {
        setTimeValues(prev => [prev[0], hours]);
        setTimeMinutes(prev => [prev[0], minutes]);
        updateTimeSelection(timeValues[0], timeMinutes[0], hours, minutes);
      }
    }
    
    if (Platform.OS === 'android') {
      setActiveTimeType(null);
    }
  };

  const openTimePicker = (type) => {
    setActiveTimeType(type);
    const currentHours = type === 'start' ? timeValues[0] : timeValues[1];
    const currentMinutes = type === 'start' ? timeMinutes[0] : timeMinutes[1];
    
    const date = new Date();
    date.setHours(currentHours);
    date.setMinutes(currentMinutes);
    setShowTimePicker(true);
  };

  const formatTime = (hour, minutes = 0) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleTimeSelect = (type, value) => {
    const currentHours = activeTimeType === 'start' ? timeValues[0] : timeValues[1];
    const currentMinutes = activeTimeType === 'start' ? timeMinutes[0] : timeMinutes[1];
    const currentPeriod = currentHours >= 12 ? 'PM' : 'AM';

    let newHours = currentHours;
    let newMinutes = currentMinutes;
    let newPeriod = currentPeriod;

    if (type === 'hour') {
      newHours = value;
      if (currentPeriod === 'PM' && value !== 12) {
        newHours += 12;
      } else if (currentPeriod === 'AM' && value === 12) {
        newHours = 0;
      }
    } else if (type === 'minute') {
      newMinutes = value;
    } else if (type === 'period') {
      newPeriod = value;
      if (value === 'PM' && newHours < 12) {
        newHours += 12;
      } else if (value === 'AM' && newHours >= 12) {
        newHours -= 12;
      }
    }

    if (activeTimeType === 'start') {
      setTimeValues(prev => [newHours, prev[1]]);
      setTimeMinutes(prev => [newMinutes, prev[1]]);
      updateTimeSelection(newHours, newMinutes, timeValues[1], timeMinutes[1]);
    } else {
      setTimeValues(prev => [prev[0], newHours]);
      setTimeMinutes(prev => [prev[0], newMinutes]);
      updateTimeSelection(timeValues[0], timeMinutes[0], newHours, newMinutes);
    }

    if (is_DEBUG) console.log('MBA123: Selected', type, value, 'for', activeTimeType);
  };

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        options.push(timeString);
      }
    }
    return options;
  }, []);

  const handleTimeSelectFromOptions = (timeString) => {
    // Parse time string like "6:00 PM" into hours and minutes
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    let hour = hours;
    if (period === 'PM' && hours !== 12) {
      hour = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour = 0;
    }

    if (activeTimeType === 'start') {
      setTimeValues(prev => [hour, prev[1]]);
      setTimeMinutes(prev => [minutes, prev[1]]);
      updateTimeSelection(hour, minutes, timeValues[1], timeMinutes[1]);
    } else {
      setTimeValues(prev => [prev[0], hour]);
      setTimeMinutes(prev => [prev[0], minutes]);
      updateTimeSelection(timeValues[0], timeMinutes[0], hour, minutes);
    }
    setShowTimePicker(false);
    if (is_DEBUG) console.log('MBA123: Selected time:', timeString, 'converted to', hour, ':', minutes);
  };

  const handleTimePress = (type) => {
    setActiveTimeType(type);
    setShowTimePicker(true);
    if (is_DEBUG) console.log('MBA123: Opening time picker for', type);
  };

  const generateHourOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1).map(hour => ({
      label: hour.toString().padStart(2, '0'),
      value: hour
    }));
  };

  const generateMinuteOptions = () => {
    return Array.from({ length: 60 }, (_, i) => i).map(minute => ({
      label: minute.toString().padStart(2, '0'),
      value: minute
    }));
  };

  const renderTimePicker = (isEnd = false) => (
    <View 
      ref={isEnd ? timePickerEndRef : timePickerStartRef}
      style={[styles.timePickerDropdown, isEnd && styles.timePickerDropdownEnd]} 
      data-testid={`time-picker-${isEnd ? 'end' : 'start'}`}
    >
      <View style={styles.timePickerContent}>
        <ScrollView 
          style={styles.timePickerColumn} 
          showsVerticalScrollIndicator={true}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          {generateHourOptions().map(({ label, value }) => (
            <TouchableOpacity
              key={`hour-${value}`}
              style={[
                styles.timeOption,
                value === (timeValues[isEnd ? 1 : 0] % 12 || 12) && styles.timeOptionSelected
              ]}
              onPress={() => handleTimeSelect('hour', value)}
            >
              <Text style={styles.timeOptionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView 
          style={styles.timePickerColumn} 
          showsVerticalScrollIndicator={true}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          {generateMinuteOptions().map(({ label, value }) => (
            <TouchableOpacity
              key={`minute-${value}`}
              style={[
                styles.timeOption,
                value === timeMinutes[isEnd ? 1 : 0] && styles.timeOptionSelected
              ]}
              onPress={() => handleTimeSelect('minute', value)}
            >
              <Text style={styles.timeOptionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.timePickerColumn}>
          {['AM', 'PM'].map((period) => (
            <TouchableOpacity
              key={`period-${period}`}
              style={[
                styles.timeOption,
                (timeValues[isEnd ? 1 : 0] >= 12 ? 'PM' : 'AM') === period && styles.timeOptionSelected
              ]}
              onPress={() => handleTimeSelect('period', period)}
            >
              <Text style={styles.timeOptionText}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const handleTimeChange = (isStart, hours, minutes, isRelease = false) => {
    if (isStart) {
      setTimeValues(prev => [hours, prev[1]]);
      setTimeMinutes(prev => [minutes, prev[1]]);
      if (isRelease) {
        updateTimeSelection(hours, minutes, timeValues[1], timeMinutes[1]);
      }
    } else {
      setTimeValues(prev => [prev[0], hours]);
      setTimeMinutes(prev => [prev[0], minutes]);
      if (isRelease) {
        updateTimeSelection(timeValues[0], timeMinutes[0], hours, minutes);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.timeRangeHeader}>
          <Text style={[styles.timeRangeLabel, styles.mobileText]}>Default Time Range</Text>
          <TouchableOpacity 
            style={styles.overnightButton} 
            onPress={toggleOvernight}
          >
            <Text style={[styles.overnightLink, styles.mobileText]}>
              {isOvernightForced ? 'Prevent Overnight' : 'Force Overnight'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sliderContainer, { zIndex: 3 }]} ref={sliderContainerRef}>
          {sliderWidth > 0 && (
            <TimeSlider
              sliderWidth={sliderWidth}
              startTime={{ hours: timeValues[0], minutes: timeMinutes[0] }}
              endTime={{ hours: timeValues[1], minutes: timeMinutes[1] }}
              onTimeChange={handleTimeChange}
              is_DEBUG={is_DEBUG}
            />
          )}

          <View style={styles.timeLabelsContainer}>
            <View style={styles.timeInputWrapper}>
              <TouchableOpacity 
                style={styles.timeInputContainer}
                onPress={() => handleTimePress('start')}
              >
                <Text style={[styles.timeLabel, styles.mobileText]}>
                  {formatTime(timeValues[0], timeMinutes[0])}
                </Text>
              </TouchableOpacity>
              {showTimePicker && activeTimeType === 'start' && renderTimePicker(false)}
            </View>
            <View style={styles.timeInputWrapper}>
              <TouchableOpacity 
                style={styles.timeInputContainer}
                onPress={() => handleTimePress('end')}
              >
                <Text style={[styles.timeLabel, styles.mobileText]}>
                  {formatTime(timeValues[1], timeMinutes[1])}
                </Text>
              </TouchableOpacity>
              {showTimePicker && activeTimeType === 'end' && renderTimePicker(true)}
            </View>
          </View>
        </View>

        <View style={[styles.customizeButtonContainer, { zIndex: 1 }]}>
          <TouchableOpacity 
            style={styles.customizeButton}
            onPress={() => setShowIndividualDays(!showIndividualDays)}
          >
            <MaterialIcons name="schedule" size={20} color={theme.colors.mainColors.main} />
            <Text style={[styles.customizeButtonText, styles.mobileText]}>
              Customize Individual Day Schedules
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.presetsContainer, { zIndex: 1 }]}>
          <Text style={[styles.presetsTitle, styles.mobileText]}>Quick Presets</Text>
          <View style={styles.presetButtons}>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => handlePresetSelect('morning')}
            >
              <Text style={[styles.presetButtonText, styles.mobileText]}>Morning (9 AM - 12 PM)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => handlePresetSelect('afternoon')}
            >
              <Text style={[styles.presetButtonText, styles.mobileText]}>Afternoon (1 PM - 5 PM)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => handlePresetSelect('fullDay')}
            >
              <Text style={[styles.presetButtonText, styles.mobileText]}>Full Day (9 AM - 5 PM)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
  },
  timeRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeRangeLabel: {
    fontSize: theme.fontSizes.large,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  overnightButton: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  overnightLink: {
    color: theme.colors.mainColors.main,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sliderContainer: {
    marginBottom: 32,
    width: '100%', // Ensure container takes full width
    position: 'relative',
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sliderTrack: {
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.modernBorder,
    borderRadius: TRACK_HEIGHT / 2,
    marginVertical: THUMB_SIZE / 2,
  },
  selectedTrack: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.mainColors.main,
    top: -THUMB_SIZE / 2 + TRACK_HEIGHT / 2,
    marginLeft: -THUMB_SIZE / 2,
    zIndex: 2,
  },
  customizeButtonContainer: {
    marginBottom: 24,
    zIndex: 1,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.mainColors.main,
  },
  customizeButtonText: {
    color: theme.colors.mainColors.main,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  presetsContainer: {
    gap: 12,
    zIndex: 1,
  },
  presetsTitle: {
    fontSize: theme.fontSizes.large,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignSelf: 'flex-start',
  },
  presetButton: {
    width: 200,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
  },
  presetButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  timeLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 16,
  },
  timeLabel: {
    fontSize: theme.fontSizes.large,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeInputWrapper: {
    position: 'relative',
    zIndex: 3,
  },
  timeInputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.mainColors.main,
    paddingBottom: 4,
  },
  timePickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 3,
    width: 200,
    padding: 8,
  },
  timePickerDropdownEnd: {
    left: 'auto',
    right: 0,
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  timePickerColumn: {
    flex: 1,
    maxHeight: 200,
    paddingRight: 4, // Add padding for scrollbar
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timeOptionSelected: {
    backgroundColor: theme.colors.mainColors.main + '20',
  },
  timeOptionText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  mobileText: {
    fontSize: Platform.OS === 'web' && window.innerWidth <= 768 ? theme.fontSizes.smallMedium : theme.fontSizes.medium,
  },
});

export default TimeSelectionCard; 