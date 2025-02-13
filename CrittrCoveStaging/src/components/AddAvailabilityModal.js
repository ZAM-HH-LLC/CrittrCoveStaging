import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, Platform, Dimensions, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import UnavailableTimeSlot from './UnavailableTimeSlot';
import { format, parse } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SERVICE_TYPES, ALL_SERVICES } from '../data/mockData';
import AvailabilityBookingCard from './AvailabilityBookingCard';
import { useNavigation } from '@react-navigation/native';
import TimePicker from './TimePicker';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const modalWidth = Platform.OS === 'web' ? width * 0.4 : width * 0.9;

const AddAvailabilityModal = ({ isVisible: propIsVisible, onClose, onSave, selectedDates, currentAvailability, bookings, onRemoveTimeSlot }) => {
  const [isVisible, setIsVisible] = useState(propIsVisible);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [modalWidth, setModalWidth] = useState(getModalWidth());
  const [activeView, setActiveView] = useState('bookings');
  const [editingBooking, setEditingBooking] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    setIsVisible(propIsVisible);
  }, [propIsVisible]);

  function getModalWidth() {
    const { width } = Dimensions.get('window');
    return width < 600 ? width * 0.9 : width * 0.4;
  }

  useEffect(() => {
    const updateWidth = () => {
      setModalWidth(getModalWidth());
    };

    const dimensionsHandler = Dimensions.addEventListener('change', updateWidth);

    return () => {
      dimensionsHandler.remove();
    };
  }, []);

  const isTimeSlotUnavailable = () => {
    if (!startTime || !endTime || isAllDay) return false;
    
    return selectedDates.some(date => {
      const existingTimes = currentAvailability[date]?.unavailableTimes || [];
      return existingTimes.some(time => {
        const [existingStartHour, existingStartMin] = time.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = time.endTime.split(':').map(Number);
        const newStartStr = format(startTime, 'HH:mm');
        const newEndStr = format(endTime, 'HH:mm');
        const [newStartHour, newStartMin] = newStartStr.split(':').map(Number);
        const [newEndHour, newEndMin] = newEndStr.split(':').map(Number);
        
        return newStartHour === existingStartHour && 
               newStartMin === existingStartMin && 
               newEndHour === existingEndHour && 
               newEndMin === existingEndMin;
      });
    });
  };

  const handleMarkUnavailable = () => {
    if (selectedServices.length === 0 || isTimeSlotUnavailable()) return;
    
    const services = selectedServices.includes(ALL_SERVICES) 
      ? SERVICE_TYPES.filter(service => service !== ALL_SERVICES) 
      : selectedServices;

    onSave({
      dates: selectedDates,
      isAllDay,
      startTime: isAllDay ? null : format(startTime, 'HH:mm'),
      endTime: isAllDay ? null : format(endTime, 'HH:mm'),
      isUnavailable: true,
      serviceTypes: services,
      reason: `Unavailable for: ${services.join(', ')}`,
    });
  };

  const handleMarkAvailable = () => {
    if (selectedServices.length === 0 || !isTimeSlotUnavailable()) return;

    const newStartStr = format(startTime, 'HH:mm');
    const newEndStr = format(endTime, 'HH:mm');

    const updatedAvailability = {};
    
    selectedDates.forEach(selectedDate => {
      if (currentAvailability[selectedDate]?.unavailableTimes) {
        const currentTimes = currentAvailability[selectedDate].unavailableTimes;
        const filteredTimes = currentTimes.filter(time => 
          time.startTime !== newStartStr || time.endTime !== newEndStr
        );

        updatedAvailability[selectedDate] = {
          ...currentAvailability[selectedDate],
          unavailableTimes: filteredTimes
        };
      }
    });

    onRemoveTimeSlot(selectedDates[0], { startTime: newStartStr, endTime: newEndStr }, updatedAvailability, selectedDates);
  };

  const handleRemoveTimeSlot = (date, timeSlot) => {
    if (selectedDates.length === 1) {
      onRemoveTimeSlot(date, timeSlot);
      return;
    }

    const updatedAvailability = {};
    
    selectedDates.forEach(selectedDate => {
      if (currentAvailability[selectedDate]?.unavailableTimes) {
        const currentTimes = currentAvailability[selectedDate].unavailableTimes;
        const filteredTimes = currentTimes.filter(time => 
          time.startTime !== timeSlot.startTime || time.endTime !== timeSlot.endTime
        );

        updatedAvailability[selectedDate] = {
          ...currentAvailability[selectedDate],
          unavailableTimes: filteredTimes
        };
      }
    });

    onRemoveTimeSlot(date, timeSlot, updatedAvailability, selectedDates);
  };

  const renderUnavailableTimes = () => {
    if (selectedDates.length === 0) return null;

    const date = selectedDates[0];
    const unavailableTimes = currentAvailability[date]?.unavailableTimes || [];

    if (unavailableTimes.length === 0) return null;

    return (
      <View style={styles.unavailableTimesContainer}>
        <Text style={styles.sectionTitle}>Unavailable Times:</Text>
        <ScrollView>
          {unavailableTimes.map((time, index) => (
            <UnavailableTimeSlot
              key={index}
              startTime={time.startTime}
              endTime={time.endTime}
              reason={time.reason}
              onRemove={() => handleRemoveTimeSlot(date, time)}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

const renderTimePicker = () => (
  <>
    <View style={styles.timePickerContainer}>
      <Text>Start Time:</Text>
      <TimePicker
        value={startTime}
        onChange={setStartTime}
        showPicker={showStartTimePicker}
        setShowPicker={setShowStartTimePicker}
        fullWidth
      />
    </View>
    <View style={styles.timePickerContainer}>
      <Text>End Time:</Text>
      <TimePicker
        value={endTime}
        onChange={setEndTime}
        showPicker={showEndTimePicker}
        setShowPicker={setShowEndTimePicker}
        fullWidth
      />
    </View>
  </>
);

const formatSelectedDates = () => {
  if (!selectedDates || selectedDates.length === 0) return '';
  
  const startDate = selectedDates[0];
  const endDate = selectedDates[selectedDates.length - 1];
  
  if (startDate === endDate) {
    return startDate;
  }
  
  return `${startDate} - ${endDate}`;
};

const handleEditBooking = async (booking) => {
  setEditingBooking(booking);
  // Implement your booking edit logic here
  try {
    const response = await updateBooking({
      ...booking,
      // Add your updated booking data
    });
    
    if (response.success) {
      // Update local state
      // Implement your state update logic
    }
  } catch (error) {
    console.error('Failed to update booking:', error);
  }
};

const renderToggleButtons = () => (
  <View style={styles.toggleContainer}>
    <TouchableOpacity
      style={[
        styles.toggleButton,
        activeView === 'unavailable' && styles.activeToggle
      ]}
      onPress={() => setActiveView('unavailable')}
    >
      <Text style={[
        styles.toggleText,
        activeView === 'unavailable' && styles.activeToggleText
      ]}>
        Unavailable Times
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.toggleButton,
        activeView === 'bookings' && styles.activeToggle
      ]}
      onPress={() => setActiveView('bookings')}
    >
      <Text style={[
        styles.toggleText,
        activeView === 'bookings' && styles.activeToggleText
      ]}>
        Bookings
      </Text>
    </TouchableOpacity>
  </View>
);

const renderBookings = () => {
  const dateBookings = selectedDates.reduce((acc, date) => {
    if (bookings[date]) {
      acc.push(...bookings[date].map(booking => ({
        ...booking,
        date
      })));
    }
    return acc;
  }, []);

  if (dateBookings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons 
          name="calendar-blank" 
          size={48} 
          color={theme.colors.textSecondary} 
        />
        <Text style={styles.emptyStateText}>No bookings for selected dates</Text>
      </View>
    );
  }

  const handleBookingPress = (booking) => {
    onClose();
    
    // Navigate after a short delay
    setTimeout(() => {
      navigation.navigate('BookingDetails', { bookingId: booking.id });
    }, 300);
  };

  return (
    <View style={styles.bookingsContainer}>
      <ScrollView 
        style={styles.bookingsList}
        nestedScrollEnabled={true}
      >
        {dateBookings.map((booking, index) => (
          <AvailabilityBookingCard
            key={index}
            booking={booking}
            onPress={() => handleBookingPress(booking)}
            onEdit={() => handleBookingPress(booking)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { width: modalWidth }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDates.length > 1 ? 'Edit Multiple Days' : 'Edit Availability'}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <MaterialCommunityIcons 
                name="close" 
                size={24} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.selectedDatesText}>
            Selected Dates: {formatSelectedDates()}
          </Text>

          {renderToggleButtons()}
          
          <ScrollView 
            style={styles.contentScrollView}
            nestedScrollEnabled={true}
          >
            {activeView === 'unavailable' ? (
              <View style={styles.unavailableTimesWrapper}>
                {renderUnavailableTimes()}
              </View>
            ) : (
              <View style={styles.bookingsWrapper}>
                {renderBookings()}
              </View>
            )}

            <View style={styles.availabilityControls}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Service Type(s) *</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.customDropdown,
                    selectedServices.length === 0 && styles.inputError
                  ]}
                  onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                >
                  <Text style={{
                    color: selectedServices.length > 0 ? theme.colors.text : theme.colors.placeHolderText
                  }}>
                    {selectedServices.length > 0 
                      ? selectedServices.includes(ALL_SERVICES)
                        ? "All Services"
                        : selectedServices.length > 1
                          ? `${selectedServices.length} services selected`
                          : selectedServices[0]
                      : "Select service type(s)"
                    }
                  </Text>
                  <MaterialCommunityIcons 
                    name={showServiceDropdown ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </TouchableOpacity>
                
                {showServiceDropdown && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView style={styles.dropdownScroll}>
                      {SERVICE_TYPES.map((service) => (
                        <TouchableOpacity
                          key={service}
                          style={styles.dropdownItem}
                          onPress={() => {
                            if (service === ALL_SERVICES) {
                              setSelectedServices(
                                selectedServices.includes(ALL_SERVICES) 
                                  ? [] 
                                  : [ALL_SERVICES]
                              );
                            } else {
                              setSelectedServices(prev => {
                                // Remove "All Services" if it was selected
                                const withoutAll = prev.filter(s => s !== ALL_SERVICES);
                                
                                if (prev.includes(service)) {
                                  return withoutAll.filter(s => s !== service);
                                } else {
                                  return [...withoutAll, service];
                                }
                              });
                            }
                          }}
                        >
                          <View style={styles.dropdownItemContent}>
                            <Text style={[
                              styles.dropdownText,
                              selectedServices.includes(service) && styles.selectedOption
                            ]}>
                              {service}
                            </Text>
                            {selectedServices.includes(service) && (
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

              <View style={styles.switchContainer}>
                <Text>All Day</Text>
                <Switch value={isAllDay} onValueChange={setIsAllDay} />
              </View>

              {!isAllDay && renderTimePicker()}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.availabilityButton,
                    styles.availableButton,
                    (selectedServices.length === 0 || !isTimeSlotUnavailable()) && styles.disabledButton
                  ]}
                  onPress={handleMarkAvailable}
                  disabled={selectedServices.length === 0 || !isTimeSlotUnavailable()}
                >
                  <Text style={styles.availabilityButtonText}>
                    Mark Available
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.availabilityButton,
                    styles.unavailableButton,
                    (selectedServices.length === 0 || isTimeSlotUnavailable()) && styles.disabledButton
                  ]}
                  onPress={handleMarkUnavailable}
                  disabled={selectedServices.length === 0 || isTimeSlotUnavailable()}
                >
                  <Text style={styles.availabilityButtonText}>
                    Mark Unavailable
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17,
    maxHeight: SCREEN_HEIGHT * 0.7,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
    zIndex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  availabilityButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  availableButton: {
    backgroundColor: theme.colors.primary,
  },
  unavailableButton: {
    backgroundColor: theme.colors.danger,
  },
  disabledButton: {
    opacity: 0.5,
  },
  availabilityButtonText: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
    zIndex: 1,
  },
  webTimePicker: {
    padding: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
  },
  unavailableTimesContainer: {
    marginTop: 20,
    maxHeight: 200,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 15,
    zIndex: 2,
  },
  
  inputLabel: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    marginBottom: 5,
    fontWeight: '500',
  },
  
  input: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    backgroundColor: theme.colors.inputBackground,
  },
  
  customDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
  },
  
  dropdownContainer: {
    position: 'absolute',
    top: '95%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    marginTop: 2,
    maxHeight: 160,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  dropdownScroll: {
    maxHeight: 160,
  },
  
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    height: 40,
  },
  
  dropdownText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.medium,
  },
  
  selectedOption: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  
  inputError: {
    borderColor: theme.colors.danger,
  },
  
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderColor: theme.colors.border,
    borderWidth: 1,
    margin: 2,
  },
  activeToggle: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: theme.fontSizes.small,
  },
  activeToggleText: {
    color: theme.colors.whiteText,
    fontWeight: '500',
  },
  bookingsList: {
    maxHeight: 300,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.medium,
    textAlign: 'center',
  },
  contentScrollView: {
    flex: 1,
    width: '100%',
  },
  availabilityControls: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    width: '100%',
  },
  bookingsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  unavailableTimesWrapper: {
    maxHeight: 200,
    marginBottom: 16,
  },
  bookingsWrapper: {
    marginBottom: 16,
  },
  selectedDatesText: {
    marginVertical: 8,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
});

export default AddAvailabilityModal;
