import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  TouchableWithoutFeedback,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { TIME_UNIT_MAPPING, BACKEND_TO_FRONTEND_TIME_UNIT } from '../../data/mockData';
import { debugLog } from '../../context/AuthContext';

const TIME_UNITS = Object.keys(TIME_UNIT_MAPPING);
const ANIMAL_THRESHOLDS = ['1', '2', '3', '4', '5'];

const RatesAndReviewStep = ({ serviceData, setServiceData, isUpdatingService, setIsUpdatingService, onProceedWithUpdate }) => {
  const [showTimeUnitDropdown, setShowTimeUnitDropdown] = useState(false);
  const [showThresholdDropdown, setShowThresholdDropdown] = useState(false);
  const [customChargeVisible, setCustomChargeVisible] = useState(false);
  const [isHolidayRatePercent, setIsHolidayRatePercent] = useState(true);
  const [isEditingExistingRate, setIsEditingExistingRate] = useState(false);
  const [showUnsavedRateWarning, setShowUnsavedRateWarning] = useState(false);
  const [newCustomRate, setNewCustomRate] = useState({
    title: '',
    rate: '',
    description: ''
  });

  // Check if we need to convert existing data on component mount
  useEffect(() => {
    // Initialize isPercent property based on the state
    setServiceData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        isPercent: isHolidayRatePercent
      }
    }));
    
    // If we have a base_rate_unit from backend but it's not in our mapping, initialize with default
    if (serviceData.rates?.base_rate_unit && !BACKEND_TO_FRONTEND_TIME_UNIT[serviceData.rates.base_rate_unit]) {
      debugLog('MBA5931', 'Converting initial base_rate_unit to mapped value');
      const frontendKey = Object.keys(TIME_UNIT_MAPPING).find(
        key => TIME_UNIT_MAPPING[key] === serviceData.rates.base_rate_unit
      );
      
      if (!frontendKey && serviceData.rates.base_rate_unit) {
        // If we don't have a mapping for this value, keep the backend value
        debugLog('MBA5931', 'No mapping found for:', serviceData.rates.base_rate_unit);
      }
    }

    // Check if existing holiday rate has a % sign
    if (serviceData.rates?.holidayRate) {
      const holidayRateString = serviceData.rates.holidayRate.toString();
      if (holidayRateString.includes('%')) {
        setIsHolidayRatePercent(true);
        // Strip the % sign for the input field
        setServiceData(prev => ({
          ...prev,
          rates: {
            ...prev.rates,
            holidayRate: holidayRateString.replace('%', ''),
            isPercent: true
          }
        }));
      } else if (holidayRateString.includes('$')) {
        setIsHolidayRatePercent(false);
        // Strip the $ sign for the input field
        setServiceData(prev => ({
          ...prev,
          rates: {
            ...prev.rates,
            holidayRate: holidayRateString.replace('$', ''),
            isPercent: false
          }
        }));
      }
    }
  }, []);

  useEffect(() => {
    debugLog('MBA5931', 'Available TIME_UNITS:', TIME_UNITS);
    debugLog('MBA5931', 'TIME_UNIT_MAPPING:', TIME_UNIT_MAPPING);
    debugLog('MBA5931', 'Current base_rate_unit:', serviceData.rates?.base_rate_unit);
    debugLog('MBA5931', 'Displayed unit text:', serviceData.rates?.base_rate_unit ? 
      (BACKEND_TO_FRONTEND_TIME_UNIT[serviceData.rates.base_rate_unit] || serviceData.rates.base_rate_unit) : 
      TIME_UNITS[0]);
  }, [serviceData.rates?.base_rate_unit]);

  // Helper function to check if there's an unsaved custom rate
  const hasUnsavedCustomRate = () => {
    // If the custom rate form is open, we consider it as unsaved
    // regardless of whether fields have content
    const result = customChargeVisible;
    
    debugLog('MBAno34othg0v', 'hasUnsavedCustomRate check:', { 
      customChargeVisible, 
      title: newCustomRate.title,
      rate: newCustomRate.rate,
      description: newCustomRate.description,
      result 
    });
    
    return result;
  };

  // Add effect to check if trying to update service while custom rate is being added
  useEffect(() => {
    debugLog('MBAno34othg0v', 'isUpdatingService changed:', {
      isUpdatingService,
      hasUnsaved: hasUnsavedCustomRate()
    });
    
    if (!isUpdatingService) {
      // Skip processing when isUpdatingService becomes false
      return;
    }
    
    // Check if there's an unsaved rate
    const hasUnsaved = hasUnsavedCustomRate();
    
    // Only show warning if isUpdatingService becomes true while there's an unsaved rate
    if (hasUnsaved) {
      debugLog('MBAno34othg0v', 'Showing unsaved rate warning modal');
      // Show the modal
      setShowUnsavedRateWarning(true);
      // Reset the isUpdatingService flag after showing the modal
      if (setIsUpdatingService) {
        debugLog('MBAno34othg0v', 'Setting isUpdatingService to FALSE to prevent API call');
        setIsUpdatingService(false);
      }
    } else {
      debugLog('MBAno34othg0v', 'No unsaved custom rate, allowing update to proceed');
      // Here we would directly call the API, but we need to add that functionality to props
      if (setIsUpdatingService) {
        // Signal to parent that it's OK to proceed
        debugLog('MBAno34othg0v', 'Setting isUpdatingService to TRUE to allow parent to call API');
        setIsUpdatingService(true);
        
        // This will trigger the parent component to call its callServiceApi function
        if (typeof onProceedWithUpdate === 'function') {
          debugLog('MBAno34othg0v', 'Calling onProceedWithUpdate directly');
          onProceedWithUpdate();
        }
      }
    }
  }, [isUpdatingService]);

  // Close dropdowns when clicking outside
  const handlePressOutside = () => {
    if (showTimeUnitDropdown) setShowTimeUnitDropdown(false);
    if (showThresholdDropdown) setShowThresholdDropdown(false);
  };

  const formatNumericInput = (text) => {
    // Remove any non-numeric characters except decimal point
    let numericValue = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1]?.length > 2) {
      numericValue = parts[0] + '.' + parts[1].slice(0, 2);
    }

    return numericValue;
  };

  const handleBaseRateChange = (text) => {
    const numericValue = formatNumericInput(text);
    setServiceData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        base_rate: numericValue
      }
    }));
  };

  const handleTimeUnitSelect = (unit) => {
    setServiceData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        base_rate_unit: TIME_UNIT_MAPPING[unit]
      }
    }));
    setShowTimeUnitDropdown(false);
  };

  const handleAdditionalAnimalRateChange = (text) => {
    const numericValue = formatNumericInput(text);
    setServiceData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        additionalAnimalRate: numericValue
      }
    }));
  };

  const handleThresholdSelect = (threshold) => {
    setServiceData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        additionalAnimalThreshold: threshold
      }
    }));
    setShowThresholdDropdown(false);
  };

  const handleHolidayRateChange = (text) => {
    const numericValue = formatNumericInput(text);
    setServiceData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        holidayRate: numericValue
      }
    }));
  };

  const toggleHolidayRateType = (isPercent) => {
    setIsHolidayRatePercent(isPercent);
    // Update the serviceData with the new holiday rate type
    setServiceData(prevData => ({
      ...prevData,
      rates: {
        ...prevData.rates,
        isPercent: isPercent
      }
    }));
  };

  // Calculate the dollar amount for percentage holiday rate
  const calculateHolidayRateDollarValue = () => {
    const baseRate = parseFloat(serviceData.rates?.base_rate) || 0;
    const holidayRatePercent = parseFloat(serviceData.rates?.holidayRate) || 0;
    
    if (baseRate > 0 && holidayRatePercent > 0) {
      const dollarValue = (baseRate * holidayRatePercent / 100).toFixed(2);
      return `$${dollarValue}`;
    }
    return null;
  };

  // Format holiday rate based on type (% or $)
  const getFormattedHolidayRate = () => {
    const value = serviceData.rates?.holidayRate || '';
    if (!value) return '';
    
    return isHolidayRatePercent ? `${value}%` : `$${value}`;
  };

  const handleCustomRateChange = (field, value) => {
    if (field === 'rate') {
      value = formatNumericInput(value);
    }
    setNewCustomRate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCustomRate = () => {
    if (!customChargeVisible) {
      debugLog('MBAno34othg0v', 'Opening custom rate form');
      setCustomChargeVisible(true);
      setIsEditingExistingRate(false);
      return;
    }

    // Check for title
    if (!newCustomRate.title.trim()) {
      debugLog('MBAno34othg0v', 'Missing custom rate title');
      return;
    }
    
    // Check for rate value
    if (!newCustomRate.rate) {
      debugLog('MBAno34othg0v', 'Missing custom rate value');
      return;
    }

    // Validate rate value
    const rateValue = parseFloat(newCustomRate.rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      debugLog('MBAno34othg0v', 'Invalid rate value:', newCustomRate.rate);
      return;
    }

    debugLog('MBAno34othg0v', 'Saving custom rate successfully:', newCustomRate);
    
    // Save the custom rate to the service data
    setServiceData(prev => ({
      ...prev,
      additionalRates: [...(prev.additionalRates || []), newCustomRate]
    }));
    
    // Reset the form state
    setNewCustomRate({
      title: '',
      rate: '',
      description: ''
    });
    
    // Close the form
    setCustomChargeVisible(false);
    setIsEditingExistingRate(false);
  };

  const handleEditCustomRate = (index) => {
    // Get the rate to edit
    const rateToEdit = serviceData.additionalRates[index];
    
    // Set the form with existing values
    setNewCustomRate({
      title: rateToEdit.title,
      rate: rateToEdit.rate,
      description: rateToEdit.description || ''
    });
    
    // Show the custom charge form and indicate we're editing
    setCustomChargeVisible(true);
    setIsEditingExistingRate(true);
    
    // Remove the old item
    setServiceData(prev => ({
      ...prev,
      additionalRates: prev.additionalRates.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteCustomRate = (index) => {
    setServiceData(prev => ({
      ...prev,
      additionalRates: prev.additionalRates.filter((_, i) => i !== index)
    }));
  };

  const renderDropdown = (options, selectedValue, onSelect, visible, containerStyle) => {
    if (!visible) return null;

    return (
      <View style={[styles.dropdownContainer, containerStyle]}>
        <ScrollView style={styles.dropdownScroll} contentContainerStyle={styles.dropdownScrollContent}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownItem,
                selectedValue === option && styles.selectedDropdownItem
              ]}
              onPress={() => onSelect(option)}
            >
              <Text style={[
                styles.dropdownText,
                selectedValue === option && styles.selectedDropdownText
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={handlePressOutside}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Set Your Rates</Text>

        {/* Error Modal */}
        <Modal
          visible={showUnsavedRateWarning}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUnsavedRateWarning(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={48}
                color={theme.colors.error}
                style={styles.modalIcon}
              />
              <Text style={styles.modalTitle}>Unsaved Custom Rate</Text>
              <Text style={styles.modalText}>
                Please save or cancel your custom rate before updating the service.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  debugLog('MBAno34othg0v', 'Modal OK button clicked');
                  // Just close the modal, keep the form open for editing
                  setShowUnsavedRateWarning(false);
                }}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={[styles.rateContainer, { zIndex: 3 }]}>
          <Text style={styles.label}>Base Rate <Text style={{ color: theme.colors.placeHolderText }}>(Required)</Text></Text>
          <View style={styles.rateInputGroup}>
            <View style={[styles.currencyInputContainer, { flex: 1 }]}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={serviceData.rates?.base_rate || ''}
                onChangeText={handleBaseRateChange}
                placeholderTextColor={theme.colors.placeHolderText}
              />
            </View>
            <View style={{ flex: 1, zIndex: 1 }}>
              <TouchableOpacity
                style={styles.unitSelector}
                onPress={() => {
                  setShowThresholdDropdown(false);
                  setShowTimeUnitDropdown(!showTimeUnitDropdown);
                }}
              >
                <Text style={styles.unitText}>
                  {serviceData.rates?.base_rate_unit ? 
                    (BACKEND_TO_FRONTEND_TIME_UNIT[serviceData.rates.base_rate_unit] || serviceData.rates.base_rate_unit) : 
                    TIME_UNITS[0]}
                </Text>
                <MaterialCommunityIcons
                  name={showTimeUnitDropdown ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              {renderDropdown(
                TIME_UNITS,
                serviceData.rates?.base_rate_unit,
                handleTimeUnitSelect,
                showTimeUnitDropdown,
                { width: '100%' }
              )}
            </View>
          </View>
        </View>

        <View style={[styles.rateContainer, { zIndex: 2 }]}>
          <Text style={styles.label}>Additional Animal Rate <Text style={{ color: theme.colors.placeHolderText }}>(Optional)</Text></Text>
          <View style={styles.rateInputGroup}>
            <View style={[styles.currencyInputContainer, { flex: 1 }]}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={serviceData.rates?.additionalAnimalRate || ''}
                onChangeText={handleAdditionalAnimalRateChange}
                placeholderTextColor={theme.colors.placeHolderText}
              />
            </View>
            <View style={{ flex: 1, zIndex: 1 }}>
              <TouchableOpacity
                style={styles.unitSelector}
                onPress={() => {
                  setShowTimeUnitDropdown(false);
                  setShowThresholdDropdown(!showThresholdDropdown);
                }}
              >
                <Text style={styles.unitText}>
                  After {serviceData.rates?.additionalAnimalThreshold || '1'} animals
                </Text>
                <MaterialCommunityIcons
                  name={showThresholdDropdown ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              {renderDropdown(
                ANIMAL_THRESHOLDS,
                serviceData.rates?.additionalAnimalThreshold,
                handleThresholdSelect,
                showThresholdDropdown,
                { width: '100%' }
              )}
            </View>
          </View>
        </View>

        <View style={styles.holidayRateContainer}>
          <View style={styles.holidayRateHeader}>
            <Text style={styles.label}>Holiday Rate <Text style={{ color: theme.colors.placeHolderText }}>(Optional)</Text></Text>
            <View style={styles.rateTypeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isHolidayRatePercent ? styles.activeToggleButton : styles.inactiveToggleButton,
                  {
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0
                  }
                ]}
                onPress={() => toggleHolidayRateType(true)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  isHolidayRatePercent ? styles.activeToggleText : styles.inactiveToggleText
                ]}>%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !isHolidayRatePercent ? styles.activeToggleButton : styles.inactiveToggleButton,
                  {
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8
                  }
                ]}
                onPress={() => toggleHolidayRateType(false)}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !isHolidayRatePercent ? styles.activeToggleText : styles.inactiveToggleText
                ]}>$</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[
            styles.holidayRateInputWrapper, 
            { marginBottom: isHolidayRatePercent && serviceData.rates?.base_rate && serviceData.rates?.holidayRate ? 28 : 0 }
          ]}>
            <View style={isHolidayRatePercent ? styles.percentageInputContainer : styles.currencyInputContainer}>
              {!isHolidayRatePercent && <Text style={styles.currencySymbol}>$</Text>}
              <TextInput
                style={styles.currencyInput}
                placeholder="0"
                keyboardType="decimal-pad"
                value={serviceData.rates?.holidayRate === '0' ? '' : serviceData.rates?.holidayRate}
                onChangeText={handleHolidayRateChange}
                placeholderTextColor={theme.colors.placeHolderText}
              />
              {isHolidayRatePercent && <Text style={styles.percentageSymbol}>%</Text>}
            </View>
            {isHolidayRatePercent && serviceData.rates?.base_rate && serviceData.rates?.holidayRate && (
              <Text style={styles.calculatedHolidayRate}>
                {calculateHolidayRateDollarValue()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.customRatesContainer}>
          <Text style={styles.label}>Custom Charges <Text style={{ color: theme.colors.placeHolderText }}>(Optional)</Text></Text>
          {serviceData.additionalRates?.length > 0 ? (
            serviceData.additionalRates.map((rate, index) => (
              <View key={index} style={styles.customRateItem}>
                <View style={styles.customRateContent}>
                  <View style={styles.customRateTitleContainer}>
                    <Text style={styles.customRateTitle}>{rate.title}</Text>
                    {rate.description ? (
                      <Text style={styles.customRateDescription} numberOfLines={1}>
                        {rate.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.customRateAmount}>${rate.rate}</Text>
                </View>
                <View style={styles.customRateActions}>
                  <TouchableOpacity
                    onPress={() => handleEditCustomRate(index)}
                    style={styles.customRateAction}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="pencil"
                      size={20}
                      color={theme.colors.mainColors.main}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCustomRate(index)}
                    style={styles.customRateAction}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={20}
                      color="#F26969"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : customChargeVisible ? null : (
            <Text style={styles.noCustomRatesText}>
              No custom charges added yet. Use the button below to add one.
            </Text>
          )}
          
          {/* Custom charge form or Add button */}
          {customChargeVisible ? (
            <View style={styles.newCustomRateContainer}>
              <Text style={styles.customRateFormHeading}>
                {isEditingExistingRate ? 'Edit Custom Rate' : 'New Custom Rate'}
              </Text>
              <TextInput
                style={styles.customRateInput}
                placeholder="Charge Title"
                value={newCustomRate.title}
                onChangeText={(text) => handleCustomRateChange('title', text)}
                placeholderTextColor={theme.colors.placeHolderText}
              />
              <View style={styles.currencyInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={newCustomRate.rate}
                  onChangeText={(text) => handleCustomRateChange('rate', text)}
                  placeholderTextColor={theme.colors.placeHolderText}
                />
              </View>
              <TextInput
                style={[styles.customRateInput, styles.textArea]}
                placeholder="Description"
                value={newCustomRate.description}
                onChangeText={(text) => handleCustomRateChange('description', text)}
                placeholderTextColor={theme.colors.placeHolderText}
                multiline={true}
                numberOfLines={3}
              />
              <View style={styles.customRateButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelRateButton}
                  onPress={() => {
                    debugLog('MBAno34othg0v', 'Cancel button pressed for custom rate form');
                    // Reset all form-related state
                    setCustomChargeVisible(false);
                    setNewCustomRate({
                      title: '',
                      rate: '',
                      description: ''
                    });
                    setIsEditingExistingRate(false);
                    // Ensure any warning modal is also closed
                    setShowUnsavedRateWarning(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={theme.colors.text}
                  />
                  <Text style={styles.cancelRateText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addRateButton, 
                    styles.saveRateButton,
                    (!newCustomRate.title.trim() || !newCustomRate.rate || 
                      isNaN(parseFloat(newCustomRate.rate)) || parseFloat(newCustomRate.rate) <= 0) 
                      ? styles.disabledSaveButton : {}
                  ]}
                  onPress={handleAddCustomRate}
                  disabled={!newCustomRate.title.trim() || !newCustomRate.rate || 
                    isNaN(parseFloat(newCustomRate.rate)) || parseFloat(newCustomRate.rate) <= 0}
                >
                  <MaterialCommunityIcons
                    name="content-save"
                    size={20}
                    color={theme.colors.surface}
                  />
                  <Text style={styles.saveRateText}>
                    {isEditingExistingRate ? 'Update Custom Rate' : 'Save Custom Rate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addRateButton}
              onPress={handleAddCustomRate}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={theme.colors.mainColors.main}
              />
              <Text style={styles.addRateText}>Add Rate</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 24,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateInputGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
  },
  currencySymbol: {
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 12,
    fontFamily: theme.fonts.regular.fontFamily,
    outlineStyle: 'none',
  },
  unitSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  unitText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: 200,
  },
  dropdownScroll: {
    width: '100%',
  },
  dropdownScrollContent: {
    flexGrow: 1,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedDropdownItem: {
    backgroundColor: theme.colors.mainColors.mainLight,
  },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedDropdownText: {
    color: theme.colors.mainColors.main,
    fontWeight: '600',
  },
  holidayRateContainer: {
    marginBottom: 24,
  },
  holidayRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateTypeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    width: 44,
    height: 36,
  },
  activeToggleButton: {
    backgroundColor: theme.colors.mainColors.main,
    borderWidth: 1,
    borderColor: theme.colors.mainColors.main,
  },
  inactiveToggleButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  activeToggleText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  inactiveToggleText: {
    color: theme.colors.text,
  },
  holidayRateInputWrapper: {
    position: 'relative',
  },
  percentageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
  },
  percentageInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 12,
    fontFamily: theme.fonts.regular.fontFamily,
    outlineStyle: 'none',
  },
  percentageSymbol: {
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  calculatedHolidayRate: {
    position: 'absolute',
    bottom: -24,
    right: 4,
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    paddingTop: 4,
  },
  customRatesContainer: {
    // marginTop: 24,
  },
  customRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customRateContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
  },
  customRateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  customRateTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  customRateTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  customRateDescription: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    marginTop: 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  customRateAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  newCustomRateContainer: {
    gap: 12,
    marginBottom: 16,
  },
  customRateInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.fonts.regular.fontFamily,
    outlineStyle: 'none',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.mainColors.main,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addRateText: {
    color: theme.colors.mainColors.main,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  customRateButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelRateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  cancelRateText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  saveRateButton: {
    flex: 2,
    backgroundColor: theme.colors.mainColors.main,
    borderColor: theme.colors.mainColors.main,
  },
  disabledSaveButton: {
    backgroundColor: theme.colors.placeHolderText,
    borderColor: theme.colors.placeHolderText,
  },
  saveRateText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  customRateFormHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  noCustomRatesText: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  customRateAction: {
    padding: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 12,
    maxWidth: '85%',
    minWidth: 280,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: theme.colors.mainColors.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
});

export default RatesAndReviewStep; 