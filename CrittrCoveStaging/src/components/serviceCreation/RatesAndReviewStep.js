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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { TIME_UNIT_MAPPING, BACKEND_TO_FRONTEND_TIME_UNIT } from '../../data/mockData';
import { debugLog } from '../../context/AuthContext';

const TIME_UNITS = Object.keys(TIME_UNIT_MAPPING);
const ANIMAL_THRESHOLDS = ['1', '2', '3', '4', '5'];

const RatesAndReviewStep = ({ serviceData, setServiceData }) => {
  const [showTimeUnitDropdown, setShowTimeUnitDropdown] = useState(false);
  const [showThresholdDropdown, setShowThresholdDropdown] = useState(false);
  const [customChargeVisible, setCustomChargeVisible] = useState(false);
  const [newCustomRate, setNewCustomRate] = useState({
    title: '',
    rate: '',
    description: ''
  });

  // Check if we need to convert existing data on component mount
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    debugLog('MBA5931', 'Available TIME_UNITS:', TIME_UNITS);
    debugLog('MBA5931', 'TIME_UNIT_MAPPING:', TIME_UNIT_MAPPING);
    debugLog('MBA5931', 'Current base_rate_unit:', serviceData.rates?.base_rate_unit);
    debugLog('MBA5931', 'Displayed unit text:', serviceData.rates?.base_rate_unit ? 
      (BACKEND_TO_FRONTEND_TIME_UNIT[serviceData.rates.base_rate_unit] || serviceData.rates.base_rate_unit) : 
      TIME_UNITS[0]);
  }, [serviceData.rates?.base_rate_unit]);

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
      setCustomChargeVisible(true);
      return;
    }

    if (newCustomRate.title && newCustomRate.rate) {
      setServiceData(prev => ({
        ...prev,
        additionalRates: [...(prev.additionalRates || []), newCustomRate]
      }));
      setNewCustomRate({
        title: '',
        rate: '',
        description: ''
      });
      setCustomChargeVisible(false);
    }
  };

  const handleEditCustomRate = (index) => {
    // Implementation for editing custom rate
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
          <Text style={styles.label}>Holiday Rate <Text style={{ color: theme.colors.placeHolderText }}>(Optional)</Text></Text>
          <View style={styles.percentageInputContainer}>
            <TextInput
              style={styles.percentageInput}
              placeholder="0"
              keyboardType="decimal-pad"
              value={serviceData.rates?.holidayRate === '0' ? '' : serviceData.rates?.holidayRate}
              onChangeText={handleHolidayRateChange}
              placeholderTextColor={theme.colors.placeHolderText}
            />
            <Text style={styles.percentageSymbol}>%</Text>
          </View>
        </View>

        <View style={styles.customRatesContainer}>
          <Text style={styles.label}>Custom Charges <Text style={{ color: theme.colors.placeHolderText }}>(Optional)</Text></Text>
          {serviceData.additionalRates?.map((rate, index) => (
            <View key={index} style={styles.customRateItem}>
              <View style={styles.customRateContent}>
                <Text style={styles.customRateTitle}>{rate.title}</Text>
                <Text style={styles.customRateAmount}>${rate.rate}</Text>
              </View>
              <View style={styles.customRateActions}>
                <TouchableOpacity
                  onPress={() => handleEditCustomRate(index)}
                  style={styles.customRateAction}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color={theme.colors.placeHolderText}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteCustomRate(index)}
                  style={styles.customRateAction}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={20}
                    color={theme.colors.placeHolderText}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {customChargeVisible ? (
            <View style={styles.newCustomRateContainer}>
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
            </View>
          ) : null}
          
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
    // marginBottom: 24,
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
  customRatesContainer: {
    marginTop: 24,
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
  customRateAction: {
    padding: 4,
  },
  customRateTitle: {
    fontSize: 16,
    color: theme.colors.text,
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
});

export default RatesAndReviewStep; 