import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';
import TimeSlider from './TimeSlider';

const THUMB_SIZE = 20;
const TRACK_HEIGHT = 4;
const MINUTES_STEP = 15;

const TimeRangeSelector = ({
  title,
  onTimeSelect,
  initialTimes = {},
  showOvernightToggle = true,
  dateRange = null,
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  const sliderContainerRef = useRef(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [times, setTimes] = useState({
    startTime: initialTimes.startTime || { hours: 9, minutes: 0 },
    endTime: initialTimes.endTime || { hours: 17, minutes: 0 },
    isOvernightForced: initialTimes.isOvernightForced || false
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeType, setActiveTimeType] = useState(null);
  const isDragging = useRef(false);
  const previousTimes = useRef(times);

  // Add ref for click outside detection
  const timePickerRef = useRef(null);
  const timePickerStartRef = useRef(null);
  const timePickerEndRef = useRef(null);

  // Update slider width when container size changes
  useEffect(() => {
    if (!sliderContainerRef.current) return;

    const updateSliderWidth = () => {
      if (sliderContainerRef.current) {
        const containerWidth = sliderContainerRef.current.offsetWidth;
        setSliderWidth(Math.min(containerWidth - THUMB_SIZE, 736));
      }
    };

    updateSliderWidth();

    if (Platform.OS === 'web') {
      const resizeObserver = new ResizeObserver(updateSliderWidth);
      resizeObserver.observe(sliderContainerRef.current);
      return () => {
        if (sliderContainerRef.current) {
          resizeObserver.unobserve(sliderContainerRef.current);
        }
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showTimePicker) return;
      const target = event.target;
      const isChildOf = (element, ref) => {
        if (!ref.current || !element) return false;
        return ref.current.contains(element);
      };
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

  // Handle initialTimes updates
  useEffect(() => {
    if (isDragging.current) return;

    const shouldUpdateStart = initialTimes.startTime && (
      times.startTime.hours !== initialTimes.startTime.hours ||
      times.startTime.minutes !== initialTimes.startTime.minutes
    );

    const shouldUpdateEnd = initialTimes.endTime && (
      times.endTime.hours !== initialTimes.endTime.hours ||
      times.endTime.minutes !== initialTimes.endTime.minutes
    );

    if (shouldUpdateStart || shouldUpdateEnd || initialTimes.isOvernightForced !== times.isOvernightForced) {
      const newTimes = {
        ...times,
        ...(shouldUpdateStart && { startTime: initialTimes.startTime }),
        ...(shouldUpdateEnd && { endTime: initialTimes.endTime }),
        ...(initialTimes.isOvernightForced !== undefined && { isOvernightForced: initialTimes.isOvernightForced })
      };

      if (is_DEBUG) {
        console.log('MBA54321 Updating from initialTimes:', {
          shouldUpdateStart,
          shouldUpdateEnd,
          newTimes
        });
      }

      setTimes(newTimes);
      previousTimes.current = newTimes;
    }
  }, [initialTimes]);

  const handleTimeChange = (isStart, hours, minutes, isRelease = false) => {
    // If we're not releasing and the time hasn't actually changed, don't update
    if (!isRelease) {
      const currentTime = isStart ? times.startTime : times.endTime;
      if (currentTime.hours === hours && currentTime.minutes === minutes) {
        return;
      }
    }

    // Create a new time object for the changed time (start or end)
    const newTime = { hours, minutes };
    
    // Create a new times object, preserving the other time value
    const newTimes = {
      ...previousTimes.current,
      [isStart ? 'startTime' : 'endTime']: newTime
    };

    // Update isDragging state
    if (isRelease) {
      isDragging.current = false;
    } else {
      isDragging.current = true;
    }

    if (is_DEBUG) {
      console.log('MBA54321 handleTimeChange:', {
        isStart,
        hours,
        minutes,
        isRelease,
        previousTimes: previousTimes.current,
        newTimes
      });
    }
    
    // Update times and notify parent
    setTimes(newTimes);
    previousTimes.current = newTimes;
    onTimeSelect(newTimes);
  };

  const handleOvernightToggle = () => {
    const newTimes = {
      ...times,
      isOvernightForced: !times.isOvernightForced
    };
    setTimes(newTimes);
    previousTimes.current = newTimes;
    onTimeSelect(newTimes);
  };

  const handleTimePress = (type) => {
    setActiveTimeType(type);
    setShowTimePicker(true);
    if (is_DEBUG) console.log('MBA123: Opening time picker for', type);
  };

  const formatTime = (hour, minutes = 0) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
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

  const handleTimeSelect = (type, value) => {
    const isStart = activeTimeType === 'start';
    const currentTime = isStart ? times.startTime : times.endTime;
    let newHours = currentTime.hours;
    let newMinutes = currentTime.minutes;

    switch (type) {
      case 'hour':
        newHours = value;
        if (currentTime.hours >= 12 && value !== 12) {
          newHours += 12;
        } else if (currentTime.hours < 12 && value === 12) {
          newHours = 0;
        }
        break;
      case 'minute':
        newMinutes = value;
        break;
      case 'period':
        if (value === 'PM' && newHours < 12) {
          newHours += 12;
        } else if (value === 'AM' && newHours >= 12) {
          newHours -= 12;
        }
        break;
    }

    const newTime = { hours: newHours, minutes: newMinutes };
    const newTimes = {
      ...times,
      [isStart ? 'startTime' : 'endTime']: newTime
    };
    
    setTimes(newTimes);
    previousTimes.current = newTimes;
    onTimeSelect(newTimes);
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
                value === (isEnd ? times.endTime.hours : times.startTime.hours % 12 || 12) && styles.timeOptionSelected
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
                value === (isEnd ? times.endTime.minutes : times.startTime.minutes) && styles.timeOptionSelected
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
                (isEnd ? times.endTime.hours >= 12 : times.startTime.hours >= 12 ? 'PM' : 'AM') === period && styles.timeOptionSelected
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

  return (
    <View style={styles.container}>
      <View style={styles.timeRangeHeader}>
        <Text style={[styles.timeRangeLabel, styles.mobileText]}>
          {title}
        </Text>
        {showOvernightToggle && (
          <TouchableOpacity 
            style={styles.overnightButton} 
            onPress={handleOvernightToggle}
          >
            <Text style={[styles.overnightLink, styles.mobileText]}>
              {times.isOvernightForced ? 'Prevent Overnight' : 'Force Overnight'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={[styles.sliderContainer, { zIndex: 3 }]} ref={sliderContainerRef}>
        {sliderWidth > 0 && (
          <TimeSlider
            sliderWidth={sliderWidth}
            startTime={times.startTime}
            endTime={times.endTime}
            onTimeChange={handleTimeChange}
            is_DEBUG={is_DEBUG}
          />
        )}
      </View>

      <View style={styles.timeLabelsContainer}>
          <View style={styles.timeInputWrapper}>
            <TouchableOpacity 
              style={styles.timeInputContainer}
              onPress={() => handleTimePress('start')}
            >
              <Text style={[styles.timeLabel, styles.mobileText]}>
                {formatTime(times.startTime.hours, times.startTime.minutes)}
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
                {formatTime(times.endTime.hours, times.endTime.minutes)}
              </Text>
            </TouchableOpacity>
            {showTimePicker && activeTimeType === 'end' && renderTimePicker(true)}
          </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  timeRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    zIndex: 10000,
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
    marginBottom: 16,
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  timeLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 18,
    position: 'relative',
    zIndex: 10000,
  },
  timeInputWrapper: {
    position: 'relative',
    zIndex: 10000,
  },
  timeInputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.mainColors.main,
    paddingBottom: 4,
    zIndex: 10000,
  },
  timeLabel: {
    fontSize: theme.fontSizes.large,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
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
    zIndex: 10000,
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
    zIndex: 10000,
  },
  timePickerColumn: {
    flex: 1,
    maxHeight: 200,
    paddingRight: 4,
    zIndex: 10000,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 10000,
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

export default TimeRangeSelector; 