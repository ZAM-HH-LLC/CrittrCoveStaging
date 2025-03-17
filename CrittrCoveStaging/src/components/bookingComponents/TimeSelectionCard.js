import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import TimeRangeSelector from './TimeRangeSelector';
import { AuthContext } from '../../context/AuthContext';

const TimeSelectionCard = ({ 
  onTimeSelect,
  initialTimes = {},
  dateRange = null,
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  const [showIndividualDays, setShowIndividualDays] = useState(false);
  const [individualTimeRanges, setIndividualTimeRanges] = useState({});

  const handleTimeSelect = (timeData, dateKey = 'default') => {
    if (is_DEBUG) {
      console.log('MBA54321 handleTimeSelect:', { timeData, dateKey });
    }

    if (onTimeSelect) {
      if (showIndividualDays) {
        // Update individual time ranges
        const newTimeRanges = {
          ...individualTimeRanges,
          [dateKey]: timeData
        };
        setIndividualTimeRanges(newTimeRanges);
        
        // Send all time ranges to parent
        onTimeSelect(newTimeRanges);
      } else {
        // Send single time range for default mode
        onTimeSelect(timeData);
      }
    }
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
    handleTimeSelect(newTimes);
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
    let zIndexCounter = 1000; // Start with a high base z-index
    
    while (currentDate <= endDateObj) {
      const dateKey = currentDate.toISOString().split('T')[0];
      timeRanges.push(
        <View key={dateKey} style={[styles.timeRangeContainer, { zIndex: zIndexCounter }]}>
          <TimeRangeSelector
            title={`${formatDate(dateKey)}`}
            onTimeSelect={(timeData) => handleTimeSelect(timeData, dateKey)}
            initialTimes={individualTimeRanges[dateKey] || initialTimes}
            showOvernightToggle={true}
            dateRange={{ startDate: dateKey, endDate: dateKey }}
          />
        </View>
      );
      currentDate.setDate(currentDate.getDate() + 1);
      zIndexCounter -= 10; // Decrease z-index for each subsequent card
    }

    return (
      <ScrollView style={[styles.individualTimeRangesContainer, { zIndex: 1100 }]}>
        {timeRanges}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {!showIndividualDays && (
          <TimeRangeSelector
            title={`Default Time Range`}
            onTimeSelect={handleTimeSelect}
            initialTimes={initialTimes}
            showOvernightToggle={true}
            dateRange={dateRange}
          />
        )}

        <View style={[styles.customizeButtonContainer, { zIndex: 1 }]}>
          <TouchableOpacity 
            style={styles.customizeButton}
            onPress={() => setShowIndividualDays(!showIndividualDays)}
          >
            <MaterialIcons name="schedule" size={20} color={theme.colors.mainColors.main} />
            <Text style={[styles.customizeButtonText]}>
              {showIndividualDays ? 'Use Default Time Range' : 'Customize Individual Day Schedules'}
            </Text>
          </TouchableOpacity>
        </View>

        {showIndividualDays && renderIndividualTimeRanges()}

        <View style={[styles.presetsContainer, { zIndex: 1 }]}>
          <Text style={[styles.presetsTitle]}>Quick Presets</Text>
          <View style={styles.presetButtons}>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => handlePresetSelect('morning')}
            >
              <Text style={[styles.presetButtonText]}>Morning (9 AM - 12 PM)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => handlePresetSelect('afternoon')}
            >
              <Text style={[styles.presetButtonText]}>Afternoon (1 PM - 5 PM)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => handlePresetSelect('fullDay')}
            >
              <Text style={[styles.presetButtonText]}>Full Day (9 AM - 5 PM)</Text>
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
    position: 'relative',
    zIndex: 1,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    zIndex: 1,
  },
  customizeButtonContainer: {
    marginBottom: 24,
    zIndex: 2,
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
    zIndex: 2,
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
  individualTimeRangesContainer: {
    maxHeight: 400,
    position: 'relative',
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
  },
});

export default TimeSelectionCard; 