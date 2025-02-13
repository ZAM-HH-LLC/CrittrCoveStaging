import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { TIME_OPTIONS, GENERAL_CATEGORIES, SERVICE_TYPE_SUGGESTIONS, ANIMAL_TYPE_SUGGESTIONS } from '../data/mockData';

const AddServiceModal = ({ 
  visible, 
  onClose, 
  onSave,
  initialService = null,
  setHasUnsavedChanges 
}) => {
  const [currentService, setCurrentService] = useState({
    serviceName: '',
    serviceDescription: '',
    animalTypes: '',
    rates: { 
      base_rate: '',
      additionalAnimalRate: '',
      holidayRate: ''
    },
    lengthOfService: '',
    categories: [],
  });
  const [additionalRates, setAdditionalRates] = useState([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showAnimalDropdown, setShowAnimalDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [serviceDropdownPosition, setServiceDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [animalDropdownPosition, setAnimalDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [categoryDropdownPosition, setCategoryDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const serviceInputRef = useRef(null);
  const animalInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const categoryDropdownRef = useRef(null);
  const animalDropdownRef = useRef(null);
  const serviceDropdownRef = useRef(null);
  const timeDropdownRef = useRef(null);

  useEffect(() => {
    if (initialService) {
      setCurrentService(initialService);
      setSelectedCategories(initialService.categories || []);
      setAdditionalRates(initialService.additionalRates || []);
    }
  }, [initialService]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCategoryDropdown && 
          categoryDropdownRef.current && 
          !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      if (showAnimalDropdown && 
          animalDropdownRef.current && 
          !animalDropdownRef.current.contains(event.target)) {
        setShowAnimalDropdown(false);
      }
      if (showServiceDropdown && 
          serviceDropdownRef.current && 
          !serviceDropdownRef.current.contains(event.target)) {
        setShowServiceDropdown(false);
      }
      if (showTimeDropdown && 
          timeDropdownRef.current && 
          !timeDropdownRef.current.contains(event.target)) {
        setShowTimeDropdown(false);
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown, showAnimalDropdown, showServiceDropdown, showTimeDropdown, visible]);

  const measureDropdown = (inputRef, setPosition, inputType) => {
    if (inputRef.current) {
      inputRef.current.measure((x, y, width, height, pageX, pageY) => {
        setPosition({ 
          top: y + height - 6,
          left: x, 
          width: '100%',
        });
      });
    }
  };

  const handleServiceTypeChange = (text) => {
    setCurrentService((prev) => ({ ...prev, serviceName: text }));
  };

  const handleAnimalTypeChange = (text) => {
    setCurrentService((prev) => ({ ...prev, animalTypes: text }));
  };

  const handleCategorySelect = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  const getFilteredServiceSuggestions = () => {
    if (!currentService?.serviceName) return SERVICE_TYPE_SUGGESTIONS;
    return SERVICE_TYPE_SUGGESTIONS.filter(suggestion =>
      suggestion.toLowerCase().includes(currentService.serviceName.toLowerCase())
    );
  };

  const getFilteredAnimalSuggestions = () => {
    if (!currentService?.animalTypes) return ANIMAL_TYPE_SUGGESTIONS;
    return ANIMAL_TYPE_SUGGESTIONS.filter(suggestion =>
      suggestion.toLowerCase().includes(currentService.animalTypes.toLowerCase())
    );
  };

  const addAdditionalRate = () => {
    setAdditionalRates(prev => [...prev, { label: '', value: '', description: '' }]);
  };

  const updateAdditionalRate = (index, key, value) => {
    setAdditionalRates(prev =>
      prev.map((rate, i) => (i === index ? { ...rate, [key]: value } : rate))
    );
  };

  const handleAddService = async () => {
    if (!currentService.serviceName?.trim() ||
        !currentService.animalTypes?.trim() ||
        !currentService.rates.base_rate?.trim() ||
        !currentService.rates.additionalAnimalRate?.trim() ||
        !currentService.rates.holidayRate?.trim() ||
        !currentService.lengthOfService?.trim()) {
      setShowValidationErrors(true);
      return;
    }

    try {
      const serviceToSave = {
        ...currentService,
        additionalRates,
        categories: selectedCategories,
      };

      await onSave(serviceToSave);
      setHasUnsavedChanges(true);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert('Error', 'Failed to save service');
    }
  };

  const resetForm = () => {
    setCurrentService({
      serviceName: '',
      serviceDescription: '',
      animalTypes: '',
      rates: { 
        base_rate: '',
        additionalAnimalRate: '',
        holidayRate: ''
      },
      lengthOfService: '',
      categories: [],
    });
    setSelectedCategories([]);
    setAdditionalRates([]);
    setShowValidationErrors(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalTitle}>
              {initialService ? 'Edit Service' : 'Add New Service'}
            </Text>
            
            <View style={[styles.inputWrapper, { zIndex: 4 }]}>
              <Text style={styles.inputLabel}>General Categories</Text>
              <TouchableOpacity
                ref={categoryInputRef}
                style={[styles.input, styles.categoryInput]}
                onPress={() => {
                  measureDropdown(categoryInputRef, setCategoryDropdownPosition, 'category');
                  setShowCategoryDropdown(!showCategoryDropdown);
                }}
              >
                <Text style={selectedCategories.length ? styles.selectedText : styles.placeholderText}>
                  {selectedCategories.length ? selectedCategories.join(', ') : 'Select categories'}
                </Text>
                <MaterialCommunityIcons 
                  name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View 
                  ref={categoryDropdownRef}
                  style={[styles.categoryDropdownContainer, categoryDropdownPosition]}
                >
                  <ScrollView 
                    style={styles.categoryScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                  >
                    {GENERAL_CATEGORIES.map((category, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleCategorySelect(category)}
                        style={styles.categoryItem}
                      >
                        <Text style={styles.categoryText}>{category}</Text>
                        <View style={styles.checkmarkContainer}>
                          {selectedCategories.includes(category) && (
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

            <View style={[styles.inputWrapper, { zIndex: 3 }]}>
              <Text style={styles.inputLabel}>Animal Type</Text>
              <TextInput
                ref={animalInputRef}
                style={[
                  styles.input,
                  showValidationErrors && !currentService?.animalTypes?.trim() && styles.inputError
                ]}
                placeholder="Animal Type"
                placeholderTextColor={theme.colors.placeHolderText}
                value={currentService?.animalTypes}
                onChangeText={handleAnimalTypeChange}
                onFocus={() => {
                  setShowAnimalDropdown(true);
                  measureDropdown(animalInputRef, setAnimalDropdownPosition, 'animal');
                }}
              />
              {showAnimalDropdown && (
                <View 
                  ref={animalDropdownRef}
                  style={[styles.suggestionsContainer, animalDropdownPosition]}
                >
                  <ScrollView 
                    style={styles.suggestionScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                  >
                    {getFilteredAnimalSuggestions().map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setCurrentService((prev) => ({ ...prev, animalTypes: suggestion }));
                          setShowAnimalDropdown(false);
                        }}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[styles.inputWrapper, { zIndex: 2 }]}>
              <Text style={styles.inputLabel}>Service Name</Text>
              <TextInput
                ref={serviceInputRef}
                style={[
                  styles.input,
                  showValidationErrors && !currentService?.serviceName?.trim() && styles.inputError
                ]}
                placeholder="Service Name"
                placeholderTextColor={theme.colors.placeHolderText}
                value={currentService?.serviceName}
                onChangeText={handleServiceTypeChange}
                onFocus={() => {
                  setShowServiceDropdown(true);
                  measureDropdown(serviceInputRef, setServiceDropdownPosition, 'service');
                }}
              />
              {showServiceDropdown && (
                <View 
                  ref={serviceDropdownRef}
                  style={[styles.suggestionsContainer, serviceDropdownPosition]}
                >
                  <ScrollView 
                    style={styles.suggestionScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                  >
                    {getFilteredServiceSuggestions().map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setCurrentService((prev) => ({ ...prev, serviceName: suggestion }));
                          setShowServiceDropdown(false);
                        }}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[styles.inputWrapper, { zIndex: 1 }]}>
              <Text style={styles.inputLabel}>Service Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Service Description"
                placeholderTextColor={theme.colors.placeHolderText}
                value={currentService?.serviceDescription}
                onChangeText={(text) =>
                  setCurrentService((prev) => ({ ...prev, serviceDescription: text }))
                }
                multiline
              />
            </View>

            <View style={[styles.inputWrapper, { zIndex: 1 }]}>
              <Text style={styles.inputLabel}>Length of Service</Text>
              <TouchableOpacity
                ref={timeInputRef}
                style={[
                  styles.input,
                  styles.timeInput,
                  showValidationErrors && !currentService?.lengthOfService?.trim() && styles.inputError
                ]}
                onPress={() => setShowTimeDropdown(!showTimeDropdown)}
              >
                <Text style={currentService?.lengthOfService ? styles.selectedText : styles.placeholderText}>
                  {currentService?.lengthOfService || 'Select length of service'}
                </Text>
                <MaterialCommunityIcons
                  name={showTimeDropdown ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              {showTimeDropdown && (
                <View 
                  ref={timeDropdownRef}
                  style={styles.timeDropdownContainer}
                >
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                  >
                    {TIME_OPTIONS.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.timeDropdownItem}
                        onPress={() => {
                          setCurrentService((prev) => ({ ...prev, lengthOfService: option }));
                          setShowTimeDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.timeDropdownText,
                            currentService?.lengthOfService === option && styles.selectedTimeOption,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={styles.inputLabel}>Base Rate</Text>
            <TextInput
              style={[
                styles.input,
                showValidationErrors && !currentService?.rates?.base_rate?.trim() && styles.inputError
              ]}
              placeholder="$ Ex. 25"
              placeholderTextColor={theme.colors.placeHolderText}
              keyboardType="decimal-pad"
              value={currentService?.rates?.base_rate ? `$${currentService.rates.base_rate}` : ''}
              onChangeText={(value) =>
                setCurrentService((prev) => ({ 
                  ...prev, 
                  rates: {
                    ...prev.rates,
                    base_rate: value.replace(/[^0-9.]/g, '').replace('$', '')
                  }
                }))
              }
            />

            <Text style={styles.inputLabel}>Additional Animal Rate</Text>
            <TextInput
              style={[
                styles.input,
                showValidationErrors && !currentService?.rates?.additionalAnimalRate?.trim() && styles.inputError
              ]}
              placeholder="$ Ex. 20"
              placeholderTextColor={theme.colors.placeHolderText}
              keyboardType="decimal-pad"
              value={currentService?.rates?.additionalAnimalRate ? `$${currentService.rates.additionalAnimalRate}` : ''}
              onChangeText={(value) =>
                setCurrentService((prev) => ({ 
                  ...prev, 
                  rates: {
                    ...prev.rates,
                    additionalAnimalRate: value.replace(/[^0-9.]/g, '').replace('$', '')
                  }
                }))
              }
            />

            <Text style={styles.inputLabel}>Holiday Rate</Text>
            <TextInput
              style={[
                styles.input,
                showValidationErrors && !currentService?.rates?.holidayRate?.trim() && styles.inputError
              ]}
              placeholder="$ Ex. 30"
              placeholderTextColor={theme.colors.placeHolderText}
              keyboardType="decimal-pad"
              value={currentService?.rates?.holidayRate ? `$${currentService.rates.holidayRate}` : ''}
              onChangeText={(value) =>
                setCurrentService((prev) => ({ 
                  ...prev, 
                  rates: {
                    ...prev.rates,
                    holidayRate: value.replace(/[^0-9.]/g, '').replace('$', '')
                  }
                }))
              }
            />

            {additionalRates.map((rate, idx) => (
              <View key={idx} style={styles.additionalRateRow}>
                <Text style={styles.additionalRateTitle}>Rate #{idx + 1}</Text>
                <Text style={styles.inputLabel}>Rate Title</Text>
                <TextInput
                  style={[
                    styles.input,
                    showValidationErrors && !rate.label?.trim() && styles.inputError
                  ]}
                  placeholder="Animal with medication"
                  placeholderTextColor={theme.colors.placeHolderText}
                  value={rate.label || ''}
                  onChangeText={(text) => updateAdditionalRate(idx, 'label', text)}
                />
                <Text style={styles.inputLabel}>Rate Amount</Text>
                <TextInput
                  style={[
                    styles.input,
                    showValidationErrors && !rate.value?.trim() && styles.inputError
                  ]}
                  placeholder="$ Ex. 20"
                  placeholderTextColor={theme.colors.placeHolderText}
                  keyboardType="decimal-pad"
                  value={rate.value ? `$${rate.value}` : ''}
                  onChangeText={(value) => updateAdditionalRate(idx, 'value', value.replace(/[^0-9.]/g, '').replace('$', ''))}
                />
                <Text style={styles.inputLabel}>Rate Description</Text>
                <TextInput
                  style={[
                    styles.input,
                    showValidationErrors && !rate.description?.trim() && styles.inputError
                  ]}
                  placeholder="Rate for animal needing medication"
                  placeholderTextColor={theme.colors.placeHolderText}
                  value={rate.description || ''}
                  onChangeText={(text) => updateAdditionalRate(idx, 'description', text)}
                />
                <TouchableOpacity 
                  onPress={() => {
                    setAdditionalRates(prevRates => prevRates.filter((_, i) => i !== idx));
                  }}
                  style={styles.deleteRateButton}
                >
                  <Text style={styles.deleteRateButtonText}>Delete Additional Rate</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity onPress={addAdditionalRate} style={styles.addRateButton}>
              <Text style={styles.addRateText}>+ Add Additional Rate</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleAddService}>
              <Text style={styles.saveButtonText}>
                {initialService ? 'Save Changes' : 'Add Service'}
              </Text>
            </TouchableOpacity>
          </View>
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
    width: '90%',
    maxWidth: 500,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 20,
    maxHeight: '50%',
  },
  modalScroll: {
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    marginBottom: 5,
    color: theme.colors.text,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputLabel: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    marginBottom: 5,
    marginTop: 15,
    fontWeight: '500',
  },
  categoryInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  selectedText: {
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.placeHolderText,
  },
  categoryDropdownContainer: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    maxHeight: 200,
    zIndex: 1000,
  },
  categoryScrollView: {
    maxHeight: 200,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    flex: 1,
  },
  checkmarkContainer: {
    width: 24,
    alignItems: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionScrollView: {
    maxHeight: 200,
  },
  suggestionText: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    color: theme.colors.text,
  },
  timeDropdownContainer: {
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
  timeDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeDropdownText: {
    color: theme.colors.text,
  },
  selectedTimeOption: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  additionalRateRow: {
    marginTop: 20,
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  additionalRateTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.text,
  },
  deleteRateButton: {
    backgroundColor: theme.colors.error,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  deleteRateButtonText: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
  },
  addRateButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  addRateText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  saveButtonText: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
  },
});

export default AddServiceModal;
