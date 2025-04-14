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
import { createService } from '../api/API';
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
  const showToast = useToast();

  // Reset state when modal is opened
  useEffect(() => {
    if (visible) {
      setCurrentStep(STEPS.CATEGORY_SELECTION.id);
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
      setError(null);
    }
  }, [visible]);

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case STEPS.CATEGORY_SELECTION.id:
        return serviceData.generalCategories?.length > 0 && serviceData.animalTypes?.length > 0;
      
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
        const hasValidHolidayRate = !serviceData.rates?.hasHolidayRate || 
          (serviceData.rates.holidayRate && parseFloat(serviceData.rates.holidayRate) >= 0);
        
        return hasValidBaseRate && hasValidAdditionalRate && hasValidHolidayRate;
      
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      setError('Please complete all required fields before proceeding');
      return;
    }

    setError(null);
    if (currentStep < STEPS.RATES_AND_REVIEW.id) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSaveService();
    }
  };

  const handleSaveService = async () => {
    debugLog('MBA54321', 'Original serviceData:', serviceData);
    setIsSubmitting(true);
    
    try {
      // Check what type of data we have for animalTypes
      let animalType = 'Other';
      if (serviceData.animalTypes.length > 0) {
        const firstAnimalType = serviceData.animalTypes[0];
        animalType = typeof firstAnimalType === 'string' ? 
          firstAnimalType : 
          (firstAnimalType.name || 'Other');
      }
      
      // Check what type of data we have for generalCategories
      const categories = serviceData.generalCategories.map(cat => 
        typeof cat === 'string' ? cat : (cat.name || 'Uncategorized')
      );
      
      // Format holiday rate with appropriate symbol based on type
      const holidayRateValue = serviceData.rates.holidayRate || '0';
      const holidayRateString = holidayRateValue && holidayRateValue !== '0' ? 
        (serviceData.rates.isPercent ? `${holidayRateValue}%` : `$${holidayRateValue}`) : 
        '0';
      
      // Log the holiday rate values for debugging
      debugLog('MBA54321', 'Holiday rate value:', holidayRateValue);
      debugLog('MBA54321', 'Holiday rate is percent:', serviceData.rates.isPercent);
      debugLog('MBA54321', 'Formatted holiday rate:', holidayRateString);
      
      // Format the data according to the backend's expected format
      const formattedData = {
        service_name: serviceData.serviceName,
        description: serviceData.serviceDescription,
        animal_type: animalType,
        categories: categories,
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
      
      debugLog('MBA54321', 'Formatted data for backend:', formattedData);
      
      // Call the API to create the service
      const response = await createService(formattedData);
      debugLog('MBA54321', 'Service created successfully, response:', response);
      
      // Show success toast
      showToast({
        message: 'Service created successfully!',
        type: 'success',
        duration: 3000
      });
      
      // Format the data according to what ServiceManager expects
      const serviceManagerData = {
        serviceName: serviceData.serviceName,
        serviceDescription: serviceData.serviceDescription,
        lengthOfService: serviceData.rates.base_rate_unit,
        isOvernight: serviceData.isOvernight || false,
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
          return {
            name: type.name,
            categoryId: type.categoryId,
            isCustom: type.isCustom || false
          };
        }),
        additionalRates: serviceData.additionalRates.map(rate => ({
          label: rate.title,
          value: rate.rate,
          description: rate.description || ''
        }))
      };
      
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
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      debugLog('MBA54321', 'Error creating service:', error);
      debugLog('MBA54321', 'Error response:', error.response?.data);
      
      // Show error toast
      showToast({
        message: `Failed to create service: ${error.response?.data?.error || error.message}`,
        type: 'error',
        duration: 4000
      });
      
      setError('Failed to create service. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
                  {currentStep === STEPS.RATES_AND_REVIEW.id ? 'Create Service' : 'Next'}
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