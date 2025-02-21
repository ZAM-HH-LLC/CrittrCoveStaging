import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, Picker, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import { AuthContext } from '../context/AuthContext'
import { format } from 'date-fns';
import { TIME_OPTIONS } from '../data/mockData';
import { validateDateTimeRange } from '../utils/dateTimeValidation';

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
  modalTitle = 'Add New Occurrence'
}) => {

  // Helper function to create a Date object from a time string
  const createTimeDate = (timeStr) => {
    if (timeStr instanceof Date) return timeStr;
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date;
  };

  const { is_DEBUG } = useContext(AuthContext);
  const [occurrence, setOccurrence] = useState(() => {
    if (initialOccurrence) {
      // For editing existing occurrence
      const initialState = {
        startDate: initialOccurrence.startDate,
        endDate: initialOccurrence.endDate || initialOccurrence.startDate,
        startTime: createTimeDate(initialOccurrence.startTime),
        endTime: createTimeDate(initialOccurrence.endTime),
        rates: {
          baseRate: '0',
          additionalAnimalRate: '0',
          appliesAfterAnimals: '1',
          holidayRate: '0',
          timeUnit: 'per visit',
          additionalRates: []
        }
      };

      // Only add rates if they exist in initialOccurrence
      if (initialOccurrence.rates) {
        initialState.rates = {
          baseRate: initialOccurrence.rates.baseRate?.toString() || '0',
          additionalAnimalRate: initialOccurrence.rates.additionalAnimalRate?.toString() || '0',
          appliesAfterAnimals: initialOccurrence.rates.appliesAfterAnimals || '1',
          holidayRate: initialOccurrence.rates.holidayRate?.toString() || '0',
          timeUnit: initialOccurrence.rates.timeUnit || 'per visit',
          additionalRates: (initialOccurrence.rates.additionalRates || []).map(rate => ({
            name: rate.name,
            description: rate.description || '',
            amount: rate.amount.toString()
          }))
        };
      }
      
      return initialState;
    }

    // For new occurrence
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return {
      startDate: todayStr,
      endDate: todayStr,
      startTime: new Date(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      rates: {
        baseRate: defaultRates?.baseRate?.toString() || '0',
        additionalAnimalRate: defaultRates?.additionalAnimalRate?.toString() || '0',
        appliesAfterAnimals: defaultRates?.appliesAfterAnimals || '1',
        holidayRate: defaultRates?.holidayRate?.toString() || '0',
        timeUnit: defaultRates?.timeUnit || 'per visit',
        additionalRates: defaultRates?.additionalRates || []
      }
    };
  });

  // Reset occurrence when initialOccurrence changes or when modal visibility changes
  useEffect(() => {
    if (!visible) {
      // Reset to default state when modal closes
      if (!initialOccurrence) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        setOccurrence({
          startDate: todayStr,
          endDate: todayStr,
          startTime: new Date(),
          endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
          rates: {
            baseRate: defaultRates?.baseRate?.toString() || '0',
            additionalAnimalRate: defaultRates?.additionalAnimalRate?.toString() || '0',
            appliesAfterAnimals: defaultRates?.appliesAfterAnimals || '1',
            holidayRate: defaultRates?.holidayRate?.toString() || '0',
            timeUnit: defaultRates?.timeUnit || 'per visit',
            additionalRates: []
          }
        });
        setTimeUnit(defaultRates?.timeUnit || 'per visit');
      }
    } else if (initialOccurrence) {
      // Only set occurrence data if we're editing
      const defaultRatesObj = {
        baseRate: '0',
        additionalAnimalRate: '0',
        appliesAfterAnimals: '1',
        holidayRate: '0',
        timeUnit: 'per visit',
        additionalRates: []
      };

      const ratesData = initialOccurrence.rates || defaultRatesObj;

      setOccurrence({
        startDate: initialOccurrence.startDate,
        endDate: initialOccurrence.endDate || initialOccurrence.startDate,
        startTime: createTimeDate(initialOccurrence.startTime),
        endTime: createTimeDate(initialOccurrence.endTime),
        rates: {
          baseRate: ratesData.baseRate?.toString() || '0',
          additionalAnimalRate: ratesData.additionalAnimalRate?.toString() || '0',
          appliesAfterAnimals: ratesData.appliesAfterAnimals || '1',
          holidayRate: ratesData.holidayRate?.toString() || '0',
          timeUnit: ratesData.timeUnit || 'per visit',
          additionalRates: (ratesData.additionalRates || []).map(rate => ({
            name: rate.name,
            description: rate.description || '',
            amount: rate.amount?.toString() || '0'
          }))
        }
      });
      setTimeUnit(ratesData.timeUnit || 'per visit');
    }
  }, [visible, initialOccurrence, defaultRates]);

  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({ name: '', amount: '' });
  const [timeUnit, setTimeUnit] = useState(initialOccurrence?.rates?.timeUnit || occurrence.rates.timeUnit);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);

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

  const handleAdd = async () => {
    try {
      setIsLoading(true);
      
      // Keep dates as YYYY-MM-DD strings without any manipulation
      const startDate = occurrence.startDate;
      const endDate = occurrence.endDate || occurrence.startDate;
      
      if (is_DEBUG) {
        console.log('Original dates:', {
          startDate,
          endDate,
          startTime: format(occurrence.startTime, 'HH:mm'),
          endTime: format(occurrence.endTime, 'HH:mm')
        });
      }
      
      const occurrenceData = {
        startDate,
        endDate,
        startTime: format(occurrence.startTime, 'HH:mm'),
        endTime: format(occurrence.endTime, 'HH:mm'),
        rates: {
          ...occurrence.rates,
          baseRate: parseFloat(occurrence.rates.baseRate) || 0,
          additionalAnimalRate: parseFloat(occurrence.rates.additionalAnimalRate) || 0,
          appliesAfterAnimals: occurrence.rates.appliesAfterAnimals,
          holidayRate: parseFloat(occurrence.rates.holidayRate) || 0,
          additionalRates: occurrence.rates.additionalRates.map(rate => ({
            ...rate,
            amount: parseFloat(rate.amount) || 0
          })),
          timeUnit,
        },
        totalCost: parseFloat(calculateTotal())
      };

      if (is_DEBUG) {
        console.log('Adding occurrence with data:', occurrenceData);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      const success = await onAdd(occurrenceData);
      
      if (success) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        setOccurrence({
          startDate: todayStr,
          endDate: todayStr,
          startTime: new Date(),
          endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
          rates: {
            baseRate: defaultRates?.baseRate?.toString() || '0',
            additionalAnimalRate: defaultRates?.additionalAnimalRate?.toString() || '0',
            appliesAfterAnimals: defaultRates?.appliesAfterAnimals || '1',
            holidayRate: defaultRates?.holidayRate?.toString() || '0',
            timeUnit: 'per visit',
            additionalRates: []
          }
        });
        setShowAddRate(false);
        setNewRate({ name: '', amount: '' });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        onClose();
      }
    } catch (error) {
      console.error('Error adding occurrence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRate = () => {
    if (newRate.name && newRate.amount) {
      setOccurrence(prev => ({
        ...prev,
        rates: {
          ...prev.rates,
          additionalRates: [...prev.rates.additionalRates, {
            ...newRate,
            amount: parseFloat(newRate.amount)
          }]
        }
      }));
      setNewRate({ name: '', amount: '' });
      setShowAddRate(false);
    }
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
      occurrence.startDate,
      occurrence.endDate,
      format(occurrence.startTime, 'HH:mm'),
      format(occurrence.endTime, 'HH:mm')
    );

    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    handleAdd();
  };

  const resetForm = () => {
    setOccurrence({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startTime: new Date(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      rates: {
        baseRate: defaultRates?.baseRate || '0',
        additionalAnimalRate: defaultRates?.additionalAnimalRate || '0',
        appliesAfterAnimals: defaultRates?.appliesAfterAnimals || '1',
        holidayRate: defaultRates?.holidayRate || '0',
        timeUnit: defaultRates?.timeUnit || 'per visit',
        additionalRates: []
      }
    });
    setTimeUnit(defaultRates?.timeUnit || 'per visit');
    setShowAddRate(false);
    setNewRate({ name: '', amount: '' });
    setValidationError(null);
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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalTitle}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollableContent>
            <View style={styles.dateTimeSection}>
              <Text style={styles.sectionTitle}>Date & Time</Text>
              
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.label}>Start Date</Text>
                  <DatePicker
                    value={occurrence.startDate}
                    onChange={(date) => setOccurrence(prev => ({ ...prev, startDate: date }))}
                  />
                </View>
                <Text style={{ width: 10 }} />
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.label}>Start Time</Text>
                  <TimePicker
                    value={occurrence.startTime}
                    onChange={(time) => setOccurrence(prev => ({ ...prev, startTime: time }))}
                    fullWidth
                  />
                </View>
              </View>
            </View>
            <View style={styles.dateTimeSection}>
              <View style={[styles.dateTimeContainer, {marginTop: 15}]}>
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.label}>End Date</Text>
                  <DatePicker
                    value={occurrence.endDate}
                    onChange={(date) => setOccurrence(prev => ({ ...prev, endDate: date }))}
                  />
                </View>
                <Text style={{ width: 10 }} />
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.label}>End Time</Text>
                  <TimePicker
                    value={occurrence.endTime}
                    onChange={(time) => setOccurrence(prev => ({ ...prev, endTime: time }))}
                    fullWidth
                  />
                </View>
              </View>
            </View>

            {validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}

            {!hideRates && (
              <>
                <View style={styles.rateSection}>
                  <View style={[styles.rateContainer, {marginTop: 15}]}>
                    <View style={styles.baseRateInput}>
                      <Text style={styles.label}>Base Rate</Text>
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
                        selectedValue={timeUnit}
                        onValueChange={(itemValue) => setTimeUnit(itemValue)}
                        style={styles.picker}
                      >
                        {renderPickerItems(TIME_OPTIONS)}
                      </Picker>
                    </View>
                  </View>

                  <View style={[styles.rateContainer, styles.topSpacing]}>
                    <View style={styles.baseRateInput}>
                      <Text style={styles.label}>Additional Animal Rate</Text>
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

                  <View style={[styles.rateContainer, styles.topSpacing]}>
                    <View style={styles.baseRateInput}>
                      <Text style={styles.label}>Holiday Rate</Text>
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

                <View style={styles.rateSection}>
                  <Text style={[styles.label, {marginTop: 10, marginBottom: 0}]}>Additional Rates</Text>
                  {occurrence.rates.additionalRates.map((rate, index) => (
                    <View key={index} style={[styles.rateRow, {marginTop: 10, marginBottom: 0}]}>
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
                        <TouchableOpacity onPress={handleAddRate}>
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.addButtonText}>{isEditing ? 'Save' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollableContent>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
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
  closeButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: '500',
    fontFamily: theme.fonts.header.fontFamily,
  },
  dateTimeSection: {
    // marginBottom: 10,
  },
  dateTimeContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    // marginBottom: 15,
  },
  dateTimeColumn: {
    flex: 1,
  },
  topSpacing: {
    marginTop: 15,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rateInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateAmountContainer: {
    flex: 1,
  },
  rateAmountInput: {
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  addRateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    alignItems: 'center',
    // marginTop: ,
  },
  addRateButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dollarSign: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginRight: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  addButtonText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.surface,
    fontWeight: 'bold',
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
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  baseRateInput: {
    flex: 1,
  },
  timeUnitInput: {
    flex: 1,
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
  dropdownText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedDropdownText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  pickerItem: {
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default AddOccurrenceModal;