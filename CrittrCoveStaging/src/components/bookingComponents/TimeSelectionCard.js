import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import NewTimeRangeSelector from './NewTimeRangeSelector';
import { AuthContext, debugLog } from '../../context/AuthContext';
import DayTimeSelector from './DayTimeSelector';
import { formatDateOnly, getUTCTimeString } from '../../utils/time_utils';

// Helper function to parse time values from various formats
const parseTimeValue = (timeValue) => {
  if (!timeValue) return null;
  
  // Handle string format 'HH:MM'
  if (typeof timeValue === 'string' && timeValue.includes(':')) {
    const [hours, minutes] = timeValue.split(':').map(part => parseInt(part, 10));
    return { hours, minutes };
  }
  
  // Handle object format directly
  if (typeof timeValue === 'object' && timeValue !== null) {
    // If it has hours/minutes properties directly
    if (timeValue.hours !== undefined || timeValue.minutes !== undefined) {
      return {
        hours: timeValue.hours || 0,
        minutes: timeValue.minutes || 0
      };
    }
  }
  
  // Default fallback
  return null;
};

const TimeSelectionCard = ({ 
  onTimeSelect,
  initialTimes = {},
  dateRange = null,
  selectedService = null,
  isOvernightForced = false
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  
  // Initialize showIndividualDays based on initialTimes.hasIndividualTimes
  const [showIndividualDays, setShowIndividualDays] = useState(() => {
    // For overnight services, never show individual days
    if (selectedService?.is_overnight || isOvernightForced) {
      return false;
    }
    
    const shouldShowIndividual = initialTimes && initialTimes.hasIndividualTimes === true;
    debugLog('MBAoi9uv43d: Initial showIndividualDays value:', shouldShowIndividual);
    return shouldShowIndividual;
  });
  
  const [individualTimeRanges, setIndividualTimeRanges] = useState({});
  const [times, setTimes] = useState(() => {
    // Safely initialize with default values if initialTimes is not properly formatted
    try {
      if (!initialTimes || typeof initialTimes !== 'object') {
        debugLog('MBAoi9uv43d: Invalid initialTimes, using defaults:', initialTimes);
        return {
          startTime: { hours: 9, minutes: 0 },
          endTime: { hours: 17, minutes: 0 },
          isOvernightForced: false
        };
      }
      return initialTimes;
    } catch (error) {
      debugLog('MBAoi9uv43d: Error initializing times:', error);
      return {
        startTime: { hours: 9, minutes: 0 },
        endTime: { hours: 17, minutes: 0 },
        isOvernightForced: false
      };
    }
  });
  
  // Use a ref to track if this is the initial render
  const isInitialRender = useRef(true);
  
  useEffect(() => {
    debugLog('MBAoi9uv43d: TimeSelectionCard received initialTimes:', initialTimes);
    
    // Safely initialize with default values if initialTimes is not properly formatted
    try {
      if (!initialTimes || typeof initialTimes !== 'object') {
        const defaultTimes = {
          startTime: { hours: 9, minutes: 0 },
          endTime: { hours: 17, minutes: 0 },
          isOvernightForced: selectedService?.is_overnight || isOvernightForced || false
        };
        debugLog('MBAoi9uv43d: Using default times:', defaultTimes);
        setTimes(defaultTimes);
        setShowIndividualDays(false);
        return;
      }
      
      // Extract the hasIndividualTimes flag early
      const hasIndividualTimesFlag = initialTimes.hasIndividualTimes === true;
      debugLog('MBAoi9uv43d: hasIndividualTimes flag is', hasIndividualTimesFlag);
      
      // Only set the showIndividualDays based on initialTimes on the initial render
      // This prevents it from overriding user's toggle action
      if (isInitialRender.current) {
        debugLog('MBAoi9uv43d: Initial render - setting showIndividualDays to', hasIndividualTimesFlag);
        setShowIndividualDays(hasIndividualTimesFlag);
        isInitialRender.current = false;
      } else {
        debugLog('MBAoi9uv43d: Not initial render - preserving showIndividualDays state');
      }
      
      // Get formatted start time
      const startTimeValue = parseTimeValue(initialTimes.startTime);
      const endTimeValue = parseTimeValue(initialTimes.endTime);
      
      const formattedTimes = {
        startTime: startTimeValue || { hours: 9, minutes: 0 },
        endTime: endTimeValue || { hours: 17, minutes: 0 },
        // CRITICAL FIX: prioritize selectedService.is_overnight over previous state
        isOvernightForced: selectedService?.is_overnight || isOvernightForced || false
      };
      
      debugLog('MBAoi9uv43d: CRITICAL FIX - Setting formatted times:', {
        formattedTimes,
        selectedServiceIsOvernight: selectedService?.is_overnight,
        isOvernightForcedProp: isOvernightForced,
        initialTimesIsOvernightForced: initialTimes.isOvernightForced,
        message: 'isOvernightForced now prioritizes current service over previous state'
      });
      setTimes(formattedTimes);
      
      // Check if initialTimes already has individual times or if we have dates from draft
      const hasDatesInDraft = initialTimes && Object.keys(initialTimes).some(key => key.match(/^\d{4}-\d{2}-\d{2}$/));
      
      debugLog('MBAoi9uv43d: Time selection setup:', { 
        hasDatesInDraft,
        hasIndividualTimesFlag,
        hasDateRange: !!(dateRange && dateRange.startDate && dateRange.endDate),
        hasDates: !!(initialTimes && initialTimes.dates && initialTimes.dates.length > 0)
      });
      
      // Initialize individual time ranges if we have a date range or dates in draft
      if ((dateRange && dateRange.startDate && dateRange.endDate) || hasDatesInDraft) {
        const newTimeRanges = {};
        
        // If we have a dateRange, populate default times for all dates in the range
        if (dateRange && dateRange.startDate && dateRange.endDate) {
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          
          // Set default times for each date in the range
          const current = new Date(startDate);
          while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            newTimeRanges[dateKey] = JSON.parse(JSON.stringify(formattedTimes));
            current.setDate(current.getDate() + 1);
          }
        }
        
        // Also populate time ranges from multiple days selection if available
        if (initialTimes.dates && initialTimes.dates.length > 0 && !dateRange) {
          debugLog('MBAoi9uv43d: Creating time ranges from multiple days selection');
          initialTimes.dates.forEach(dateObj => {
            // Handle different date formats
            let date;
            if (typeof dateObj === 'string') {
              date = new Date(dateObj);
            } else if (dateObj && dateObj.date) {
              date = new Date(dateObj.date);
            } else {
              date = new Date(dateObj);
            }
            
            const dateKey = date.toISOString().split('T')[0];
            if (!newTimeRanges[dateKey]) {
              newTimeRanges[dateKey] = JSON.parse(JSON.stringify(formattedTimes));
            }
          });
        }
        
        // Check if initialTimes has individual times for specific days
        if (hasIndividualTimesFlag || hasDatesInDraft) {
          Object.keys(initialTimes).forEach(key => {
            // Check if the key is a date (format YYYY-MM-DD)
            if (key.match(/^\d{4}-\d{2}-\d{2}$/) && initialTimes[key]) {
              const dayTime = initialTimes[key];
              const parsedStartTime = parseTimeValue(dayTime.startTime);
              const parsedEndTime = parseTimeValue(dayTime.endTime);
              
              if (parsedStartTime || parsedEndTime) {
                newTimeRanges[key] = {
                  startTime: parsedStartTime || { hours: 9, minutes: 0 },
                  endTime: parsedEndTime || { hours: 17, minutes: 0 },
                  // CRITICAL FIX: prioritize current service over previous state
                  isOvernightForced: selectedService?.is_overnight || isOvernightForced || false
                };
              }
            }
          });
        }
        
        // Also handle individualTimeRanges format from initialTimes
        if (initialTimes.individualTimeRanges) {
          Object.keys(initialTimes.individualTimeRanges).forEach(dateKey => {
            if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const dayTime = initialTimes.individualTimeRanges[dateKey];
              const parsedStartTime = parseTimeValue(dayTime.startTime);
              const parsedEndTime = parseTimeValue(dayTime.endTime);
              
              if (parsedStartTime || parsedEndTime) {
                newTimeRanges[dateKey] = {
                  startTime: parsedStartTime || { hours: 9, minutes: 0 },
                  endTime: parsedEndTime || { hours: 17, minutes: 0 },
                  // CRITICAL FIX: prioritize current service over previous state
                  isOvernightForced: selectedService?.is_overnight || isOvernightForced || false
                };
              }
            }
          });
        }
        
        debugLog('MBAoi9uv43d: Setting individual time ranges:', newTimeRanges);
        setIndividualTimeRanges(newTimeRanges);
      }
    } catch (error) {
      debugLog('MBAoi9uv43d: Error processing initialTimes:', error);
      // Set default times on error
      setTimes({
        startTime: { hours: 9, minutes: 0 },
        endTime: { hours: 17, minutes: 0 },
        isOvernightForced: selectedService?.is_overnight || isOvernightForced || false
      });
    }
  }, [initialTimes, dateRange, selectedService]);
  
  const handleDefaultTimeSelect = (newTimes) => {
    debugLog('MBAoi9uv43d: handleDefaultTimeSelect called with:', newTimes);
    
    // Create a new deep copy to avoid reference issues
    const updatedTimes = JSON.parse(JSON.stringify(newTimes));
    
    // Update our local state
    setTimes(updatedTimes);
    
    // If showing individual days, update each day's times
    if (showIndividualDays) {
      const updatedRanges = {};
      
      // Create deep copies for each date
      Object.keys(individualTimeRanges).forEach(date => {
        updatedRanges[date] = {
          startTime: updatedTimes.startTime,
          endTime: updatedTimes.endTime,
          isOvernightForced: updatedTimes.isOvernightForced
        };
      });
      
      setIndividualTimeRanges(updatedRanges);
      
      // Send full object with individual day data
      onTimeSelect({
        ...updatedTimes,
        ...updatedRanges,
        hasIndividualTimes: true
      });
    } else {
      // Just send the default times
      onTimeSelect({
        ...updatedTimes,
        hasIndividualTimes: false
      });
    }
  };

  const handleIndividualDayTimeSelect = (timesData, dateKey) => {
    debugLog('MBAoi9uv43d: Individual day time selection for card:', { dateKey, timesData });
    
    if (!dateKey) {
      debugLog('MBAoi9uv43d: No dateKey provided, returning');
      return;
    }

    // Create a completely fresh object for the updated ranges with no shared references
    const updatedRanges = JSON.parse(JSON.stringify(individualTimeRanges));
    
    // Now set the new time data for this date key
    updatedRanges[dateKey] = JSON.parse(JSON.stringify(timesData));
    
    debugLog('MBAoi9uv43d: TimeSelectionCard updating only date:', dateKey);
    debugLog('MBAoi9uv43d: Current individualTimeRanges keys:', Object.keys(individualTimeRanges));
    debugLog('MBAoi9uv43d: New updatedRanges keys:', Object.keys(updatedRanges));
    
    // Update local state with completely new object to break all references
    setIndividualTimeRanges(updatedRanges);
    
    // Format time strings for API
    const formattedRanges = {};
    Object.keys(updatedRanges).forEach(date => {
      const timeData = updatedRanges[date];
      formattedRanges[date] = {
        startTime: `${String(timeData.startTime.hours).padStart(2, '0')}:${String(timeData.startTime.minutes).padStart(2, '0')}`,
        endTime: `${String(timeData.endTime.hours).padStart(2, '0')}:${String(timeData.endTime.minutes).padStart(2, '0')}`,
        isOvernightForced: !!timeData.isOvernightForced
      };
    });
    
    // Create a completely new data object for the parent component
    const updatedData = {
      startTime: JSON.parse(JSON.stringify(times.startTime)),
      endTime: JSON.parse(JSON.stringify(times.endTime)),
      isOvernightForced: times.isOvernightForced,
      hasIndividualTimes: true,
      dates: initialTimes.dates ? [...initialTimes.dates] : [],
      individualTimeRanges: formattedRanges
    };
    
    // Add the specific date data
    updatedData[dateKey] = formattedRanges[dateKey];
    
    debugLog('MBAoi9uv43d: TimeSelectionCard sending updated data to parent');
    onTimeSelect(updatedData);
  };

  const handleToggleIndividualDays = () => {
    debugLog('MBAoi9uv43d: TOGGLE button pressed');
    debugLog('MBAoi9uv43d: Current showIndividualDays state:', showIndividualDays);
    
    if (showIndividualDays) {
      // Currently showing individual days, switching to default time range
      debugLog('MBAoi9uv43d: Switching FROM individual days TO default time range');
      
      // First, update the UI state
      setShowIndividualDays(false);
      
      // Then send updated data to parent with hasIndividualTimes=false
      // Include ONLY the essential time data, no date keys
      const updatedData = {
        startTime: times.startTime,
        endTime: times.endTime,
        isOvernightForced: times.isOvernightForced,
        hasIndividualTimes: false,
        // Keep the dates array for reference but don't include individual time ranges
        dates: initialTimes.dates || []
      };
      
      debugLog('MBAoi9uv43d: Sending default time data to parent:', updatedData);
      onTimeSelect(updatedData);
    } else {
      // Currently showing default time range, switching to individual days
      debugLog('MBAoi9uv43d: Switching FROM default time range TO individual days');
      
      // First update the UI state
      setShowIndividualDays(true);
      
      // Create individual time ranges
      let newTimeRanges = {};
      
      // Check if we have multiple individual dates from the booking data
      const hasMultipleDays = initialTimes && initialTimes.dates && initialTimes.dates.length > 0;
      
      if (hasMultipleDays) {
        // Get dates from initialTimes.dates for multiple-days selection
        debugLog('MBAoi9uv43d: Creating time ranges for multiple individual dates');
        
        initialTimes.dates.forEach(dateObj => {
          // Handle different date formats
          let date;
          if (typeof dateObj === 'string') {
            date = new Date(dateObj);
          } else if (dateObj && dateObj.date) {
            date = new Date(dateObj.date);
          } else {
            date = new Date(dateObj);
          }
          
          const dateKey = date.toISOString().split('T')[0];
          
          // Use current times values as default
          newTimeRanges[dateKey] = {
            startTime: JSON.parse(JSON.stringify(times.startTime)),
            endTime: JSON.parse(JSON.stringify(times.endTime)),
            isOvernightForced: times.isOvernightForced
          };
        });
      } else if (dateRange && dateRange.startDate && dateRange.endDate) {
        // Create ranges from dateRange
        debugLog('MBAoi9uv43d: Creating time ranges from dateRange');
        
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        const current = new Date(startDate);
        
        while (current <= endDate) {
          const dateKey = current.toISOString().split('T')[0];
          
          // Use current times values as default, with deep copy
          newTimeRanges[dateKey] = {
            startTime: JSON.parse(JSON.stringify(times.startTime)),
            endTime: JSON.parse(JSON.stringify(times.endTime)),
            isOvernightForced: times.isOvernightForced
          };
          
          // Move to next day
          current.setDate(current.getDate() + 1);
        }
      } else if (Object.keys(individualTimeRanges).length > 0) {
        // Use existing time ranges if we already have them
        newTimeRanges = JSON.parse(JSON.stringify(individualTimeRanges));
      }
      
      debugLog('MBAoi9uv43d: Setting individual time ranges:', newTimeRanges);
      setIndividualTimeRanges(newTimeRanges);
      
      // Send full object with individual day data
      onTimeSelect({
        ...times,
        ...newTimeRanges,
        hasIndividualTimes: true
      });
    }
  };

  // Utility to get dates from dateRange or initialTimes
  const getDates = () => {
    let dates = [];
    
    // Check if we have multiple individual dates from the booking data
    const hasMultipleDays = initialTimes && initialTimes.dates && initialTimes.dates.length > 0;
    
    if (hasMultipleDays) {
      // Get dates from the initialTimes.dates for multiple-days selection
      debugLog('MBAoi9uv43d: Using multiple individual dates from initialTimes:', initialTimes.dates);
      dates = initialTimes.dates.map(dateObj => {
        // Handle different date formats (string or object with date property)
        if (typeof dateObj === 'string') {
          return new Date(dateObj);
        } else if (dateObj && dateObj.date) {
          return new Date(dateObj.date);
        } else {
          return new Date(dateObj);
        }
      });
    } else if (dateRange && dateRange.startDate && dateRange.endDate) {
      // Generate array of dates between start and end for date range
      debugLog('MBAoi9uv43d: Generating dates from dateRange:', dateRange);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const current = new Date(startDate);
      
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return dates;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Only show default time range selector when not showing individual days */}
        {!showIndividualDays && (
          <NewTimeRangeSelector
            onTimeSelect={handleDefaultTimeSelect}
            initialTimes={times}
            is_overnight={selectedService?.is_overnight || times.isOvernightForced || isOvernightForced || false}
            uniqueId="default-time-range"
            dateRange={dateRange}
            selectedDates={initialTimes.dates || []}
          />
        )}

        {/* Only show customize button if not an overnight service */}
        {!selectedService?.is_overnight && !isOvernightForced && (
          <View style={styles.customizeButtonContainer}>
            <TouchableOpacity 
              style={styles.customizeButton}
              onPress={handleToggleIndividualDays}
              activeOpacity={0.7}
            >
              <MaterialIcons name="schedule" size={20} color={theme.colors.mainColors.main} />
              <Text style={styles.customizeButtonText}>
                {showIndividualDays ? 'Set Default Time Range' : 'Customize Individual Day Schedules'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Only show individual day schedules if not an overnight service and the toggle is on */}
        {showIndividualDays && !selectedService?.is_overnight && !isOvernightForced && (
          <View style={styles.individualDaysContainer}>
            <Text style={styles.sectionHeader}>Individual Day Schedules</Text>
            <ScrollView>
              {getDates().map((date, index) => {
                const dateKey = date.toISOString().split('T')[0];
                
                // Get existing time data for this date or use default with deep copying
                let timeData;
                
                // Check if we have a specific time range for this date in initialTimes
                if (initialTimes && initialTimes[dateKey]) {
                  const parsedStartTime = parseTimeValue(initialTimes[dateKey].startTime);
                  const parsedEndTime = parseTimeValue(initialTimes[dateKey].endTime);
                  
                  timeData = {
                    startTime: parsedStartTime || JSON.parse(JSON.stringify(times.startTime)),
                    endTime: parsedEndTime || JSON.parse(JSON.stringify(times.endTime)),
                    // CRITICAL FIX: prioritize current service over previous state
                    isOvernightForced: selectedService?.is_overnight || isOvernightForced || false
                  };
                  
                  debugLog(`MBAoi9uv43d: Found specific time data for date ${dateKey} in initialTimes`);
                } 
                // Otherwise check individualTimeRanges which is our local state
                else if (individualTimeRanges && individualTimeRanges[dateKey]) {
                  timeData = JSON.parse(JSON.stringify(individualTimeRanges[dateKey]));
                  debugLog(`MBAoi9uv43d: Using time from individualTimeRanges for date ${dateKey}`);
                } 
                // If nothing found, use default times
                else {
                  timeData = { 
                    startTime: JSON.parse(JSON.stringify(times.startTime)),
                    endTime: JSON.parse(JSON.stringify(times.endTime)),
                    isOvernightForced: times.isOvernightForced
                  };
                  debugLog(`MBAoi9uv43d: Using default times for date ${dateKey}`);
                }
                
                return (
                  <DayTimeSelector
                    key={`day-${dateKey}`}
                    date={date}
                    initialTimes={timeData}
                    onTimeChange={handleIndividualDayTimeSelect}
                    is_overnight={selectedService?.is_overnight || false}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
  },
  customizeButtonContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
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
  individualDaysContainer: {
    gap: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
});

export default TimeSelectionCard; 