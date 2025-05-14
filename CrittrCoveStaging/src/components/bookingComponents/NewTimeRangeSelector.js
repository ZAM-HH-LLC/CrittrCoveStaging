import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext, debugLog } from '../../context/AuthContext';
import TimePickerDropdown from './TimePickerDropdown';

const NewTimeRangeSelector = ({
  title,
  onTimeSelect,
  initialTimes = {},
  is_overnight = false,
  uniqueId = 'default',
  dateRange = null,
  selectedDates = [],
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  
  // Create local state with deep copies to prevent reference issues
  const [times, setTimes] = useState(() => {
    const defaultTimes = {
      startTime: { hours: 9, minutes: 0 },
      endTime: { hours: 17, minutes: 0 },
      isOvernightForced: initialTimes?.isOvernightForced || is_overnight || false
    };
    
    // Deep copy initialTimes if provided
    if (initialTimes) {
      return {
        startTime: initialTimes.startTime ? JSON.parse(JSON.stringify(initialTimes.startTime)) : defaultTimes.startTime,
        endTime: initialTimes.endTime ? JSON.parse(JSON.stringify(initialTimes.endTime)) : defaultTimes.endTime,
        isOvernightForced: initialTimes.isOvernightForced || is_overnight || false
      };
    }
    
    return defaultTimes;
  });
  
  // Track which time picker is currently open
  const [activeTimePicker, setActiveTimePicker] = useState(null);
  
  // Update times when initialTimes prop changes
  useEffect(() => {
    if (!initialTimes) return;
    
    debugLog(`MBAoi9uv43d: NewTimeRangeSelector (${uniqueId}) initialTimes update:`, initialTimes);
    
    // Create deep copies of the times
    const updatedTimes = {
      startTime: initialTimes.startTime ? JSON.parse(JSON.stringify(initialTimes.startTime)) : times.startTime,
      endTime: initialTimes.endTime ? JSON.parse(JSON.stringify(initialTimes.endTime)) : times.endTime,
      isOvernightForced: initialTimes.isOvernightForced || is_overnight || times.isOvernightForced
    };
    
    setTimes(updatedTimes);
  }, [
    initialTimes?.startTime?.hours, 
    initialTimes?.startTime?.minutes, 
    initialTimes?.endTime?.hours, 
    initialTimes?.endTime?.minutes,
    initialTimes?.isOvernightForced,
    is_overnight
  ]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeTimePicker) {
        setActiveTimePicker(null);
      }
    };

    return () => {
      // Clean up listeners
    };
  }, [activeTimePicker]);
  
  // Handle start time change
  const handleStartTimeChange = (newTime) => {
    // Validate that start time is not after end time
    // End time could be 00:00 (midnight) which is treated as end of day
    // So we need a special check for that case
    const isEndTimeMidnight = times.endTime.hours === 0 && times.endTime.minutes === 0;
    const startTotalMinutes = (newTime.hours * 60) + newTime.minutes;
    const endTotalMinutes = (times.endTime.hours * 60) + times.endTime.minutes;
    
    // Check if the time combination is valid
    // Allow if end time is midnight (special case) or if start time is before end time
    if (!(isEndTimeMidnight || startTotalMinutes < endTotalMinutes)) {
      debugLog(`MBAoi9uv43d: NewTimeRangeSelector (${uniqueId}) invalid start time - would be after end time:`, {
        attemptedStart: newTime,
        currentEnd: times.endTime,
        startMinutes: startTotalMinutes,
        endMinutes: endTotalMinutes
      });
      
      // Return false to trigger error handling in TimePickerDropdown
      return false;
    }
    
    // Time is valid, proceed with the update
    const newTimes = {
      ...times,
      startTime: JSON.parse(JSON.stringify(newTime))
    };
    
    setTimes(newTimes);
    onTimeSelect(newTimes);
    
    debugLog(`MBAoi9uv43d: NewTimeRangeSelector (${uniqueId}) startTime changed:`, {
      newTime,
      updatedTimes: newTimes
    });
    
    return true;
  };
  
  // Handle end time change
  const handleEndTimeChange = (newTime) => {
    // Special case: if new end time is midnight (00:00), always allow it
    const isNewEndTimeMidnight = newTime.hours === 0 && newTime.minutes === 0;
    
    // For all other times, validate that end time is after start time
    const startTotalMinutes = (times.startTime.hours * 60) + times.startTime.minutes;
    const endTotalMinutes = (newTime.hours * 60) + newTime.minutes;
    
    // Check if the time combination is valid
    // Allow if end time is midnight (special case) or if end time is after start time
    if (!(isNewEndTimeMidnight || endTotalMinutes > startTotalMinutes)) {
      debugLog(`MBAoi9uv43d: NewTimeRangeSelector (${uniqueId}) invalid end time - would be before start time:`, {
        currentStart: times.startTime,
        attemptedEnd: newTime,
        startMinutes: startTotalMinutes,
        endMinutes: endTotalMinutes
      });
      
      // Return false to trigger error handling in TimePickerDropdown
      return false;
    }
    
    // Time is valid, proceed with the update
    const newTimes = {
      ...times,
      endTime: JSON.parse(JSON.stringify(newTime))
    };
    
    setTimes(newTimes);
    onTimeSelect(newTimes);
    
    debugLog(`MBAoi9uv43d: NewTimeRangeSelector (${uniqueId}) endTime changed:`, {
      newTime,
      updatedTimes: newTimes
    });
    
    return true;
  };
  
  // Format time for display (12-hour format)
  const formatTimeDisplay = (time) => {
    if (!time) return '';
    
    const hours = time.hours;
    const minutes = time.minutes;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Format a date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      debugLog(`MBAoi9uv43d: Error formatting date: ${error.message}`);
      return '';
    }
  };
  
  // Calculate duration between start and end times
  const calculateDuration = () => {
    const { isOvernightForced } = times;
    
    // If overnight service and we have date range or selected dates, calculate nights from date range
    if ((isOvernightForced || is_overnight) && (dateRange || (selectedDates && selectedDates.length > 0))) {
      let startDate, endDate;
      
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        // If we have a date range, use it
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);
      } else if (selectedDates && selectedDates.length >= 2) {
        // If we have selected dates array, use first and last date
        // Sort dates to ensure correct order
        const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
        startDate = new Date(sortedDates[0]);
        endDate = new Date(sortedDates[sortedDates.length - 1]);
      } else if (selectedDates && selectedDates.length === 1) {
        // If only one date selected, it's same day
        return "Same day";
      } else {
        // Fallback if no date information
        return "1 night";
      }
      
      // Calculate nights between dates
      const diffTime = Math.abs(endDate - startDate);
      
      // For date ranges, use correct date math (without time component)
      // This ensures dates like May 14-16 (3 days) result in 2 nights, not 1 night
      let diffDays;
      
      // Normalize dates to remove time component
      const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // Calculate the actual number of calendar days between the dates (inclusive)
      diffDays = Math.round(Math.abs(normalizedEndDate - normalizedStartDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // The number of nights is always one less than the number of days
      const nights = diffDays > 1 ? diffDays - 1 : 0;
      
      if (nights === 0) {
        return "Same day";
      } else if (nights === 1) {
        return "1 night";
      } else {
        return `${nights} nights`;
      }
    }
    
    // For regular (non-overnight) services or when no date range is available
    const { startTime, endTime } = times;
    
    // Convert times to minutes
    const startMinutes = (startTime.hours * 60) + startTime.minutes;
    let endMinutes = (endTime.hours * 60) + endTime.minutes;
    
    // Special case: midnight (00:00) as end time is treated as end of day
    if (endTime.hours === 0 && endTime.minutes === 0) {
      endMinutes = 24 * 60; // End of day
    }
    
    // Calculate duration in minutes
    let durationMinutes = endMinutes - startMinutes;
    
    // If end time is earlier than start time and not midnight, add 24 hours
    if (durationMinutes < 0 && !(endTime.hours === 0 && endTime.minutes === 0)) {
      durationMinutes += 24 * 60;
    }
    
    // Convert to hours and minutes
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    // Format the duration string
    let durationStr = '';
    if (hours > 0) {
      durationStr += `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      if (durationStr.length > 0) durationStr += ' ';
      durationStr += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    return durationStr || '0 minutes';
  };
  
  // Get start date for display
  const getStartDate = () => {
    if (dateRange && dateRange.startDate) {
      return dateRange.startDate;
    } else if (selectedDates && selectedDates.length > 0) {
      const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
      return sortedDates[0];
    }
    return null;
  };
  
  // Get end date for display
  const getEndDate = () => {
    if (dateRange && dateRange.endDate) {
      return dateRange.endDate;
    } else if (selectedDates && selectedDates.length > 0) {
      const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
      return sortedDates[sortedDates.length - 1];
    }
    return null;
  };
  
  const startDate = getStartDate();
  const endDate = getEndDate();
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {/* Time selection UI with dates */}
      <View style={styles.timeSelectionContainer}>
        {/* Start time picker with date */}
        <View style={styles.timePickerContainer}>
          {startDate && (
            <Text style={styles.dateLabel}>{formatDate(startDate)}</Text>
          )}
          <Text style={styles.timeLabel}>Start Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
          >
            <View style={styles.timeButtonContent}>
              <MaterialIcons name="access-time" size={18} color={theme.colors.mainColors.main} />
              <Text style={styles.timeText}>
                {formatTimeDisplay(times.startTime)}
              </Text>
              <MaterialIcons 
                name={activeTimePicker === 'start' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={20} 
                color={theme.colors.text} 
              />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* End time picker with date */}
        <View style={styles.timePickerContainer}>
          {endDate && (
            <Text style={styles.dateLabel}>{formatDate(endDate)}</Text>
          )}
          <Text style={styles.timeLabel}>End Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
          >
            <View style={styles.timeButtonContent}>
              <MaterialIcons name="access-time" size={18} color={theme.colors.mainColors.main} />
              <Text style={styles.timeText}>
                {formatTimeDisplay(times.endTime)}
              </Text>
              <MaterialIcons 
                name={activeTimePicker === 'end' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={20} 
                color={theme.colors.text} 
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Duration display */}
      <View style={styles.durationContainer}>
        <MaterialIcons name="timelapse" size={18} color={theme.colors.mainColors.main} />
        <Text style={styles.durationText}>Duration: {calculateDuration()}</Text>
      </View>
      
      {/* Modal for handling outside click to close the dropdowns */}
      {activeTimePicker && (
        <Modal
          transparent={true}
          animationType="none"
          visible={!!activeTimePicker}
          onRequestClose={() => setActiveTimePicker(null)}
        >
          <TouchableWithoutFeedback onPress={() => setActiveTimePicker(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[
                  styles.modalContent,
                  activeTimePicker === 'start' ? styles.startModalContent : styles.endModalContent
                ]}>
                  <TimePickerDropdown
                    initialTime={activeTimePicker === 'start' ? times.startTime : times.endTime}
                    onTimeSelect={activeTimePicker === 'start' ? handleStartTimeChange : handleEndTimeChange}
                    isOpen={true}
                    onClose={() => setActiveTimePicker(null)}
                    uniqueId={`${uniqueId}-${activeTimePicker}`}
                    showInlinePicker={true}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.medium.fontFamily,
    color: theme.colors.text,
    marginBottom: 16,
  },
  timeSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timePickerContainer: {
    flex: 1,
    marginHorizontal: 4,
    position: 'relative',
    zIndex: 10,
  },
  dateLabel: {
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.medium.fontFamily,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: theme.fontSizes.smallMedium,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    marginBottom: 8,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    position: 'relative',
  },
  timeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  timeText: {
    flex: 1,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    marginLeft: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 12,
    backgroundColor: theme.colors.bgColorModern,
    borderRadius: 8,
  },
  durationText: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    marginLeft: 8,
  },
  // Modal styling for outside click handling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    width: '80%',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  startModalContent: {
    alignSelf: 'flex-start',
    marginLeft: '10%',
  },
  endModalContent: {
    alignSelf: 'flex-end',
    marginRight: '10%',
  }
});

export default NewTimeRangeSelector; 