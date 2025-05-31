import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import StepProgressIndicator from './common/StepProgressIndicator';
import { debugLog } from '../context/AuthContext';
import CategorySelectionStep from './serviceCreation/CategorySelectionStep';
import ServiceDetailsStep from './serviceCreation/ServiceDetailsStep';
import RatesAndReviewStep from './serviceCreation/RatesAndReviewStep';
import { createService, updateService } from '../api/API';
import { useToast } from './ToastProvider';

const STEPS = {
  CATEGORY_SELECTION: {
    id: 0,
    name: 'Categories & Types'
  },
  SERVICE_DETAILS: {
    id: 1,
    name: 'Service Details'
  },
  RATES_AND_REVIEW: {
    id: 2,
    name: 'Rates & Review'
  }
};

// Import the hardcoded animal categories directly
const ANIMAL_CATEGORIES = {
  // Farm animals
  'Horse': 'Farm Animals',
  'Cow': 'Farm Animals',
  'Sheep': 'Farm Animals',
  'Goat': 'Farm Animals',
  'Pig': 'Farm Animals',
  
  // Domestic
  'Dogs': 'Domestic',
  'Cats': 'Domestic',
  'Birds': 'Domestic',
  'Rabbits': 'Domestic',
  'Hamsters': 'Domestic',
  
  // Reptiles
  'Snake': 'Reptiles',
  'Lizard': 'Reptiles',
  'Turtle': 'Reptiles',
  'Gecko': 'Reptiles',
  'Chameleon': 'Reptiles',
  
  // Aquatic
  'Fish': 'Aquatic',
  'Frog': 'Aquatic',
  'Newt': 'Aquatic',
  'Axolotl': 'Aquatic',
  
  // Invertebrates
  'Spider': 'Invertebrates',
  'Scorpion': 'Invertebrates',
  'Crab': 'Invertebrates',
  'Snail': 'Invertebrates',
  'Millipede': 'Invertebrates'
};

// Also define GENERAL_CATEGORIES so we can look up category IDs from names
const GENERAL_CATEGORIES = [
  {
    id: 'all',
    name: 'All',
    icon: 'paw-outline',
  },
  {
    id: 'farm_animals',
    name: 'Farm Animals',
    icon: 'horse',
  },
  {
    id: 'domestic',
    name: 'Domestic',
    icon: 'paw',
  },
  {
    id: 'reptiles',
    name: 'Reptiles',
    icon: 'snake',
  },
  {
    id: 'aquatic',
    name: 'Aquatic',
    icon: 'fish',
  },
  {
    id: 'invertebrates',
    name: 'Invertebrates',
    icon: 'spider',
  }
];

const ServiceCreationModal = ({ 
  visible, 
  onClose,
  onSave,
  initialService = null,
  setHasUnsavedChanges 
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(STEPS.CATEGORY_SELECTION.id);
  const [serviceData, setServiceData] = useState({
    generalCategories: [],
    animalTypes: [],
    serviceName: '',
    serviceDescription: '',
    isOvernight: false,
    rates: {
      base_rate: '',
      base_rate_unit: 'Per Visit',
      additionalAnimalRate: '',
      additionalAnimalThreshold: '1',
      hasHolidayRate: false,
      holidayRate: '0',
      isPercent: true
    },
    additionalRates: []
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingCustomRate, setIsAddingCustomRate] = useState(false);
  const showToast = useToast();

  // Reset state when modal is opened
  useEffect(() => {
    if (visible) {
      setCurrentStep(STEPS.CATEGORY_SELECTION.id);
      setError(null);
      
      if (initialService) {
        debugLog('MBA123456', 'Initializing with service data:', initialService);
        setIsEditMode(true);
        
        // Extract animal types from the object
        let animalTypesArray = [];
        
        // Log the animal types we're working with
        if (initialService.animalTypes && initialService.animalTypes.length > 0) {
          // If animalTypes is already provided in the expected format, use it directly
          debugLog('MBA123456', 'Using pre-formatted animalTypes array:', initialService.animalTypes);
          animalTypesArray = initialService.animalTypes;
        } else if (initialService.animal_types) {
          debugLog('MBA123456', 'Using animal_types from backend:', initialService.animal_types);
          
          // Handle if animal_types is a dictionary mapping animal types to categories
          if (typeof initialService.animal_types === 'object' && !Array.isArray(initialService.animal_types)) {
            debugLog('MBA123456', 'Processing animal_types as dictionary');
            Object.entries(initialService.animal_types).forEach(([animalName, categoryName]) => {
              // Find the category ID for this category name
              const category = GENERAL_CATEGORIES.find(cat => cat.name === categoryName);
              debugLog('MBA123456', `Adding animal: ${animalName}, category: ${categoryName}, categoryId: ${category?.id || 'not found'}`);
              
              animalTypesArray.push({
                name: animalName,
                categoryName: categoryName,
                categoryId: category ? category.id : null, 
                isCustom: false
              });
            });
          }
        } else {
          debugLog('MBA123456', 'No animal types found in data');
        }
        
        debugLog('MBA123456', 'Final converted animal types:', animalTypesArray);
        
        // Parse holiday rate
        let holidayRate = '0';
        let isPercent = true;
        
        if (initialService.holiday_rate) {
          if (typeof initialService.holiday_rate === 'string') {
            if (initialService.holiday_rate.includes('%')) {
              holidayRate = initialService.holiday_rate.replace('%', '');
              isPercent = true;
            } else if (initialService.holiday_rate.includes('$')) {
              holidayRate = initialService.holiday_rate.replace('$', '');
              isPercent = false;
            } else {
              holidayRate = initialService.holiday_rate;
              isPercent = initialService.holiday_rate_is_percent !== undefined 
                ? initialService.holiday_rate_is_percent 
                : true;
            }
          } else {
            holidayRate = initialService.holiday_rate.toString();
            isPercent = initialService.holiday_rate_is_percent !== undefined 
              ? initialService.holiday_rate_is_percent 
              : true;
          }
        }
        
        // Format additional rates
        let additionalRates = [];
        if (initialService.additional_rates && Array.isArray(initialService.additional_rates)) {
          additionalRates = initialService.additional_rates.map(rate => ({
            title: rate.title,
            rate: rate.rate,
            description: rate.description || ''
          }));
        }
        
        // Set the service data with the provided initial values
        setServiceData({
          service_id: initialService.service_id,
          generalCategories: [], // We don't need to populate this as it's derived from animalTypes
          animalTypes: animalTypesArray,
          serviceName: initialService.service_name || '',
          serviceDescription: initialService.description || '',
          isOvernight: initialService.is_overnight || false,
          rates: {
            base_rate: initialService.base_rate || '',
            base_rate_unit: initialService.unit_of_time || 'Per Visit',
            additionalAnimalRate: initialService.additional_animal_rate || '',
            additionalAnimalThreshold: initialService.applies_after?.toString() || '1',
            hasHolidayRate: holidayRate !== '0',
            holidayRate: holidayRate,
            isPercent: isPercent
          },
          additionalRates: additionalRates
        });
      } else {
        // Reset to default state if not in edit mode
        setIsEditMode(false);
        setServiceData({
          generalCategories: [],
          animalTypes: [],
          serviceName: '',
          serviceDescription: '',
          isOvernight: false,
          rates: {
            base_rate: '',
            base_rate_unit: 'Per Visit',
            additionalAnimalRate: '',
            additionalAnimalThreshold: '1',
            hasHolidayRate: false,
            holidayRate: '0',
            isPercent: true
          },
          additionalRates: []
        });
      }
    }
  }, [visible, initialService]);

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case STEPS.CATEGORY_SELECTION.id:
        return serviceData.animalTypes?.length > 0;
      
      case STEPS.SERVICE_DETAILS.id:
        return (
          serviceData.serviceName?.trim() &&
          serviceData.serviceDescription?.trim()
        );
      
      case STEPS.RATES_AND_REVIEW.id:
        const hasValidBaseRate = serviceData.rates?.base_rate && 
          parseFloat(serviceData.rates.base_rate) > 0;
        const hasValidAdditionalRate = !serviceData.rates?.additionalAnimalRate || 
          parseFloat(serviceData.rates.additionalAnimalRate) >= 0;
        
        return hasValidBaseRate && hasValidAdditionalRate;
      
      default:
        return false;
    }
  };

  // Direct API call function that doesn't depend on state
  const callServiceApi = async () => {
    debugLog('MBAno34othg0v', 'Directly calling API without state dependencies');
    
    debugLog('MBA54321', 'Original serviceData:', serviceData);
    setIsSubmitting(true);
    
    try {
      // Format animal types as a dictionary mapping animal types to their categories
      const animalTypesDict = {};
      
      serviceData.animalTypes.forEach(animalType => {
        const animalName = typeof animalType === 'string' ? animalType : animalType.name;
        
        // Use the hardcoded ANIMAL_CATEGORIES mapping
        if (ANIMAL_CATEGORIES[animalName]) {
          animalTypesDict[animalName] = ANIMAL_CATEGORIES[animalName];
        } else {
          // For custom animals, use the category name if it exists
          if (typeof animalType === 'object' && animalType.categoryName) {
            animalTypesDict[animalName] = animalType.categoryName;
          } else {
            animalTypesDict[animalName] = 'Other';
          }
        }
      });
      
      // Log animal types dictionary for debugging
      debugLog('MBA54321', 'Animal types dictionary created:', animalTypesDict);
      
      // Check what type of data we have for generalCategories (for backward compatibility)
      const categories = serviceData.generalCategories.map(cat => 
        typeof cat === 'string' ? cat : (cat.name || 'Uncategorized')
      );
      
      // Format holiday rate with appropriate symbol based on type
      const holidayRateValue = serviceData.rates.holidayRate || '0';
      const holidayRateString = holidayRateValue && holidayRateValue !== '0' ? 
        (serviceData.rates.isPercent ? `${holidayRateValue}%` : `$${holidayRateValue}`) : 
        '0';
      
      // Format the data according to the backend's expected format
      const formattedData = {
        service_name: serviceData.serviceName,
        description: serviceData.serviceDescription,
        animal_types: animalTypesDict,
        base_rate: serviceData.rates.base_rate,
        additional_animal_rate: serviceData.rates.additionalAnimalRate || '0',
        holiday_rate: holidayRateString,
        applies_after: parseInt(serviceData.rates.additionalAnimalThreshold) || 1,
        unit_of_time: serviceData.rates.base_rate_unit,
        is_overnight: serviceData.isOvernight || false,
        additional_rates: serviceData.additionalRates.map(rate => ({
          title: rate.title,
          description: rate.description || '',
          rate: rate.rate
        }))
      };
      
      // If in edit mode, include the service_id in the formatted data
      if (isEditMode && serviceData.service_id) {
        formattedData.service_id = serviceData.service_id;
      }
      
      debugLog('MBA54321', 'Formatted data for backend:', formattedData);
      
      let response;
      
      // Call the appropriate API based on edit mode
      if (isEditMode && serviceData.service_id) {
        response = await updateService(formattedData);
        debugLog('MBA54321', 'Service updated successfully, response:', response);
      } else {
        response = await createService(formattedData);
        debugLog('MBA54321', 'Service created successfully, response:', response);
      }
      
      // Show success toast
      showToast({
        message: isEditMode ? 'Service updated successfully!' : 'Service created successfully!',
        type: 'success',
        duration: 3000
      });
      
      // Format the data according to what ServiceManager expects
      const serviceManagerData = {
        // Use the service_id from the response
        service_id: response.service_id,
        // Use the formatted service_name from the response if available
        serviceName: response.service_name || serviceData.serviceName,
        serviceDescription: serviceData.serviceDescription,
        // Use the formatted unit_of_time from the response if available
        lengthOfService: response.unit_of_time || serviceData.rates.base_rate_unit,
        isOvernight: serviceData.isOvernight || false,
        is_active: response.is_active !== undefined ? response.is_active : true,
        rates: {
          base_rate: serviceData.rates.base_rate,
          additionalAnimalRate: serviceData.rates.additionalAnimalRate || '0',
          holidayRate: holidayRateString
        },
        generalCategories: serviceData.generalCategories.map(cat => {
          if (typeof cat === 'string') {
            return {
              id: cat.toLowerCase().replace(/\s+/g, '_'),
              name: cat,
              isCustom: false
            };
          }
          return {
            id: cat.id || cat.name.toLowerCase().replace(/\s+/g, '_'),
            name: cat.name,
            isCustom: cat.isCustom || false
          };
        }),
        animalTypes: serviceData.animalTypes.map(type => {
          if (typeof type === 'string') {
            return {
              name: type,
              categoryId: null,
              isCustom: false
            };
          }
          
          // Use the categoryName if it exists, otherwise we need to include it
          return {
            name: type.name,
            categoryId: type.categoryId,
            categoryName: type.categoryName || 'Other', // Ensure categoryName is included
            isCustom: type.isCustom || false
          };
        }),
        additionalRates: serviceData.additionalRates.map(rate => ({
          label: rate.title,
          value: rate.rate,
          description: rate.description || ''
        }))
      };
      
      // If the response has additional_rates, use those instead
      if (response.additional_rates && Array.isArray(response.additional_rates)) {
        serviceManagerData.additionalRates = response.additional_rates.map(rate => ({
          label: rate.title,
          value: rate.rate,
          description: rate.description || ''
        }));
      }
      
      debugLog('MBA54321', 'Formatted data for ServiceManager:', serviceManagerData);
      
      // Call the onSave prop with properly formatted data
      if (onSave) {
        onSave(serviceManagerData);
      }
      
      // Reset form and close modal
      setServiceData({
        generalCategories: [],
        animalTypes: [],
        serviceName: '',
        serviceDescription: '',
        isOvernight: false,
        rates: {
          base_rate: '',
          base_rate_unit: 'Per Visit',
          additionalAnimalRate: '',
          additionalAnimalThreshold: '1',
          hasHolidayRate: false,
          holidayRate: '0',
          isPercent: true
        },
        additionalRates: []
      });
      
      setCurrentStep(STEPS.CATEGORY_SELECTION.id);
      setHasUnsavedChanges(true);
      onClose();
    } catch (error) {
      debugLog('MBA54321', 'Error saving service:', error);
      debugLog('MBA54321', 'Error response:', error.response?.data);
      
      // Show error toast
      showToast({
        message: `Failed to ${isEditMode ? 'update' : 'create'} service: ${error.response?.data?.error || error.message}`,
        type: 'error',
        duration: 4000
      });
      
      setError(`Failed to ${isEditMode ? 'update' : 'create'} service. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    debugLog('MBAno34othg0v', 'handleNext called, currentStep:', currentStep);
    
    if (!canProceedToNextStep()) {
      setError('Please complete all required fields before proceeding');
      return;
    }

    setError(null);
    if (currentStep < STEPS.RATES_AND_REVIEW.id) {
      setCurrentStep(prev => prev + 1);
    } else {
      // We're on the final step (Rates & Review)
      debugLog('MBAno34othg0v', 'Final step, checking for unsaved custom rates');
      
      // Signal to RatesAndReviewStep that we're attempting to update
      setIsAddingCustomRate(true);
      
      // Don't even call handleSaveService
      // We'll call the API directly from the RatesAndReviewStep when appropriate
    }
  };

  const handleSaveService = async () => {
    debugLog('MBAno34othg0v', 'DEPRECATED: handleSaveService called, this should not happen');
  };

  const handleBack = () => {
    if (currentStep > STEPS.CATEGORY_SELECTION.id) {
      setCurrentStep(prev => prev - 1);
    } else {
      onClose();
    }
  };

  const renderCurrentStep = () => {
    debugLog('MBA54321 Rendering step:', currentStep, 'with serviceData:', serviceData);
    
    switch (currentStep) {
      case STEPS.CATEGORY_SELECTION.id:
        return (
          <CategorySelectionStep
            serviceData={serviceData}
            setServiceData={setServiceData}
          />
        );
      case STEPS.SERVICE_DETAILS.id:
        return (
          <ServiceDetailsStep
            serviceData={serviceData}
            setServiceData={setServiceData}
          />
        );
      case STEPS.RATES_AND_REVIEW.id:
        return (
          <RatesAndReviewStep
            serviceData={serviceData}
            setServiceData={setServiceData}
            isUpdatingService={isAddingCustomRate}
            setIsUpdatingService={setIsAddingCustomRate}
            onProceedWithUpdate={callServiceApi}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleBack}
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.stepIndicatorContainer}>
            <StepProgressIndicator
              steps={Object.values(STEPS).map(step => step.name)}
              currentStep={currentStep}
            />
          </View>
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
            <View style={styles.content}>
              {renderCurrentStep()}
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBack}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>
                {currentStep > STEPS.CATEGORY_SELECTION.id ? 'Back' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.nextButton,
                (!canProceedToNextStep() || isSubmitting) && styles.disabledButton
              ]}
              onPress={handleNext}
              disabled={!canProceedToNextStep() || isSubmitting}
            >
              {isSubmitting && currentStep === STEPS.RATES_AND_REVIEW.id ? (
                <ActivityIndicator color={theme.colors.surface} size="small" />
              ) : (
                <Text style={[
                  styles.nextButtonText,
                  !canProceedToNextStep() && styles.disabledButtonText
                ]}>
                  {currentStep === STEPS.RATES_AND_REVIEW.id ? 
                    (isEditMode ? 'Update Service' : 'Create Service') : 
                    'Next'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    width: '100%',
  },
  modalContent: {
    width: '95%',
    maxWidth: Platform.OS === 'web' ? 550 : '100%',
    maxHeight: '90%',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  stepIndicatorContainer: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.modernBorder,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  nextButton: {
    flex: 1,
    backgroundColor: theme.colors.mainColors.main,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.placeHolderText,
  },
  nextButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: theme.colors.surface,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ServiceCreationModal; 