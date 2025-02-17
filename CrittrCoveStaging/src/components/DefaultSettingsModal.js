import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView, Platform, Dimensions, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { DatetimePicker } from './ui/datetime-picker';

const { width } = Dimensions.get('window');
const modalWidth = Platform.OS === 'web' ? width * 0.4 : width * 0.9;

const ALL_DAYS = "All Days";
const DAYS_OF_WEEK = [
  ALL_DAYS,
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DefaultSettingsModal = ({ isVisible, onClose, onSave, defaultSettings }) => {
  const { screenWidth } = useContext(AuthContext);
  const [selectedDays, setSelectedDays] = useState([]);
  const [settings, setSettings] = useState(defaultSettings || {
    Monday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Tuesday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Wednesday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Thursday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Friday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Saturday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Sunday: { isAllDay: false, startTime: '09:00', endTime: '17:00', endDate: null },
  });

  const [showTimePicker, setShowTimePicker] = useState({ visible: false, type: '', value: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCurrentlyUnavailable, setIsCurrentlyUnavailable] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [validationError, setValidationError] = useState("Please select day(s) first");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(600)).current;

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Call onClose after animations complete
      onClose();
    });
  };

  useEffect(() => {
    if (isVisible) {
      // Fade in the background overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Slide up the modal content
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownButton = document.getElementById('dropdown-button');
      const dropdownContainer = document.getElementById('dropdown-container');
      
      // If click is not on the button and not inside the dropdown, close it
      if (showDayDropdown && 
          dropdownContainer && 
          !dropdownContainer.contains(event.target) &&
          !dropdownButton.contains(event.target)) {
        setShowDayDropdown(false);
      }
    };

    if (Platform.OS === 'web') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDayDropdown]);

  const handleSave = () => {
    onSave({
      ...settings,
      [selectedDays[0]]: {
        ...settings[selectedDays[0]],
        isUnavailable: !isCurrentlyUnavailable
      }
    });
  };

  const updateDaySettings = (day, newSettings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [day]: { ...prevSettings[day], ...newSettings }
    }));
  };

  const handleDaySelection = (day) => {
    setSelectedDays(current => {
      if (day === ALL_DAYS) {
        return current.includes(ALL_DAYS) 
          ? [] 
          : DAYS_OF_WEEK.filter(d => d !== ALL_DAYS);
      }
      
      const withoutAll = current.filter(d => d !== ALL_DAYS);
      if (withoutAll.includes(day)) {
        return withoutAll.filter(d => d !== day);
      } else {
        if (withoutAll.length + 1 === DAYS_OF_WEEK.length - 1) {
          return DAYS_OF_WEEK.filter(d => d !== ALL_DAYS);
        } else {
          return [...withoutAll, day];
        }
      }
    });
  };

  const handleAvailabilityChange = (makeAvailable) => {
    console.log("Selected days:", selectedDays);
    if (selectedDays.length === 0) return;

    const daysToUpdate = selectedDays.includes(ALL_DAYS) 
      ? DAYS_OF_WEEK.filter(day => day !== ALL_DAYS)
      : selectedDays;
    
    console.log("Days to update:", daysToUpdate);
    console.log("Current settings:", settings);
    console.log("Making available:", makeAvailable);

    const newSettings = { ...settings };
    daysToUpdate.forEach(day => {
      console.log(`Updating ${day}`);
      newSettings[day] = {
        ...settings[day],
        isUnavailable: !makeAvailable,
        startTime: settings[selectedDays[0]].startTime,
        endTime: settings[selectedDays[0]].endTime,
        isAllDay: settings[selectedDays[0]].isAllDay,
        endDate: settings[selectedDays[0]].endDate
      };
    });
    
    console.log("New settings:", newSettings);
    setSettings(newSettings);
    onSave(newSettings);
    setIsCurrentlyUnavailable(!makeAvailable);
  };

  // Update validation error whenever selected days changes
  useEffect(() => {
    if (selectedDays.length === 0) {
      setValidationError("Please select day(s) first");
    } else {
      setValidationError("");
    }
  }, [selectedDays]);

  const renderTimePicker = (type, value, onChange) => {
      return (
      <TimePicker
        value={new Date(`2000-01-01T${value}`)}
        onChange={(selectedTime) => {
          const timeString = selectedTime.toTimeString().slice(0, 5);
          onChange(timeString);
        }}
        fullWidth={false}
        disabled={selectedDays.length === 0}
        error={validationError}
      />
    );
  };

  const renderEndDatePicker = () => {
    // Guard against no selected days
    if (!selectedDays || selectedDays.length === 0) {
      return (
        <View style={styles.datePickerWrapper}>
          <View 
            style={[styles.datePickerContainer]} 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DatetimePicker
              format={[["months", "days", "years"]]}
              disabled={true}
              isInModal={true}
              error={true}
            />
          </View>
          <Text style={styles.validationErrorText}>{validationError}</Text>
        </View>
      );
    }

    const daySettings = settings[selectedDays[0]];
    
    return (
      <View style={styles.datePickerWrapper}>
        <View 
          style={styles.datePickerContainer}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DatetimePicker
            format={[["months", "days", "years"]]}
            value={daySettings.endDate ? new Date(daySettings.endDate) : null}
            onChange={(date) => updateDaySettings(selectedDays[0], { endDate: date.toISOString().split('T')[0] })}
            disabled={false}
            isInModal={true}
            error={false}
          />
        </View>
      </View>
    );
  };

  const renderDaySettings = () => {
    const daySettings = settings[selectedDays[0]] || {
      isAllDay: false,
      startTime: '09:00',
      endTime: '17:00',
      endDate: null
    };
    
    return (
      <View style={styles.daySettingsContainer}>
        <View style={styles.settingRow}>
          <Text style={selectedDays.length === 0 ? styles.disabledText : styles.enabledText}>All Day:</Text>
          <Switch
            value={daySettings.isAllDay}
            onValueChange={(value) => {
              if (selectedDays.length === 0) return;
              const newSettings = { ...settings };
              selectedDays.forEach(day => {
                newSettings[day] = {
                  ...newSettings[day],
                  isAllDay: value
                };
              });
              setSettings(newSettings);
            }}
            disabled={selectedDays.length === 0}
          />
        </View>
        {!daySettings.isAllDay && (
          <>
            <View style={styles.settingRow}>
              <Text style={selectedDays.length === 0 ? styles.disabledText : styles.enabledText}>Start Time:</Text>
              <View style={styles.timePickerContainer}>
                {renderTimePicker(
                  'startTime',
                  daySettings.startTime,
                  (newTime) => {
                    if (selectedDays.length === 0) return;
                    const newSettings = { ...settings };
                    selectedDays.forEach(day => {
                      newSettings[day] = {
                        ...newSettings[day],
                        startTime: newTime
                      };
                    });
                    setSettings(newSettings);
                  }
                )}
              </View>
            </View>
            <View style={styles.settingRow}>
              <Text style={selectedDays.length === 0 ? styles.disabledText : styles.enabledText}>End Time:</Text>
              <View style={styles.timePickerContainer}>
                {renderTimePicker(
                  'endTime',
                  daySettings.endTime,
                  (newTime) => {
                    if (selectedDays.length === 0) return;
                    const newSettings = { ...settings };
                    selectedDays.forEach(day => {
                      newSettings[day] = {
                        ...newSettings[day],
                        endTime: newTime
                      };
                    });
                    setSettings(newSettings);
                  }
                )}
              </View>
            </View>
          </>
        )}
        <View style={styles.settingRow}>
          <Text style={selectedDays.length === 0 ? styles.disabledText : styles.enabledText}>End Date:</Text>
          <View pointerEvents={selectedDays.length === 0 ? 'none' : 'auto'}>
            {renderEndDatePicker()}
          </View>
        </View>
      </View>
    );
  };

  const checkCurrentAvailability = (days, settings) => {
    if (!days || days.length === 0) return false;
    
    return days.some(day => settings[day]?.isUnavailable);
  };

  useEffect(() => {
    if (selectedDays.length > 0) {
      const isUnavailable = checkCurrentAvailability(selectedDays, settings);
      setIsCurrentlyUnavailable(isUnavailable);
    } else {
      setIsCurrentlyUnavailable(false);
    }
  }, [selectedDays, settings]);

  const renderDaySelector = () => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>Day(s) *</Text>
      <TouchableOpacity
        id="dropdown-button"
        style={[
          styles.input,
          styles.customDropdown,
          selectedDays.length === 0 && styles.inputError
        ]}
        onPress={() => setShowDayDropdown(!showDayDropdown)}
      >
        <Text style={{
          color: selectedDays.length > 0 ? theme.colors.text : theme.colors.placeHolderText
        }}>
          {selectedDays.length === 0 
            ? 'Select Days' 
            : selectedDays.includes(ALL_DAYS)
              ? 'All Days'
              : selectedDays.length > 2
                ? `${selectedDays.length} Days Selected`
                : selectedDays.join(', ')}
        </Text>
        <MaterialCommunityIcons 
          name={showDayDropdown ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={theme.colors.text} 
        />
      </TouchableOpacity>
      
      {showDayDropdown && (
        <View 
          id="dropdown-container"
          style={styles.dropdownContainer}
        >
          <ScrollView style={styles.dropdownScroll}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day}
                style={styles.dropdownItem}
                onPress={() => handleDaySelection(day)}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={[
                    styles.dropdownText,
                    selectedDays.includes(day) && styles.selectedOption
                  ]}>
                    {day}
                  </Text>
                  {selectedDays.includes(day) && (
                    <MaterialCommunityIcons 
                      name="check" 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View style={[
        styles.modalContainer,
        {
          opacity: fadeAnim,
        }
      ]}>
        <Animated.View style={[
          styles.modalContent,
          {
            width: screenWidth < 600 ? '90%' : 600,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Default Settings</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          {renderDaySelector()}
          {renderDaySettings()}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.availableButton]}
              onPress={() => handleAvailabilityChange(true)}
              disabled={selectedDays.length === 0}
            >
              <Text style={styles.buttonText}>Mark Available</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.unavailableButton]}
              onPress={() => handleAvailabilityChange(false)}
              disabled={selectedDays.length === 0}
            >
              <Text style={styles.buttonText}>Mark Unavailable</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    padding: 22,
    borderRadius: 17,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    marginBottom: 15,
    fontFamily: theme.fonts.header.fontFamily,
  },
  settingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    fontFamily: theme.fonts.header.fontFamily,
  },
  dayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  availableButton: {
    backgroundColor: theme.colors.primary,
  },
  unavailableButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedTabText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  daySettingsContainer: {
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  webTimePicker: {
    padding: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
  },
  webDatePicker: {
    padding: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 15,
    zIndex: 2,
  },
  inputLabel: {
    marginBottom: 5,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    padding: 10,
    backgroundColor: theme.colors.surface,
  },
  customDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedOption: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  enabledText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timePickerContainer: {
    flex: 1,
    maxWidth: 150,
  },
  datePickerContainer: {
    flex: 1,
    maxWidth: 200,
  },
  datePickerWrapper: {
    width: '100%',
  },
  validationErrorText: {
    color: theme.colors.danger,
    fontSize: theme.fontSizes.small,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default DefaultSettingsModal;
