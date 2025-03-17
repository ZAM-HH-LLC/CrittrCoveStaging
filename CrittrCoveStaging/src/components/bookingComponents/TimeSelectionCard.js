import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import TimeRangeSelector from './TimeRangeSelector';

const TimeSelectionCard = ({ 
  onTimeSelect,
  initialTimes = {},
  dateRange = null,
}) => {
  const [showIndividualDays, setShowIndividualDays] = useState(false);

  const handleTimeSelect = (timeData) => {
    if (onTimeSelect) {
      onTimeSelect(timeData);
    }
  };

  const handlePresetSelect = (preset) => {
    let newTimes = {};
    switch (preset) {
      case 'morning':
        newTimes = {
          startTime: { hour: 9, minutes: 0 },
          endTime: { hour: 12, minutes: 0 },
          isOvernightForced: false
        };
        break;
      case 'afternoon':
        newTimes = {
          startTime: { hour: 13, minutes: 0 },
          endTime: { hour: 17, minutes: 0 },
          isOvernightForced: false
        };
        break;
      case 'fullDay':
        newTimes = {
          startTime: { hour: 9, minutes: 0 },
          endTime: { hour: 17, minutes: 0 },
          isOvernightForced: false
        };
        break;
      default:
        return;
    }
    handleTimeSelect(newTimes);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TimeRangeSelector
          title="Default Time Range"
          onTimeSelect={handleTimeSelect}
          initialTimes={initialTimes}
          showOvernightToggle={true}
          dateRange={dateRange}
        />

        <View style={[styles.customizeButtonContainer, { zIndex: 1 }]}>
          <TouchableOpacity 
            style={styles.customizeButton}
            onPress={() => setShowIndividualDays(!showIndividualDays)}
          >
            <MaterialIcons name="schedule" size={20} color={theme.colors.mainColors.main} />
            <Text style={[styles.customizeButtonText]}>
              Customize Individual Day Schedules
            </Text>
          </TouchableOpacity>
        </View>

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
    paddingVertical: 16,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
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
});

export default TimeSelectionCard; 