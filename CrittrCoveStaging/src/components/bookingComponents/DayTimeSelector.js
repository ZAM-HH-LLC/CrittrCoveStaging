import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext, debugLog } from '../../context/AuthContext';
import NewTimeRangeSelector from './NewTimeRangeSelector';

const DayTimeSelector = ({
  date,
  initialTimes = {},
  onTimeChange,
  is_overnight = false
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  
  // State to manage multiple time slots for this date
  const [timeSlots, setTimeSlots] = useState(() => {
    // Handle both array format (multiple time slots) and single object format (legacy)
    if (Array.isArray(initialTimes)) {
      // New format: array of time slots
      return initialTimes.map((slot, index) => ({
        id: `slot-${index}`,
        startTime: slot.startTime || { hours: 9, minutes: 0 },
        endTime: slot.endTime || { hours: 17, minutes: 0 },
        isOvernightForced: slot.isOvernightForced || false
      }));
    } else if (initialTimes && (initialTimes.startTime || initialTimes.endTime)) {
      // Legacy format: single time object
      return [{
        id: 'slot-0',
        startTime: initialTimes.startTime || { hours: 9, minutes: 0 },
        endTime: initialTimes.endTime || { hours: 17, minutes: 0 },
        isOvernightForced: initialTimes.isOvernightForced || false
      }];
    }
    
    // Default fallback
    return [{
      id: 'slot-0',
      startTime: { hours: 9, minutes: 0 },
      endTime: { hours: 17, minutes: 0 },
      isOvernightForced: false
    }];
  });
  
  // Format the date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    // Create a copy to prevent timezone issues
    const dateObj = new Date(date);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  };
  
  // Generate a unique ID for this date's time selector
  const generateUniqueId = () => {
    if (!date) return 'day-unknown';
    
    try {
      // If date is a Date object, convert to ISO string and extract date part
      if (date instanceof Date) {
        return `day-${date.toISOString().split('T')[0]}`;
      }
      
      // If date is already in YYYY-MM-DD format
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return `day-${date}`;
      }
      
      // If date is in another format, try to convert it
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return `day-${parsedDate.toISOString().split('T')[0]}`;
      }
      
      // Fallback
      return `day-unknown-${Date.now()}`;
    } catch (error) {
      debugLog('MBAoi9uv43d: Error generating unique ID for date:', error);
      return `day-unknown-${Date.now()}`;
    }
  };
  
  // Generate a stable date key for API
  const generateDateKey = () => {
    if (!date) return null;
    
    try {
      // If date is a Date object, convert to YYYY-MM-DD
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      
      // If date is already in YYYY-MM-DD format
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
      }
      
      // If date is in another format, try to convert it
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
      
      // Couldn't parse date
      debugLog('MBAoi9uv43d: Could not parse date:', date);
      return null;
    } catch (error) {
      debugLog('MBAoi9uv43d: Error generating date key:', error);
      return null;
    }
  };
  
  // Generate stable IDs
  const uniqueId = generateUniqueId();
  const dateKey = generateDateKey();
  
  // Handle time selection from a specific time slot
  const handleTimeSlotSelect = (timesData, slotId) => {
    if (!dateKey) {
      debugLog('MBAoi9uv43d: Cannot handle time selection - invalid date key');
      return;
    }
    
    debugLog(`MBAoi9uv43d: DayTimeSelector handleTimeSlotSelect called:`, {
      dateKey,
      slotId,
      timesData,
      currentTimeSlots: timeSlots
    });
    
    // Update the specific time slot
    const updatedTimeSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        const updatedSlot = {
          ...slot,
          startTime: timesData.startTime,
          endTime: timesData.endTime,
          isOvernightForced: timesData.isOvernightForced
        };
        debugLog(`MBAoi9uv43d: Updated slot ${slotId}:`, updatedSlot);
        return updatedSlot;
      }
      return slot;
    });
    
    setTimeSlots(updatedTimeSlots);
    
    debugLog(`MBAoi9uv43d: DayTimeSelector (${uniqueId}) time slot ${slotId} changed:`, {
      dateKey,
      updatedTimeSlots,
      previousTimeSlots: timeSlots
    });
    
    // Pass all time slots for this date to the parent component
    onTimeChange(updatedTimeSlots, dateKey);
  };
  
  // Add a new time slot for this date
  const handleAddTimeSlot = () => {
    const newSlotId = `slot-${timeSlots.length}`;
    const newSlot = {
      id: newSlotId,
      startTime: { hours: 9, minutes: 0 },
      endTime: { hours: 17, minutes: 0 },
      isOvernightForced: false
    };
    
    const updatedTimeSlots = [...timeSlots, newSlot];
    setTimeSlots(updatedTimeSlots);
    
    debugLog(`MBAoi9uv43d: Added new time slot for date ${dateKey}:`, updatedTimeSlots);
    
    // Notify parent of the new time slots
    onTimeChange(updatedTimeSlots, dateKey);
  };
  
  // Remove a time slot (only allow if there's more than one)
  const handleRemoveTimeSlot = (slotId) => {
    if (timeSlots.length <= 1) {
      debugLog('MBAoi9uv43d: Cannot remove last time slot');
      return;
    }
    
    const updatedTimeSlots = timeSlots.filter(slot => slot.id !== slotId);
    setTimeSlots(updatedTimeSlots);
    
    debugLog(`MBAoi9uv43d: Removed time slot ${slotId} for date ${dateKey}:`, updatedTimeSlots);
    
    // Notify parent of the updated time slots
    onTimeChange(updatedTimeSlots, dateKey);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{formatDate(date)}</Text>
      
      {timeSlots.map((slot, index) => (
        <View key={slot.id} style={styles.timeSlotContainer}>
          {timeSlots.length > 1 && (
            <View style={styles.timeSlotHeader}>
              <Text style={styles.timeSlotTitle}>Time Slot {index + 1}</Text>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => handleRemoveTimeSlot(slot.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
          
          <NewTimeRangeSelector
            onTimeSelect={(timesData) => handleTimeSlotSelect(timesData, slot.id)}
            initialTimes={slot}
            is_overnight={is_overnight}
            uniqueId={`${uniqueId}-${slot.id}`}
            selectedDates={[date]}
            isIndividualDaySelector={true}
          />
        </View>
      ))}
      
      <TouchableOpacity 
        style={styles.addTimeButton}
        onPress={handleAddTimeSlot}
        activeOpacity={0.7}
      >
        <MaterialIcons name="add" size={20} color={theme.colors.mainColors.main} />
        <Text style={styles.addTimeButtonText}>Add another time for this date</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    overflow: 'visible',
  },
  dateLabel: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.medium.fontFamily,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgColorModern,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  timeSlotContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.bgColorModern,
  },
  timeSlotTitle: {
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.medium.fontFamily,
    color: theme.colors.secondary,
  },
  removeButton: {
    padding: 4,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.mainColors.main,
    backgroundColor: 'transparent',
  },
  addTimeButtonText: {
    color: theme.colors.mainColors.main,
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default DayTimeSelector; 