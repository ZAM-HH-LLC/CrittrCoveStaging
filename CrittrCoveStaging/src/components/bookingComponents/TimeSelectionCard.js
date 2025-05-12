import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import TimeRangeSelector from './TimeRangeSelector';
import { AuthContext, debugLog } from '../../context/AuthContext';

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
    debugLog('MBA66777: Initial showIndividualDays value:', shouldShowIndividual);
    return shouldShowIndividual;
  });
  const [individualTimeRanges, setIndividualTimeRanges] = useState({});
  const [times, setTimes] = useState(() => {
    // Safely initialize with default values if initialTimes is not properly formatted
    try {
      if (!initialTimes || typeof initialTimes !== 'object') {
        debugLog('MBA2j3kbr9hve4: Invalid initialTimes, using defaults:', initialTimes);
        return {
          startTime: { hours: 9, minutes: 0 },
          endTime: { hours: 17, minutes: 0 },
          isOvernightForced: false
        };
      }
      return initialTimes;
    } catch (error) {
      debugLog('MBA2j3kbr9hve4: Error initializing times:', error);
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
    debugLog('MBA66777: TimeSelectionCard received initialTimes:', initialTimes);
    
    // Safely initialize with default values if initialTimes is not properly formatted
    try {
      if (!initialTimes || typeof initialTimes !== 'object') {
        const defaultTimes = {
          startTime: { hours: 9, minutes: 0 },
          endTime: { hours: 17, minutes: 0 },
          isOvernightForced: selectedService?.is_overnight || false
        };
        debugLog('MBA66777: Using default times:', defaultTimes);
        setTimes(defaultTimes);
        setShowIndividualDays(false);
        return;
      }
      
      // Extract the hasIndividualTimes flag early
      const hasIndividualTimesFlag = initialTimes.hasIndividualTimes === true;
      debugLog('MBA66777: hasIndividualTimes flag is', hasIndividualTimesFlag);
      
      // Only set the showIndividualDays based on initialTimes on the initial render
      // This prevents it from overriding user's toggle action
      if (isInitialRender.current) {
        debugLog('MBA66777: Initial render - setting showIndividualDays to', hasIndividualTimesFlag);
        setShowIndividualDays(hasIndividualTimesFlag);
        isInitialRender.current = false;
      } else {
        debugLog('MBA66777: Not initial render - preserving showIndividualDays state');
      }
      
      // Function to safely parse time string or object
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
      
      // Get formatted start time
      const startTimeValue = parseTimeValue(initialTimes.startTime);
      const endTimeValue = parseTimeValue(initialTimes.endTime);
      
      const formattedTimes = {
        startTime: startTimeValue || { hours: 9, minutes: 0 },
        endTime: endTimeValue || { hours: 17, minutes: 0 },
        isOvernightForced: initialTimes.isOvernightForced || selectedService?.is_overnight || false
      };
      
      debugLog('MBA2j3kbr9hve4: Setting formatted times:', formattedTimes);
      setTimes(formattedTimes);
      
      // Check if initialTimes already has individual times or if we have dates from draft
      const hasDatesInDraft = initialTimes && Object.keys(initialTimes).some(key => key.match(/^\d{4}-\d{2}-\d{2}$/));
      
      debugLog('MBA66777: Time selection setup:', { 
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
            newTimeRanges[dateKey] = { ...formattedTimes };
            current.setDate(current.getDate() + 1);
          }
        }
        
        // Also populate time ranges from multiple days selection if available
        if (initialTimes.dates && initialTimes.dates.length > 0 && !dateRange) {
          debugLog('MBA66777: Creating time ranges from multiple days selection');
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
              newTimeRanges[dateKey] = { ...formattedTimes };
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
                  isOvernightForced: dayTime.isOvernightForced || false
                };
              }
            }
          });
        }
        
        debugLog('MBA2j3kbr9hve4: Setting individual time ranges:', newTimeRanges);
        setIndividualTimeRanges(newTimeRanges);
      }
    } catch (error) {
      debugLog('MBA2j3kbr9hve4: Error processing initialTimes:', error);
      // Set default times on error
      setTimes({
        startTime: { hours: 9, minutes: 0 },
        endTime: { hours: 17, minutes: 0 },
        isOvernightForced: selectedService?.is_overnight || false
      });
    }
  }, [initialTimes, dateRange, selectedService]);
  
  // Ensure times are properly displayed
  useEffect(() => {
    if (!showIndividualDays && individualTimeRanges && Object.keys(individualTimeRanges).length > 0) {
      debugLog('MBA66777: Individual days view is off but we have individualTimeRanges');
    }
  }, [showIndividualDays, individualTimeRanges]);
  
  const handleOvernightTimeSelect = (startTime, endTime, isOvernightForced) => {
    debugLog('MBA2j3kbr9hve4: handleOvernightTimeSelect called with:', { 
      startTime, 
      endTime, 
      isOvernightForced 
    });
    
    // Create proposed new start and end times, using existing values if not provided
    const newStartTime = startTime || times.startTime;
    const newEndTime = endTime || times.endTime;
    
    // Convert to minutes for easier comparison
    const startTimeInMinutes = newStartTime.hours * 60 + newStartTime.minutes;
    const endTimeInMinutes = newEndTime.hours * 60 + newEndTime.minutes;
    
    // Special case: Midnight (00:00) as end time is treated as end of day (24:00)
    const isMidnightEndTime = newEndTime.hours === 0 && newEndTime.minutes === 0;
    
    // We only need to validate when end time is NOT midnight
    if (!isMidnightEndTime && endTimeInMinutes <= startTimeInMinutes) {
      debugLog('MBA2j3kbr9hve4: Invalid time selection - end time cannot be before start time', {
        startTime: newStartTime,
        endTime: newEndTime
      });
      // Don't update times if invalid
      return;
    }
    
    // Update our local state
    const updatedTimes = {
      ...times,
      startTime: newStartTime,
      endTime: newEndTime,
      isOvernightForced: isOvernightForced !== undefined ? isOvernightForced : times.isOvernightForced
    };
    
    setTimes(updatedTimes);
    
    // If showing individual days, update each day's times
    if (showIndividualDays) {
      const updatedRanges = { ...individualTimeRanges };
      Object.keys(updatedRanges).forEach(date => {
        updatedRanges[date] = {
          ...updatedRanges[date],
          startTime: newStartTime,
          endTime: newEndTime,
          isOvernightForced: isOvernightForced !== undefined ? isOvernightForced : updatedRanges[date].isOvernightForced
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
    debugLog('MBAoi1h34ghnvo: Individual day time selection:', { timesData, dateKey });
    
    if (!dateKey) {
      debugLog('MBAoi1h34ghnvo: No dateKey provided, returning');
      return;
    }

    // Convert to minutes for easier comparison
    const startTimeInMinutes = timesData.startTime.hours * 60 + timesData.startTime.minutes;
    const endTimeInMinutes = timesData.endTime.hours * 60 + timesData.endTime.minutes;
    
    // Special case: Midnight (00:00) as end time is treated as end of day (24:00)
    const isMidnightEndTime = timesData.endTime.hours === 0 && timesData.endTime.minutes === 0;
    
    // We only need to validate when end time is NOT midnight
    if (!isMidnightEndTime && endTimeInMinutes <= startTimeInMinutes) {
      debugLog('MBAoi1h34ghnvo: Invalid time selection for individual day - end time cannot be before start time', {
        dateKey,
        startTime: timesData.startTime,
        endTime: timesData.endTime
      });
      // Don't update times if invalid
      return;
    }

    // Create a new object with only the selected dates
    const updatedRanges = {};
    
    // Only process the specific date that was selected
    updatedRanges[dateKey] = {
      startTime: timesData.startTime,
      endTime: timesData.endTime,
      isOvernightForced: timesData.isOvernightForced
    };
    
    debugLog('MBAoi1h34ghnvo: Current ranges after update:', updatedRanges);
    
    // Update state with only the selected date
    setIndividualTimeRanges(updatedRanges);
    
    // Format only the selected date's time range for the backend
    const formattedRanges = {};
    formattedRanges[dateKey] = {
      startTime: typeof timesData.startTime === 'string' ? timesData.startTime : `${String(timesData.startTime.hours).padStart(2, '0')}:${String(timesData.startTime.minutes).padStart(2, '0')}`,
      endTime: typeof timesData.endTime === 'string' ? timesData.endTime : `${String(timesData.endTime.hours).padStart(2, '0')}:${String(timesData.endTime.minutes).padStart(2, '0')}`,
      isOvernightForced: timesData.isOvernightForced
    };
    
    debugLog('MBAoi1h34ghnvo: Formatted ranges:', formattedRanges);
    
    // Create the final data object with only the selected date's time change
    const finalData = {
      ...times,
      hasIndividualTimes: true,
      isOvernightForced: timesData.isOvernightForced,
      dates: initialTimes.dates || [],
      // Include only the formatted range for the selected date
      ...formattedRanges,
      // Include the raw individualTimeRanges for state preservation
      individualTimeRanges: updatedRanges,
      // Ensure we preserve all time changes
      allTimesAreTheSame: false
    };
    
    debugLog('MBAoi1h34ghnvo: Sending final data to parent:', finalData);
    onTimeSelect(finalData);
  };

  const handlePresetSelect = (preset) => {
    let newTimes = {};
    switch (preset) {
      case 'morning':
        newTimes = {
          startTime: { hours: 9, minutes: 0 },
          endTime: { hours: 12, minutes: 0 },
          isOvernightForced: false
        };
        break;
      case 'afternoon':
        newTimes = {
          startTime: { hours: 13, minutes: 0 },
          endTime: { hours: 17, minutes: 0 },
          isOvernightForced: false
        };
        break;
      case 'fullDay':
        newTimes = {
          startTime: { hours: 9, minutes: 0 },
          endTime: { hours: 17, minutes: 0 },
          isOvernightForced: false
        };
        break;
      default:
        return;
    }
    handleOvernightTimeSelect(null, null, newTimes.isOvernightForced);
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const options = { month: 'short', day: 'numeric' };
    const start = new Date(startDate).toLocaleDateString('en-US', options);
    const end = new Date(endDate).toLocaleDateString('en-US', options);
    return start === end ? start : `${start} to ${end}`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const options = { month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  const renderIndividualTimeRanges = () => {
    // Get dates either from dateRange or from multiple-days selection
    let dates = [];
    
    // Check if we have multiple individual dates from the booking data
    const hasMultipleDays = initialTimes && initialTimes.dates && initialTimes.dates.length > 0;
    
    if (hasMultipleDays) {
      // Get dates from the initialTimes.dates for multiple-days selection
      debugLog('MBA66777: Using multiple individual dates from initialTimes:', initialTimes.dates);
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
      debugLog('MBA66777: Generating dates from dateRange:', dateRange);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const current = new Date(startDate);
      
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    // If no dates found, return null
    if (dates.length === 0) {
      debugLog('MBA66777: No dates found for individual time ranges');
      return null;
    }
    
    debugLog('MBA66777: Rendering individual time ranges for dates:', dates);
    
    return (
      <View style={styles.individualDaysContainer}>
        <Text style={styles.sectionHeader}>Individual Day Schedules</Text>
        
        {dates.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const timeData = individualTimeRanges[dateKey] || { 
            startTime: times.startTime, 
            endTime: times.endTime,
            isOvernightForced: times.isOvernightForced
          };
          
          const handleIndividualTimeUpdate = (timesData) => {
            handleIndividualDayTimeSelect(timesData, dateKey);
          };
          
          return (
            <View key={dateKey} style={styles.dateContainer}>
              <TimeRangeSelector
                title={formatDate(date)}
                onTimeSelect={handleIndividualTimeUpdate}
                initialTimes={timeData}
                showOvernightToggle={!selectedService?.is_overnight}
                dateRange={{ startDate: date, endDate: date }}
                is_overnight={selectedService?.is_overnight || timeData.isOvernightForced}
              />
              {index < dates.length - 1 && <View style={styles.dateDivider} />}
            </View>
          );
        })}
      </View>
    );
  };

  const handleToggleIndividualDays = () => {
    debugLog('MBA66777: TOGGLE button pressed');
    debugLog('MBA66777: Current showIndividualDays state:', showIndividualDays);
    
    if (showIndividualDays) {
      // Currently showing individual days, switching to default time range
      debugLog('MBA66777: Switching FROM individual days TO default time range');
      
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
      
      debugLog('MBA66777: Sending default time data to parent:', updatedData);
      onTimeSelect(updatedData);
    } else {
      // Currently showing default time range, switching to individual days
      debugLog('MBA66777: Switching FROM default time range TO individual days');
      
      // First update the UI state
      setShowIndividualDays(true);
      
      // Create individual time ranges
      let newTimeRanges = {};
      
      // Check if we have multiple individual dates from the booking data
      const hasMultipleDays = initialTimes && initialTimes.dates && initialTimes.dates.length > 0;
      
      if (hasMultipleDays) {
        // Get dates from initialTimes.dates for multiple-days selection
        debugLog('MBA66777: Creating time ranges for multiple individual dates');
        
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
            startTime: times.startTime,
            endTime: times.endTime,
            isOvernightForced: times.isOvernightForced
          };
        });
      } else if (dateRange && dateRange.startDate && dateRange.endDate) {
        // Create ranges from dateRange
        debugLog('MBA66777: Creating time ranges from dateRange');
        
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        const current = new Date(startDate);
        
        while (current <= endDate) {
          const dateKey = current.toISOString().split('T')[0];
          
          // Use current times values as default
          newTimeRanges[dateKey] = {
            startTime: times.startTime,
            endTime: times.endTime,
            isOvernightForced: times.isOvernightForced
          };
          
          // Move to next day
          current.setDate(current.getDate() + 1);
        }
      } else if (Object.keys(individualTimeRanges).length > 0) {
        // Use existing time ranges if we already have them
        newTimeRanges = individualTimeRanges;
      }
      
      debugLog('MBA66777: Setting individual time ranges:', newTimeRanges);
      setIndividualTimeRanges(newTimeRanges);
      
      // Send full object with individual day data
      onTimeSelect({
        ...times,
        ...newTimeRanges,
        hasIndividualTimes: true
      });
    }
  };

  const handleTimeRangeSelectorUpdate = (timesData) => {
    debugLog('MBA7799: TimeRangeSelector update:', timesData);
    
    // Don't automatically treat midnight end time as overnight
    const isServiceOvernight = selectedService?.is_overnight === true;
    const hasExplicitOvernightFlag = timesData.isOvernightForced === true;
    const isMidnightEndTime = timesData.endTime && timesData.endTime.hours === 0 && timesData.endTime.minutes === 0;
    
    // Only set isOvernightForced if service is overnight or explicitly set
    // Don't set it just because end time is 00:00
    const effectiveOvernightFlag = isServiceOvernight || (hasExplicitOvernightFlag && !isMidnightEndTime);
    
    debugLog('MBA7799: Determining overnight status:', {
      isServiceOvernight,
      hasExplicitOvernightFlag,
      isMidnightEndTime,
      effectiveOvernightFlag
    });
    
    // Check if end time is before start time (except for midnight case)
    if (timesData.startTime && timesData.endTime) {
      const startTimeInMinutes = timesData.startTime.hours * 60 + timesData.startTime.minutes;
      const endTimeInMinutes = timesData.endTime.hours * 60 + timesData.endTime.minutes;
      
      // Special case: Midnight (00:00) as end time is treated as end of day (24:00)
      // So we only need to validate when end time is NOT midnight
      if (!isMidnightEndTime && endTimeInMinutes <= startTimeInMinutes) {
        debugLog('MBA7799: Invalid time selection from TimeRangeSelector - end time cannot be before start time', {
          startTime: timesData.startTime,
          endTime: timesData.endTime
        });
        // Don't update times if invalid
        return;
      }
    }
    
    handleOvernightTimeSelect(
      timesData.startTime, 
      timesData.endTime, 
      effectiveOvernightFlag
    );
  };

  // Track showIndividualDays changes
  useEffect(() => {
    debugLog('MBA66777: showIndividualDays changed to', showIndividualDays);
  }, [showIndividualDays]);
  
  // Add a log at render time
  debugLog('MBA66777: TimeSelectionCard rendering with showIndividualDays =', showIndividualDays);

  // Add an effect to detect when hasIndividualTimes changes in initialTimes
  useEffect(() => {
    // Skip on first render since we handle that separately
    if (!isInitialRender.current) {
      const hasIndividualTimesFlag = initialTimes && initialTimes.hasIndividualTimes === true;
      
      // If hasIndividualTimes was explicitly set to false in initialTimes,
      // update our local state to match
      if (hasIndividualTimesFlag === false && showIndividualDays === true) {
        debugLog('MBA66777: Detected hasIndividualTimes changed to false, updating local state');
        setShowIndividualDays(false);
      } else if (hasIndividualTimesFlag === true && showIndividualDays === false) {
        debugLog('MBA66777: Detected hasIndividualTimes changed to true, updating local state');
        setShowIndividualDays(true);
      }
    }
  }, [initialTimes.hasIndividualTimes, showIndividualDays]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Only show default time range selector when not showing individual days */}
        {!showIndividualDays && (
          <TimeRangeSelector
            title={selectedService?.is_overnight || isOvernightForced ? `Time Range` : `Default Time Range`}
            onTimeSelect={handleTimeRangeSelectorUpdate}
            initialTimes={times}
            showOvernightToggle={!selectedService?.is_overnight && !isOvernightForced}
            dateRange={dateRange}
            is_overnight={selectedService?.is_overnight || times.isOvernightForced || isOvernightForced || false}
          />
        )}

        {/* Only show customize button if not an overnight service */}
        {!selectedService?.is_overnight && !isOvernightForced && (
          <View style={[styles.customizeButtonContainer, { zIndex: 1 }]}>
            <TouchableOpacity 
              style={styles.customizeButton}
              onPress={handleToggleIndividualDays}
              activeOpacity={0.7}
            >
              <MaterialIcons name="schedule" size={20} color={theme.colors.mainColors.main} />
              <Text style={[styles.customizeButtonText]}>
                {showIndividualDays ? 'Use Default Time Range' : 'Customize Individual Day Schedules'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Only show individual day schedules if not an overnight service and the toggle is on */}
        {showIndividualDays && !selectedService?.is_overnight && !isOvernightForced && renderIndividualTimeRanges()}

        {/* Only show presets for non-overnight services when not in individual days mode */}
        {!showIndividualDays && !selectedService?.is_overnight && !isOvernightForced && (
          <View style={[styles.presetsContainer, { zIndex: 1 }]}>
            <Text style={[styles.presetsTitle]}>Quick Presets</Text>
            <View style={styles.presetButtons}>
              <TouchableOpacity 
                style={styles.presetButton}
                onPress={() => handlePresetSelect('morning')}
              >
                <Text style={[styles.presetButtonText]}>9 AM - 12 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetButton}
                onPress={() => handlePresetSelect('afternoon')}
              >
                <Text style={[styles.presetButtonText]}>1 PM - 5 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetButton}
                onPress={() => handlePresetSelect('fullDay')}
              >
                <Text style={[styles.presetButtonText]}>9 AM - 5 PM</Text>
              </TouchableOpacity>
            </View>
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
    position: 'relative',
    zIndex: 3000,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    position: 'relative',
    zIndex: 3000,
  },
  customizeButtonContainer: {
    marginBottom: 24,
    position: 'relative',
    zIndex: 2800,
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
    position: 'relative',
    zIndex: 2800,
  },
  customizeButtonText: {
    color: theme.colors.mainColors.main,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  presetsContainer: {
    gap: 12,
    position: 'relative',
    zIndex: 2700,
  },
  presetsTitle: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignSelf: 'flex-start',
    position: 'relative',
    zIndex: 2700,
  },
  presetButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
  },
  presetButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.smallMedium,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  individualDaysContainer: {
    gap: 12,
    position: 'relative',
    zIndex: 3100,
  },
  sectionHeader: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  dateContainer: {
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'relative',
    zIndex: 3000,
  },
  dateDivider: {
    height: 1,
    backgroundColor: theme.colors.modernBorder,
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
});

export default TimeSelectionCard; 