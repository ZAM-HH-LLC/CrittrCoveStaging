import React, { useState, useContext, useEffect, useRef } from 'react';
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
import { AuthContext, debugLog } from '../context/AuthContext';
import ServiceAndPetsCard from './bookingComponents/ServiceAndPetsCard';
import DateSelectionCard from './bookingComponents/DateSelectionCard';
import TimeSelectionCard from './bookingComponents/TimeSelectionCard';
import ReviewAndRatesCard from './bookingComponents/ReviewAndRatesCard';
import StepProgressIndicator from './common/StepProgressIndicator';
import TosRequiredModal from './modals/TosRequiredModal';
import { updateBookingDraftPetsAndServices, 
         updateBookingDraftTimeAndDate, 
         updateBookingDraftMultipleDays,
         updateBookingDraftRecurring,
         createBookingFromDraft,
         getBookingDraftDatesAndTimes
} from '../api/API';
import { convertToUTC, formatDateForAPI, formatTimeForAPI, parseOccurrencesForBookingSteps } from '../utils/time_utils';

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
  debugLog('MBA2ou09hv595', 'BookingStepModal component rendered/re-rendered', {
    visible,
    bookingId,
    timestamp: new Date().toISOString()
  });
  const { is_DEBUG, screenWidth, timeSettings } = useContext(AuthContext);
  const isSmallScreen = screenWidth < 600;
  const isDesktop = screenWidth > 768;
  const [currentStep, setCurrentStep] = useState(STEPS.SERVICES_AND_PETS.id);
  const [bookingData, setBookingData] = useState({
    service: initialData?.service || null,
    pets: initialData?.pets || [],
    dates: initialData?.dates || [],
    bookingType: initialData?.bookingType || 'one-time',
    dateRangeType: initialData?.dateRangeType || 'date-range',
    times: initialData?.times || {
      startTime: '09:00',  // Default start time
      endTime: '17:00',    // Default end time
      isOvernightForced: false,
      hasIndividualTimes: false  // Default to false
    },
    rates: initialData?.rates || {},
    dateSelectionData: null,
    dateRange: null,
    hasFetchedDates: false, // Track whether dates have been fetched
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [timeValidationModal, setTimeValidationModal] = useState({ visible: false, message: '' });
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Function to check if user has already agreed to terms (matches ReviewAndRatesCard logic)
  const getTosStatus = () => {
    if (!bookingData) return undefined;
    // For professionals creating a booking, they are the "pro" side
    // For clients creating a booking, they are the "client" side
    // Since BookingStepModal is used by professionals, check pro_agreed_tos
    return bookingData.pro_agreed_tos;
  };
  
  // Add persistent state for preventing duplicate API calls
  const [hasInitializedServices, setHasInitializedServices] = useState(false);
  const [hasInitializedPets, setHasInitializedPets] = useState(false);
  const [lastInitializedBookingId, setLastInitializedBookingId] = useState(null);
  
  // Store fetched data at parent level to prevent loss during re-renders
  const [availableServices, setAvailableServices] = useState([]);
  const [availablePets, setAvailablePets] = useState([]);
  
  // Use refs to track initialization state without causing re-renders
  const initializationRef = useRef({
    lastBookingId: null,
    servicesInitialized: false,
    petsInitialized: false,
    servicesInProgress: false,
    petsInProgress: false
  });

  // Add effect to log initial data
  useEffect(() => {
    debugLog('MBA12345 Initial data received:', initialData);
    debugLog('MBA12345 Initial booking data state:', bookingData);
  }, [initialData]);

  // New effect to fetch draft dates and times
  useEffect(() => {
    const fetchDraftDatesAndTimes = async () => {
      if (!bookingId || !visible) return;
      
      // Only fetch if we haven't already loaded dates, or if they're empty
      if (bookingData.hasFetchedDates) {
        debugLog('MBA2j3kbr9hve4: Skipping fetch as hasFetchedDates is true');
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        debugLog('MBA2j3kbr9hve4: Fetching draft dates and times for booking ID:', bookingId);
        const response = await getBookingDraftDatesAndTimes(bookingId);
        debugLog('MBA2j3kbr9hve4: Received draft dates and times:', response);
        
        if (response) {
          // Use our utility function to parse occurrences correctly with user's timezone
          const userTimezone = timeSettings?.timezone || 'US/Mountain';
          debugLog('MBA2j3kbr9hve4: Using timezone for parsing occurrences:', {
            userTimezone,
            timeSettings,
            fallbackUsed: !timeSettings?.timezone
          });
          const parsedData = parseOccurrencesForBookingSteps(response.occurrences || [], userTimezone);
          
          debugLog('MBA2j3kbr9hve4: Parsed draft dates and times:', parsedData);
          
          // Check if this is an overnight service
          // First check the service from the response 
          const serviceName = (response.service_details?.service_type || '').toLowerCase();
          const isOvernightService = response.service_details?.is_overnight === true;
          
          debugLog('MBA2j3kbr9hve4: Is overnight service from response:', isOvernightService);
          debugLog('MBA2j3kbr9hve4: Service name:', serviceName);
          debugLog('MBA2j3kbr9hve4: Full service details from response:', response.service_details);

          // Update bookingData with the service information to ensure we have the overnight status
          let serviceData = null;
          if (response.service_details) {
            serviceData = {
              ...response.service_details,
              service_id: response.service_details.service_id,
              service_name: response.service_details.service_type,
              is_overnight: isOvernightService, // Using our improved overnight detection
            };
            debugLog('MBA2j3kbr9hve4: Setting service data with overnight status:', serviceData);
          }
          
          // Check for occurrences to determine if this is an overnight booking
          if (response.occurrences && response.occurrences.length > 0) {
            // Check if we can determine if this is an overnight booking from the dates
            const firstOcc = response.occurrences[0];
            const lastOcc = response.occurrences[response.occurrences.length - 1];
            
            // If first and last occurrence have different dates, this might be an overnight range
            if (firstOcc.start_date !== lastOcc.end_date) {
              const startDate = new Date(firstOcc.start_date);
              const endDate = new Date(lastOcc.end_date);
              const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
              
              // If the difference is 1+ days, it's likely an overnight booking
              if (daysDifference >= 1) {
                debugLog('MBA2j3kbr9hve4: DETECTED OVERNIGHT from date range:', {
                  startDate: firstOcc.start_date,
                  endDate: lastOcc.end_date,
                  daysDifference
                });
                
                // Force overnight mode
                if (serviceData) {
                  serviceData.is_overnight = true;
                }
              }
            }
          }
            
          // Special check to handle a possible case where we have a multi-day date range
          // with only start and end dates in individual occurrences (instead of all dates)
          if (response.occurrences?.length === 2) {
            try {
              const occ1Date = new Date(response.occurrences[0].start_date);
              const occ2Date = new Date(response.occurrences[1].start_date);
              
              // Check if they are more than 1 day apart
              const daysBetween = Math.abs(Math.round((occ2Date - occ1Date) / (1000 * 60 * 60 * 24)));
              
              if (daysBetween > 1) {
                debugLog('MBA2j3kbr9hve4: DETECTED POTENTIAL OVERNIGHT from date distance:', {
                  date1: response.occurrences[0].start_date,
                  date2: response.occurrences[1].start_date,
                  daysBetween
                });
                
                // Force overnight mode if we have more than 1 day between occurrences
                if (serviceData) {
                  serviceData.is_overnight = true;
                }
              }
            } catch (err) {
              debugLog('MBA2j3kbr9hve4: Error checking occ dates:', err);
            }
          }
            
          // Ensure we set a correct dateRangeType
          // If we have detected an overnight service, force 'date-range' mode
          let dateRangeType = response.date_range_type || 'date-range';
          if (isOvernightService || (serviceData && serviceData.is_overnight)) {
            dateRangeType = 'date-range';
            debugLog('MBA2j3kbr9hve4: Forcing date-range type for overnight service');
          } 
          // Otherwise, if we have non-consecutive dates, force multiple-days mode
          else if (parsedData.dates && parsedData.dates.length > 1 && !parsedData.dateRange) {
            dateRangeType = 'multiple-days';
            debugLog('MBA2j3kbr9hve4: Non-consecutive dates detected, forcing multiple-days mode');
          }
            
          // Determine final overnight status
          const isOvernightForced = isOvernightService || (serviceData && serviceData.is_overnight);
          
          debugLog('MBA2j3kbr9hve4: Final overnight determination:', {
            initialCheck: isOvernightService,
            afterOccurrenceChecks: serviceData?.is_overnight,
            finalIsOvernightForced: isOvernightForced
          });
          
          setBookingData(prev => ({
            ...prev,
            dates: parsedData.dates || [],
            dateRange: parsedData.dateRange,
            times: {
              ...(parsedData.defaultTimes || {}),
              ...parsedData.individualTimes,
              individualTimeRanges: parsedData.individualTimes || {},
              allTimesAreTheSame: parsedData.allTimesAreTheSame,
              hasIndividualTimes: !parsedData.allTimesAreTheSame,
              isOvernightForced: isOvernightForced
            },
            dateRangeType: dateRangeType,
            bookingType: response.booking_type || prev.bookingType || 'one-time',
            hasFetchedDates: true, // Flag to prevent refetching
            // Update service information with overnight status
            service: serviceData || prev.service
          }));
        }
      } catch (error) {
        debugLog('MBA2j3kbr9hve4: Error fetching draft dates and times:', error);
        // Only show an error if we're not already on step 1 (service selection)
        // This prevents showing an error when we're editing an existing booking
        // that might not have dates/times yet
        if (currentStep > STEPS.SERVICES_AND_PETS.id) {
          setError('Failed to load booking details. Please try again.');
        } else {
          // Log the error but don't show it to the user on the first step
          debugLog('MBA2j3kbr9hve4: Suppressing error on first step:', error.message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDraftDatesAndTimes();
  }, [bookingId, visible, currentStep, bookingData.hasFetchedDates]);

  // Effect to ensure dateRangeType is always 'date-range' for overnight services
  useEffect(() => {
    // CRITICAL FIX: Only check the service itself, not previous times state
    if (bookingData.service?.is_overnight) {
      debugLog('MBA2j3kbr9hve4: Detected overnight service, ensuring dateRangeType is date-range');
      
      // If we have an overnight service but dateRangeType is not date-range, update it
      if (bookingData.dateRangeType !== 'date-range') {
        debugLog('MBA2j3kbr9hve4: Updating dateRangeType from', bookingData.dateRangeType, 'to date-range');
        
        setBookingData(prev => ({
          ...prev,
          dateRangeType: 'date-range'
        }));
      }
    }
  }, [bookingData.service?.is_overnight]); // CRITICAL FIX: Only depend on service.is_overnight

  const handleServiceSelect = (service) => {
    debugLog('MBA12345 Selected service:', service);
    
    // Check if the service has an overnight property or name contains overnight-related terms
    const serviceName = (service?.service_name || '').toLowerCase();
    
    // Determine if this is an overnight service from the is_overnight flag or name
    const isOvernight = service?.is_overnight === true;
    
    debugLog('MBA2j3kbr9hve4: Service overnight status:', {
      isOvernight,
      serviceData: service,
      serviceName
    });
    
    setBookingData(prev => {
      // CRITICAL FIX: Reset times state to clean defaults when service changes
      // This prevents carrying over stale isOvernightForced values
      const cleanDefaultTimes = {
        startTime: '09:00',
        endTime: '17:00',
        isOvernightForced: isOvernight, // Only set based on current service
        hasIndividualTimes: isOvernight ? false : (prev.times?.hasIndividualTimes || false) // Reset individual times for overnight
      };
      
      debugLog('MBA2j3kbr9hve4: CRITICAL FIX - Reset times with clean defaults:', {
        previousTimes: prev.times,
        newCleanTimes: cleanDefaultTimes,
        serviceIsOvernight: isOvernight
      });
      
      // Also update the service object to ensure is_overnight is set correctly
      const updatedService = {
        ...service,
        is_overnight: isOvernight
      };
      
      return {
        ...prev,
        service: updatedService,
        // CRITICAL FIX: Use clean default times to prevent stale state
        times: cleanDefaultTimes,
        // Force date-range selection mode for overnight services
        dateRangeType: isOvernight ? 'date-range' : prev.dateRangeType
      };
    });
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

  // New batch pet selection function for auto-selection from server
  const handleBatchPetSelect = (petsArray) => {
    debugLog('MBA12345 Batch selecting pets:', petsArray.map(p => ({ id: p.pet_id, name: p.name })));
    
    setBookingData(prev => ({
      ...prev,
      pets: petsArray
    }));
  };

  // Functions to manage initialization state at parent level
  const shouldFetchServices = () => {
    if (!bookingId) return false;
    
    const currentRef = initializationRef.current;
    
    // If this is a new bookingId, reset everything
    if (bookingId !== currentRef.lastBookingId) {
      currentRef.lastBookingId = bookingId;
      currentRef.servicesInitialized = false;
      currentRef.petsInitialized = false;
      currentRef.servicesInProgress = false;
      currentRef.petsInProgress = false;
      
      // Update state for UI consistency
      setLastInitializedBookingId(bookingId);
      setHasInitializedServices(false);
      setHasInitializedPets(false);
      
      // Reset data when booking ID changes
      setAvailableServices([]);
      setAvailablePets([]);
    }
    
    // Only fetch if not already initialized and not in progress
    const shouldFetch = !currentRef.servicesInitialized && !currentRef.servicesInProgress;
    
    if (shouldFetch) {
      currentRef.servicesInProgress = true;
    }
    
    return shouldFetch;
  };

  const shouldFetchPets = () => {
    if (!bookingId) return false;
    
    const currentRef = initializationRef.current;
    
    // Only fetch if not already initialized and not in progress
    const shouldFetch = !currentRef.petsInitialized && !currentRef.petsInProgress;
    
    if (shouldFetch) {
      currentRef.petsInProgress = true;
    }
    
    return shouldFetch;
  };

  const markServicesInitialized = (isError = false) => {
    debugLog('MBA2ou09hv595', 'Marking services as initialized', { bookingId, isError });
    
    if (isError) {
      // On error, just reset the in-progress flag so it can be retried
      initializationRef.current.servicesInProgress = false;
    } else {
      // On success, mark as initialized and reset in-progress flag
      initializationRef.current.servicesInitialized = true;
      initializationRef.current.servicesInProgress = false;
      setHasInitializedServices(true);
    }
  };

  const markPetsInitialized = (isError = false) => {
    debugLog('MBA2ou09hv595', 'Marking pets as initialized', { bookingId, isError });
    
    if (isError) {
      // On error, just reset the in-progress flag so it can be retried
      initializationRef.current.petsInProgress = false;
    } else {
      // On success, mark as initialized and reset in-progress flag
      initializationRef.current.petsInitialized = true;
      initializationRef.current.petsInProgress = false;
      setHasInitializedPets(true);
    }
  };

  // Parent-level data handling functions
  const handleServicesData = (services, selectedServiceId) => {
    debugLog('MBA2ou09hv595', 'Parent handling services data', {
      bookingId,
      services,
      servicesCount: services?.length,
      selectedServiceId
    });
    
    setAvailableServices(services || []);
    
    // Handle auto-selection at parent level
    if (selectedServiceId && services) {
      const currentSelectedId = bookingData.service?.service_id;
      if (currentSelectedId !== selectedServiceId) {
        const serviceToSelect = services.find(s => s.service_id === selectedServiceId);
        if (serviceToSelect) {
          debugLog('MBA2ou09hv595', 'Parent auto-selecting service', {
            currentSelectedId,
            selectedServiceId,
            serviceToSelect: { id: serviceToSelect.service_id, name: serviceToSelect.service_name }
          });
          
          handleServiceSelect({
            ...serviceToSelect,
            isOvernightForced: serviceToSelect.is_overnight
          });
        }
      }
    }
  };

  const handlePetsData = (pets, selectedPetIds) => {
    debugLog('MBA2ou09hv595', 'Parent handling pets data', {
      bookingId,
      pets,
      petsCount: pets?.length,
      selectedPetIds
    });
    
    setAvailablePets(pets || []);
    
    // Handle auto-selection at parent level
    if (selectedPetIds && selectedPetIds.length > 0 && pets) {
      const petsToSelect = pets.filter(p => p.is_selected === true);
      if (petsToSelect.length > 0) {
        debugLog('MBA2ou09hv595', 'Parent auto-selecting pets', {
          petsToSelect: petsToSelect.map(p => ({ id: p.pet_id, name: p.name }))
        });
        
        handleBatchPetSelect(petsToSelect);
      }
    }
  };

  const handleDateSelect = (dateData) => {
    debugLog('MBA12345 Selected dates:', dateData);
    debugLog('MBA2j3kbr9hve4: CRITICAL handleDateSelect rangeType:', {
      rangeType: dateData.rangeType,
      currentDateRangeType: bookingData.dateRangeType,
      isServiceOvernight: bookingData.service?.is_overnight,
      isTimesOvernightForced: bookingData.times?.isOvernightForced
    });
    
    setBookingData(prev => {
      // Preserve date range when switching to multiple-days
      let newDateRange = prev.dateRange;
      
      // Update date range based on the selection type
      if (dateData.rangeType === 'date-range' && dateData.startDate && dateData.endDate) {
        newDateRange = {
          startDate: dateData.startDate,
          endDate: dateData.endDate
        };
      } else if (dateData.rangeType === 'date-range' && dateData.startDate && !dateData.endDate) {
        // Incomplete range selection - clear the date range to prevent stale data
        newDateRange = null;
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
    debugLog('MBAoi1h34ghnvo: TimeSelectionCard sent time data:', timeData);

    // Clear any previous time validation errors when user changes times
    if (bookingData.timeValidationError) {
      setBookingData(prev => ({
        ...prev,
        timeValidationError: null
      }));
      setError(null);
    }

    // CRITICAL FIX: Determine overnight status from current service, not timeData
    const hasServiceOvernight = bookingData.service?.is_overnight === true;
    
    debugLog('MBAoi1h34ghnvo: CRITICAL FIX - Overnight status determination:', {
      hasServiceOvernight,
      timeDataIsOvernightForced: timeData.isOvernightForced,
      message: 'Using service.is_overnight as source of truth'
    });
    
    setBookingData(prev => {
      // Check if we have individual day times
      if (timeData.hasIndividualTimes) {
        debugLog('MBAoi1h34ghnvo: Processing individual times');
        
        // Create a new times object that preserves all individual time changes
        const individualTimes = {
          ...prev.times,
          hasIndividualTimes: true,
          isOvernightForced: hasServiceOvernight, // CRITICAL FIX: Use service overnight status
          dates: timeData.dates || prev.times.dates || [],
          // Preserve the raw individualTimeRanges
          individualTimeRanges: timeData.individualTimeRanges || {}
        };

        // Add all date-specific time changes
        Object.keys(timeData).forEach(key => {
          if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
            debugLog('MBAoi1h34ghnvo: Processing date key:', key, timeData[key]);
            // Preserve the exact time data for each date - handle both single object and array formats
            if (Array.isArray(timeData[key])) {
              // Multiple time slots - preserve the array
              individualTimes[key] = [...timeData[key]];
              debugLog('MBAoi1h34ghnvo: Preserved array of time slots for date:', key, individualTimes[key]);
            } else {
              // Single time slot - convert to array format for consistency
              individualTimes[key] = [{
                startTime: timeData[key].startTime,
                endTime: timeData[key].endTime,
                isOvernightForced: timeData[key].isOvernightForced
              }];
              debugLog('MBAoi1h34ghnvo: Converted single time slot to array for date:', key, individualTimes[key]);
            }
          }
        });
          
        debugLog('MBAoi1h34ghnvo: Final individual times object:', individualTimes);
        
        return {
          ...prev,
          times: individualTimes
        };
      } else {
        debugLog('MBAoi1h34ghnvo: Using default time range mode');
        
        // Create a new times object that preserves any existing values
        const updatedTimes = {
          ...prev.times,
          startTime: timeData.startTime ? `${String(timeData.startTime.hours).padStart(2, '0')}:${String(timeData.startTime.minutes || 0).padStart(2, '0')}` : prev.times.startTime,
          endTime: timeData.endTime ? `${String(timeData.endTime.hours).padStart(2, '0')}:${String(timeData.endTime.minutes || 0).padStart(2, '0')}` : prev.times.endTime,
          isOvernightForced: hasServiceOvernight, // CRITICAL FIX: Use service overnight status
          hasIndividualTimes: false,
          dates: timeData.dates || prev.times.dates || []
        };

        debugLog('MBAoi1h34ghnvo: Updated default times:', updatedTimes);

        return {
          ...prev,
          times: updatedTimes
        };
      }
    });
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case STEPS.SERVICES_AND_PETS.id:
        return bookingData.service && bookingData.pets.length > 0;
      case STEPS.DATE_SELECTION.id:
        // Check if we have valid dates, either from:
        // 1. dateSelectionData that's been validated
        // 2. dates array with entries
        // 3. a valid dateRange with both startDate and endDate

        debugLog('MBA_VALIDATION_DEBUG: Checking date selection validity', {
          hasDateSelectionData: !!bookingData.dateSelectionData,
          dateSelectionDataIsValid: bookingData.dateSelectionData?.isValid,
          dateSelectionDataStartDate: bookingData.dateSelectionData?.startDate,
          dateSelectionDataEndDate: bookingData.dateSelectionData?.endDate,
          datesLength: bookingData.dates?.length,
          hasDateRange: !!(bookingData.dateRange?.startDate && bookingData.dateRange?.endDate),
          serviceIsOvernight: bookingData.service?.is_overnight,
          dateRangeType: bookingData.dateRangeType
        });

        // First check if dateSelectionData exists and is valid
        if (bookingData.dateSelectionData && bookingData.dateSelectionData.isValid) {
          // Additional validation for overnight bookings - must have different start/end dates
          if (bookingData.service?.is_overnight && bookingData.dateSelectionData.rangeType === 'date-range') {
            const startDate = bookingData.dateSelectionData.startDate;
            const endDate = bookingData.dateSelectionData.endDate;
            
            if (!startDate || !endDate) {
              debugLog('MBA_VALIDATION: Overnight booking missing start or end date');
              return false;
            }
            
            // Check if start and end dates are the same (same day)
            const startDateStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate;
            const endDateStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate;
            
            if (startDateStr === endDateStr) {
              debugLog('MBA_VALIDATION: Overnight booking cannot be same day', { startDateStr, endDateStr });
              return false;
            }
          }
          return true;
        }
        
        // Check if we have any dates in the array
        if (bookingData.dates && bookingData.dates.length > 0) {
          // For overnight bookings, ensure we have at least 2 dates (spanning multiple days)
          if (bookingData.service?.is_overnight && bookingData.dateRangeType === 'date-range') {
            if (bookingData.dates.length < 2) {
              debugLog('MBA_VALIDATION: Overnight booking needs at least 2 dates', { 
                datesLength: bookingData.dates.length,
                dates: bookingData.dates 
              });
              return false;
            }
            
            // Additional check: ensure dates are different days
            const firstDate = bookingData.dates[0];
            const lastDate = bookingData.dates[bookingData.dates.length - 1];
            
            if (firstDate && lastDate) {
              const firstDateStr = firstDate instanceof Date ? firstDate.toISOString().split('T')[0] : firstDate;
              const lastDateStr = lastDate instanceof Date ? lastDate.toISOString().split('T')[0] : lastDate;
              
              if (firstDateStr === lastDateStr) {
                debugLog('MBA_VALIDATION: Overnight booking cannot have same start/end date', { 
                  firstDateStr, 
                  lastDateStr 
                });
                return false;
              }
            }
          }
          return true;
        }
        
        // Check if we have a valid date range
        if (bookingData.dateRange && bookingData.dateRange.startDate && bookingData.dateRange.endDate) {
          // For overnight bookings, ensure start and end dates are different
          if (bookingData.service?.is_overnight && bookingData.dateRangeType === 'date-range') {
            const startDateStr = bookingData.dateRange.startDate instanceof Date 
              ? bookingData.dateRange.startDate.toISOString().split('T')[0] 
              : bookingData.dateRange.startDate;
            const endDateStr = bookingData.dateRange.endDate instanceof Date 
              ? bookingData.dateRange.endDate.toISOString().split('T')[0] 
              : bookingData.dateRange.endDate;
              
            if (startDateStr === endDateStr) {
              debugLog('MBA_VALIDATION: Overnight booking dateRange cannot be same day', { 
                startDateStr, 
                endDateStr 
              });
              return false;
            }
          }
          return true;
        }
        
        // No valid date configuration found
        return false;
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
    const canProceed = canProceedToNextStep();
    debugLog('MBA_VALIDATION_DEBUG: handleNext called', {
      currentStep,
      canProceed,
      bookingData: {
        dateSelectionData: bookingData.dateSelectionData,
        dates: bookingData.dates,
        dateRange: bookingData.dateRange,
        serviceIsOvernight: bookingData.service?.is_overnight
      }
    });
    
    if (!canProceed) {
      setError('Please complete all required fields before proceeding');
      return;
    }

    setError(null);
    
    // Log what's happening when advancing to the next step
    debugLog('MBA2j3kbr9hve4: Moving to next step:', {
      currentStep,
      nextStep: currentStep + 1,
      hasValidDates: bookingData.dates && bookingData.dates.length > 0,
      hasValidDateRange: bookingData.dateRange && bookingData.dateRange.startDate && bookingData.dateRange.endDate,
      hasValidDateSelectionData: bookingData.dateSelectionData && bookingData.dateSelectionData.isValid,
      dateRangeType: bookingData.dateRangeType,
      bookingType: bookingData.bookingType
    });
    
    if (currentStep < STEPS.REVIEW_AND_RATES.id) {
      // If we're on the first step, update the draft with selected service and pets
      if (currentStep === STEPS.SERVICES_AND_PETS.id) {
        try {
          debugLog('MBA2j3kbr9hve4: Updating booking draft with service and pets');
          await updateBookingDraftPetsAndServices(bookingId, {
            service_id: bookingData.service?.service_id,
            pets: bookingData.pets
          });
          debugLog('MBA2j3kbr9hve4: Successfully updated booking draft with service and pets');
          
          // Reset hasFetchedDates to force fetching dates and times when moving to the dates step
          setBookingData(prev => ({
            ...prev,
            hasFetchedDates: false
          }));
        } catch (error) {
          debugLog('MBA2j3kbr9hve4: Error updating booking draft:', error);
          setError('Failed to save service and pet selections');
          return;
        }
      }
      
      // Handle time selection calculations before proceeding
      if (currentStep === STEPS.TIME_SELECTION.id) {
        try {
          debugLog('MBA5asdt3f4321 Original booking data:', bookingData);

          // Direct fix - if the service is overnight, always use the updateBookingDraftTimeAndDate endpoint
          // regardless of the dateRangeType that might have been previously set
          const isServiceOvernightFlag = bookingData.service?.is_overnight === true;
          const isTimeOvernightFlag = bookingData.times?.isOvernightForced === true;
          const isAnyOvernightFlag = isServiceOvernightFlag || isTimeOvernightFlag;
          
          debugLog('MBA5asdt3f4321 DIRECT OVERNIGHT CHECK AT START:', {
            isServiceOvernightFlag,
            isTimeOvernightFlag,
            isAnyOvernightFlag,
            dateRangeType: bookingData.dateRangeType
          });
          
          // If any overnight flag is set, we'll bypass all the other checks and directly use the overnight endpoint
          if (isAnyOvernightFlag && bookingData.dateRange) {
            // Force overnight mode
            debugLog('MBA53212co2v3nvoub5 DIRECT OVERRIDE: Forcing overnight mode for any overnight service');
            
            const startDate = formatDateForAPI(bookingData.dateRange.startDate);
            const endDate = formatDateForAPI(bookingData.dateRange.endDate);
            const startTime = formatTimeForAPI(bookingData.times.startTime);
            const endTime = formatTimeForAPI(bookingData.times.endTime);
            
            debugLog('MBA53212co2v3nvoub5 DIRECT OVERRIDE: Using time-and-date endpoint with dates:', {
              startDate,
              endDate,
              startTime,
              endTime
            });
            
            // Get user's timezone from context
            const userTz = timeSettings?.timezone || 'US/Mountain';
            debugLog('MBA53212co2v3nvoub5 Using user timezone for UTC conversion:', userTz);
            
            // Convert local times to UTC before sending to backend
            const { date: utcStartDate, time: utcStartTime } = convertToUTC(
              startDate,
              startTime,
              userTz
            );

            const { date: utcEndDate, time: utcEndTime } = convertToUTC(
              endDate,
              endTime,
              userTz
            );

            // Call the API with UTC times and dates
            const response = await updateBookingDraftTimeAndDate(
              bookingId,
              utcStartDate,
              utcEndDate,
              utcStartTime,
              utcEndTime
            );
            
            debugLog('MBA53212co2v3nvoub5 DIRECT OVERRIDE: Response from updateBookingDraftTimeAndDate:', response);
            
            // Update booking data with the response's draft_data
            if (response?.draft_data) {
              setBookingData(prev => ({
                ...prev,
                ...response.draft_data,
                // Ensure we maintain overnight settings
                times: {
                  ...(response.draft_data.times || prev.times),
                  isOvernightForced: true
                },
                service: {
                  ...(response.draft_data.service || prev.service),
                  is_overnight: true
                },
                // Force dateRangeType to date-range for overnight services
                dateRangeType: 'date-range'
              }));
            }
            
            // Skip the rest of the checks - we've already made the API call
            setCurrentStep(prev => prev + 1);
            return;
          }
          
          if (bookingData.dateRangeType === 'date-range') {
            // Check if this is a non-overnight service with date range
            const isServiceOvernight = bookingData.service?.is_overnight === true;
            // Check time overnight status - but don't count 00:00 end time as overnight by itself
            const isTimeOvernight = bookingData.times?.isOvernightForced === true && 
                                   !(bookingData.times.endTime === '00:00' && !isServiceOvernight);
            
            // Check if the date range spans multiple days - if it does, treat it as overnight
            let isMultiDayRange = false;
            if (bookingData.dateRange && bookingData.dateRange.startDate && bookingData.dateRange.endDate) {
              try {
                const startDate = new Date(bookingData.dateRange.startDate);
                const endDate = new Date(bookingData.dateRange.endDate);
                const daysDifference = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                
                // If more than 1 day difference, consider it multi-day
                if (daysDifference > 1) {
                  isMultiDayRange = true;
                  debugLog('MBA53212co2v3nvoub5 DETECTED multi-day date range:', {
                    startDate: bookingData.dateRange.startDate,
                    endDate: bookingData.dateRange.endDate,
                    daysDifference
                  });
                }
              } catch (err) {
                debugLog('MBA53212co2v3nvoub5 Error checking date range:', err);
              }
            }
            
            debugLog('MBA53212co2v3nvoub5 CRITICAL FIX - Checking overnight status:', {
              dateRangeType: bookingData.dateRangeType,
              serviceIsOvernight: isServiceOvernight,
              timesIsOvernightForced: bookingData.times?.isOvernightForced,
              endTime: bookingData.times?.endTime,
              endTimeIsMidnight: bookingData.times?.endTime === '00:00',
              // Special check for midnight end time
              isMidnightEndTimeButNotForced: bookingData.times?.endTime === '00:00' && !isServiceOvernight,
              isTimeOvernight: isTimeOvernight,
              isMultiDayRange: isMultiDayRange,
              willTreatAsOvernight: isServiceOvernight || isTimeOvernight,
              message: 'Multi-day ranges no longer automatically force overnight mode',
              service: bookingData.service,
              times: bookingData.times
            });
            
            // CRITICAL FIX: Only truly overnight services should be treated as overnight
            // Multi-day date ranges for non-overnight services should NOT force overnight mode
            if (isServiceOvernight || isTimeOvernight) {
              // Only force overnight flag if the service itself is actually overnight
              const updatedBookingData = {
                ...bookingData,
                service: {
                  ...bookingData.service,
                  is_overnight: isServiceOvernight || isTimeOvernight
                },
                times: {
                  ...bookingData.times,
                  isOvernightForced: isServiceOvernight || isTimeOvernight
                }
              };
              
              // Update state with the overnight mode for truly overnight services
              setBookingData(updatedBookingData);
              
              // This is a truly overnight service with a date range, so we should call updateBookingDraftTimeAndDate
              debugLog('MBA53212co2v3nvoub5 Using overnight endpoint for truly overnight service');
              
              const startDate = formatDateForAPI(bookingData.dateRange.startDate);
              const endDate = formatDateForAPI(bookingData.dateRange.endDate);
              const startTime = formatTimeForAPI(bookingData.times.startTime);
              const endTime = formatTimeForAPI(bookingData.times.endTime);
              
              // Get user's timezone from context
              const userTz = timeSettings?.timezone || 'US/Mountain';
              debugLog('MBA53212co2v3nvoub5 Using user timezone for UTC conversion:', userTz);
              
              // Convert local times to UTC before sending to backend
              const { date: utcStartDate, time: utcStartTime } = convertToUTC(
                startDate,
                startTime,
                userTz
              );

              const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                endDate,
                endTime,
                userTz
              );

              // Call the API with UTC times and dates
              const response = await updateBookingDraftTimeAndDate(
                bookingId,
                utcStartDate,
                utcEndDate,
                utcStartTime,
                utcEndTime
              );
              
              debugLog('MBA53212co2v3nvoub5 Received response from updateBookingDraftTimeAndDate (overnight override):', response);
              
              // Update booking data with the response's draft_data
              if (response?.draft_data) {
                setBookingData(prev => ({
                  ...prev,
                  ...response.draft_data,
                  // CRITICAL FIX: Only maintain overnight settings if service is actually overnight
                  times: {
                    ...(response.draft_data.times || prev.times),
                    isOvernightForced: isServiceOvernight || isTimeOvernight
                  },
                  service: {
                    ...(response.draft_data.service || prev.service),
                    is_overnight: isServiceOvernight || isTimeOvernight
                  }
                }));
              }
              
              // Skip the rest of the checks since we've already made the API call
              setCurrentStep(prev => prev + 1);
              return;
            }
            
            // CRITICAL FIX: Multi-day date ranges for non-overnight services should use multiple days endpoint
            const isNonOvernightDateRange = 
              bookingData.dateRangeType === 'date-range' && 
              !isServiceOvernight &&
              !isTimeOvernight;

            debugLog('MBA53212co2v3nvoub5 CRITICAL FIX - Decision:', {
              isNonOvernightDateRange: isNonOvernightDateRange,
              isMultiDayRange: isMultiDayRange,
              willUseEndpoint: isNonOvernightDateRange ? 'updateBookingDraftMultipleDays' : 'updateBookingDraftTimeAndDate',
              message: 'Multi-day ranges for non-overnight services now use multiple days endpoint'
            });

            if (isNonOvernightDateRange) {
              // CRITICAL FIX: For non-overnight date range services (including multi-day), create individual days
              debugLog('MBA53212co2v3nvoub5 CRITICAL FIX - Handling non-overnight date range as individual occurrences:', {
                isMultiDay: isMultiDayRange,
                message: 'Multi-day ranges for non-overnight services handled correctly'
              });
              
              // Create dates array from date range
              const startDate = new Date(bookingData.dateRange.startDate);
              const endDate = new Date(bookingData.dateRange.endDate);
              const dates = [];
              
              // Generate all dates in the range
              const currentDate = new Date(startDate);
              while (currentDate <= endDate) {
                dates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              debugLog('MBA53212co2v3nvoub5 Generated dates from range:', dates.map(d => d.toISOString().split('T')[0]));
              debugLog('MBA53212co2v3nvoub5 Time settings:', bookingData.times);
              
              // Format dates and determine times for each day - handle multiple time slots per date
              const formattedDates = [];
              
              dates.forEach(date => {
                const dateKey = date.toISOString().split('T')[0];
                debugLog('MBA53212co2v3nvoub5 Processing date:', dateKey);
                
                let dayTimes = bookingData.times;
                
                // If there are individual time settings for this day, use those
                if (bookingData.times[dateKey] && bookingData.times.hasIndividualTimes) {
                  dayTimes = bookingData.times[dateKey];
                  debugLog('MBA53212co2v3nvoub5 Using individual times for date:', dateKey, dayTimes);
                } else {
                  debugLog('MBA53212co2v3nvoub5 Using default times for date:', dateKey, dayTimes);
                }
                
                // Check if dayTimes is an array of time slots or a single time object
                const timeSlots = Array.isArray(dayTimes) ? dayTimes : [dayTimes];
                debugLog('MBA53212co2v3nvoub5 Time slots for date:', dateKey, timeSlots);
                
                // Process each time slot for this date
                timeSlots.forEach((timeSlot, slotIndex) => {
                  // Format the start time
                  let startTime;
                  if (typeof timeSlot.startTime === 'string') {
                    startTime = timeSlot.startTime;
                  } else if (timeSlot.startTime?.hours !== undefined) {
                    startTime = `${String(timeSlot.startTime.hours).padStart(2, '0')}:${String(timeSlot.startTime.minutes || 0).padStart(2, '0')}`;
                  } else {
                    // Default time if missing
                    startTime = '09:00';
                  }
                  
                  // Format the end time
                  let endTime;
                  if (typeof timeSlot.endTime === 'string') {
                    endTime = timeSlot.endTime;
                  } else if (timeSlot.endTime?.hours !== undefined) {
                    endTime = `${String(timeSlot.endTime.hours).padStart(2, '0')}:${String(timeSlot.endTime.minutes || 0).padStart(2, '0')}`;
                  } else {
                    // Default time if missing
                    endTime = '17:00';
                  }
                  
                  debugLog('MBA53212co2v3nvoub5 Formatted times for slot', slotIndex, 'on date:', dateKey, { startTime, endTime });
                  
                  // Format the date - use same date for both start and end, let backend handle validation
                  const formattedDate = formatDateForAPI(date);
                  const formattedEndDate = formattedDate; // Always use same date - let user intent drive this
                  
                  debugLog('MBA53212co2v3nvoub5 Formatted date:', formattedDate);
                  
                  debugLog('MBA53212co2v3nvoub5 Using same date for both start and end times:', {
                    startTime,
                    endTime,
                    formattedDate,
                    formattedEndDate,
                    message: 'Backend will validate if end time is valid for the selected date'
                  });
                  
                  // Get user's timezone from context
                  const userTz = timeSettings?.timezone || 'US/Mountain';
                  debugLog('MBA53212co2v3nvoub5 Using user timezone for UTC conversion:', userTz);
                  
                  // Convert local times to UTC - use the same date for both start and end
                  const { date: utcStartDate, time: utcStartTime } = convertToUTC(
                    formattedDate,
                    startTime,
                    userTz
                  );
                  
                  const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                    formattedEndDate,
                    endTime,
                    userTz
                  );
                  
                  debugLog('MBA53212co2v3nvoub5 Converted UTC times for slot', slotIndex, ':', { 
                    utcStartDate, 
                    utcStartTime, 
                    utcEndDate, 
                    utcEndTime,
                    isDifferentDates: utcStartDate !== utcEndDate
                  });
                  
                  // Add each time slot as a separate occurrence
                  // Backend will determine if this is overnight based on the date/time combination
                  formattedDates.push({
                    date: utcStartDate,
                    startTime: utcStartTime,
                    endDate: utcEndDate,
                    endTime: utcEndTime,
                    is_overnight: false // Let backend determine overnight status
                  });
                });
              });
              
              debugLog('MBA53212co2v3nvoub5 - Converted UTC dates:', formattedDates);
              
              // Call the API for multiple individual days (even though they're from a date range)
              const response = await updateBookingDraftMultipleDays(
                bookingId,
                {
                  dates: formattedDates,
                  times: {} // Empty times object since times are already included in each date
                },
                timeSettings
              );
              
              debugLog('MBA53212co2v3nvoub5 Received response from updateBookingDraftMultipleDays:', response);
              
              if (response?.draft_data) {
                setBookingData(prev => ({
                  ...prev,
                  ...response.draft_data
                }));
              }
            } else {
              // Handle date range selection for overnight services (existing logic)
              const startDate = formatDateForAPI(bookingData.dateRange.startDate);
              const endDate = formatDateForAPI(bookingData.dateRange.endDate);
              const startTime = formatTimeForAPI(bookingData.times.startTime);
              const endTime = formatTimeForAPI(bookingData.times.endTime);

              debugLog('MBA53212co2v3nvoub5 Using update-time-and-date endpoint for OVERNIGHT service with dates:', {
                startDate,
                endDate,
                startTime,
                endTime,
                service: {
                  id: bookingData.service?.service_id,
                  name: bookingData.service?.service_name,
                  is_overnight: bookingData.service?.is_overnight
                },
                times: {
                  isOvernightForced: bookingData.times?.isOvernightForced
                }
              });

              // Convert local times to UTC before sending to backend
              const { date: utcStartDate, time: utcStartTime } = convertToUTC(
                startDate,
                startTime,
                userTz
              );

              const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                endDate,
                endTime,
                userTz
              );

              debugLog('MBA53212co2v3nvoub5 UTC dates and times:', {
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

              debugLog('MBA53212co2v3nvoub5 Received response from updateBookingDraftTimeAndDate:', response);

              // Update booking data with the response's draft_data
              if (response?.draft_data) {
                setBookingData(prev => ({
                  ...prev,
                  ...response.draft_data
                }));
              } else {
                debugLog('MBA53212co2v3nvoub5 No draft_data in response:', response);
              }
            }
          } else if (bookingData.dateRangeType === 'multiple-days') {
            // Handle multiple individual days - support multiple time slots per date
            debugLog('MBA53212co2v3nvoub5 Multiple days selection:', {
              dates: bookingData.dates,
              times: bookingData.times
            });

            // Format dates with multiple time slots support
            const formattedDates = [];
            
            if (bookingData.dates && bookingData.dates.length > 0) {
              bookingData.dates.forEach(dateObj => {
                // Handle different date formats
                let date;
                if (typeof dateObj === 'string') {
                  date = new Date(dateObj);
                } else if (dateObj && dateObj.date) {
                  date = new Date(dateObj.date);
                } else {
                  date = new Date(dateObj);
                }
                
                const dateKey = date.toISOString().split('T')[0];
                debugLog('MBA53212co2v3nvoub5 Processing individual date:', dateKey);
                
                let dayTimes = bookingData.times;
                
                // If there are individual time settings for this day, use those
                if (bookingData.times[dateKey] && bookingData.times.hasIndividualTimes) {
                  dayTimes = bookingData.times[dateKey];
                  debugLog('MBA53212co2v3nvoub5 Using individual times for date:', dateKey, dayTimes);
                } else {
                  debugLog('MBA53212co2v3nvoub5 Using default times for date:', dateKey, dayTimes);
                }
                
                // Check if dayTimes is an array of time slots or a single time object
                const timeSlots = Array.isArray(dayTimes) ? dayTimes : [dayTimes];
                debugLog('MBA53212co2v3nvoub5 Time slots for individual date:', dateKey, timeSlots);
                
                // Process each time slot for this date
                timeSlots.forEach((timeSlot, slotIndex) => {
                  // Format the start time
                  let startTime;
                  if (typeof timeSlot.startTime === 'string') {
                    startTime = timeSlot.startTime;
                  } else if (timeSlot.startTime?.hours !== undefined) {
                    startTime = `${String(timeSlot.startTime.hours).padStart(2, '0')}:${String(timeSlot.startTime.minutes || 0).padStart(2, '0')}`;
                  } else {
                    startTime = '09:00';
                  }
                  
                  // Format the end time
                  let endTime;
                  if (typeof timeSlot.endTime === 'string') {
                    endTime = timeSlot.endTime;
                  } else if (timeSlot.endTime?.hours !== undefined) {
                    endTime = `${String(timeSlot.endTime.hours).padStart(2, '0')}:${String(timeSlot.endTime.minutes || 0).padStart(2, '0')}`;
                  } else {
                    endTime = '17:00';
                  }
                  
                  debugLog('MBA53212co2v3nvoub5 Formatted times for slot', slotIndex, 'on individual date:', dateKey, { startTime, endTime });
                  
                  // Format the date
                  const formattedDate = formatDateForAPI(date);
                  
                  // Use same date for both start and end, let backend handle validation  
                  const endDateObj = new Date(date);
                    
                  const formattedEndDate = formatDateForAPI(endDateObj);
                  
                  // Get user's timezone from context
                  const userTz = timeSettings?.timezone || 'US/Mountain';
                  
                  // Convert local times to UTC
                  const { date: utcStartDate, time: utcStartTime } = convertToUTC(
                    formattedDate,
                    startTime,
                    userTz
                  );
                  
                  const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                    formattedEndDate,
                    endTime,
                    userTz
                  );
                  
                  debugLog('MBA53212co2v3nvoub5 Converted UTC times for individual date slot', slotIndex, ':', { 
                    utcStartDate, 
                    utcStartTime, 
                    utcEndDate, 
                    utcEndTime
                  });
                  
                  // Add each time slot as a separate occurrence  
                  // Backend will determine if this is overnight based on the date/time combination
                  formattedDates.push({
                    date: utcStartDate,
                    startTime: utcStartTime,
                    endDate: utcEndDate,
                    endTime: utcEndTime,
                    is_overnight: false // Let backend determine overnight status
                  });
                });
              });
            }

            debugLog('MBA53212co2v3nvoub5 Formatted dates for multiple individual days:', formattedDates);

            // Call the API for multiple individual days
            const response = await updateBookingDraftMultipleDays(
              bookingId,
              {
                dates: formattedDates,
                times: {} // Empty times object since times are included in each date
              },
              timeSettings
            );

            debugLog('MBA53212co2v3nvoub5 Received response from updateBookingDraftMultipleDays:', response);

            if (response?.draft_data) {
              setBookingData(prev => ({
                ...prev,
                ...response.draft_data
              }));
            }
          } else if (bookingData.bookingType === 'recurring') {
            // Handle recurring dates
            debugLog('MBA53212co2v3nvoub5 Recurring dates selection:', {
              startDate: bookingData.recurringStartDate,
              endDate: bookingData.recurringEndDate,
              daysOfWeek: bookingData.selectedDaysOfWeek,
              frequency: bookingData.selectedFrequency,
              times: bookingData.times
            });

            // Call the API for recurring dates
            const response = await updateBookingDraftRecurring(
              bookingId,
              {
                startDate: bookingData.recurringStartDate,
                endDate: bookingData.recurringEndDate,
                daysOfWeek: bookingData.selectedDaysOfWeek,
                frequency: bookingData.selectedFrequency,
                startTime: bookingData.times.startTime,
                endTime: bookingData.times.endTime
              }
            );

            debugLog('MBA53212co2v3nvoub5 Received response from updateBookingDraftRecurring:', response);

            if (response?.draft_data) {
              setBookingData(prev => ({
                ...prev,
                ...response.draft_data
              }));
            }
          }
        } catch (error) {
          debugLog('MBA53212co2v3nvoub5 Error calculating booking totals:', error);
          debugLog('MBA53212co2v3nvoub5 Error stack:', error.stack);
          debugLog('MBA53212co2v3nvoub5 Error details:', {
            message: error.message,
            name: error.name,
            response: error.response?.data
          });
          
          // Use specific error message from backend if available
          let errorMessage = 'Failed to calculate booking totals';
          let timeValidationError = null;
          
          if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
            // Check if this is a time validation error
            if (errorMessage.includes('End time') && errorMessage.includes('must be after start time')) {
              timeValidationError = {
                type: 'end_time_before_start',
                message: errorMessage
              };
            }
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
            // Check if this is a time validation error
            if (errorMessage.includes('End time') && errorMessage.includes('must be after start time')) {
              timeValidationError = {
                type: 'end_time_before_start',
                message: errorMessage
              };
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          setError(errorMessage);
          
          // Show modal instead of highlighting UI elements for better UX
          if (timeValidationError) {
            setTimeValidationModal({
              visible: true,
              message: timeValidationError.message
            });
          }
          return;
        }
      }

      // Clear any time validation errors when successfully proceeding
      if (bookingData.timeValidationError) {
        setBookingData(prev => ({
          ...prev,
          timeValidationError: null
        }));
      }
      
      setCurrentStep(prev => prev + 1);
    } else {
      // We're on the final step (REVIEW_AND_RATES), so create the booking
      // First check if terms have been agreed to (using same logic as ReviewAndRatesCard)
      const currentTosStatus = getTosStatus();
      const hasAgreedToTerms = currentTosStatus === true || (currentTosStatus !== true && termsAgreed);
      
      debugLog('MBA54321: BookingStepModal TOS validation:', {
        currentTosStatus,
        termsAgreed,
        hasAgreedToTerms,
        bookingData: !!bookingData
      });
      
      if (!hasAgreedToTerms) {
        debugLog('MBA54321: Terms not agreed, showing TOS modal');
        setShowTermsModal(true);
        return;
      }
      
      try {
        setError(null);
        
        // Check if we have a conversation ID from the booking data
        if (!bookingData.conversation_id) {
          setError('Missing conversation information');
          return;
        }
        
        debugLog('MBA66777 Creating booking from draft with conversation ID:', bookingData.conversation_id);
        
        // Call the API to create a booking from the draft
        const response = await createBookingFromDraft(bookingData.conversation_id, hasAgreedToTerms);
        
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
        
        // Reset the modal to step 1 with initial state
        // This ensures next time it's opened, it starts fresh
        resetModal();
        
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
    // Clear any time validation errors when going back
    if (bookingData.timeValidationError) {
      setBookingData(prev => ({
        ...prev,
        timeValidationError: null
      }));
      setError(null);
    }
    
    if (currentStep > STEPS.SERVICES_AND_PETS.id) {
      setCurrentStep(prev => prev - 1);
    } else {
      // We're on the first step, so close the modal
      handleClose();
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.SERVICES_AND_PETS.id:
        debugLog('MBA2ou09hv595', 'BookingStepModal rendering ServiceAndPetsCard', {
          bookingId,
          currentStep,
          selectedServiceId: bookingData.service?.service_id,
          selectedPetsCount: bookingData.pets?.length,
          timestamp: new Date().toISOString()
        });
        
        return (
          <ServiceAndPetsCard
            key={`services-pets-${bookingId}`} // Add key to prevent unnecessary remounting
            bookingId={bookingId}
            onServiceSelect={handleServiceSelect}
            onPetSelect={handlePetSelect}
            onBatchPetSelect={handleBatchPetSelect}
            selectedService={bookingData.service}
            selectedPets={bookingData.pets}
            navigation={navigation}
            onClose={onClose}
            shouldFetchServices={shouldFetchServices}
            shouldFetchPets={shouldFetchPets}
            markServicesInitialized={markServicesInitialized}
            markPetsInitialized={markPetsInitialized}
            // Pass data from parent to prevent loss during re-renders
            availableServices={availableServices}
            availablePets={availablePets}
            onServicesData={handleServicesData}
            onPetsData={handlePetsData}
          />
        );
      case STEPS.DATE_SELECTION.id:
        debugLog('MBA2j3kbr9hve4: Rendering date selection with:', { 
          dates: bookingData.dates, 
          dateRange: bookingData.dateRange,
          bookingType: bookingData.bookingType,
          dateRangeType: bookingData.dateRangeType,
          hasFetchedDates: bookingData.hasFetchedDates
        });
        
        const dateSelectionIsOvernightMode = bookingData.service?.is_overnight || false;
        
        debugLog('MBA2j3kbr9hve4: Date selection overnight status:', {
          serviceIsOvernight: bookingData.service?.is_overnight,
          timesIsOvernightForced: bookingData.times?.isOvernightForced,
          combinedMode: dateSelectionIsOvernightMode
        });
        
        return (
          <DateSelectionCard
            selectedDates={bookingData.dates || []}
            onDateSelect={handleDateSelect}
            bookingType={bookingData.bookingType || 'one-time'}
            dateRangeType={bookingData.dateRangeType || 'date-range'}
            initialDateRange={bookingData.dateRange || null}
            isOvernightForced={dateSelectionIsOvernightMode}
          />
        );
      case STEPS.TIME_SELECTION.id:
        // Check if we have valid dates to display
        if (!bookingData.dates || bookingData.dates.length === 0) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Please select dates first</Text>
            </View>
          );
        }
        
        // Log current service and times state BEFORE preparing initialTimes 
        debugLog('MBA66777: CURRENT STATE Before rendering time selection:', { 
          service: {
            id: bookingData.service?.service_id,
            name: bookingData.service?.service_name,
            is_overnight: bookingData.service?.is_overnight
          },
          times: {
            isOvernightForced: bookingData.times?.isOvernightForced,
            hasIndividualTimes: bookingData.times?.hasIndividualTimes
          },
          dateRange: bookingData.dateRange,
          dateRangeType: bookingData.dateRangeType
        });
        
        // Determine if overnight mode based ONLY on current service, not previous state
        const currentServiceIsOvernight = bookingData.service?.is_overnight || false;
        
        debugLog('MBA66777: CRITICAL FIX - Overnight mode calculation:', {
          serviceIsOvernight: bookingData.service?.is_overnight,
          previousTimesIsOvernightForced: bookingData.times?.isOvernightForced,
          calculatedCurrentServiceIsOvernight: currentServiceIsOvernight,
          message: 'isOvernightForced now based ONLY on current service, not previous state'
        });
        
        // Prepare initialTimes object with all necessary data
        const initialTimes = {
          ...bookingData.times,
          // Always include dates for multiple-days selection
          dates: bookingData.dates || [],
          // Include occurrences if available
          occurrences: bookingData.occurrences || [],
          // Ensure hasIndividualTimes is preserved from bookingData.times, but reset if overnight service
          hasIndividualTimes: currentServiceIsOvernight ? false : (bookingData.times?.hasIndividualTimes || false),
          // CRITICAL FIX: isOvernightForced should ONLY depend on current service, not previous state
          isOvernightForced: currentServiceIsOvernight
        };
        
        const isOvernightMode = currentServiceIsOvernight;
        
        debugLog('MBA66777: Passing initialTimes to TimeSelectionCard:', {
          hasIndividualTimes: initialTimes.hasIndividualTimes,
          dateCount: initialTimes.dates?.length || 0,
          isOvernightService: bookingData.service?.is_overnight,
          isOvernightForced: bookingData.times?.isOvernightForced,
          combinedOvernight: isOvernightMode
        });
        
        return (
          <TimeSelectionCard
            onTimeSelect={handleTimeSelect}
            initialTimes={initialTimes}
            dateRange={bookingData.dateRange}
            selectedService={{
              ...bookingData.service,
              is_overnight: isOvernightMode
            }}
            isOvernightForced={isOvernightMode}
          />
        );
      case STEPS.REVIEW_AND_RATES.id:
        return (
          <ReviewAndRatesCard
            bookingData={bookingData}
            bookingId={bookingId}
            onRatesUpdate={(updatedData) => {
              debugLog('MBA2j3kbr9hve4: Rates updated:', updatedData);
              setBookingData(prev => ({
                ...prev,
                occurrences: updatedData.occurrences,
                cost_summary: updatedData.cost_summary
              }));
            }}
            isProfessional={true}
            fromApprovalModal={false}
            onTermsAgreed={(agreed) => {
              debugLog('MBA54321: BookingStepModal received onTermsAgreed:', agreed);
              setTermsAgreed(agreed);
            }}
            onTosAgreementChange={(agreed) => {
              debugLog('MBA54321: BookingStepModal received onTosAgreementChange:', agreed);
              setTermsAgreed(agreed);
            }}
          />
        );
      default:
        return null;
    }
  };

  // Function to reset the modal state
  const resetModal = () => {
    debugLog('MBA2j3kbr9hve4: Resetting booking step modal state');
    setCurrentStep(STEPS.SERVICES_AND_PETS.id);
    setBookingData({
      service: initialData?.service || null,
      pets: initialData?.pets || [],
      dates: initialData?.dates || [],
      bookingType: initialData?.bookingType || 'one-time',
      dateRangeType: initialData?.dateRangeType || 'date-range',
      times: initialData?.times || {
        startTime: '09:00',
        endTime: '17:00',
        isOvernightForced: false,
        hasIndividualTimes: false
      },
      rates: initialData?.rates || {},
      dateSelectionData: null,
      dateRange: null,
      hasFetchedDates: false, // Reset the fetch flag to ensure dates are refetched
      timeValidationError: null, // Clear any validation errors
    });
    setError(null);
    setIsLoading(false);
    // Only reset termsAgreed if user hasn't previously agreed to terms
    const currentTosStatus = getTosStatus();
    if (currentTosStatus !== true) {
      setTermsAgreed(false);
    }
    setShowTermsModal(false);
  };

  // Function to handle cancellation of the modal
  const handleClose = () => {
    debugLog('MBA66777: Closing booking step modal and resetting state');
    // Reset the modal state
    resetModal();
    // Call the onClose function passed as a prop
    onClose();
  };

  // Add cleanup effect to ensure clean state when unmounting
  useEffect(() => {
    return () => {
      debugLog('MBA2j3kbr9hve4: BookingStepModal unmounting, cleaning up state');
      // This is a cleanup function that will run when the component unmounts
      // We don't need to do anything here, just logging for debugging
    };
  }, []);

  const formatDatesForAPI = (dateState) => {
    if (!dateState || !dateState.dates || dateState.dates.length === 0) {
      return { dates: [] };
    }

    // Format the dates for the API using the proper UTC conversion
    const formattedDates = dateState.dates.map(date => {
      const dateString = date.toISOString().split('T')[0];
      
      // Get time data for this specific date or fall back to default
      let timeData = dateState.times;
      
      // Check if we have individual day schedules
      if (dateState.times.hasIndividualTimes && dateState.times[dateString]) {
        timeData = dateState.times[dateString];
      }
      
      // Format start and end times
      const formattedStartTime = formatTimeObj(timeData.startTime);
      const formattedEndTime = formatTimeObj(timeData.endTime);
      
      // Handle midnight (00:00) as end of current day, not start of next day
      // This ensures proper duration calculation and prevents negative durations
      let endDate = dateString;
      const isMidnightEnd = formattedEndTime === "00:00";
      const isTimeBeforeStart = compareTimesAsMinutes(timeData.endTime, timeData.startTime) < 0;
      
      // If end time is midnight (00:00) or earlier than start time, use the next day as the end date
      if (isMidnightEnd || isTimeBeforeStart) {
        // Calculate the next day
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        endDate = nextDay.toISOString().split('T')[0];
        
        debugLog("MBA8810: Using next day for end date due to midnight/early morning end time:", {
          date: dateString,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          endDate: endDate,
          isMidnightEnd,
          isTimeBeforeStart
        });
      }
      
      return {
        date: dateString,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        end_date: endDate, // Always include end_date for proper backend processing
        is_overnight: timeData.isOvernightForced || dateState.service?.is_overnight || false
      };
    });

    return { dates: formattedDates };
  };

  const formatTimeObj = (timeObj) => {
    const hours = timeObj.hours.toString().padStart(2, '0');
    const minutes = timeObj.minutes.toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Helper to compare two time objects by converting to minutes
  const compareTimesAsMinutes = (time1, time2) => {
    const time1Minutes = (time1.hours * 60) + time1.minutes;
    const time2Minutes = (time2.hours * 60) + time2.minutes;
    return time1Minutes - time2Minutes;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        onRequestClose={handleClose}
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
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading booking information...</Text>
                  </View>
                ) : (
                  renderCurrentStep()
                )}
              </View>
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </ScrollView>
            <View style={styles.footer}>
              {currentStep === STEPS.SERVICES_AND_PETS.id ? (
                // Step 1: [Cancel] [Next]
                <>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.nextButton,
                      (!canProceedToNextStep() || isLoading) && styles.disabledButton
                    ]}
                    onPress={handleNext}
                    disabled={!canProceedToNextStep() || isLoading}
                  >
                    <Text style={[
                      styles.nextButtonText,
                      (!canProceedToNextStep() || isLoading) && styles.disabledButtonText
                    ]}>
                      Next
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Steps 2-4: [Back] [Cancel][Next/Confirm]
                <>
                  <TouchableOpacity
                    style={[styles.backButton, isSmallScreen && styles.smallScreenButton]}
                    onPress={handleBack}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <View style={styles.spacer} />
                  <TouchableOpacity
                    style={[styles.cancelButtonSmall, isSmallScreen && styles.smallScreenButton]}
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <View style={isSmallScreen ? styles.smallMargin : null} />
                  <TouchableOpacity
                    style={[
                      styles.nextButtonSmall, 
                      isSmallScreen && styles.smallScreenButton,
                      (!canProceedToNextStep() || isLoading) && styles.disabledButton
                    ]}
                    onPress={handleNext}
                    disabled={!canProceedToNextStep() || isLoading}
                  >
                    {currentStep === STEPS.REVIEW_AND_RATES.id && isSmallScreen ? (
                      <View style={styles.confirmButtonColumn}>
                        <Text style={[styles.nextButtonText, (!canProceedToNextStep() || isLoading) && styles.disabledButtonText]}>
                          Request
                        </Text>
                        <Text style={[styles.nextButtonText, (!canProceedToNextStep() || isLoading) && styles.disabledButtonText]}>
                          Booking
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.nextButtonText, (!canProceedToNextStep() || isLoading) && styles.disabledButtonText]}>
                        {currentStep === STEPS.REVIEW_AND_RATES.id ? 'Request Booking' : 'Next'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <TosRequiredModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        actionType="booking"
      />

      {/* Time Validation Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={timeValidationModal.visible}
        onRequestClose={() => setTimeValidationModal({ visible: false, message: '' })}
      >
        <View style={styles.timeValidationModalOverlay}>
          <View style={styles.timeValidationModalContent}>
            <Text style={styles.timeValidationModalTitle}>Invalid Time Selection</Text>
            <Text style={styles.timeValidationModalMessage}>
              {timeValidationModal.message}
            </Text>
            <TouchableOpacity
              style={styles.timeValidationModalButton}
              onPress={() => setTimeValidationModal({ visible: false, message: '' })}
            >
              <Text style={styles.timeValidationModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.modernBorder,
  },
  spacer: {
    width: 16,
    flexGrow: 1,
  },
  smallMargin: {
    width: 8,
  },
  backButton: {
    minWidth: 100,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smallScreenButton: {
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonSmall: {
    minWidth: 100,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonSmall: {
    minWidth: 100,
    backgroundColor: theme.colors.mainColors.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  stepContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.modernBorder,
    marginVertical: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmButtonColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Time Validation Modal Styles
  timeValidationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeValidationModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeValidationModalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.medium.fontFamily,
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  timeValidationModalMessage: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  timeValidationModalButton: {
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
  },
  timeValidationModalButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: theme.fonts.medium.fontFamily,
    textAlign: 'center',
  },

});

export default BookingStepModal; 