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
import { AuthContext, debugLog } from '../../context/AuthContext';
import TimeSlider from './TimeSlider';
import moment from 'moment-timezone';

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
  const { is_DEBUG, timeSettings } = useContext(AuthContext);
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

  // Refs for dropdown and button elements
  const timePickerDropdownRef = useRef(null);
  const startButtonRef = useRef(null);
  const endButtonRef = useRef(null);
  const timePickerStartRef = useRef(null);
  const timePickerEndRef = useRef(null);
  
  const hourScrollViewRef = useRef(null);
  const minuteScrollViewRef = useRef(null);

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

  // Handle click outside to close the dropdown
  useEffect(() => {
    if (Platform.OS !== 'web' || !showTimePicker) return;

    const handleDocumentClick = (event) => {
      // Get the active dropdown and button based on the activeTimeType
      const activeDropdownRef = activeTimeType === 'start' ? timePickerStartRef : timePickerEndRef;
      const activeButtonRef = activeTimeType === 'start' ? startButtonRef : endButtonRef;

      debugLog('MBAoi1h34ghnvo: Checking click outside', {
        activeTimeType,
        showTimePicker,
        hasDropdownRef: !!activeDropdownRef?.current,
        hasButtonRef: !!activeButtonRef?.current
      });
      
      // Only proceed if we have valid refs
      if (!activeDropdownRef?.current && !activeButtonRef?.current) return;
      
      // Check if click is inside either the dropdown or the button that opened it
      const isInsideDropdown = activeDropdownRef.current?.contains(event.target);
      const isInsideButton = activeButtonRef.current?.contains(event.target);

      debugLog('MBAoi1h34ghnvo: Click event', {
        isInsideDropdown,
        isInsideButton,
        target: event.target.tagName,
        activeTimeType
      });
      
      // Close the dropdown if clicked outside both the dropdown and button
      if (!isInsideDropdown && !isInsideButton) {
        debugLog('MBAoi1h34ghnvo: Closing dropdown - clicked outside');
        setShowTimePicker(false);
        setActiveTimeType(null);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleDocumentClick);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [showTimePicker, activeTimeType]);

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
    debugLog('MBAoi1h34ghnvo: handleTimePress called for', type, 'current state:', {activeTimeType, showTimePicker});
    
    if (activeTimeType === type && showTimePicker) {
      // If clicking the same time picker that's already open, close it
      debugLog('MBAoi1h34ghnvo: Closing dropdown');
      setShowTimePicker(false);
      setActiveTimeType(null);
    } else {
      // Open the clicked time picker
      debugLog('MBAoi1h34ghnvo: Opening dropdown for', type);
      setActiveTimeType(type);
      setShowTimePicker(true);
    }
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
      // For overnight services, calculate number of nights using moment-timezone for DST awareness
      if (!dateRange?.startDate || !dateRange?.endDate) return '1 Night';
      
      // Use user's timezone from timeSettings instead of hardcoding
      const userTimezone = timeSettings?.timezone || 'US/Mountain';
      const startDate = moment.tz(dateRange.startDate, userTimezone).startOf('day');
      const endDate = moment.tz(dateRange.endDate, userTimezone).startOf('day');
      const nights = endDate.diff(startDate, 'days');
      return `${nights} Night${nights > 1 ? 's' : ''}`;
    }

    // For day services, calculate hours and minutes
    const { startTime, endTime } = times;
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    let endMinutes = endTime.hours * 60 + endTime.minutes;
    
    // Handle the case where end time is midnight or earlier than start time
    // Treat midnight as the end of the current day, not the beginning of next day
    if (endTime.hours === 0 && endTime.minutes === 0) {
      // 00:00 is actually 24:00 (end of day)
      endMinutes = 24 * 60; 
    } else if (endMinutes < startMinutes) {
      // If end time is earlier than start time (e.g., 2am), add 24 hours
      endMinutes += 24 * 60;
    }
    
    const duration = endMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return hours > 0 
      ? `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`
      : `${minutes} minutes`;
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

    // Create the proposed new time
    const newTime = { hours: newHours, minutes: newMinutes };
    
    // Validate that start time is not after end time, and end time is not before start time
    if (isStart) {
      // For start time, ensure it's not after end time
      const endTimeInMinutes = times.endTime.hours * 60 + times.endTime.minutes;
      const newStartTimeInMinutes = newHours * 60 + newMinutes;
      
      // Don't allow start time to be after or equal to end time
      // Special case for midnight end time (treated as end of day)
      const isEndTimeMidnight = times.endTime.hours === 0 && times.endTime.minutes === 0;
      
      if (newStartTimeInMinutes >= endTimeInMinutes && !isEndTimeMidnight) {
        // Invalid: Start time would be after or equal to end time
        debugLog('MBAoi1h34ghnvo: Prevented invalid time selection - start time cannot be after end time');
        return;
      }
    } else {
      // For end time, ensure it's not before start time (unless it's midnight)
      const startTimeInMinutes = times.startTime.hours * 60 + times.startTime.minutes;
      const newEndTimeInMinutes = newHours * 60 + newMinutes;
      
      // Special case: Midnight (00:00) as end time is treated as end of day (24:00)
      const isMidnightEndTime = newHours === 0 && newMinutes === 0;
      
      // Only validate if not setting end time to midnight
      if (newEndTimeInMinutes <= startTimeInMinutes && !isMidnightEndTime) {
        // Invalid: End time would be before or equal to start time
        debugLog('MBAoi1h34ghnvo: Prevented invalid time selection - end time cannot be before start time');
        return;
      }
    }

    const newTimes = {
      ...times,
      [isStart ? 'startTime' : 'endTime']: newTime
    };

    debugLog('MBAoi1h34ghnvo: Time selection in picker:', {
      type,
      value,
      isStart,
      currentTime,
      newTime,
      newTimes
    });

    setTimes(newTimes);
    previousTimes.current = newTimes;
    onTimeSelect(newTimes);
    
    // Do not close the dropdown after selection to allow multiple adjustments
    // Let the user close it explicitly by clicking outside or the dropdown button
  };

  const scrollToSelectedTime = (type) => {
    if (is_DEBUG) console.log('MBA123: Scrolling to selected time for', type);
    
    requestAnimationFrame(() => {
      const currentTime = type === 'start' ? times.startTime : times.endTime;
      const hour = currentTime.hours % 12 || 12;
      const minute = currentTime.minutes;

      // Calculate scroll positions
      const hourScrollPos = (hour - 1) * 40; // 40 is the height of each time option
      const minuteScrollPos = minute * 40;

      // Scroll to positions
      if (hourScrollViewRef.current) {
        hourScrollViewRef.current.scrollTo({ y: Math.max(0, hourScrollPos - 80), animated: false });
      }
      if (minuteScrollViewRef.current) {
        minuteScrollViewRef.current.scrollTo({ y: Math.max(0, minuteScrollPos - 80), animated: false });
      }
    });
  };

  useEffect(() => {
    if (showTimePicker) {
      scrollToSelectedTime(activeTimeType);
    }
  }, [showTimePicker, activeTimeType]);

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

  const renderTimeButton = (type) => {
    const isStart = type === 'start';
    const containerRef = isStart ? timePickerStartRef : timePickerEndRef;
    const buttonRef = isStart ? startButtonRef : endButtonRef;
    
    return (
      <View 
        style={[styles.timeSelectContainer, isStart ? styles.startTimeContainer : styles.endTimeContainer]}
        ref={containerRef}
      >
        <View style={styles.dateTimeWrapper}>
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateLabel}>
              {isStart ? 'Start Time:' : 'End Time:'}
            </Text>
            <View style={styles.dateContainer}>
              <MaterialIcons name="calendar-today" size={20} color={theme.colors.mainColors.main} />
              <Text style={styles.dateText}>
                {formatDate(isStart ? dateRange?.startDate : dateRange?.endDate)}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.timeSelectButton}
            onPress={() => handleTimePress(type)}
            activeOpacity={0.7}
            ref={buttonRef}
          >
            <View style={styles.timeContent}>
              <View style={styles.timeDisplay}>
                <MaterialIcons name="access-time" size={20} color={theme.colors.mainColors.main} />
                <Text style={styles.timeText}>
                  {formatTime(isStart ? times.startTime.hours : times.endTime.hours, 
                           isStart ? times.startTime.minutes : times.endTime.minutes)}
                </Text>
              </View>
              <MaterialIcons 
                name="keyboard-arrow-down" 
                size={24} 
                color={theme.colors.text} 
              />
            </View>
          </TouchableOpacity>
          {showTimePicker && activeTimeType === type && renderTimePickerDropdown(type)}
        </View>
      </View>
    );
  };

  const renderTimePickerDropdown = (type) => {
    const currentTime = type === 'start' ? times.startTime : times.endTime;
    const currentHour = currentTime.hours % 12 || 12;
    const currentMinutes = currentTime.minutes;
    const isPM = currentTime.hours >= 12;
    const dropdownRef = type === 'start' ? timePickerStartRef : timePickerEndRef;

    return (
      <View 
        style={[
          styles.timePickerDropdownContainer,
          type === 'start' ? styles.timePickerDropdownStart : styles.timePickerDropdownEnd,
          styles.timePickerAnimation
        ]}
        ref={timePickerDropdownRef}
      >
        <View style={styles.timePickerContent}>
          <ScrollView 
            ref={hourScrollViewRef}
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
                  value === currentHour && styles.timeOptionSelected
                ]}
                onPress={() => handleTimeSelect('hour', value)}
              >
                <Text style={[
                  styles.timeOptionText,
                  value === currentHour && styles.timeOptionSelectedText
                ]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView 
            ref={minuteScrollViewRef}
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
                  value === currentMinutes && styles.timeOptionSelected
                ]}
                onPress={() => handleTimeSelect('minute', value)}
              >
                <Text style={[
                  styles.timeOptionText,
                  value === currentMinutes && styles.timeOptionSelectedText
                ]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.timePickerColumn}>
            {['AM', 'PM'].map((period) => (
              <TouchableOpacity
                key={`period-${period}`}
                style={[
                  styles.timeOption,
                  (isPM ? 'PM' : 'AM') === period && styles.timeOptionSelected
                ]}
                onPress={() => handleTimeSelect('period', period)}
              >
                <Text style={[
                  styles.timeOptionText,
                  (isPM ? 'PM' : 'AM') === period && styles.timeOptionSelectedText
                ]}>{period}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

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
            ref={startButtonRef}
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
            ref={endButtonRef}
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
    zIndex: 3000,
  },
  overnightContainer: {
    gap: 24,
    position: 'relative',
    zIndex: 3000,
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
    position: 'relative',
    zIndex: 3000,
    width: '100%',
  },
  dateTimeWrapper: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    backgroundColor: theme.colors.background,
    width: '100%',
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
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
  startTimeContainer: {
    position: 'relative',
    zIndex: 4000,
    marginTop: 12,
  },
  endTimeContainer: {
    position: 'relative',
    zIndex: 3500,
    marginTop: 12,
  },
  timePickerDropdownContainer: {
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
    marginTop: 4,
    width: '100%',
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  timePickerDropdownStart: {
    zIndex: 4100,
  },
  timePickerDropdownEnd: {
    zIndex: 3600,
    position: 'absolute',
    maxHeight: 300,
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    padding: 8,
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  timePickerColumn: {
    flex: 1,
    maxHeight: 200,
    paddingRight: 4,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    height: 40, // Fixed height for calculations
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
  timeOptionSelectedText: {
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  mobileText: {
    fontSize: Platform.OS === 'web' && window.innerWidth <= 768 ? theme.fontSizes.smallMedium : theme.fontSizes.medium,
  },
  timePickerAnimation: {
    transition: Platform.OS === 'web' ? 'opacity 0.2s ease, transform 0.2s ease' : undefined,
  },
});

export default TimeRangeSelector; 