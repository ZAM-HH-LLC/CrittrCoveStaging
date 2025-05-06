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
import { AuthContext, debugLog } from '../context/AuthContext';
import ServiceAndPetsCard from './bookingComponents/ServiceAndPetsCard';
import DateSelectionCard from './bookingComponents/DateSelectionCard';
import TimeSelectionCard from './bookingComponents/TimeSelectionCard';
import ReviewAndRatesCard from './bookingComponents/ReviewAndRatesCard';
import StepProgressIndicator from './common/StepProgressIndicator';
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
  const { is_DEBUG, screenWidth } = useContext(AuthContext);
  const isSmallScreen = screenWidth < 600;
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
      isOvernightForced: false,
      hasIndividualTimes: false  // Default to false
    },
    rates: initialData.rates || {},
    dateSelectionData: null,
    dateRange: null,
    hasFetchedDates: false, // Track whether dates have been fetched
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
          // Use our utility function to parse occurrences correctly
          const parsedData = parseOccurrencesForBookingSteps(response.occurrences || []);
          
          debugLog('MBA2j3kbr9hve4: Parsed draft dates and times:', parsedData);
          
          // Check if this is an overnight service
          // First check the service from the response 
          const serviceName = (response.service_details?.service_type || '').toLowerCase();
          const knownOvernightTerms = ['overnight', 'boarding', 'house sitting', 'pet sitting'];
          const isOvernightService = response.service_details?.is_overnight === true || 
                                   knownOvernightTerms.some(term => serviceName.includes(term));
          
          debugLog('MBA2j3kbr9hve4: Is overnight service from response:', isOvernightService);
          debugLog('MBA2j3kbr9hve4: Service name:', serviceName);
          debugLog('MBA2j3kbr9hve4: Known overnight terms match:', knownOvernightTerms.some(term => serviceName.includes(term)));
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
              individualTimeRanges: parsedData.individualTimes || {},
              allTimesAreTheSame: parsedData.allTimesAreTheSame,
              hasIndividualTimes: !parsedData.allTimesAreTheSame,
              // Ensure we preserve the isOvernightForced flag based on the service type
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
    if (bookingData.service?.is_overnight || bookingData.times?.isOvernightForced) {
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
  }, [bookingData.service, bookingData.times?.isOvernightForced]);

  const handleServiceSelect = (service) => {
    debugLog('MBA12345 Selected service:', service);
    
    // Check if the service has an overnight property or name contains overnight-related terms
    const serviceName = (service?.service_name || '').toLowerCase();
    const knownOvernightTerms = ['overnight', 'boarding', 'house sitting', 'pet sitting'];
    
    // Determine if this is an overnight service from the is_overnight flag or name
    const isOvernight = service?.is_overnight === true || 
                        knownOvernightTerms.some(term => serviceName.includes(term));
    
    debugLog('MBA2j3kbr9hve4: Service overnight status:', {
      isOvernight,
      serviceData: service,
      serviceName,
      matchesOvernightTerms: knownOvernightTerms.some(term => serviceName.includes(term))
    });
    
    setBookingData(prev => {
      // Update times object to include isOvernightForced based on service
      const updatedTimes = {
        ...(prev.times || {}),
        // Explicitly set isOvernightForced based on service type
        isOvernightForced: isOvernight
      };
      
      debugLog('MBA2j3kbr9hve4: Updated times with overnight status:', updatedTimes);
      
      // Also update the service object to ensure is_overnight is set correctly
      const updatedService = {
        ...service,
        is_overnight: isOvernight
      };
      
      return {
        ...prev,
        service: updatedService,
        // Also update the times object to ensure isOvernightForced is set correctly
        times: updatedTimes,
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
      // Check if we have individual day times
      if (timeData.hasIndividualTimes) {
        // Filter out only the date-keyed properties and non-function properties
        const individualTimes = Object.keys(timeData)
          .filter(key => key.match(/^\d{4}-\d{2}-\d{2}$/) || 
                        ['startTime', 'endTime', 'isOvernightForced', 'hasIndividualTimes', 'dates'].includes(key))
          .reduce((obj, key) => {
            obj[key] = timeData[key];
            return obj;
          }, {});
          
        debugLog('MBA12345 Using individual day times:', individualTimes);
        
        return {
          ...prev,
          times: {
            ...individualTimes,
            hasIndividualTimes: true
          }
        };
      } else {
        // Using default time range mode
        debugLog('MBA12345 Using default time range mode');
        
        // Create a new times object that preserves any existing values
        const updatedTimes = {
          ...prev.times,
          startTime: timeData.startTime ? `${String(timeData.startTime.hours).padStart(2, '0')}:${String(timeData.startTime.minutes || 0).padStart(2, '0')}` : prev.times.startTime,
          endTime: timeData.endTime ? `${String(timeData.endTime.hours).padStart(2, '0')}:${String(timeData.endTime.minutes || 0).padStart(2, '0')}` : prev.times.endTime,
          isOvernightForced: timeData.isOvernightForced,
          // Explicitly set hasIndividualTimes to false
          hasIndividualTimes: false
        };

        debugLog('MBA12345 Previous times:', prev.times);
        debugLog('MBA12345 Updated times:', updatedTimes);

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

        // First check if dateSelectionData exists and is valid
        if (bookingData.dateSelectionData && bookingData.dateSelectionData.isValid) {
          return true;
        }
        
        // Check if we have any dates in the array
        if (bookingData.dates && bookingData.dates.length > 0) {
          return true;
        }
        
        // Check if we have a valid date range
        if (bookingData.dateRange && bookingData.dateRange.startDate && bookingData.dateRange.endDate) {
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
    if (!canProceedToNextStep()) {
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
            debugLog('MBA5asdt3f4321 DIRECT OVERRIDE: Forcing overnight mode for any overnight service');
            
            const startDate = formatDateForAPI(bookingData.dateRange.startDate);
            const endDate = formatDateForAPI(bookingData.dateRange.endDate);
            const startTime = formatTimeForAPI(bookingData.times.startTime);
            const endTime = formatTimeForAPI(bookingData.times.endTime);
            
            debugLog('MBA5asdt3f4321 DIRECT OVERRIDE: Using time-and-date endpoint with dates:', {
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

            // Call the API with UTC times and dates
            const response = await updateBookingDraftTimeAndDate(
              bookingId,
              utcStartDate,
              utcEndDate,
              utcStartTime,
              utcEndTime
            );
            
            debugLog('MBA5asdt3f4321 DIRECT OVERRIDE: Response from updateBookingDraftTimeAndDate:', response);
            
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
            const isTimeOvernight = bookingData.times?.isOvernightForced === true;
            
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
                  debugLog('MBA5asdt3f4321 DETECTED multi-day date range:', {
                    startDate: bookingData.dateRange.startDate,
                    endDate: bookingData.dateRange.endDate,
                    daysDifference
                  });
                }
              } catch (err) {
                debugLog('MBA5asdt3f4321 Error checking date range:', err);
              }
            }
            
            debugLog('MBA5asdt3f4321 CRITICAL Checking overnight status:', {
              dateRangeType: bookingData.dateRangeType,
              serviceIsOvernight: isServiceOvernight,
              timesIsOvernightForced: isTimeOvernight,
              isMultiDayRange: isMultiDayRange,
              service: bookingData.service,
              times: bookingData.times
            });
            
            // DIRECT FIX: If either the service or times indicate this is an overnight service,
            // or if we have a multi-day date range, we need to use the updateBookingDraftTimeAndDate endpoint
            if (isServiceOvernight || isTimeOvernight || isMultiDayRange) {
              // Force the overnight flag to ensure we get the right API call in future steps
              const updatedBookingData = {
                ...bookingData,
                service: {
                  ...bookingData.service,
                  is_overnight: true
                },
                times: {
                  ...bookingData.times,
                  isOvernightForced: true
                }
              };
              
              // Update state with the forced overnight mode
              setBookingData(updatedBookingData);
              
              // This is an overnight service with a date range, so we should call updateBookingDraftTimeAndDate
              debugLog('MBA5asdt3f4321 OVERRIDE: Forcing overnight mode for date range due to overnight service or flag');
              
              const startDate = formatDateForAPI(bookingData.dateRange.startDate);
              const endDate = formatDateForAPI(bookingData.dateRange.endDate);
              const startTime = formatTimeForAPI(bookingData.times.startTime);
              const endTime = formatTimeForAPI(bookingData.times.endTime);
              
              debugLog('MBA5asdt3f4321 Using update-time-and-date endpoint for OVERNIGHT service with dates:', {
                startDate,
                endDate,
                startTime,
                endTime,
                service: updatedBookingData.service,
                times: updatedBookingData.times
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

              // Call the API with UTC times and dates
              const response = await updateBookingDraftTimeAndDate(
                bookingId,
                utcStartDate,
                utcEndDate,
                utcStartTime,
                utcEndTime
              );
              
              debugLog('MBA5asdt3f4321 Received response from updateBookingDraftTimeAndDate (overnight override):', response);
              
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
                  }
                }));
              }
              
              // Skip the rest of the checks since we've already made the API call
              setCurrentStep(prev => prev + 1);
              return;
            }
            
            const isNonOvernightDateRange = 
              bookingData.dateRangeType === 'date-range' && 
              !isServiceOvernight &&
              !isTimeOvernight &&
              !isMultiDayRange;

            debugLog('MBA5asdt3f4321 Decision:', {
              isNonOvernightDateRange: isNonOvernightDateRange,
              willUseEndpoint: isNonOvernightDateRange ? 'updateBookingDraftMultipleDays' : 'updateBookingDraftTimeAndDate'
            });

            if (isNonOvernightDateRange) {
              // For non-overnight date range services, we need to create individual days
              debugLog('MBA5asdt3f4321 Handling non-overnight date range as individual occurrences');
              
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
              
              debugLog('MBA5asdt3f4321 Generated dates from range:', dates.map(d => d.toISOString().split('T')[0]));
              debugLog('MBA5asdt3f4321 Time settings:', bookingData.times);
              
              // Format dates and determine times for each day
              const formattedDates = dates.map(date => {
                const dateKey = date.toISOString().split('T')[0];
                debugLog('MBA5asdt3f4321 Processing date:', dateKey);
                
                let dayTimes = bookingData.times;
                
                // If there are individual time settings for this day, use those
                if (bookingData.times[dateKey] && bookingData.times.hasIndividualTimes) {
                  dayTimes = bookingData.times[dateKey];
                  debugLog('MBA5asdt3f4321 Using individual times for date:', dateKey, dayTimes);
                } else {
                  debugLog('MBA5asdt3f4321 Using default times for date:', dateKey, dayTimes);
                }
                
                // Format the start time
                let startTime;
                if (typeof dayTimes.startTime === 'string') {
                  startTime = dayTimes.startTime;
                } else if (dayTimes.startTime?.hours !== undefined) {
                  startTime = `${String(dayTimes.startTime.hours).padStart(2, '0')}:${String(dayTimes.startTime.minutes || 0).padStart(2, '0')}`;
                } else {
                  // Default time if missing
                  startTime = '09:00';
                }
                
                // Format the end time
                let endTime;
                if (typeof dayTimes.endTime === 'string') {
                  endTime = dayTimes.endTime;
                } else if (dayTimes.endTime?.hours !== undefined) {
                  endTime = `${String(dayTimes.endTime.hours).padStart(2, '0')}:${String(dayTimes.endTime.minutes || 0).padStart(2, '0')}`;
                } else {
                  // Default time if missing
                  endTime = '17:00';
                }
                
                debugLog('MBA5asdt3f4321 Formatted times for date:', dateKey, { startTime, endTime });
                
                // Format the date
                const formattedDate = formatDateForAPI(date);
                debugLog('MBA5asdt3f4321 Formatted date:', formattedDate);
                
                try {
                  // Convert local times to UTC
                  const { date: utcDate, time: utcStartTime } = convertToUTC(
                    formattedDate,
                    startTime,
                    'US/Mountain'
                  );
                  
                  const { time: utcEndTime } = convertToUTC(
                    formattedDate,
                    endTime,
                    'US/Mountain'
                  );
                  
                  debugLog('MBA5asdt3f4321 Converted UTC times:', { utcDate, utcStartTime, utcEndTime });
                  
                  return {
                    date: utcDate,
                    startTime: utcStartTime,
                    endTime: utcEndTime
                  };
                } catch (err) {
                  debugLog('MBA5asdt3f4321 Error converting time to UTC:', err);
                  throw err;
                }
              });
              
              debugLog('MBA5asdt3f4321 Sending non-overnight date range as individual days:', formattedDates);
              
              // Call the API for multiple individual days (even though they're from a date range)
              const response = await updateBookingDraftMultipleDays(
                bookingId,
                {
                  dates: formattedDates,
                  times: {} // Empty times object since times are already included in each date
                }
              );
              
              debugLog('MBA5asdt3f4321 Received response from updateBookingDraftMultipleDays:', response);
              
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

              debugLog('MBA5asdt3f4321 Using update-time-and-date endpoint for OVERNIGHT service with dates:', {
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
                'US/Mountain'
              );

              const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                endDate,
                endTime,
                'US/Mountain'
              );

              debugLog('MBA5asdt3f4321 UTC dates and times:', {
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

              debugLog('MBA5asdt3f4321 Received response from updateBookingDraftTimeAndDate:', response);

              // Update booking data with the response's draft_data
              if (response?.draft_data) {
                setBookingData(prev => ({
                  ...prev,
                  ...response.draft_data
                }));
              } else {
                debugLog('MBA5asdt3f4321 No draft_data in response:', response);
              }
            }
          } else if (bookingData.dateRangeType === 'multiple-days') {
            // Handle multiple individual days
            debugLog('MBA5asdt3f4321 Multiple days selection:', {
              dates: bookingData.dates,
              times: bookingData.times
            });

            // Call the API for multiple individual days
            const response = await updateBookingDraftMultipleDays(
              bookingId,
              {
                dates: bookingData.dates,
                times: bookingData.times
              }
            );

            debugLog('MBA5asdt3f4321 Received response from updateBookingDraftMultipleDays:', response);

            if (response?.draft_data) {
              setBookingData(prev => ({
                ...prev,
                ...response.draft_data
              }));
            }
          } else if (bookingData.bookingType === 'recurring') {
            // Handle recurring dates
            debugLog('MBA5asdt3f4321 Recurring dates selection:', {
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

            debugLog('MBA5asdt3f4321 Received response from updateBookingDraftRecurring:', response);

            if (response?.draft_data) {
              setBookingData(prev => ({
                ...prev,
                ...response.draft_data
              }));
            }
          }
        } catch (error) {
          debugLog('MBA5asdt3f4321 Error calculating booking totals:', error);
          debugLog('MBA5asdt3f4321 Error stack:', error.stack);
          debugLog('MBA5asdt3f4321 Error details:', {
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
        debugLog('MBA2j3kbr9hve4: Rendering date selection with:', { 
          dates: bookingData.dates, 
          dateRange: bookingData.dateRange,
          bookingType: bookingData.bookingType,
          dateRangeType: bookingData.dateRangeType,
          hasFetchedDates: bookingData.hasFetchedDates
        });
        
        const dateSelectionIsOvernightMode = bookingData.service?.is_overnight || bookingData.times?.isOvernightForced || false;
        
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
        
        // Prepare initialTimes object with all necessary data
        const initialTimes = {
          ...bookingData.times,
          // Always include dates for multiple-days selection
          dates: bookingData.dates || [],
          // Include occurrences if available
          occurrences: bookingData.occurrences || [],
          // Ensure hasIndividualTimes is preserved from bookingData.times
          hasIndividualTimes: bookingData.times?.hasIndividualTimes || false,
          // Make sure isOvernightForced is included in initialTimes
          isOvernightForced: bookingData.service?.is_overnight || bookingData.times?.isOvernightForced || false
        };
        
        // If it's an overnight service, make sure hasIndividualTimes is false
        if (bookingData.service?.is_overnight || bookingData.times?.isOvernightForced) {
          initialTimes.hasIndividualTimes = false;
          initialTimes.isOvernightForced = true;
        }
        
        const isOvernightMode = bookingData.service?.is_overnight || bookingData.times?.isOvernightForced || false;
        
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
      service: initialData.service || null,
      pets: initialData.pets || [],
      dates: initialData.dates || [],
      bookingType: initialData.bookingType || 'one-time',
      dateRangeType: initialData.dateRangeType || 'date-range',
      times: initialData.times || {
        startTime: '09:00',
        endTime: '17:00',
        isOvernightForced: false,
        hasIndividualTimes: false
      },
      rates: initialData.rates || {},
      dateSelectionData: null,
      dateRange: null,
      hasFetchedDates: false, // Reset the fetch flag to ensure dates are refetched
    });
    setError(null);
    setIsLoading(false);
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

  return (
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
});

export default BookingStepModal; 