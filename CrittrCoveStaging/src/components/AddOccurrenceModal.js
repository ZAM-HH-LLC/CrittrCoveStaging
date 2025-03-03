import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, Picker, ActivityIndicator, Platform, Animated, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import DateTimePicker from './DateTimePicker';
import { AuthContext } from '../context/AuthContext'
import { format, parse } from 'date-fns';
import { TIME_OPTIONS } from '../data/mockData';
import { validateDateTimeRange } from '../utils/dateTimeValidation';
import { Button } from 'react-native-paper';
import ConfirmationModal from './ConfirmationModal';
import { getStorage } from '../context/AuthContext';

const ANIMAL_COUNT_OPTIONS = ['1', '2', '3', '4', '5'];

const WebScrollStyles = `
  .modal-scroll-container {
    max-height: 60vh;
    overflow-y: scroll !important;
    padding-right: 16px;
    display: block;
    position: relative;
    scrollbar-width: auto;
    scrollbar-color: rgba(0, 0, 0, 0.5) rgba(0, 0, 0, 0.1);
  }

  .modal-scroll-container::-webkit-scrollbar {
    width: 10px;
    background-color: #F5F5F5;
    display: block;
  }

  .modal-scroll-container::-webkit-scrollbar-track {
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.1);
    border: 1px solid #ccc;
  }

  .modal-scroll-container::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #aaa;
  }

  .modal-scroll-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`;

const ScrollableContent = ({ children }) => {
  if (Platform.OS === 'web') {
    return (
      <>
        <style>{WebScrollStyles}</style>
        <div className="modal-scroll-container">
          {children}
        </div>
      </>
    );
  }
  
  return (
    <ScrollView showsVerticalScrollIndicator={true} persistentScrollbar={true}>
      {children}
    </ScrollView>
  );
};

const AddOccurrenceModal = ({ 
  visible, 
  onClose, 
  onAdd, 
  defaultRates, 
  hideRates = false,
  initialOccurrence = null,
  isEditing = false,
  modalTitle = 'Add New Occurrence',
  isFromRequestBooking = false,
  booking
}) => {
  const { is_DEBUG, screenWidth, timeSettings } = useContext(AuthContext);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isAnyPickerActive, setIsAnyPickerActive] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const [validationError, setValidationError] = useState(null);

  // Clear validation error when modal becomes visible
  useEffect(() => {
    if (visible) {
      setValidationError(null);
    }
  }, [visible]);

  const handlePickerStateChange = (isActive) => {
    setIsAnyPickerActive(isActive);
    if (is_DEBUG) {
      console.log('MBA5678 Picker state changed:', {
        isActive,
        isFromRequestBooking,
        currentModalHeight: isActive && isFromRequestBooking ? '65vh' : '80%'
      });
    }

    // Animate to new height
    Animated.timing(heightAnim, {
      toValue: isActive && isFromRequestBooking ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA5678 Modal state:', {
        isFromRequestBooking,
        isAnyPickerActive,
        visible
      });
    }
  }, [isFromRequestBooking, isAnyPickerActive, visible]);

  const parseInitialDates = (initialOccurrence) => {
    if (is_DEBUG) {
      console.log('MBA1234 Parsing initial occurrence:', initialOccurrence);
      console.log('MBA1234 Time settings:', timeSettings);
    }

    if (!initialOccurrence) {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      return {
        startDateTime: now,
        endDateTime: oneHourLater,
        isMilitary: timeSettings.use_military_time
      };
    }

    try {
      const { startDate, startTime, endDate, endTime } = initialOccurrence;
      
      // Use the user's time format preference from settings 
      const isMilitary = timeSettings.use_military_time;
      
      if (is_DEBUG) {
        console.log('MBA1234 Time format detection:', {
          startTime,
          endTime,
          isMilitary,
          timeSettings
        });
      }

      // Parse the date and time strings based on format
      let startDateTime, endDateTime;
      
      if (isMilitary) {
        startDateTime = parse(
          `${startDate} ${startTime}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        endDateTime = parse(
          `${endDate} ${endTime}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
      } else {
        startDateTime = parse(
          `${startDate} ${startTime}`,
          'yyyy-MM-dd hh:mm aa',
          new Date()
        );
        endDateTime = parse(
          `${endDate} ${endTime}`,
          'yyyy-MM-dd hh:mm aa',
          new Date()
        );
      }

      if (is_DEBUG) {
        console.log('MBA1234 Parsed dates:', {
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          isMilitary
        });
      }

      return {
        startDateTime,
        endDateTime,
        isMilitary
      };
    } catch (error) {
      console.error('MBA1234 Error parsing dates:', error);
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      return {
        startDateTime: now,
        endDateTime: oneHourLater,
        isMilitary: timeSettings.use_military_time
      };
    }
  };

  const initialDates = parseInitialDates(initialOccurrence);
  
  if (is_DEBUG) {
    console.log('MBA565656 AddOccurrenceModal initializing with:', {
      defaultRates,
      initialOccurrence,
      initialDates
    });
  }

  const [occurrence, setOccurrence] = useState(() => {
    const initialState = {
      startDateTime: initialDates.startDateTime,
      endDateTime: initialDates.endDateTime,
      isMilitary: timeSettings.use_military_time,
      rates: {
        baseRate: '0',
        additionalAnimalRate: '0',
        appliesAfterAnimals: '1',
        holidayRate: '0',
        unit_of_time: 'Per Visit',
        additionalRates: []
      }
    };

    // If we have an initial occurrence, use its rates
    if (initialOccurrence?.rates) {
      initialState.rates = initialOccurrence.rates;
    }
    // Otherwise if we have default rates, use those
    else if (defaultRates) {
      initialState.rates = {
        baseRate: defaultRates.base_rate?.toString() || '0',
        additionalAnimalRate: defaultRates.additional_animal_rate?.toString() || '0',
        appliesAfterAnimals: defaultRates.applies_after?.toString() || '1',
        holidayRate: defaultRates.holiday_rate?.toString() || '0',
        unit_of_time: defaultRates.unit_of_time || 'Per Visit',
        additionalRates: defaultRates.additional_rates?.map(rate => ({
          name: rate.title,
          description: rate.description || '',
          amount: rate.amount
        })) || []
      };
    }

    if (is_DEBUG) {
      console.log('MBA565656 Initial state calculated:', initialState);
    }

    return initialState;
  });

  // Add effect to update rates when defaultRates changes
  useEffect(() => {
    if (!initialOccurrence && defaultRates) {
      if (is_DEBUG) {
        console.log('MBA565656 Updating rates from defaultRates:', {
          defaultRates,
          currentRates: occurrence.rates
        });
      }

      const newRates = {
        baseRate: defaultRates.base_rate?.toString() || '0',
        additionalAnimalRate: defaultRates.additional_animal_rate?.toString() || '0',
        appliesAfterAnimals: defaultRates.applies_after?.toString() || '1',
        holidayRate: defaultRates.holiday_rate?.toString() || '0',
        unit_of_time: defaultRates.unit_of_time || 'Per Visit',
        additionalRates: defaultRates.additional_rates?.map(rate => ({
          name: rate.title,
          description: rate.description || '',
          amount: rate.amount
        })) || []
      };

      if (is_DEBUG) {
        console.log('MBA565656 Setting new rates:', newRates);
      }

      setOccurrence(prev => {
        const updated = {
          ...prev,
          rates: newRates
        };
        if (is_DEBUG) {
          console.log('MBA565656 Updated occurrence state:', updated);
        }
        return updated;
      });
      
      setUnitOfTime(defaultRates.unit_of_time || 'Per Visit');
    }
  }, [defaultRates, initialOccurrence]);

  // Add effect to update unit_of_time when rates change
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA565656 Rates changed:', occurrence.rates);
    }
    setUnitOfTime(occurrence.rates.unit_of_time);
  }, [occurrence.rates]);

  // Add effect to log when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (is_DEBUG) {
        console.log('MBA565656 Modal became visible:', {
          defaultRates,
          initialOccurrence,
          currentRates: occurrence.rates
        });
      }
    }
  }, [visible]);

  // Add effect to update military time preference when timeSettings changes
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA4321 Time settings changed:', timeSettings);
    }
    setOccurrence(prev => ({
      ...prev,
      isMilitary: timeSettings.use_military_time
    }));
  }, [timeSettings]);

  // Add effect to update dates when initialOccurrence changes
  useEffect(() => {
    if (initialOccurrence) {
      if (is_DEBUG) {
        console.log('MBA4321 Initial occurrence rates:', initialOccurrence.rates);
        console.log('MBA4321 Initial unit_of_time:', initialOccurrence.rates?.unit_of_time);
      }
      const dates = parseInitialDates(initialOccurrence);
      // Use unit_of_time directly from the rates object without any transformation
      const unit_of_time = initialOccurrence.rates?.unit_of_time;
      if (is_DEBUG) {
        console.log('MBA4321 Setting unit_of_time to:', unit_of_time);
      }
      setOccurrence(prev => ({
        ...prev,
        startDateTime: dates.startDateTime,
        endDateTime: dates.endDateTime,
        isMilitary: dates.isMilitary,
        rates: {
          ...initialOccurrence.rates,
          unit_of_time: unit_of_time
        }
      }));
      setUnitOfTime(unit_of_time);
    }
  }, [initialOccurrence]);

  const handleStartDateTimeChange = (date) => {
    if (is_DEBUG) {
      console.log('MBA1234 Start datetime changed:', date?.toISOString());
    }
    if (date && !isNaN(date.getTime())) {
      setOccurrence(prev => ({
        ...prev,
        startDateTime: date
      }));
    }
  };

  const handleEndDateTimeChange = (date) => {
    if (is_DEBUG) {
      console.log('MBA1234 End datetime changed:', date?.toISOString());
    }
    if (date && !isNaN(date.getTime())) {
      setOccurrence(prev => ({
        ...prev,
        endDateTime: date
      }));
    }
  };

  const handleAdd = async () => {
    try {
      // Format dates in UTC for backend
      const startDate = format(occurrence.startDateTime, 'yyyy-MM-dd');
      const startTime = format(occurrence.startDateTime, 'HH:mm');
      const endDate = format(occurrence.endDateTime, 'yyyy-MM-dd');
      const endTime = format(occurrence.endDateTime, 'HH:mm');

      if (is_DEBUG) {
        console.log('MBA1234 Adding occurrence:', {
          startDate,
          startTime,
          endDate,
          endTime,
          startDateTime: occurrence.startDateTime.toISOString(),
          endDateTime: occurrence.endDateTime.toISOString()
        });
      }

      const response = await onAdd({
        startDate,
        startTime,
        endDate,
        endTime,
        rates: occurrence.rates
      });

      if (is_DEBUG) {
        console.log('MBA1234 Response from onAdd:', response);
      }

      if (response?.status === 'success') {
        if (is_DEBUG) {
          console.log('MBA1234 Successfully added/updated occurrence');
        }
        resetForm();
        onClose();
        // Show success message using Alert
        Alert.alert('Success', response.message);
      } else {
        // Show error message but don't close modal
        setValidationError(response?.message || 'Failed to add occurrence');
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBA1234 Error adding occurrence:', error);
      }
      setValidationError(error.message || 'An unexpected error occurred');
    }
  };

  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({ name: '', amount: '' });
  const [unit_of_time, setUnitOfTime] = useState(
    initialOccurrence?.rates?.unit_of_time || 
    defaultRates?.unit_of_time || 
    'Per Visit'
  );
  
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA1234 Initial occurrence:', initialOccurrence);
      console.log('MBA1234 Unit of time set to:', unit_of_time);
    }
  }, [unit_of_time, initialOccurrence]);

  // Update occurrence when unit_of_time changes
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA4321 Unit of time changed:', {
        newUnitOfTime: unit_of_time,
        occurrenceRatesUnitOfTime: occurrence.rates.unit_of_time
      });
    }
    setOccurrence(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        unit_of_time: unit_of_time
      }
    }));
  }, [unit_of_time]);

  const calculateTotal = () => {
    // If we have a totalCost from the initialOccurrence, use that
    if (initialOccurrence?.totalCost) {
      return parseFloat(initialOccurrence.totalCost).toFixed(2);
    }

    // Otherwise calculate it
    const baseAmount = parseFloat(occurrence.rates.baseRate) || 0;
    const additionalAnimalAmount = parseFloat(occurrence.rates.additionalAnimalRate) || 0;
    const holidayAmount = parseFloat(occurrence.rates.holidayRate) || 0;
    const customRatesAmount = occurrence.rates.additionalRates?.reduce((sum, rate) => 
      sum + (parseFloat(rate.amount) || 0), 0) || 0;

    const subtotal = baseAmount + additionalAnimalAmount + holidayAmount + customRatesAmount;
    const platformFee = subtotal * 0.10; // 10% platform fee
    const taxes = (subtotal + platformFee) * 0.09; // 9% tax
    const totalClientCost = subtotal + platformFee + taxes;

    return totalClientCost.toFixed(2);
  };

  const handleDeleteRate = (index) => {
    setOccurrence(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        additionalRates: prev.rates.additionalRates.filter((_, i) => i !== index)
      }
    }));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    // Validate the date/time range
    const validation = validateDateTimeRange(
      format(occurrence.startDateTime, 'yyyy-MM-dd'),
      format(occurrence.endDateTime, 'yyyy-MM-dd'),
      format(occurrence.startDateTime, 'HH:mm'),
      format(occurrence.endDateTime, 'HH:mm')
    );

    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    setValidationError(null);
    handleAdd();
  };

  const resetForm = () => {
    setOccurrence({
      startDateTime: new Date(),
      endDateTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      isMilitary: timeSettings.use_military_time,
      rates: {
        baseRate: defaultRates?.base_rate?.toString() || '0',
        additionalAnimalRate: defaultRates?.additional_animal_rate?.toString() || '0',
        appliesAfterAnimals: defaultRates?.applies_after?.toString() || '1',
        holidayRate: defaultRates?.holiday_rate?.toString() || '0',
        unit_of_time: defaultRates?.unit_of_time || 'Per Visit',
        additionalRates: defaultRates?.additional_rates?.map(rate => ({
          name: rate.title,
          description: rate.description || '',
          amount: rate.amount
        })) || []
      }
    });
    setUnitOfTime(defaultRates?.unit_of_time || 'Per Visit');
    setShowAddRate(false);
    setNewRate({ name: '', amount: '' });
  };

  const renderPickerItems = (options) => {
    return options.map((option) => (
      <Picker.Item 
        key={option} 
        label={option} 
        value={option}
        style={styles.pickerItem}
      />
    ));
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirmation(false);
    handleClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        onRequestClose={handleClose}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[
            styles.modalContent,
            isFromRequestBooking ? {
              maxHeight: undefined,
              height: heightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['325px', '650px']
              }),
              transform: [{
                translateY: heightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -40]
                })
              }]
            } : {
              maxHeight: '80%'
            }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollViewContent,
                isFromRequestBooking && isAnyPickerActive && { paddingBottom: 300 }
              ]}
            >
              <View style={[styles.section, { zIndex: 10 }]}>
                <Text style={styles.label}>Start Date & Time</Text>
                <DateTimePicker
                  value={occurrence.startDateTime}
                  onChange={handleStartDateTimeChange}
                  error={validationError?.startDateTime}
                  isMilitary={occurrence.isMilitary}
                  onPickerStateChange={handlePickerStateChange}
                />
              </View>

              <View style={[styles.section, { zIndex: 9 }]}>
                <Text style={styles.label}>End Date & Time</Text>
                <DateTimePicker
                  value={occurrence.endDateTime}
                  onChange={handleEndDateTimeChange}
                  error={validationError?.endDateTime}
                  isMilitary={occurrence.isMilitary}
                  onPickerStateChange={handlePickerStateChange}
                />
              </View>

              {!hideRates && (
                <>
                  <View style={[styles.section, { zIndex: 8 }]}>
                    <Text style={styles.label}>Base Rate</Text>
                    <View style={styles.rateContainer}>
                      <View style={styles.baseRateInput}>
                        <TextInput
                          style={styles.input}
                          value={occurrence.rates.baseRate.toString()}
                          onChangeText={(text) => setOccurrence(prev => ({
                            ...prev,
                            rates: {
                              ...prev.rates,
                              baseRate: text.replace(/[^0-9.]/g, '')
                            }
                          }))}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                        />
                      </View>
                      <View style={styles.timeUnitInput}>
                        <Text style={styles.label}>Per</Text>
                        <Picker
                          selectedValue={unit_of_time}
                          onValueChange={(itemValue) => {
                            if (is_DEBUG) {
                              console.log('MBA4321 Picker value changed to:', itemValue);
                            }
                            setUnitOfTime(itemValue);
                            setOccurrence(prev => ({
                              ...prev,
                              rates: {
                                ...prev.rates,
                                unit_of_time: itemValue
                              }
                            }));
                          }}
                          style={styles.picker}
                        >
                          {renderPickerItems(TIME_OPTIONS)}
                        </Picker>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.section, { zIndex: 7 }]}>
                    <Text style={styles.label}>
                      {screenWidth < 375 
                        ? `+${occurrence.rates.appliesAfterAnimals} Pet Rate`
                        : 'Additional Pet Rate'
                      }
                    </Text>
                    <View style={styles.rateContainer}>
                      <View style={styles.baseRateInput}>
                        <TextInput
                          style={styles.input}
                          value={occurrence.rates.additionalAnimalRate.toString()}
                          onChangeText={(text) => setOccurrence(prev => ({
                            ...prev,
                            rates: {
                              ...prev.rates,
                              additionalAnimalRate: text.replace(/[^0-9.]/g, '')
                            }
                          }))}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                        />
                      </View>
                      <View style={styles.timeUnitInput}>
                        <Text style={styles.label}>Applies After</Text>
                        <Picker
                          selectedValue={occurrence.rates.appliesAfterAnimals}
                          onValueChange={(itemValue) => setOccurrence(prev => ({
                            ...prev,
                            rates: {
                              ...prev.rates,
                              appliesAfterAnimals: itemValue
                            }
                          }))}
                          style={styles.picker}
                        >
                          {ANIMAL_COUNT_OPTIONS.map((option) => (
                            <Picker.Item key={option} label={`${option} animal${option === '1' ? '' : 's'}`} value={option} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.section, { zIndex: 6 }]}>
                    <Text style={styles.label}>Holiday Rate</Text>
                    <View style={styles.rateContainer}>
                      <View style={styles.baseRateInput}>
                        <TextInput
                          style={styles.input}
                          value={occurrence.rates.holidayRate.toString()}
                          onChangeText={(text) => setOccurrence(prev => ({
                            ...prev,
                            rates: {
                              ...prev.rates,
                              holidayRate: text.replace(/[^0-9.]/g, '')
                            }
                          }))}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={[styles.section, { zIndex: 5 }]}>
                    <Text style={styles.label}>Additional Rates</Text>
                    {occurrence.rates.additionalRates.map((rate, index) => (
                      <View key={index} style={[styles.rateRow, {marginBottom: 10}]}>
                        <TextInput
                          style={[styles.input, styles.rateInput]}
                          value={rate.name}
                          editable={false}
                        />
                        <View style={[styles.rateAmountContainer]}>
                          <TextInput
                            style={[styles.input, styles.rateAmountInput]}
                            value={rate.amount.toString()}
                            editable={false}
                          />
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteRate(index)}>
                          <MaterialCommunityIcons name="close" size={24} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {showAddRate ? (
                      <>
                        <View style={styles.rateLabelContainer}>
                          <Text style={styles.rateTitleLabel}>Rate Title</Text>
                          <Text style={styles.rateAmountLabel}>Rate Amount</Text>
                        </View>
                        <View style={styles.rateRow}>
                          <TextInput
                            style={[styles.input, styles.rateInput]}
                            value={newRate.name}
                            onChangeText={(text) => setNewRate(prev => ({ ...prev, name: text }))}
                            placeholder="Rate Title"
                          />
                          <View style={[styles.rateAmountContainer]}>
                            <TextInput
                              style={[styles.input, styles.rateAmountInput]}
                              value={newRate.amount}
                              onChangeText={(text) => setNewRate(prev => ({ 
                                ...prev, 
                                amount: text.replace(/[^0-9.]/g, '') 
                              }))}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                            />
                          </View>
                          <TouchableOpacity onPress={() => handleAddRate()}>
                            <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <TouchableOpacity 
                        style={styles.addRateButton}
                        onPress={() => setShowAddRate(true)}
                      >
                        <Text style={styles.addRateButtonText}>Add custom rate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                

                  <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>${calculateTotal()}</Text>
                  </View>

                </>
              )}
            </ScrollView>

            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={handleDeleteClick}
                style={[styles.button, { borderColor: theme.colors.error }]}
                textColor={theme.colors.error}
              >
                Delete
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSubmit}
                style={styles.button}
              >
                {isEditing ? 'Save Changes' : 'Add'}
              </Button>
            </View>
            {validationError && (
              <Text style={styles.errorMessage}>{validationError}</Text>
            )}
          </Animated.View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteConfirm}
        actionText="delete this occurrence"
      />
    </>
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
    borderRadius: 8,
    padding: 20,
    width: '95%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: theme.fontSizes.largeLarge,
    fontWeight: 'bold',
    fontFamily: theme.fonts.header.fontFamily,
  },
  section: {
    position: 'relative',
    marginBottom: 16,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 2,
    fontFamily: theme.fonts.header.fontFamily,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 200, // Higher than modal content
    marginBottom: 16,
  },
  dollarSign: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginRight: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: theme.colors.background,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 6,
  },
  rateSection: {
    // marginBottom: 10,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  baseRateInput: {
    flex: 1,
  },
  timeUnitInput: {
    flex: 1,
    marginTop: -32,
  },
  picker: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    height: 39,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalAmount: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.small,
    marginTop: 8,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    width: '100%',
    flexWrap: 'nowrap',
  },
  rateInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    height: 39,
    padding: 12,
    fontFamily: theme.fonts.regular.fontFamily,
    minWidth: 0,
  },
  rateAmountContainer: {
    flex: 1,
    minWidth: 0,
  },
  rateAmountInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    height: 39,
    padding: 12,
    fontFamily: theme.fonts.regular.fontFamily,
    width: '100%',
  },
  addRateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  addRateButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateLabelContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 5,
  },
  rateTitleLabel: {
    flex: 2,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateAmountLabel: {
    flex: 1,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginLeft: 10,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  errorMessage: {
    color: theme.colors.error,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 8,
  },
});

export default AddOccurrenceModal;