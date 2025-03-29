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
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import ServiceAndPetsCard from './bookingComponents/ServiceAndPetsCard';
import DateSelectionCard from './bookingComponents/DateSelectionCard';
import TimeSelectionCard from './bookingComponents/TimeSelectionCard';
import ReviewAndRatesCard from './bookingComponents/ReviewAndRatesCard';
import StepProgressIndicator from './common/StepProgressIndicator';
import { updateBookingDraftPetsAndServices, updateBookingDraftTimeAndDate } from '../api/API';
import { convertToUTC, formatDateForAPI, formatTimeForAPI } from '../utils/time_utils';
import { debugLog } from '../context/AuthContext';

const STEPS = {
  SERVICES_AND_PETS: {
    id: 0,
    name: 'Services & Pets'
  },
  DATE_SELECTION: {
    id: 1,
    name: 'Date Selection'
  },
  TIME_SELECTION: {
    id: 2,
    name: 'Time Selection'
  },
  REVIEW_AND_RATES: {
    id: 3,
    name: 'Review & Rates'
  }
};

const BookingStepModal = ({ 
  visible, 
  onClose,
  bookingId,
  onComplete,
  initialData = {}
}) => {
  const { is_DEBUG, screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;
  const [currentStep, setCurrentStep] = useState(STEPS.SERVICES_AND_PETS.id);
  const [bookingData, setBookingData] = useState({
    service: initialData.service || null,
    pets: initialData.pets || [],
    dates: initialData.dates || [],
    bookingType: initialData.bookingType || 'one-time',
    dateRangeType: initialData.dateRangeType || 'date-range',
    times: initialData.times || {
      startTime: '09:00',  // Default start time
      endTime: '17:00',    // Default end time
      isOvernightForced: false
    },
    rates: initialData.rates || {},
    dateSelectionData: null,
    dateRange: null,
  });
  const [error, setError] = useState(null);

  // Add effect to log initial data
  useEffect(() => {
    debugLog('MBA12345 Initial data received:', initialData);
    debugLog('MBA12345 Initial booking data state:', bookingData);
  }, [initialData]);

  const handleServiceSelect = (service) => {
    debugLog('MBA12345 Selected service:', service);
    setBookingData(prev => ({
      ...prev,
      service
    }));
  };

  const handlePetSelect = (pet) => {
    debugLog('MBA12345 Selected/deselected pet:', pet);
    
    const updatedPets = bookingData.pets.find(p => p.pet_id === pet.pet_id)
      ? bookingData.pets.filter(p => p.pet_id !== pet.pet_id)
      : [...bookingData.pets, pet];

    setBookingData(prev => ({
      ...prev,
      pets: updatedPets
    }));
  };

  const handleDateSelect = (dateData) => {
    debugLog('MBA12345 Selected dates:', dateData);
    setBookingData(prev => {
      // Preserve date range when switching to multiple-days
      let newDateRange = prev.dateRange;
      
      // Update date range based on the selection type
      if (dateData.rangeType === 'date-range' && dateData.startDate && dateData.endDate) {
        newDateRange = {
          startDate: dateData.startDate,
          endDate: dateData.endDate
        };
      } else if (dateData.rangeType === 'multiple-days') {
        // Keep the existing date range when in multiple-days mode
        newDateRange = prev.dateRange;
      } else if (!dateData.dates || dateData.dates.length === 0) {
        // Clear date range if all dates are cleared
        newDateRange = null;
      }

      return {
        ...prev,
        dates: dateData.dates || [],
        dateSelectionData: dateData,
        dateRange: newDateRange,
        dateRangeType: dateData.rangeType || prev.dateRangeType
      };
    });
  };

  const handleBookingTypeChange = (bookingType) => {
    debugLog('MBA12345 Booking type changed:', bookingType);
    setBookingData(prev => ({
      ...prev,
      bookingType,
      // Clear dates when changing booking type
      dates: []
    }));
  };

  const handleDateRangeTypeChange = (dateRangeType) => {
    debugLog('MBA12345 Date range type changed:', dateRangeType);
    setBookingData(prev => ({
      ...prev,
      dateRangeType
    }));
  };

  const handleTimeSelect = (timeData) => {
    debugLog('MBA12345 Selected times:', timeData);
    setBookingData(prev => {
      // Create a new times object that preserves any existing values
      const updatedTimes = {
        ...prev.times,
        startTime: timeData.startTime ? `${String(timeData.startTime.hours).padStart(2, '0')}:${String(timeData.startTime.minutes || 0).padStart(2, '0')}` : prev.times.startTime,
        endTime: timeData.endTime ? `${String(timeData.endTime.hours).padStart(2, '0')}:${String(timeData.endTime.minutes || 0).padStart(2, '0')}` : prev.times.endTime,
        isOvernightForced: timeData.isOvernightForced
      };

      debugLog('MBA12345 Previous times:', prev.times);
      debugLog('MBA12345 Updated times:', updatedTimes);

      return {
        ...prev,
        times: updatedTimes
      };
    });
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case STEPS.SERVICES_AND_PETS.id:
        return bookingData.service && bookingData.pets.length > 0;
      case STEPS.DATE_SELECTION.id:
        // Check if dateSelectionData exists and is valid
        return bookingData.dateSelectionData && bookingData.dateSelectionData.isValid;
      case STEPS.TIME_SELECTION.id:
        // Always allow proceeding from time selection since we have default times
        return true;
      case STEPS.REVIEW_AND_RATES.id:
        return true;
      // Add validation for other steps as they are implemented
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceedToNextStep()) {
      setError('Please complete all required fields before proceeding');
      return;
    }

    setError(null);
    if (currentStep < STEPS.REVIEW_AND_RATES.id) {
      // If we're on the first step, update the draft with selected service and pets
      if (currentStep === STEPS.SERVICES_AND_PETS.id) {
        try {
          await updateBookingDraftPetsAndServices(bookingId, {
            service_id: bookingData.service?.service_id,
            pets: bookingData.pets
          });
        } catch (error) {
          debugLog('MBA54321 Error updating booking draft:', error);
          setError('Failed to save service and pet selections');
          return;
        }
      }
      
      // Handle time selection calculations before proceeding
      if (currentStep === STEPS.TIME_SELECTION.id) {
        try {
          debugLog('MBA54321 Original booking data:', bookingData);

          // Format dates for API
          const startDate = formatDateForAPI(bookingData.dateRange.startDate);
          const endDate = formatDateForAPI(bookingData.dateRange.endDate);

          // Format times for conversion
          debugLog('MBA54321 Time data before formatting:', {
            startTime: bookingData.times.startTime,
            endTime: bookingData.times.endTime
          });

          // No need to format times again since they're already in HH:mm format
          const startTime = bookingData.times.startTime;
          const endTime = bookingData.times.endTime;

          debugLog('MBA54321 Formatted dates and times:', {
            startDate,
            endDate,
            startTime,
            endTime
          });

          // Convert times to UTC
          const startTimeUTC = convertToUTC(
            startDate,
            startTime,
            'US/Mountain' // TODO: Get actual user timezone from context
          );

          const endTimeUTC = convertToUTC(
            endDate,
            endTime,
            'US/Mountain' // TODO: Get actual user timezone from context
          );

          debugLog('MBA54321 Converted times to UTC:', {
            startTimeUTC,
            endTimeUTC
          });

          // Check if dates shifted in UTC conversion
          const hasDateShift = startDate !== startTimeUTC.date || endDate !== endTimeUTC.date;
          const nightCountAdjustment = hasDateShift ? -1 : 0;

          debugLog('MBA54321 Date shift detected:', {
            hasDateShift,
            nightCountAdjustment,
            originalStartDate: startDate,
            originalEndDate: endDate,
            utcStartDate: startTimeUTC.date,
            utcEndDate: endTimeUTC.date
          });

          // Call the API with UTC times and dates
          const response = await updateBookingDraftTimeAndDate(
            bookingId,
            startTimeUTC.date,  // Use the UTC date
            endTimeUTC.date,    // Use the UTC date
            startTimeUTC.time,
            endTimeUTC.time,
            nightCountAdjustment
          );

          debugLog('MBA54321 Received response from updateBookingDraftTimeAndDate:', response);

          // Update booking data with the response's draft_data
          if (response?.draft_data) {
            setBookingData(prev => ({
              ...prev,
              ...response.draft_data
            }));
          } else {
            debugLog('MBA54321 No draft_data in response:', response);
          }

        } catch (error) {
          debugLog('MBA54321 Error calculating booking totals:', error);
          debugLog('MBA54321 Error stack:', error.stack);
          debugLog('MBA54321 Error details:', {
            message: error.message,
            name: error.name,
            response: error.response?.data
          });
          setError('Failed to calculate booking totals');
          return;
        }
      }

      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(bookingData);
    }
  };

  const handleBack = () => {
    if (currentStep > STEPS.SERVICES_AND_PETS.id) {
      setCurrentStep(prev => prev - 1);
    } else {
      onClose();
    }
  };

  const renderCurrentStep = () => {
    debugLog('MBA54321 Rendering step:', currentStep, 'with bookingData:', bookingData);
    
    switch (currentStep) {
      case STEPS.SERVICES_AND_PETS.id:
        return (
          <ServiceAndPetsCard
            bookingId={bookingId}
            onServiceSelect={handleServiceSelect}
            onPetSelect={handlePetSelect}
            selectedService={bookingData.service}
            selectedPets={bookingData.pets}
          />
        );
      case STEPS.DATE_SELECTION.id:
        return (
          <DateSelectionCard
            selectedDates={bookingData.dates}
            onDateSelect={handleDateSelect}
            bookingType={bookingData.bookingType}
            dateRangeType={bookingData.dateRangeType}
            initialDateRange={bookingData.dateRange}
            isOvernightForced={bookingData.service?.isOvernightForced}
          />
        );
      case STEPS.TIME_SELECTION.id:
        return (
          <TimeSelectionCard
            onTimeSelect={handleTimeSelect}
            initialTimes={bookingData.times}
            dateRange={bookingData.dateRange}
            selectedService={bookingData.service}
          />
        );
      case STEPS.REVIEW_AND_RATES.id:
        return (
          <ReviewAndRatesCard
            bookingData={bookingData}
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
            >
              <Text style={styles.cancelButtonText}>
                {currentStep > STEPS.SERVICES_AND_PETS.id ? 'Back' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceedToNextStep() && styles.disabledButton
              ]}
              onPress={handleNext}
              disabled={!canProceedToNextStep()}
            >
              <Text style={[
                styles.nextButtonText,
                !canProceedToNextStep() && styles.disabledButtonText
              ]}>
                {currentStep === STEPS.REVIEW_AND_RATES.id ? 'Confirm Booking' : 'Next'}
              </Text>
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
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
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

export default BookingStepModal; 