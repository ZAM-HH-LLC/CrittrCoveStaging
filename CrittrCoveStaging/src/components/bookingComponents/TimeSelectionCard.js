import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import TimeRangeSelector from './TimeRangeSelector';
import { AuthContext } from '../../context/AuthContext';

const TimeSelectionCard = ({ 
  onTimeSelect,
  initialTimes = {},
  dateRange = null,
  selectedService = null,
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  const [showIndividualDays, setShowIndividualDays] = useState(false);
  const [individualTimeRanges, setIndividualTimeRanges] = useState({});
  const [times, setTimes] = useState(initialTimes);

  const handleOvernightTimeSelect = (type, value) => {
    if (is_DEBUG) {
      console.log('MBA12345 Overnight time selection:', { type, value });
    }

    const currentTimes = { ...times };
    
    // If value is a complete time object (from preset or direct selection)
    if (value && value.startTime && value.endTime) {
      currentTimes.startTime = value.startTime;
      currentTimes.endTime = value.endTime;
      currentTimes.isOvernightForced = value.isOvernightForced;
    } else if (type === 'start') {
      if (value.hours !== undefined) {
        currentTimes.startTime = {
          ...currentTimes.startTime,
          hours: value.hours,
          minutes: value.minutes || 0
        };
      }
      if (value.minutes !== undefined) {
        currentTimes.startTime = {
          ...currentTimes.startTime,
          minutes: value.minutes
        };
      }
    } else if (type === 'end') {
      if (value.hours !== undefined) {
        currentTimes.endTime = {
          ...currentTimes.endTime,
          hours: value.hours,
          minutes: value.minutes || 0
        };
      }
      if (value.minutes !== undefined) {
        currentTimes.endTime = {
          ...currentTimes.endTime,
          minutes: value.minutes
        };
      }
    }

    if (is_DEBUG) {
      console.log('MBA12345 Updated overnight times:', currentTimes);
    }
    setTimes(currentTimes);
    
    // If we're showing individual days, we need to also update individualTimeRanges
    if (showIndividualDays && dateRange) {
      // Get all dates in range
      const { startDate, endDate } = dateRange;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const newTimeRanges = { ...individualTimeRanges };
        
        // Update every date with the new default time
        const current = new Date(start);
        while (current <= end) {
          const dateKey = current.toISOString().split('T')[0];
          newTimeRanges[dateKey] = { ...currentTimes };
          current.setDate(current.getDate() + 1);
        }
        
        setIndividualTimeRanges(newTimeRanges);
      }
    }
    
    onTimeSelect(currentTimes);
  };

  const handleIndividualDayTimeSelect = (timeData, dateKey) => {
    if (is_DEBUG) {
      console.log('MBA12345 Individual day time selection:', { timeData, dateKey });
    }

    // Update individual time ranges
    const newTimeRanges = {
      ...individualTimeRanges,
      [dateKey]: {
        ...individualTimeRanges[dateKey],
        startTime: timeData.startTime ? {
          hours: timeData.startTime.hours,
          minutes: timeData.startTime.minutes || 0
        } : individualTimeRanges[dateKey]?.startTime,
        endTime: timeData.endTime ? {
          hours: timeData.endTime.hours,
          minutes: timeData.endTime.minutes || 0
        } : individualTimeRanges[dateKey]?.endTime,
        isOvernightForced: timeData.isOvernightForced
      }
    };
    setIndividualTimeRanges(newTimeRanges);
    
    // When individual days are selected, we pass the entire object with date keys
    // to the parent component, so it can use these times when creating occurrences
    const timesWithIndividualDays = {
      ...times, // Keep default times
      ...newTimeRanges, // Add individual day times
      hasIndividualTimes: true // Flag to indicate we're using individual times
    };
    
    // Send all time ranges to parent
    onTimeSelect(timesWithIndividualDays);
  };

  // Initialize times with proper format
  useEffect(() => {
    if (initialTimes) {
      const formattedTimes = {
        startTime: {
          hours: initialTimes.startTime ? parseInt(initialTimes.startTime.split(':')[0]) : 9,
          minutes: initialTimes.startTime ? parseInt(initialTimes.startTime.split(':')[1]) : 0
        },
        endTime: {
          hours: initialTimes.endTime ? parseInt(initialTimes.endTime.split(':')[0]) : 17,
          minutes: initialTimes.endTime ? parseInt(initialTimes.endTime.split(':')[1]) : 0
        },
        isOvernightForced: initialTimes.isOvernightForced || false
      };
      if (is_DEBUG) {
        console.log('MBA12345 Initializing times:', formattedTimes);
      }
      setTimes(formattedTimes);
      
      // Initialize individual time ranges if we have a date range
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        const newTimeRanges = {};
        
        // Set default times for each date in the range
        const current = new Date(startDate);
        while (current <= endDate) {
          const dateKey = current.toISOString().split('T')[0];
          newTimeRanges[dateKey] = { ...formattedTimes };
          current.setDate(current.getDate() + 1);
        }
        
        setIndividualTimeRanges(newTimeRanges);
      }
    }
  }, [initialTimes, dateRange]);

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
    handleOvernightTimeSelect(null, newTimes);
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
    if (!dateRange) return null;

    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) return null;

    const timeRanges = [];
    
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    let zIndexCounter = 1000;
    
    while (currentDate <= endDateObj) {
      const dateKey = currentDate.toISOString().split('T')[0];
      timeRanges.push(
        <View key={dateKey} style={[styles.timeRangeContainer, { zIndex: zIndexCounter }]}>
          <TimeRangeSelector
            title={`${formatDate(dateKey)}`}
            onTimeSelect={(timeData) => handleIndividualDayTimeSelect(timeData, dateKey)}
            initialTimes={individualTimeRanges[dateKey] || times}
            showOvernightToggle={!selectedService?.is_overnight}
            dateRange={{ startDate: dateKey, endDate: dateKey }}
            is_overnight={selectedService?.is_overnight || false}
          />
        </View>
      );
      currentDate.setDate(currentDate.getDate() + 1);
      zIndexCounter -= 10;
    }

    return (
      <ScrollView style={[styles.individualTimeRangesContainer, { zIndex: 1100 }]}>
        {timeRanges}
      </ScrollView>
    );
  };

  const handleToggleIndividualDays = () => {
    const newShowIndividualDays = !showIndividualDays;
    setShowIndividualDays(newShowIndividualDays);
    
    if (newShowIndividualDays) {
      // Switching to individual days - initialize if needed
      if (Object.keys(individualTimeRanges).length === 0 && dateRange) {
        const { startDate, endDate } = dateRange;
        if (startDate && endDate) {
          const newTimeRanges = {};
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          // Initialize all days with the default time
          const current = new Date(start);
          while (current <= end) {
            const dateKey = current.toISOString().split('T')[0];
            newTimeRanges[dateKey] = { ...times };
            current.setDate(current.getDate() + 1);
          }
          
          setIndividualTimeRanges(newTimeRanges);
          
          // Notify parent with individual day structure
          const timesWithIndividualDays = {
            ...times,
            ...newTimeRanges,
            hasIndividualTimes: true
          };
          onTimeSelect(timesWithIndividualDays);
        }
      } else if (dateRange) {
        // Already have individual time ranges, just notify parent
        const timesWithIndividualDays = {
          ...times,
          ...individualTimeRanges,
          hasIndividualTimes: true
        };
        onTimeSelect(timesWithIndividualDays);
      }
    } else {
      // Switching back to default time range
      // Just send the default times without individual days
      onTimeSelect({
        ...times,
        hasIndividualTimes: false
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {!showIndividualDays && (
          <TimeRangeSelector
            title={`Default Time Range`}
            onTimeSelect={handleOvernightTimeSelect}
            initialTimes={times}
            showOvernightToggle={!selectedService?.is_overnight}
            dateRange={dateRange}
            is_overnight={selectedService?.is_overnight || false}
          />
        )}

        {!selectedService?.is_overnight && (
          <View style={[styles.customizeButtonContainer, { zIndex: 1 }]}>
            <TouchableOpacity 
              style={styles.customizeButton}
              onPress={handleToggleIndividualDays}
            >
              <MaterialIcons name="schedule" size={20} color={theme.colors.mainColors.main} />
              <Text style={[styles.customizeButtonText]}>
                {showIndividualDays ? 'Use Default Time Range' : 'Customize Individual Day Schedules'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showIndividualDays && renderIndividualTimeRanges()}

        {!showIndividualDays && !selectedService?.is_overnight && (
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
  individualTimeRangesContainer: {
    maxHeight: 400,
    position: 'relative',
    zIndex: 3100,
  },
  timeRangeContainer: {
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
});

export default TimeSelectionCard; 