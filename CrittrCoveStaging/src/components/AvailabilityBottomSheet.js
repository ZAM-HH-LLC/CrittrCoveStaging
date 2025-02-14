import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Switch, Animated } from 'react-native';
import { theme } from '../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';
import TimePicker from './TimePicker';
import { SERVICE_TYPES, ALL_SERVICES } from '../data/mockData';
import { AuthContext } from '../context/AuthContext';

const AvailabilityBottomSheet = ({ 
  selectedDates, 
  currentAvailability,
  onClose,
  onViewUnavailableTimes,
  onSave,
  onMinimize
}) => {
  const { screenWidth } = useContext(AuthContext);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedServices, setSelectedServices] = useState([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const animatedHeight = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the entrance animation when the component mounts
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  }, []);

  const getAvailabilityStatus = () => {
    if (!selectedDates || selectedDates.length === 0) return 'Unknown';

    const date = selectedDates[0];
    const dateAvailability = currentAvailability[date];

    if (!dateAvailability) return 'Available';
    if (!dateAvailability.isAvailable) return 'Unavailable';
    if (dateAvailability.unavailableTimes?.length > 0) return 'Partially Available';
    return 'Available';
  };

  const getStatusColor = () => {
    const status = getAvailabilityStatus();
    switch (status) {
      case 'Available':
        return theme.colors.success;
      case 'Partially Available':
        return theme.colors.warning;
      case 'Unavailable':
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const formatDateRange = () => {
    if (!selectedDates || selectedDates.length === 0) return '';
    
    if (selectedDates.length === 1) {
      return format(parse(selectedDates[0], 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy');
    }

    return `${format(parse(selectedDates[0], 'yyyy-MM-dd', new Date()), 'MMM dd')} - ${format(parse(selectedDates[selectedDates.length - 1], 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}`;
  };

  const validateAndSave = (isAvailable) => {
    if (selectedServices.length === 0) {
      setError('Please select at least one service type');
      return;
    }
    setError(null);
    onSave({ 
      startTime: isAllDay ? '00:00' : format(startTime, 'HH:mm'),
      endTime: isAllDay ? '24:00' : format(endTime, 'HH:mm'),
      services: selectedServices,
      isAvailable,
      isAllDay
    });
  };

  const toggleMinimized = () => {
    const toValue = isMinimized ? 1 : 0;
    
    // Call onMinimize first to start the background fade
    const newMinimizedState = !isMinimized;
    onMinimize?.(newMinimizedState);
    
    // Then start our animations
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false
      }),
      Animated.timing(animatedOpacity, {
        toValue,
        duration: 300,
        useNativeDriver: false
      })
    ]).start(() => {
      setIsMinimized(newMinimizedState);
    });
  };

  const handleClose = () => {
    // Animate the slide down
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      // Call the onClose prop after animation completes
      onClose();
    });
  };

  const maxHeight = isAllDay ? 364 : 445; // Adjust this value based on your content
  const minHeight = 96;

  const containerHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [minHeight, maxHeight]
  });

  const renderHandle = () => {
    if (Platform.OS === 'web') {
      return (
        <TouchableOpacity 
          onPress={toggleMinimized}
          style={styles.handleContainer}
        >
          <MaterialCommunityIcons 
            name={isMinimized ? "chevron-up" : "chevron-down"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        onPress={toggleMinimized}
        style={styles.handleContainer}
      >
        <View style={styles.handle} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.overlay,
      { pointerEvents: isMinimized ? 'box-none' : 'auto' } // Allow clicks through when minimized
    ]}>
      <Animated.View 
        style={[
          styles.container,
          { 
            height: containerHeight,
            transform: [{
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [600, 0]
              })
            }]
          }
        ]}
      >
        {renderHandle()}
        
        <View style={[styles.header, isMinimized && styles.headerMinimized]}>
          {!isMinimized && (
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.dateText}>{formatDateRange()}</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getAvailabilityStatus()}
            </Text>
          </View>
          {!isMinimized && (
            <Animated.View style={{ opacity: animatedOpacity }}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={onViewUnavailableTimes}
              >
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.actionButtonText}>
                  {'Unavailable\nTimes'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <Animated.View 
          style={[
            styles.content,
            { opacity: animatedOpacity,
             }
          ]}
        >
          <View style={styles.serviceSection}>
            <Text style={[styles.label, { textAlign: 'center' }]}>Change Availability for Services</Text>
            <TouchableOpacity
              style={[styles.serviceSelector, error && selectedServices.length <= 0 && styles.serviceSelectorError]}
              onPress={() => setShowServiceDropdown(!showServiceDropdown)}
            >
              <Text style={styles.serviceSelectorText}>
                {selectedServices.length > 0 
                  ? selectedServices.includes(ALL_SERVICES)
                    ? "All Services"
                    : selectedServices.length > 1
                      ? `${selectedServices.length} services selected`
                      : selectedServices[0]
                  : "Select one or more service types"
                }
              </Text>
              <MaterialCommunityIcons 
                name={showServiceDropdown ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
            {error && selectedServices.length <= 0 && !showServiceDropdown && <Text style={styles.errorText}>{error}</Text>}

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

          <View style={styles.timeToggleContainer}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Time Selection</Text>
            <View style={styles.customToggle}>
              <TouchableOpacity 
                style={[
                  styles.toggleButton,
                  isAllDay ? styles.toggleButtonActive : styles.toggleButtonInactive
                ]}
                onPress={() => setIsAllDay(true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  isAllDay && styles.toggleButtonTextActive
                ]}>All Day</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.toggleButton,
                  !isAllDay ? styles.toggleButtonActive : styles.toggleButtonInactive
                ]}
                onPress={() => setIsAllDay(false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !isAllDay && styles.toggleButtonTextActive
                ]}>Custom Hours</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isAllDay && (
            <View style={styles.timeSection}>
              <View style={styles.timeContainer}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Start Time</Text>
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  fullWidth
                />
              </View>
              <View style={styles.timeContainer}>
                <Text style={[styles.label, { marginBottom: 0 }]}>End Time</Text>
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  fullWidth
                />
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.availableButton]}
              onPress={() => validateAndSave(true)}
            >
              <Text style={styles.buttonText}>Mark Available</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.unavailableButton]}
              onPress={() => validateAndSave(false)}
            >
              <Text style={styles.buttonText}>Mark Unavailable</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    width: '100%',
    pointerEvents: 'box-none', // This allows clicks to pass through to elements behind
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleContainer: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 8,
    marginTop: 4, // Add a small margin to separate from the chevron
  },
  headerMinimized: {
    marginBottom: 8,
    paddingBottom: 12, // Add padding at the bottom when minimized
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  closeButton: {
    width: 60,
    height: 40,
    // marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  statusText: {
    fontSize: theme.fontSizes.medium,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  actionButton: {
    width: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.primary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  content: {
    gap: 12,
  },
  timeToggleContainer: {
    // marginBottom: 8,
  },
  customToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 4,
    // marginTop: 8,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleButtonInactive: {
    backgroundColor: 'transparent',
  },
  toggleButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  toggleButtonTextActive: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeSection: {
    flexDirection: 'row',
    gap: 16,
  },
  timeContainer: {
    flex: 1,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceSection: {
    position: 'relative',
    zIndex: 1,
  },
  serviceSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.background,
  },
  serviceSelectorText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    // marginTop: 12,
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
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceSelectorError: {
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.small,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default AvailabilityBottomSheet; 