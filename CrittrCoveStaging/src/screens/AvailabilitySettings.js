import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import AddAvailabilityModal from '../components/AddAvailabilityModal';
import DefaultSettingsModal from '../components/DefaultSettingsModal';
import { format, parse } from 'date-fns';
import { SERVICE_TYPES, fetchAvailabilityData, ALL_SERVICES } from '../data/mockData';
import AvailabilityBottomSheet from '../components/AvailabilityBottomSheet';
import UnavailableTimesModal from '../components/UnavailableTimesModal';
import { useNavigation } from '@react-navigation/native';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AvailabilitySettings = () => {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDates, setSelectedDates] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [defaultAvailability, setDefaultAvailability] = useState('available');
  const [currentAvailability, setCurrentAvailability] = useState({});
  const [bookings, setBookings] = useState({});
  const [defaultSettings, setDefaultSettings] = useState({
    Monday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Tuesday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Wednesday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Thursday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Friday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Saturday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
    Sunday: { isAllDay: false, isUnavailable: false, startTime: '09:00', endTime: '17:00', endDate: null },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showUnavailableTimesModal, setShowUnavailableTimesModal] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const loadAvailabilityData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAvailabilityData();
        updateMarkedDates(data.availableDates, data.unavailableDates, data.bookings);
        
        const combinedAvailability = {};
        Object.keys(data.availableDates).forEach(date => {
          combinedAvailability[date] = { 
            isAvailable: true,
            unavailableTimes: [] // Initialize empty array for partially unavailable times
          };
        });
        Object.keys(data.unavailableDates).forEach(date => {
          combinedAvailability[date] = { 
            isAvailable: false,
            unavailableTimes: [{
              startTime: data.unavailableDates[date].startTime,
              endTime: data.unavailableDates[date].endTime,
              reason: ' Personal Time'
            }]
          };
        });
        Object.keys(data.bookings).forEach(date => {
          if (!combinedAvailability[date]) {
            combinedAvailability[date] = { 
              isAvailable: true,
              unavailableTimes: []
            };
          }
          combinedAvailability[date].unavailableTimes = [
            ...combinedAvailability[date].unavailableTimes,
            ...data.bookings[date].map(booking => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
              reason: ` Booked with ${booking.client_name}`,
              clientId: booking.clientId // Assuming each booking has a clientId
            }))
          ];
        });
        setCurrentAvailability(combinedAvailability);
        setBookings(data.bookings);
      } catch (err) {
        setError('Failed to load availability data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailabilityData();
  }, []);

  const updateMarkedDates = (availableDates, unavailableDates, bookings) => {
    const newMarkedDates = {};

    // Helper function to check if all services are selected for a time slot
    const hasAllServices = (reason) => {
      if (!reason) return false;
      const services = reason.replace('Unavailable for: ', '').split(', ');
      return services.length === (SERVICE_TYPES.length - 1);
    };

    Object.entries(unavailableDates).forEach(([date, time]) => {
      const isFullDay = time.startTime === '00:00' && time.endTime === '24:00';
      const allServicesSelected = hasAllServices(time.reason);
      
      newMarkedDates[date] = {
        customStyles: {
          container: { 
            backgroundColor: isFullDay && allServicesSelected ? 'lightgrey' : theme.colors.calendarColor,
            width: 35,
            height: 35,
            borderRadius: 17.5,
            alignItems: 'center',
            justifyContent: 'center'
          },
          text: { color: 'white' }
        }
      };
    });

    Object.entries(availableDates).forEach(([date, time]) => {
      if (!newMarkedDates[date]) {
        newMarkedDates[date] = {
          customStyles: {
            container: { 
              backgroundColor: 'white',
              width: 35,
              height: 35,
              borderRadius: 17.5,
              alignItems: 'center',
              justifyContent: 'center'
            },
            text: { color: 'black' }
          }
        };
      }
    });

    Object.entries(bookings).forEach(([date, bookingList]) => {
      const isFullDay = bookingList.some(booking => 
        booking.startTime === '00:00' && booking.endTime === '24:00'
      );
      newMarkedDates[date] = { 
        marked: true,
        dotColor: theme.colors.primary,
        customStyles: {
          container: { 
            backgroundColor: isFullDay ? theme.colors.primary : theme.colors.calendarColorYellowBrown,
            width: 35,
            height: 35,
            borderRadius: 17.5,
            alignItems: 'center',
            justifyContent: 'center'
          },
          text: { color: 'white' }
        }
      };
    });

    setMarkedDates(newMarkedDates);
  };

  const onDayPress = (day) => {
    const { dateString } = day;
    const selectedDate = new Date(dateString);
    selectedDate.setDate(selectedDate.getDate() + 1); // Adjust for timezone offset
    selectedDate.setHours(0, 0, 0, 0);
  

    if (selectedDates.length === 0) {
      setSelectedDates([dateString]);
      setShowBottomSheet(true);
    } else if (selectedDates.length >= 1) {
      const firstDate = new Date(selectedDates[0]);
      firstDate.setDate(firstDate.getDate() + 1); // Adjust for timezone offset
      firstDate.setHours(0, 0, 0, 0);    

      if (selectedDate.getTime() === firstDate.getTime()) {
        return;
      }

      if (selectedDate < firstDate) {
        setSelectedDates([dateString]);
        setShowBottomSheet(true);
        return;
      }

      const range = [];
      const currentDate = new Date(firstDate);
      const endDate = new Date(selectedDate);

      while (currentDate <= endDate) {
        range.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    
      setSelectedDates(range);
    }
  };

  const handleAddAvailability = (availabilityData) => {
    const newMarkedDates = { ...markedDates };
    const newCurrentAvailability = { ...currentAvailability };

    availabilityData.dates.forEach(date => {
      const allServicesSelected = availabilityData.serviceTypes.includes(ALL_SERVICES) || 
                                 availabilityData.serviceTypes.length === SERVICE_TYPES.length - 1;

      if (!availabilityData.isAvailable) {
        newCurrentAvailability[date] = {
          isAvailable: false,
          unavailableTimes: [{
            startTime: availabilityData.startTime,
            endTime: availabilityData.endTime,
            reason: availabilityData.reason
          }]
        };

        newMarkedDates[date] = {
          customStyles: {
            container: {
              backgroundColor: availabilityData.isAllDay && allServicesSelected ? 'lightgrey' : theme.colors.calendarColor,
              width: 35,
              height: 35,
              borderRadius: 17.5,
              alignItems: 'center',
              justifyContent: 'center'
            },
            text: { color: 'white' }
          }
        };
      } else {
        newCurrentAvailability[date] = {
          isAvailable: true,
          unavailableTimes: []
        };
        newMarkedDates[date] = {
          customStyles: {
            container: { 
              backgroundColor: 'white',
              width: 35,
              height: 35,
              borderRadius: 17.5,
              alignItems: 'center',
              justifyContent: 'center'
            },
            text: { color: 'black' }
          }
        };
      }
    });

    setMarkedDates(newMarkedDates);
    setCurrentAvailability(newCurrentAvailability);
    setIsAddModalVisible(false);
    setSelectedDates([]);
  };

  const applyDefaultSettingsToCalendar = (settings) => {
    const newMarkedDates = { ...markedDates };
    const newCurrentAvailability = { ...currentAvailability };
    
    const today = new Date();
    const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

    const daysMapping = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };

    Object.entries(settings).forEach(([day, daySettings]) => {
      let currentDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const targetDayNumber = daysMapping[day];
      
      while (currentDate <= (daySettings.endDate ? new Date(daySettings.endDate) : oneYearFromNow)) {
        const currentDayNumber = currentDate.getUTCDay();
        const dateString = currentDate.toISOString().split('T')[0];
        
        if (currentDayNumber === targetDayNumber) {
          if (daySettings.isUnavailable) {
            if (daySettings.isAllDay) {
              newMarkedDates[dateString] = {
                customStyles: {
                  container: { backgroundColor: 'lightgrey' },
                  text: { color: 'white' }
                }
              };
              newCurrentAvailability[dateString] = {
                isAvailable: false,
                unavailableTimes: [{ startTime: '00:00', endTime: '24:00', reason: 'Default Setting' }]
              };
            } else {
              newMarkedDates[dateString] = {
                customStyles: {
                  container: { backgroundColor: theme.colors.calendarColor },
                  text: { color: 'white' }
                }
              };
              newCurrentAvailability[dateString] = {
                isAvailable: true,
                unavailableTimes: [{
                  startTime: daySettings.startTime,
                  endTime: daySettings.endTime,
                  reason: 'Default Setting'
                }]
              };
            }
          } else {
            // Reset to available
            delete newMarkedDates[dateString];
            delete newCurrentAvailability[dateString];
          }
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    });

    setMarkedDates(newMarkedDates);
    setCurrentAvailability(newCurrentAvailability);
  };

  //TODO: implement this in future for making clients on bookings clickable
  // const handleClientPress = (clientId) => {
  //   // Navigate to the client history page
  //   // You'll need to implement this navigation logic
  //   console.log(`Navigating to client history for client ID: ${clientId}`);
  // };

  const IconComponent = Platform.OS === 'web' ? MaterialCommunityIcons : Icon;

  const renderArrow = (direction) => {
    let iconName;
    if (Platform.OS === 'web') {
      iconName = direction === 'left' ? 'chevron-left' : 'chevron-right';
    } else {
      iconName = direction === 'left' ? 'chevron-back' : 'chevron-forward';
    }
    return (
      <IconComponent 
        name={iconName} 
        size={24} 
        color={theme.colors.primary}
      />
    );
  };

  const handleDefaultSettingsSave = (newSettings) => {
    console.log("Before updating defaultSettings:", defaultSettings);
    console.log("New settings to be applied:", newSettings);
    setDefaultSettings(newSettings);
    
    // Add a setTimeout to check the state after update
    setTimeout(() => {
      console.log("After updating defaultSettings:", defaultSettings);
    }, 0);
    
    // Call applyDefaultSettingsToCalendar to update the calendar view
    applyDefaultSettingsToCalendar(newSettings);
    setIsSettingsModalVisible(false);
  };

  const handleSaveAvailability = (data) => {
    const { startTime, endTime, services, isAvailable } = data;
    const isAllDay = startTime === '00:00' && endTime === '24:00';
    handleAddAvailability({
      dates: selectedDates,
      isAllDay,
      startTime,
      endTime,
      isUnavailable: !isAvailable,
      serviceTypes: services,
      reason: `Unavailable for: ${services.join(', ')}`,
    });
    setShowBottomSheet(false);
    setSelectedDates([]);
  };

  // TODO: make this actually remove the timeslot on the backend
  const handleRemoveTimeSlot = (date, timeSlot, updatedAvailability, selectedDates) => {
    if (updatedAvailability && selectedDates) {
      // Handle multiple dates
      setCurrentAvailability(prev => ({
        ...prev,
        ...updatedAvailability
      }));

      // Update marked dates for multiple dates
      const newMarkedDates = { ...markedDates };
      selectedDates.forEach(date => {
        if (updatedAvailability[date]?.unavailableTimes.length === 0) {
          newMarkedDates[date] = {
            customStyles: {
              container: { backgroundColor: 'white' },
              text: { color: 'black' }
            }
          };
        }
      });
      setMarkedDates(newMarkedDates);
    } else {
      // Handle single date (existing functionality)
      setCurrentAvailability(prev => {
        const currentDateAvailability = prev[date];
        if (!currentDateAvailability) return prev;

        const filteredTimes = currentDateAvailability.unavailableTimes.filter(
          time => !(time.startTime === timeSlot.startTime && time.endTime === timeSlot.endTime)
        );

        // Update marked dates for single date
        const newMarkedDates = { ...markedDates };
        if (filteredTimes.length === 0) {
          newMarkedDates[date] = {
            customStyles: {
              container: { backgroundColor: 'white' },
              text: { color: 'black' }
            }
          };
          setMarkedDates(newMarkedDates);
        }

        return {
          ...prev,
          [date]: {
            ...currentDateAvailability,
            unavailableTimes: filteredTimes
          }
        };
      });
    }
  };

  const handleViewBookings = () => {
    if (selectedDates.length > 0) {
      navigation.navigate('MyBookings', {
        selectedDates,
        initialTab: 'Upcoming'
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading availability...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              loadAvailabilityData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.centeredContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Availability</Text>
              <TouchableOpacity 
                style={styles.defaultSettingsButton} 
                onPress={() => setIsSettingsModalVisible(true)}
              >
                <Text style={styles.defaultSettingsText}>Default Settings</Text>
                <IconComponent 
                  name={Platform.OS === 'web' ? 'cog' : 'settings-outline'} 
                  size={24} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>

            {/* TODO: make the calendar look more user friendly */}
            <Calendar
              markedDates={{
                ...markedDates,
                ...selectedDates.reduce((acc, date) => ({
                  ...acc,
                  [date]: {
                    ...markedDates[date],
                    selected: true,
                    customStyles: {
                      container: {
                        backgroundColor: theme.colors.primary,
                        width: selectedDates.length === 1 ? 35 : '100%',
                        height: 35,
                        borderRadius: selectedDates.length === 1 ? 17.5 : 0,
                        ...(selectedDates.length > 1 && {
                          borderRadius: 0,
                          ...(date === selectedDates[0] && {
                            borderTopLeftRadius: 17.5,
                            borderBottomLeftRadius: 17.5,
                          }),
                          ...(date === selectedDates[selectedDates.length - 1] && {
                            borderTopRightRadius: 17.5,
                            borderBottomRightRadius: 17.5,
                          }),
                        }),
                      },
                      text: { 
                        color: 'white',
                        fontWeight: 'bold',
                      }
                    }
                  }
                }), {})
              }}
              markingType={'custom'}
              theme={{
                'stylesheet.calendar.main': {
                  week: {
                    marginVertical: 0,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                  },
                  dayContainer: {
                    flex: 1,
                    alignItems: 'center',
                    padding: 0,
                    margin: 0,
                  }
                },
                'stylesheet.calendar.header': {
                  header: {
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingBottom: 20,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }
                }
              }}
              style={{
                paddingBottom: 20,
                paddingLeft: 10,
                paddingRight: 10
              }}
              onDayPress={onDayPress}
              renderArrow={renderArrow}
            />

            {/* Color Code Key */}
            <View style={styles.colorKeyContainer}>
              <Text style={styles.colorKeyTitle}>Color Code Key:</Text>
              <View style={styles.colorKeyItem}>
                <View style={[styles.colorBox, { backgroundColor: 'lightgrey' }]} />
                <Text style={styles.colorKeyText}>Unavailable All Day</Text>
              </View>
              <View style={styles.colorKeyItem}>
                <View style={[styles.colorBox, { backgroundColor: theme.colors.calendarColor }]} />
                <Text style={styles.colorKeyText}>Partially Unavailable</Text>
              </View>
              <View style={styles.colorKeyItem}>
                <View style={[styles.colorBox, { backgroundColor: theme.colors.calendarColorYellowBrown }]} />
                <Text style={styles.colorKeyText}>Booked Dates</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {showBottomSheet && (
        <View style={styles.bottomSheetOverlay}>
          <AvailabilityBottomSheet
            selectedDates={selectedDates}
            currentAvailability={currentAvailability}
            onClose={() => {
              setShowBottomSheet(false);
              setSelectedDates([]);
            }}
            onViewUnavailableTimes={() => {
              setShowUnavailableTimesModal(true);
            }}
            onSave={handleSaveAvailability}
            onViewBookings={handleViewBookings}
          />
        </View>
      )}

      <UnavailableTimesModal
        visible={showUnavailableTimesModal}
        onClose={() => setShowUnavailableTimesModal(false)}
        selectedDates={selectedDates}
        currentAvailability={currentAvailability}
        onRemoveTimeSlot={handleRemoveTimeSlot}
        bookings={bookings}
      />

      <DefaultSettingsModal
        isVisible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        onSave={handleDefaultSettingsSave}
        defaultSettings={defaultSettings}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomSheetOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  centeredContainer: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  defaultSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  defaultSettingsText: {
    marginRight: 8,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  colorKeyContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    elevation: 2,
  },
  colorKeyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: theme.fonts.header.fontFamily,
  },
  colorKeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    marginRight: 10,
  },
  colorKeyText: {
    fontSize: 14,
    color: 'black',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default AvailabilitySettings;
