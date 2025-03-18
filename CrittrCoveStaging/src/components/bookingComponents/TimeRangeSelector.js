import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
  is_overnight = false,
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

  const formatDate = (date) => {
    if (!date) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  const calculateDuration = () => {
    if (is_overnight) {
      // For overnight services, calculate number of nights
      if (!dateRange?.startDate || !dateRange?.endDate) return '1 Night';
      
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      return `${nights} Night${nights > 1 ? 's' : ''}`;
    }

    // For day services, calculate hours and minutes
    const { startTime, endTime } = times;
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    let duration = endMinutes - startMinutes;
    
    if (duration < 0) {
      duration += 24 * 60; // Add 24 hours if end time is on next day
    }
    
    const hours = Math.floor(duration / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
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

  const renderDurationBox = () => (
    <View style={styles.durationBox}>
      <View style={styles.durationContent}>
        <View style={styles.durationLeft}>
          <MaterialIcons name="access-time" size={20} color={theme.colors.mainColors.main} />
          <Text style={styles.durationLabel}>Duration</Text>
        </View>
        <View style={styles.durationRight}>
          <Text style={styles.durationValue}>{calculateDuration()}</Text>
          {is_overnight && (
            <FontAwesome name="moon-o" size={20} color={theme.colors.text} />
          )}
        </View>
      </View>
    </View>
  );

  const renderTimePickerDropdown = (type) => (
    <View 
      ref={type === 'start' ? timePickerStartRef : timePickerEndRef}
      style={[
        styles.timePickerDropdown,
        type === 'end' && styles.timePickerDropdownEnd
      ]} 
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
                value === (type === 'end' ? times.endTime.hours : times.startTime.hours % 12 || 12) && styles.timeOptionSelected
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
                value === (type === 'end' ? times.endTime.minutes : times.startTime.minutes) && styles.timeOptionSelected
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
                (type === 'end' ? times.endTime.hours >= 12 : times.startTime.hours >= 12 ? 'PM' : 'AM') === period && styles.timeOptionSelected
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

  const renderTimeButton = (type) => (
    <View style={[styles.timeSelectContainer, { marginTop: type === 'start' ? 12 : 0 }]}>
      <View style={styles.dateTimeWrapper}>
        <View style={styles.dateHeaderContainer}>
          <View style={styles.dateContainer}>
            <MaterialIcons name="calendar-today" size={20} color={theme.colors.mainColors.main} />
            <Text style={styles.dateText}>
              {formatDate(type === 'start' ? dateRange?.startDate : dateRange?.endDate)}
            </Text>
          </View>
          <Text style={styles.dateLabel}>
            {type === 'start' ? 'Start Date:' : 'End Date:'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.timeSelectButton}
          onPress={() => handleTimePress(type)}
        >
          <View style={styles.timeContent}>
            <View style={styles.timeDisplay}>
              <MaterialIcons name="access-time" size={20} color={theme.colors.mainColors.main} />
              <Text style={styles.timeText}>
                {formatTime(type === 'start' ? times.startTime.hours : times.endTime.hours, 
                         type === 'start' ? times.startTime.minutes : times.endTime.minutes)}
              </Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.colors.text} />
          </View>
        </TouchableOpacity>
        {showTimePicker && activeTimeType === type && renderTimePickerDropdown(type)}
      </View>
    </View>
  );

  const renderOvernightUI = () => (
    <View style={styles.overnightContainer}>
      {renderTimeButton('start')}
      {renderTimeButton('end')}
      {renderDurationBox()}
    </View>
  );

  const renderDayTimeUI = () => (
    <View style={styles.dayTimeContainer}>
      <View style={styles.timeHeader}>
        <Text style={styles.timeRangeLabel}>{title}</Text>
        <View style={styles.timeButtons}>
          <TouchableOpacity 
            style={[styles.timeButton, { marginLeft: 10 }]}
            onPress={() => handleTimePress('start')}
          >
            <Text style={styles.timeText}>
              {formatTime(times.startTime.hours, times.startTime.minutes)}
        </Text>
            {/* <MaterialIcons name="edit" size={20} color={theme.colors.mainColors.main} /> */}
          </TouchableOpacity>
          <Text style={styles.timeSeparator}>-</Text>
          <TouchableOpacity 
            style={styles.timeButton}
            onPress={() => handleTimePress('end')}
          >
            <Text style={styles.timeText}>
              {formatTime(times.endTime.hours, times.endTime.minutes)}
            </Text>
            <MaterialIcons name="edit" size={20} color={theme.colors.mainColors.main} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.sliderContainer} ref={sliderContainerRef}>
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
          </View>
  );

  return (
    <View style={styles.container}>
      {is_overnight ? renderOvernightUI() : renderDayTimeUI()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 100,
  },
  overnightContainer: {
    gap: 24,
  },
  dateTimeSection: {
    gap: 8,
  },
  dateTimeLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 8,
  },
  dateTimeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    position: 'relative',
  },
  dateText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  durationBox: {
    backgroundColor: theme.colors.bgColorModern,
    padding: 12,
    borderRadius: 8,
  },
  durationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  durationValue: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dayTimeContainer: {
    gap: 16,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRangeLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeSeparator: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sliderContainer: {
    marginBottom: 24,
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  timeSelectContainer: {
  },
  dateTimeWrapper: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeSelectButton: {
    backgroundColor: theme.colors.bgColorModern, //rgb(204, 203, 203)
    padding: 12,
    borderRadius: 8,
  },
  timeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 4,
    zIndex: 1000,
  },
  timePickerDropdownEnd: {
    left: 'auto',
    right: 0,
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 100,
  },
  timePickerColumn: {
    flex: 1,
    maxHeight: 200,
    paddingRight: 4,
    zIndex: 100,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 100,
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