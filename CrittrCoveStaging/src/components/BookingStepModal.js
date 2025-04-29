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
import { updateBookingDraftPetsAndServices, updateBookingDraftTimeAndDate, createBookingFromDraft } from '../api/API';
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
  initialData = {},
  navigation
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

          // Format times for API (in 24-hour format)
          const startTime = formatTimeForAPI(bookingData.times.startTime);
          const endTime = formatTimeForAPI(bookingData.times.endTime);

          debugLog('MBA54321 Local dates and times:', {
            startDate,
            endDate,
            startTime,
            endTime
          });

          // Convert local times to UTC before sending to backend
          const { date: utcStartDate, time: utcStartTime } = convertToUTC(
            startDate,
            startTime,
            'US/Mountain'
          );

          const { date: utcEndDate, time: utcEndTime } = convertToUTC(
            endDate,
            endTime,
            'US/Mountain'
          );

          debugLog('MBA54321 UTC dates and times:', {
            utcStartDate,
            utcStartTime,
            utcEndDate,
            utcEndTime
          });

          // Call the API with UTC times and dates
          const response = await updateBookingDraftTimeAndDate(
            bookingId,
            utcStartDate,
            utcEndDate,
            utcStartTime,
            utcEndTime
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
      // We're on the final step (REVIEW_AND_RATES), so create the booking
      try {
        setError(null);
        
        // Check if we have a conversation ID from the booking data
        if (!bookingData.conversation_id) {
          setError('Missing conversation information');
          return;
        }
        
        debugLog('MBA66777 Creating booking from draft with conversation ID:', bookingData.conversation_id);
        
        // Call the API to create a booking from the draft
        const response = await createBookingFromDraft(bookingData.conversation_id);
        
        debugLog('MBA66777 Booking created successfully:', response);
        
        // Create a booking message from the response data
        // The booking data is in the message object of the response
        const bookingMessageData = response.message || {};
        const bookingId = response.booking_id;
        
        const bookingMessage = {
          id: Date.now().toString(), // Temporary ID for UI purposes
          type_of_message: 'send_approved_message',
          metadata: {
            booking_id: bookingId,
            service_type: bookingMessageData.service_type || bookingData.service?.service_name,
            occurrences: bookingMessageData.occurrences || [],
            cost_summary: bookingMessageData.cost_summary || {
              total_client_cost: bookingMessageData.occurrences?.[0]?.cost_summary?.total_client_cost,
              total_sitter_payout: bookingMessageData.occurrences?.[0]?.cost_summary?.total_sitter_payout
            }
          },
          content: 'Approval Request',
          sent_by_other_user: false,
          timestamp: new Date().toISOString()
        };
        
        // Close the modal and pass the new booking data to the parent component
        onComplete({
          ...bookingData,
          booking_id: bookingId,
          status: 'Pending Client Approval',
          message: bookingMessage // Include the new message to be added to the message list
        });
      } catch (error) {
        debugLog('MBA66777 Error creating booking:', error);
        setError('Failed to create booking. Please try again.');
        
        // Still try to close the modal in case the booking was actually created
        // The backend handles duplicate bookings, so it's safe to let the user try again if needed
        setTimeout(() => {
          // Short timeout to let the user see the error
          onComplete({
            ...bookingData,
            error: true,
            errorMessage: error.message
          });
        }, 3000);
      }
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
            navigation={navigation}
            onClose={onClose}
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
            bookingId={bookingId}
            onRatesUpdate={(updatedData) => {
              debugLog('MBA54321 Rates updated:', updatedData);
              setBookingData(prev => ({
                ...prev,
                occurrences: updatedData.occurrences,
                cost_summary: updatedData.cost_summary
              }));
            }}
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
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
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