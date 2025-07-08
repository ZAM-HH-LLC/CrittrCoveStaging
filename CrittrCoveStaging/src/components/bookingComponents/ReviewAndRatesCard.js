// THIS FILE IS FOR THE BOOKING STEP MODAL
import React, { useEffect, useContext, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext, debugLog } from '../../context/AuthContext';
import { formatDateTimeRangeFromUTC, formatFromUTC, FORMAT_TYPES } from '../../utils/time_utils';
import { updateBookingDraftRates, updateDraftNotesFromPro } from '../../api/API';
import SupportButton from '../SupportButton';
import { capitalizeWords } from '../../utils/formatStrings';
import ProfessionalAlert from '../common/ProfessionalAlert';
import TermsOfServiceModal from '../modals/TermsOfServiceModal';

const ReviewAndRatesCard = ({ bookingData, onRatesUpdate, bookingId, showEditControls = true, isProfessional = true, onTermsAgreed, fromApprovalModal = false, onTosAgreementChange }) => {
  const { timeSettings } = useContext(AuthContext);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [editedRates, setEditedRates] = useState(null);
  const [newRate, setNewRate] = useState({ name: '', amount: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRates, setExpandedRates] = useState(new Set());
  const [editingOccurrenceId, setEditingOccurrenceId] = useState(null);
  const [occurrenceEdits, setOccurrenceEdits] = useState({});
  const [isAddingRateForOccurrence, setIsAddingRateForOccurrence] = useState(null);
  const [newOccurrenceRate, setNewOccurrenceRate] = useState({ name: '', amount: '', description: '' });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [serviceAdditionalRatesEnabled, setServiceAdditionalRatesEnabled] = useState({});
  const [availableAdditionalRates, setAvailableAdditionalRates] = useState([]);
  const [hasInitializedRates, setHasInitializedRates] = useState(false);
  const lastBookingIdRef = useRef(null);
  const [notesFromPro, setNotesFromPro] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [lastSavedNotes, setLastSavedNotes] = useState('');
  
  // Initialize notes from booking data if it exists
  useEffect(() => {
    if (bookingData?.notes_from_pro) {
      setNotesFromPro(bookingData.notes_from_pro);
      setLastSavedNotes(bookingData.notes_from_pro);
    }
  }, [bookingData?.notes_from_pro]);

  // Update saved state when notes change
  useEffect(() => {
    setNotesSaved(notesFromPro === lastSavedNotes);
  }, [notesFromPro, lastSavedNotes]);
  
  // Determine TOS status based on user type and booking data
  const getTosStatus = () => {
    if (!bookingData) return undefined;
    return isProfessional ? bookingData.pro_agreed_tos : bookingData.client_agreed_tos;
  };
  
  const currentTosStatus = getTosStatus();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    debugLog('MBA54321 ReviewAndRatesCard received bookingData:', bookingData);
    debugLog('MBA54321 ReviewAndRatesCard received bookingId:', bookingId);
    
    if (bookingData?.occurrences?.[0]) {
      // Create a safe default rates object
      const defaultRates = {
        base_rate: 0,
        additional_animal_rate: 0,
        applies_after: 1,
        holiday_rate: 0,
        holiday_days: 0,
        additional_rates: []
      };
      
      // Get the occurrence
      const occurrence = bookingData.occurrences[0];
      
      // Use the existing rates or default to our safe defaults
      const safeRates = occurrence.rates || defaultRates;
      
      // Initialize edited rates
      setEditedRates({ ...safeRates });
    }

    // Initialize service additional rates toggle state for non-overnight services
    debugLog('MBA2394jv340 Effect triggered - checking if should initialize service rates');
    debugLog('MBA2394jv340 Has service:', !!bookingData?.service);
    debugLog('MBA2394jv340 Service is_overnight:', bookingData?.service?.is_overnight);
    debugLog('MBA2394jv340 Occurrences length:', bookingData?.occurrences?.length);
    debugLog('MBA2394jv340 Has already initialized rates:', hasInitializedRates);
    debugLog('MBA2394jv340 Service details additional rates:', bookingData?.service_details?.additional_rates);
    
    // Check if bookingId changed to reset initialization
    if (lastBookingIdRef.current !== bookingId && lastBookingIdRef.current !== null) {
      debugLog('MBA2394jv340 BookingId changed from', lastBookingIdRef.current, 'to', bookingId, '- resetting');
      setHasInitializedRates(false);
      setAvailableAdditionalRates([]);
      setServiceAdditionalRatesEnabled({});
    }
    lastBookingIdRef.current = bookingId;
    
    if (bookingData?.service && !bookingData.service.is_overnight && bookingData?.occurrences?.length >= 1 && !hasInitializedRates) {
      debugLog('MBA2394jv340 Initializing service additional rates for non-overnight service');
      
      // Prioritize service_details.additional_rates as source of truth
      let availableRates = [];
      let enabledRates = {};
      
      if (bookingData.service_details?.additional_rates) {
        debugLog('MBA2394jv340 Using service_details.additional_rates as source:', bookingData.service_details.additional_rates);
        
        // Parse service_details.additional_rates to extract rate info
        Object.entries(bookingData.service_details.additional_rates).forEach(([rateKey, rateValue]) => {
          // Extract rate title from key (format: "rate_title_start-randomid")
          const titleMatch = rateKey.match(/^(.+)_start-[a-f0-9]+$/);
          if (titleMatch) {
            const rateTitle = titleMatch[1];
            
            // Handle both old boolean format and new enhanced object format
            let isEnabled, rateAmount, rateDescription;
            
            if (typeof rateValue === 'boolean') {
              // Old format: boolean value only
              isEnabled = rateValue;
              
              // Find the rate details from service or occurrences for backward compatibility
              rateAmount = '0.00';
              rateDescription = '';
              
              // First check service rates
              const serviceRate = bookingData.service?.additional_rates?.find(r => r.title === rateTitle);
              if (serviceRate) {
                rateAmount = serviceRate.amount || serviceRate.rate || '0.00';
                rateDescription = serviceRate.description || '';
              } else {
                // Check occurrence rates for amount/description
                for (const occ of bookingData.occurrences) {
                  const occRate = occ.rates?.additional_rates?.find(r => (r.title || r.name) === rateTitle);
                  if (occRate) {
                    rateAmount = occRate.amount || '0.00';
                    rateDescription = occRate.description || '';
                    break;
                  }
                }
              }
            } else if (typeof rateValue === 'object' && rateValue !== null) {
              // New enhanced format: {applies: bool, amount: str, description: str}
              isEnabled = rateValue.applies || false;
              rateAmount = rateValue.amount || '0.00';
              rateDescription = rateValue.description || '';
            } else {
              // Fallback for unexpected format
              debugLog('MBA2394jv340 Unexpected rate value format:', rateValue);
              isEnabled = false;
              rateAmount = '0.00';
              rateDescription = '';
            }
            
            availableRates.push({
              title: rateTitle,
              amount: rateAmount,
              rate: rateAmount, // For consistency
              description: rateDescription
            });
            
            enabledRates[rateTitle] = isEnabled;
          }
        });
        
        debugLog('MBA2394jv340 Parsed available rates from service_details:', availableRates);
        debugLog('MBA2394jv340 Parsed enabled rates from service_details:', enabledRates);
      } else {
        // Fallback to legacy logic if service_details.additional_rates doesn't exist
        debugLog('MBA2394jv340 No service_details.additional_rates found, falling back to legacy logic');
        
        // Get service additional rates from the service object or collect from occurrences
        const serviceAdditionalRates = bookingData.service.additional_rates || [];
        debugLog('MBA2394jv340 Raw service additional rates from initialization:', serviceAdditionalRates);
        
        // If service doesn't have additional rates, collect unique rates from all occurrences
        availableRates = serviceAdditionalRates;
        if (serviceAdditionalRates.length === 0) {
          debugLog('MBA2394jv340 No service rates found in initialization, collecting from occurrences');
          const allOccurrenceRates = [];
          
          bookingData.occurrences.forEach((occ, index) => {
            const occRates = occ.rates?.additional_rates || [];
            debugLog(`MBA2394jv340 Initialization: Occurrence ${index} additional rates:`, occRates);
            allOccurrenceRates.push(...occRates);
          });
          
          // Get unique rates by title
          const uniqueRatesMap = new Map();
          allOccurrenceRates.forEach(rate => {
            if (rate.title && !uniqueRatesMap.has(rate.title)) {
              uniqueRatesMap.set(rate.title, {
                title: rate.title,
                amount: rate.amount,
                rate: rate.amount, // For consistency with service rates
                description: rate.description || ''
              });
            }
          });
          
          availableRates = Array.from(uniqueRatesMap.values());
          debugLog('MBA2394jv340 Initialization: Unique rates collected from occurrences:', availableRates);
        }
        
        // Filter out base rates that are not actual additional rates
        availableRates = availableRates.filter(rate => {
          const title = (rate.title || '').toLowerCase();
          return !title.includes('base rate') && 
                 !title.includes('additional animal') && 
                 !title.includes('holiday rate');
        });
        
        debugLog('MBA2394jv340 Filtered service additional rates from initialization:', availableRates);
        
        // Check which rates are currently applied to ALL occurrences
        availableRates.forEach(serviceRate => {
          // Count how many occurrences have this rate
          let occurrencesWithRate = 0;
          bookingData.occurrences.forEach(occ => {
            const hasRate = occ.rates?.additional_rates?.some(occRate => 
              (occRate.title || occRate.name) === serviceRate.title
            );
            if (hasRate) occurrencesWithRate++;
          });
          
          // Rate is enabled only if it appears in ALL occurrences
          const isEnabled = occurrencesWithRate === bookingData.occurrences.length;
          enabledRates[serviceRate.title] = isEnabled;
          debugLog('MBA2394jv340 Rate status:', { 
            title: serviceRate.title, 
            isEnabled, 
            occurrencesWithRate, 
            totalOccurrences: bookingData.occurrences.length 
          });
        });
      }
      
      debugLog('MBA2394jv340 Final available rates:', availableRates);
      debugLog('MBA2394jv340 Final enabled rates state:', enabledRates);
      
      // Store the available rates in state so they persist
      setAvailableAdditionalRates(availableRates);
      setServiceAdditionalRatesEnabled(enabledRates);
      setHasInitializedRates(true);
    } else {
      debugLog('MBA2394jv340 NOT initializing service rates - conditions not met or already initialized');
      if (!hasInitializedRates) {
        setAvailableAdditionalRates([]);
      }
    }
  }, [bookingData, bookingId, hasInitializedRates]);



  // Log whenever either editMode or editingOccurrenceId changes
  useEffect(() => {
    debugLog('MBA66777 Edit state changed:', { 
      isEditMode, 
      editingOccurrenceId, 
      occurrencesCount: bookingData?.occurrences?.length || 0
    });
    debugLog('MBA2oinv5nd Current editedRates state:', editedRates);
    debugLog('MBA2oinv5nd Current occurrenceEdits state:', occurrenceEdits);
  }, [isEditMode, editingOccurrenceId, bookingData?.occurrences?.length, editedRates, occurrenceEdits]);



  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const saveNotesToDraft = async () => {
    if (!bookingData?.conversation_id) {
      debugLog('MBA88888 No conversation ID available for saving notes');
      return;
    }

    if (notesFromPro === lastSavedNotes) {
      debugLog('MBA88888 Notes are the same as last saved notes');
      return;
    }

    try {
      setIsSavingNotes(true);
      debugLog('MBA88888 Saving notes to draft:', { 
        conversationId: bookingData.conversation_id, 
        notes: notesFromPro 
      });

      await updateDraftNotesFromPro(bookingData.conversation_id, notesFromPro);
      
      setLastSavedNotes(notesFromPro);
      debugLog('MBA88888 Notes saved successfully');
    } catch (error) {
      debugLog('MBA88888 Error saving notes:', error);
      // Could add error state/toast here if needed
    } finally {
      setIsSavingNotes(false);
    }
  };

  const toggleEditMode = () => {
    debugLog('MBA2oinv5nd toggleEditMode called, current isEditMode:', isEditMode);
    if (isEditMode) {
      // Save changes
      debugLog('MBA2oinv5nd Saving changes via toggleEditMode');
      saveRateChanges();
    } else {
      // Enter edit mode - initialize editedRates with current occurrence data
      const occurrence = bookingData.occurrences[0]; // For single occurrence bookings
      debugLog('MBA2oinv5nd Entering edit mode, initializing editedRates with occurrence data:', occurrence?.rates);
      if (occurrence) {
        const initialEditedRates = {
          base_rate: occurrence.rates.base_rate,
          additional_animal_rate: occurrence.rates.additional_animal_rate || 0,
          applies_after: occurrence.rates.applies_after || 1,
          holiday_rate: occurrence.rates.holiday_rate || 0,
          additional_rates: occurrence.rates.additional_rates?.map(r => ({
            name: r.name || r.title,
            amount: r.amount,
            description: r.description || ''
          })) || []
        };
        debugLog('MBA2oinv5nd Setting editedRates to:', initialEditedRates);
        setEditedRates(initialEditedRates);
      }
      setIsEditMode(true);
      setIsAddingRate(false);
    }
  };

  const toggleAddRate = () => {
    setIsAddingRate(!isAddingRate);
    // Don't exit edit mode when adding a rate for overnight bookings
    setNewRate({ name: '', amount: '', description: '' });
  };

  // Helper function to sanitize amount input for consistent handling
  const sanitizeAmountInput = (value) => {
    // Remove non-numeric characters except decimal point
    let sanitized = value
      .replace(/[^\d.]/g, '') // Remove anything that's not a digit or decimal point
      .replace(/(\..*)\./g, '$1'); // Remove multiple decimal points, keep only the first one
    
    // Limit to 2 decimal places
    const parts = sanitized.split('.');
    if (parts.length > 1 && parts[1].length > 2) {
      sanitized = `${parts[0]}.${parts[1].substring(0, 2)}`;
    }
    
    return sanitized;
  };
  
  // Update the setNewRate for amount field to apply consistent validation
  const handleNewRateAmountChange = (text) => {
    setNewRate(prev => ({
      ...prev,
      amount: sanitizeAmountInput(text)
    }));
  };
  
  // Update the setNewOccurrenceRate for amount field to apply consistent validation
  const handleNewOccurrenceRateAmountChange = (text) => {
    setNewOccurrenceRate(prev => ({
      ...prev,
      amount: sanitizeAmountInput(text)
    }));
  };

  const saveRateChanges = async () => {
    // Use occurrenceEdits if it has values (single occurrence edit mode), otherwise use editedRates
    const hasOccurrenceEdits = occurrenceEdits && Object.keys(occurrenceEdits).length > 0;
    const ratesToSave = hasOccurrenceEdits ? occurrenceEdits : editedRates;
    debugLog('MBA2oinv5nd saveRateChanges called. Using ratesToSave:', ratesToSave, 'Source:', hasOccurrenceEdits ? 'occurrenceEdits' : 'editedRates');
    
    if (!ratesToSave) {
      debugLog('MBA2oinv5nd No ratesToSave found, returning early');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      debugLog('MBA66777 Saving rate changes:', ratesToSave);
      debugLog('MBA66777 Using bookingId:', bookingId);
      debugLog('MBA2oinv5nd Detailed ratesToSave breakdown:', {
        base_rate: ratesToSave.base_rate,
        additional_animal_rate: ratesToSave.additional_animal_rate,
        applies_after: ratesToSave.applies_after,
        holiday_rate: ratesToSave.holiday_rate,
        additional_rates: ratesToSave.additional_rates
      });
      
      // Create a clean version of ratesToSave to send to API
      const cleanRates = {
        ...ratesToSave,
        additional_rates: ratesToSave.additional_rates && ratesToSave.additional_rates.length > 0 
          ? ratesToSave.additional_rates.map(rate => ({
              title: rate.name || rate.title, // Always use 'title' for backend
              // Convert empty or string amount values to number
              amount: rate.amount === '' ? 0 : typeof rate.amount === 'string' ? parseFloat(rate.amount) : rate.amount,
              description: rate.description || `Additional rate`
            }))
          : []
      };
      
      // Create occurrences array for API with all occurrences
      const occurrencesForApi = bookingData.occurrences.map((occ, index) => {
        // For the first occurrence (the one being edited in this case), update its rates
        if (index === 0) {
          return {
            occurrence_id: occ.occurrence_id,
            rates: {
              base_rate: cleanRates.base_rate === '' ? 0 : typeof cleanRates.base_rate === 'string' ? parseFloat(cleanRates.base_rate) : cleanRates.base_rate,
              additional_animal_rate: cleanRates.additional_animal_rate === '' ? 0 : typeof cleanRates.additional_animal_rate === 'string' ? parseFloat(cleanRates.additional_animal_rate) : cleanRates.additional_animal_rate || 0,
              applies_after: parseInt(cleanRates.applies_after || 1),
              holiday_rate: cleanRates.holiday_rate === '' ? 0 : typeof cleanRates.holiday_rate === 'string' ? parseFloat(cleanRates.holiday_rate) : cleanRates.holiday_rate || 0,
              additional_rates: cleanRates.additional_rates
            }
          };
        }
        // For other occurrences, keep them as they are
        return {
          occurrence_id: occ.occurrence_id,
          rates: {
            base_rate: parseFloat(occ.rates.base_rate),
            additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
            applies_after: parseInt(occ.rates.applies_after || 1),
            holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
            additional_rates: (occ.rates.additional_rates || []).map(rate => ({
              title: rate.name || rate.title,
              amount: parseFloat(rate.amount),
              description: rate.description || ''
            }))
          }
        };
      });
      
      debugLog('MBA66777 Sending all occurrences to API:', occurrencesForApi);
      debugLog('MBA2oinv5nd First occurrence rates being sent to API:', occurrencesForApi[0]?.rates);
      
      // Call the API to update rates using the bookingId prop
      const response = await updateBookingDraftRates(
        bookingId, 
        occurrencesForApi
      );
      
      debugLog('MBA66777 Rate update API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        // Call onRatesUpdate with the updated data from the API
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
      
      // Reset all edit state
      setIsEditMode(false);
      setEditingOccurrenceId(null);
      setOccurrenceEdits({});
      setExpandedRates(new Set());
      setIsAddingRate(false);
      setIsAddingRateForOccurrence(null);
    } catch (err) {
      debugLog('MBA66777 Error saving rate changes:', err);
      setError('Failed to update rates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNewRate = async () => {
    if (!newRate.name || (!newRate.amount && newRate.amount !== '')) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create the new rate object
      const newAdditionalRate = {
        title: newRate.name,
        amount: newRate.amount === '' ? 0 : typeof newRate.amount === 'string' ? parseFloat(newRate.amount) : newRate.amount,
        description: newRate.description || `Additional rate`
      };
      
      // Create an updated rates object
      const updatedRates = { ...editedRates };
      
      if (!updatedRates.additional_rates) {
        updatedRates.additional_rates = [];
      }
      
      updatedRates.additional_rates.push({
        name: newRate.name,
        title: newRate.name, // Add title for consistency
        amount: newRate.amount === '' ? 0 : typeof newRate.amount === 'string' ? parseFloat(newRate.amount) : newRate.amount,
        description: newRate.description || `Additional rate`
      });
      
      // Create occurrences array for API with all occurrences
      const occurrencesForApi = bookingData.occurrences.map((occ, index) => {
        // For the first occurrence (the one being edited in this case), update its rates with the new rate
        if (index === 0) {
          return {
            occurrence_id: occ.occurrence_id,
            rates: {
              base_rate: parseFloat(updatedRates.base_rate),
              additional_animal_rate: parseFloat(updatedRates.additional_animal_rate || 0),
              applies_after: parseInt(updatedRates.applies_after || 1),
              holiday_rate: parseFloat(updatedRates.holiday_rate || 0),
              additional_rates: updatedRates.additional_rates.map(rate => ({
                title: rate.name || rate.title,
                amount: parseFloat(rate.amount),
                description: rate.description || `Additional rate`
              }))
            }
          };
        }
        // For other occurrences, keep them as they are
        return {
          occurrence_id: occ.occurrence_id,
          rates: {
            base_rate: parseFloat(occ.rates.base_rate),
            additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
            applies_after: parseInt(occ.rates.applies_after || 1),
            holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
            additional_rates: (occ.rates.additional_rates || []).map(rate => ({
              title: rate.name || rate.title,
              amount: parseFloat(rate.amount),
              description: rate.description || ''
            }))
          }
        };
      });
      
      debugLog('MBA66777 Sending all occurrences with new rate to API:', occurrencesForApi);
      
      // Call the API to update rates using the bookingId prop
      const response = await updateBookingDraftRates(
        bookingId, 
        occurrencesForApi
      );
      
      debugLog('MBA66777 New rate added API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        // Set the edited rates from the response
        if (response.draft_data.occurrences && response.draft_data.occurrences[0]) {
          setEditedRates(response.draft_data.occurrences[0].rates);
        }
        
        // Call onRatesUpdate with the updated data from the API
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
      
      setIsAddingRate(false);
      setNewRate({ name: '', amount: '', description: '' });
    } catch (err) {
      debugLog('MBA66777 Error adding new rate:', err);
      setError('Failed to add new rate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBaseRate = (value) => {
    // Apply consistent amount sanitization
    const sanitizedValue = sanitizeAmountInput(value);
    debugLog('MBA2oinv5nd updateBaseRate called with value:', value, 'sanitized to:', sanitizedValue);
    debugLog('MBA2oinv5nd Current editedRates before update:', editedRates);
    
    setEditedRates(prev => {
      const newRates = {
        ...prev,
        base_rate: sanitizedValue
      };
      debugLog('MBA2oinv5nd New editedRates after base rate update:', newRates);
      return newRates;
    });
  };

  const updateAdditionalAnimalRate = (value) => {
    // Apply consistent amount sanitization
    const sanitizedValue = sanitizeAmountInput(value);
    debugLog('MBA2oinv5nd updateAdditionalAnimalRate called with value:', value, 'sanitized to:', sanitizedValue);
    debugLog('MBA2oinv5nd Current editedRates before update:', editedRates);
    
    setEditedRates(prev => {
      const newRates = {
        ...prev,
        additional_animal_rate: sanitizedValue
      };
      debugLog('MBA2oinv5nd New editedRates after additional animal rate update:', newRates);
      return newRates;
    });
  };

  const updateHolidayRate = (value) => {
    // Apply consistent amount sanitization
    const sanitizedValue = sanitizeAmountInput(value);
    
    setEditedRates(prev => ({
      ...prev,
      holiday_rate: sanitizedValue
    }));
  };

  const updateAdditionalRate = (index, field, value) => {
    debugLog('MBA2oinv5nd updateAdditionalRate called with index:', index, 'field:', field, 'value:', value);
    debugLog('MBA2oinv5nd Current editedRates:', editedRates);
    
    if (!editedRates?.additional_rates) {
      debugLog('MBA2oinv5nd No additional_rates in editedRates, returning early');
      return;
    }
    
    const updatedAdditionalRates = [...editedRates.additional_rates];
    debugLog('MBA2oinv5nd Current additional_rates:', updatedAdditionalRates);
    
    if (field === 'amount') {
      // Apply consistent amount sanitization
      const sanitizedValue = sanitizeAmountInput(value);
      debugLog('MBA2oinv5nd Updating amount from', updatedAdditionalRates[index]?.amount, 'to', sanitizedValue);
      
      updatedAdditionalRates[index] = {
        ...updatedAdditionalRates[index],
        amount: sanitizedValue === '' ? '' : sanitizedValue
      };
    } else if (field === 'name') {
      debugLog('MBA2oinv5nd Updating name from', updatedAdditionalRates[index]?.name, 'to', value);
      updatedAdditionalRates[index] = {
        ...updatedAdditionalRates[index],
        name: value
      };
    }
    
    debugLog('MBA2oinv5nd Updated additional_rates:', updatedAdditionalRates);
    
    setEditedRates(prev => {
      const newRates = {
        ...prev,
        additional_rates: updatedAdditionalRates
      };
      debugLog('MBA2oinv5nd New editedRates after additional rate update:', newRates);
      return newRates;
    });
  };

  const deleteAdditionalRate = async (index) => {
    if (!editedRates?.additional_rates) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create an updated rates object
      const updatedRates = { ...editedRates };
      const updatedAdditionalRates = [...updatedRates.additional_rates];
      updatedAdditionalRates.splice(index, 1);
      updatedRates.additional_rates = updatedAdditionalRates;
      
      // Create occurrences array for API with all occurrences
      const occurrencesForApi = bookingData.occurrences.map((occ, occIndex) => {
        // For the first occurrence (the one being edited in this case), update its rates with the updated rates
        if (occIndex === 0) {
          return {
            occurrence_id: occ.occurrence_id,
            rates: {
              base_rate: parseFloat(updatedRates.base_rate),
              additional_animal_rate: parseFloat(updatedRates.additional_animal_rate || 0),
              applies_after: parseInt(updatedRates.applies_after || 1),
              holiday_rate: parseFloat(updatedRates.holiday_rate || 0),
              additional_rates: updatedRates.additional_rates.map(rate => ({
                title: rate.name || rate.title,
                amount: parseFloat(rate.amount),
                description: rate.description || `Additional rate`
              }))
            }
          };
        }
        // For other occurrences, keep them as they are
        return {
          occurrence_id: occ.occurrence_id,
          rates: {
            base_rate: parseFloat(occ.rates.base_rate),
            additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
            applies_after: parseInt(occ.rates.applies_after || 1),
            holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
            additional_rates: (occ.rates.additional_rates || []).map(rate => ({
              title: rate.name || rate.title,
              amount: parseFloat(rate.amount),
              description: rate.description || ''
            }))
          }
        };
      });
      
      debugLog('MBA66777 Sending all occurrences with updated rates to API:', occurrencesForApi);
      
      // Call the API to update rates using the bookingId prop
      const response = await updateBookingDraftRates(
        bookingId, 
        occurrencesForApi
      );
      
      debugLog('MBA66777 Rate deleted API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        // Set the edited rates from the response
        if (response.draft_data.occurrences && response.draft_data.occurrences[0]) {
          setEditedRates(response.draft_data.occurrences[0].rates);
        }
        
        // Call onRatesUpdate with the updated data from the API
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
    } catch (err) {
      debugLog('MBA66777 Error deleting rate:', err);
      setError('Failed to delete rate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOccurrence = (occurrence) => {
    debugLog('MBA66777 Editing occurrence:', occurrence);
    
    // Set the occurrence ID being edited
    setEditingOccurrenceId(occurrence.occurrence_id);
    
    // For single occurrence bookings (typically overnight), also enter edit mode
    if (bookingData.occurrences.length === 1) {
      debugLog('MBA66777 Setting isEditMode for single occurrence booking');
      setIsEditMode(true);
      
      // Make sure we have the correct rates in editedRates
      setEditedRates({
        base_rate: occurrence.rates.base_rate,
        additional_animal_rate: occurrence.rates.additional_animal_rate || 0,
        applies_after: occurrence.rates.applies_after || 1,
        holiday_rate: occurrence.rates.holiday_rate || 0,
        additional_rates: occurrence.rates.additional_rates?.map(r => ({
          name: r.name || r.title,
          amount: r.amount,
          description: r.description || ''
        })) || []
      });
    } else {
      // For multiple occurrences, expand the rates panel
      setExpandedRates(new Set([occurrence.occurrence_id]));
    }
    
    // Set the occurrence edits for either case
    setOccurrenceEdits({
      base_rate: occurrence.rates.base_rate,
      additional_animal_rate: occurrence.rates.additional_animal_rate || 0,
      applies_after: occurrence.rates.applies_after || 1,
      holiday_rate: occurrence.rates.holiday_rate || 0,
      additional_rates: occurrence.rates.additional_rates?.map(r => ({
        name: r.name || r.title,
        amount: r.amount,
        description: r.description || ''
      })) || []
    });
  };

  const handleCancelEdit = () => {
    setEditingOccurrenceId(null);
    setOccurrenceEdits({});
    
    // If we were editing a single occurrence booking, exit edit mode
    if (bookingData.occurrences.length === 1) {
      setIsEditMode(false);
    }
    
    // Also cancel adding a rate if that was in progress
    setIsAddingRate(false);
    setIsAddingRateForOccurrence(null);
  };

  const handleOccurrenceInputChange = (field, value) => {
    if (field === 'base_rate' || field === 'additional_animal_rate' || field === 'holiday_rate') {
      // Apply consistent amount sanitization
      const sanitizedValue = sanitizeAmountInput(value);
      
      setOccurrenceEdits(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
    } else {
      setOccurrenceEdits(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAdditionalRateChange = (index, field, value) => {
    debugLog(`MBA66778 Changing additional rate at index ${index}, field ${field} to value: ${value}`, {
      currentOccurrenceEdits: occurrenceEdits,
      currentAdditionalRates: occurrenceEdits.additional_rates
    });
    
    setOccurrenceEdits(prev => {
      const updated = [...(prev.additional_rates || [])];
      
      if (field === 'amount') {
        // Apply consistent amount sanitization
        const sanitizedValue = sanitizeAmountInput(value);
        
        updated[index] = {
          ...updated[index],
          amount: sanitizedValue === '' ? '' : sanitizedValue
        };
      } else if (field === 'name') {
        updated[index] = {
          ...updated[index],
          name: value
        };
      }
      
      debugLog(`MBA66778 Updated additional rate:`, {
        updatedRate: updated[index],
        allRates: updated
      });
      
      return { ...prev, additional_rates: updated };
    });
  };

  const handleSaveOccurrenceRates = async (occurrence) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clean up any empty amount values in occurrenceEdits
      const cleanOccurrenceEdits = {
        ...occurrenceEdits,
        additional_rates: (occurrenceEdits.additional_rates || []).map(rate => ({
          title: rate.name || rate.title, // Always use 'title' for backend
          // Convert empty or string amount values to number
          amount: rate.amount === '' ? 0 : typeof rate.amount === 'string' ? parseFloat(rate.amount) : rate.amount,
          description: rate.description || ''
        }))
      };
      
      // Create a list of occurrences to send to the API
      const occurrencesForApi = bookingData.occurrences.map(occ => {
        // For the occurrence being edited, update its rates
        if (occ.occurrence_id === occurrence.occurrence_id) {
          return {
            occurrence_id: occurrence.occurrence_id,
            rates: {
              base_rate: occurrenceEdits.base_rate === '' ? 0 : typeof occurrenceEdits.base_rate === 'string' ? parseFloat(occurrenceEdits.base_rate) : occurrenceEdits.base_rate,
              additional_animal_rate: occurrenceEdits.additional_animal_rate === '' ? 0 : typeof occurrenceEdits.additional_animal_rate === 'string' ? parseFloat(occurrenceEdits.additional_animal_rate) : occurrenceEdits.additional_animal_rate || 0,
              applies_after: parseInt(occurrenceEdits.applies_after || 1),
              holiday_rate: occurrenceEdits.holiday_rate === '' ? 0 : typeof occurrenceEdits.holiday_rate === 'string' ? parseFloat(occurrenceEdits.holiday_rate) : occurrenceEdits.holiday_rate || 0,
              additional_rates: cleanOccurrenceEdits.additional_rates
            }
          };
        }
        // For other occurrences, keep them as they are
        return {
          occurrence_id: occ.occurrence_id,
          rates: {
            base_rate: parseFloat(occ.rates.base_rate),
            additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
            applies_after: parseInt(occ.rates.applies_after || 1),
            holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
            additional_rates: (occ.rates.additional_rates || []).map(rate => ({
              title: rate.name || rate.title,
              amount: parseFloat(rate.amount),
              description: rate.description || ''
            }))
          }
        };
      });
      
      debugLog('MBA54321 - Sending all occurrences to API:', occurrencesForApi);
      
      const response = await updateBookingDraftRates(
        bookingId,
        occurrencesForApi
      );
      
      if (response.draft_data) {
        if (onRatesUpdate) onRatesUpdate(response.draft_data);
        
        // Reset all edit state
        setEditingOccurrenceId(null);
        setOccurrenceEdits({});
        
        // If we're in edit mode for a single occurrence booking, exit that mode too
        if (bookingData.occurrences.length === 1) {
          setIsEditMode(false);
        }
        
        // Also remove any expanded rates and cancel any rate addition in progress
        setExpandedRates(new Set());
        setIsAddingRate(false);
        setIsAddingRateForOccurrence(null);
      }
    } catch (err) {
      debugLog('MBA54321 - Error saving occurrence rates:', err);
      setError('Failed to update rates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAddRateForOccurrence = (occurrenceId) => {
    if (isAddingRateForOccurrence === occurrenceId) {
      setIsAddingRateForOccurrence(null);
    } else {
      setIsAddingRateForOccurrence(occurrenceId);
    }
    setNewOccurrenceRate({ name: '', amount: '', description: '' });
  };

  const saveNewRateForOccurrence = async (occurrence) => {
    if (!newOccurrenceRate.name || (!newOccurrenceRate.amount && newOccurrenceRate.amount !== '')) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create updated occurrence edits with the new rate
      const updatedOccurrenceEdits = { ...occurrenceEdits };
      
      if (!updatedOccurrenceEdits.additional_rates) {
        updatedOccurrenceEdits.additional_rates = [];
      }
      
      updatedOccurrenceEdits.additional_rates.push({
        name: newOccurrenceRate.name,
        title: newOccurrenceRate.name, // Add title for consistency
        amount: newOccurrenceRate.amount === '' ? 0 : typeof newOccurrenceRate.amount === 'string' ? parseFloat(newOccurrenceRate.amount) : newOccurrenceRate.amount,
        description: newOccurrenceRate.description || `Additional rate`
      });
      
      // Update state
      setOccurrenceEdits(updatedOccurrenceEdits);
      
      // Call API to save the new rate
      const occurrencesForApi = bookingData.occurrences.map(occ => {
        // For the occurrence being edited, update its rates with the new rate
        if (occ.occurrence_id === occurrence.occurrence_id) {
          return {
            occurrence_id: occurrence.occurrence_id,
            rates: {
              base_rate: parseFloat(updatedOccurrenceEdits.base_rate),
              additional_animal_rate: parseFloat(updatedOccurrenceEdits.additional_animal_rate || 0),
              applies_after: parseInt(updatedOccurrenceEdits.applies_after || 1),
              holiday_rate: parseFloat(updatedOccurrenceEdits.holiday_rate || 0),
              additional_rates: updatedOccurrenceEdits.additional_rates.map(rate => ({
                title: rate.name,
                amount: parseFloat(rate.amount),
                description: rate.description || ''
              }))
            }
          };
        }
        // For other occurrences, keep them as they are
        return {
          occurrence_id: occ.occurrence_id,
          rates: {
            base_rate: parseFloat(occ.rates.base_rate),
            additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
            applies_after: parseInt(occ.rates.applies_after || 1),
            holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
            additional_rates: (occ.rates.additional_rates || []).map(rate => ({
              title: rate.name || rate.title,
              amount: parseFloat(rate.amount),
              description: rate.description || ''
            }))
          }
        };
      });
      
      debugLog('MBA54321 - Sending all occurrences with new rate to API:', occurrencesForApi);
      
      const response = await updateBookingDraftRates(
        bookingId,
        occurrencesForApi
      );
      
      debugLog('MBA54321 - New rate added to occurrence API response:', response);
      
      if (response.draft_data) {
        if (onRatesUpdate) onRatesUpdate(response.draft_data);
      }
      
      // Close add rate form
      setIsAddingRateForOccurrence(null);
      setNewOccurrenceRate({ name: '', amount: '', description: '' });
      
    } catch (err) {
      debugLog('MBA66777 Error adding new rate for occurrence:', err);
      setError('Failed to add new rate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRateForOccurrence = async (occurrence, rateIndex) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create updated occurrence edits with the rate removed
      const updatedOccurrenceEdits = { ...occurrenceEdits };
      
      if (updatedOccurrenceEdits.additional_rates && updatedOccurrenceEdits.additional_rates.length > rateIndex) {
        // Remove the rate at the specified index
        updatedOccurrenceEdits.additional_rates.splice(rateIndex, 1);
        
        // Update state
        setOccurrenceEdits(updatedOccurrenceEdits);
        
        // Call API to save the updated rates
        const occurrencesForApi = bookingData.occurrences.map(occ => {
          // For the occurrence being edited, update its rates with the rate removed
          if (occ.occurrence_id === occurrence.occurrence_id) {
            return {
              occurrence_id: occurrence.occurrence_id,
              rates: {
                base_rate: parseFloat(updatedOccurrenceEdits.base_rate),
                additional_animal_rate: parseFloat(updatedOccurrenceEdits.additional_animal_rate || 0),
                applies_after: parseInt(updatedOccurrenceEdits.applies_after || 1),
                holiday_rate: parseFloat(updatedOccurrenceEdits.holiday_rate || 0),
                additional_rates: updatedOccurrenceEdits.additional_rates.map(rate => ({
                  title: rate.name,
                  amount: parseFloat(rate.amount),
                  description: rate.description || ''
                }))
              }
            };
          }
          // For other occurrences, keep them as they are
          return {
            occurrence_id: occ.occurrence_id,
            rates: {
              base_rate: parseFloat(occ.rates.base_rate),
              additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
              applies_after: parseInt(occ.rates.applies_after || 1),
              holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
              additional_rates: (occ.rates.additional_rates || []).map(rate => ({
                title: rate.name || rate.title,
                amount: parseFloat(rate.amount),
                description: rate.description || ''
              }))
            }
          };
        });
        
        debugLog('MBA54321 - Sending all occurrences with rate deleted to API:', occurrencesForApi);
        
        const response = await updateBookingDraftRates(
          bookingId,
          occurrencesForApi
        );
        
        debugLog('MBA54321 - Rate deleted from occurrence API response:', response);
        
        if (response.draft_data) {
          if (onRatesUpdate) onRatesUpdate(response.draft_data);
        }
      }
    } catch (err) {
      debugLog('MBA66777 Error deleting rate for occurrence:', err);
      setError('Failed to delete rate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleServiceAdditionalRate = async (serviceRate, isEnabled) => {
    try {
      setIsLoading(true);
      setError(null);
      
      debugLog('MBA77999 Toggling service additional rate:', { 
        title: serviceRate.title, 
        isEnabled, 
        occurrencesCount: bookingData.occurrences.length 
      });
      
      // Update the toggle state
      setServiceAdditionalRatesEnabled(prev => ({
        ...prev,
        [serviceRate.title]: isEnabled
      }));
      
      // Create occurrences array for API - apply the rate to all occurrences if enabled
      const occurrencesForApi = bookingData.occurrences.map(occ => {
        const currentAdditionalRates = [...(occ.rates.additional_rates || [])];
        
        if (isEnabled) {
          // Add the rate if it's not already present
          const rateExists = currentAdditionalRates.some(rate => 
            (rate.title || rate.name) === serviceRate.title
          );
          
                     if (!rateExists) {
             currentAdditionalRates.push({
               title: serviceRate.title,
               amount: parseFloat(serviceRate.amount || serviceRate.rate || 0),
               description: serviceRate.description || 'Additional rate'
             });
           }
        } else {
          // Remove the rate if it exists
          const filteredRates = currentAdditionalRates.filter(rate => 
            (rate.title || rate.name) !== serviceRate.title
          );
          currentAdditionalRates.length = 0;
          currentAdditionalRates.push(...filteredRates);
        }
        
        return {
          occurrence_id: occ.occurrence_id,
          rates: {
            base_rate: parseFloat(occ.rates.base_rate),
            additional_animal_rate: parseFloat(occ.rates.additional_animal_rate || 0),
            applies_after: parseInt(occ.rates.applies_after || 1),
            holiday_rate: parseFloat(occ.rates.holiday_rate || 0),
            additional_rates: currentAdditionalRates
          }
        };
      });
      
      debugLog('MBA77999 Sending updated occurrences to API:', occurrencesForApi);
      
      // Call the API to update rates for all occurrences
      const response = await updateBookingDraftRates(
        bookingId, 
        occurrencesForApi
      );
      
      debugLog('MBA77999 Service rate toggle API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
      
    } catch (err) {
      debugLog('MBA77999 Error toggling service additional rate:', err);
      setError('Failed to update rates. Please try again.');
      
      // Revert the toggle state on error
      setServiceAdditionalRatesEnabled(prev => ({
        ...prev,
        [serviceRate.title]: !isEnabled
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get the correct value for an additional rate field based on edit state
  const getAdditionalRateValue = (occurrence, index, field) => {
    // If we're editing this occurrence, get value from occurrenceEdits
    if (editingOccurrenceId === occurrence.occurrence_id && occurrenceEdits.additional_rates) {
      const value = occurrenceEdits.additional_rates[index]?.[field];
      // For numeric fields like 'amount', 0 is a valid value
      if (field === 'amount' && value === 0) return '';
      return value || '';
    }
    
    // If we're in edit mode (for single occurrence bookings), get from editedRates
    if (isEditMode && editedRates?.additional_rates) {
      const value = editedRates.additional_rates[index]?.[field];
      // For numeric fields like 'amount', 0 is a valid value
      if (field === 'amount' && value === 0) return '';
      return value || '';
    }
    
    // Otherwise get from the rate directly
    const rates = occurrence.rates?.additional_rates || [];
    const rate = rates[index] || {};
    const value = field === 'name' ? (rate.name || rate.title) : rate[field];
    
    // For numeric fields like 'amount', 0 is a valid value
    if (field === 'amount' && value === 0) return '';
    return value || '';
  };

  const renderServiceAndPets = () => {
    return (
      <View style={[styles.section, { marginTop: 0, marginBottom: 16 }]}>
          <Text style={styles.sectionHeader}>Service & Pets</Text>
          <View style={[styles.card, { padding: 16 }]}>
            <View style={styles.serviceContainer}>
              <Text style={styles.serviceLabel}>Service:</Text>
              <Text style={styles.serviceValue}>{bookingData.service_details?.service_type || 'N/A'}</Text>
            </View>
            
            <View style={styles.serviceDivider} />
            
            <View style={styles.petsContainer}>
              <Text style={styles.petsLabel}>Pets:</Text>
              <View style={styles.petsList}>
                {bookingData.pets && bookingData.pets.length > 0 ? (
                  bookingData.pets.map((pet, index) => (
                    <View key={index} style={styles.petItem}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petType}>{capitalizeWords(pet.species)} | {pet.breed}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPets}>No pets selected</Text>
                )}
              </View>
            </View>
          </View>
        </View>
    );
  };

  const renderServiceAdditionalRates = () => {
    debugLog('MBA2394jv340 renderServiceAdditionalRates called');
    debugLog('MBA2394jv340 bookingData:', bookingData);
    debugLog('MBA2394jv340 bookingData.service:', bookingData?.service);
    debugLog('MBA2394jv340 service.is_overnight:', bookingData?.service?.is_overnight);
    debugLog('MBA2394jv340 occurrences length:', bookingData?.occurrences?.length);
    
    // Only show for non-overnight services that have additional rates available
    if (!bookingData?.service) {
      debugLog('MBA2394jv340 No service found, returning null');
      return null;
    }
    
    if (bookingData.service.is_overnight === true) {
      debugLog('MBA2394jv340 Service is overnight, returning null');
      return null;
    }
    
    if (!bookingData?.occurrences) {
      debugLog('MBA2394jv340 No occurrences found, returning null');
      return null;
    }

    // Use the stored available rates from state
    const filteredRates = availableAdditionalRates;
    debugLog('MBA2394jv340 Using stored available rates:', filteredRates);
    
    if (filteredRates.length === 0) {
      debugLog('MBA2394jv340 No stored rates found, returning null');
      return null;
    }

    debugLog('MBA2394jv340 Rendering service additional rates section with', filteredRates.length, 'rates');

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Additional Rates</Text>
        </View>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <Text style={styles.additionalRatesDescription}>
            Toggle additional rates to apply or remove them from {bookingData.occurrences.length === 1 ? 'this booking' : `all ${bookingData.occurrences.length} dates in this booking`}:
          </Text>
          
          {filteredRates.map((serviceRate, index) => {
            const isEnabled = serviceAdditionalRatesEnabled[serviceRate.title] || false;
            
            return (
              <View key={index} style={styles.serviceRateItem}>
                <TouchableOpacity 
                  style={styles.serviceRateCheckbox}
                  onPress={() => toggleServiceAdditionalRate(serviceRate, !isEnabled)}
                  disabled={isLoading}
                >
                  <View style={[styles.checkbox, isEnabled && styles.checkboxChecked]}>
                    {isEnabled && (
                      <MaterialCommunityIcons name="check" size={16} color="white" />
                    )}
                  </View>
                  
                  <View style={styles.serviceRateInfo}>
                    <Text style={styles.serviceRateTitle}>{serviceRate.title}</Text>
                    <Text style={styles.serviceRateAmount}>
                      {formatCurrency(serviceRate.amount || serviceRate.rate)}
                    </Text>
                    {serviceRate.description && (
                      <Text style={styles.serviceRateDescription}>{serviceRate.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderNotesForClient = () => {
    // Show notes section for professionals (when creating/editing) or anyone when viewing from approval modal
    if (!isProfessional && !fromApprovalModal) {
      return null;
    }

    // Don't show if viewing from approval modal and there are no notes
    if (fromApprovalModal && !notesFromPro) {
      return null;
    }

    const isReadOnly = fromApprovalModal;
    const sectionTitle = fromApprovalModal ? "Notes from Professional" : "Notes for Client";

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>{sectionTitle}</Text>
        </View>
        <View style={[styles.card, { paddingTop: 16, marginBottom: 16 }]}>
          {isReadOnly ? (
            <Text style={styles.notesTextInputReadOnly}>
              {notesFromPro}
            </Text>
          ) : (
            <View>
              <TextInput
                style={styles.notesTextInput}
                value={notesFromPro}
                onChangeText={(text) => {
                  setNotesFromPro(text);
                  setNotesSaved(false); // Reset saved state when text changes
                }}
                placeholder={"Enter notes for the client (optional)..."}
                placeholderTextColor={theme.colors.placeHolderText}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              {/* Save Button */}
              <View style={styles.notesSaveContainer}>
                <TouchableOpacity 
                  style={[styles.notesSaveButton, notesSaved && styles.notesSaveButtonSaved]}
                  onPress={saveNotesToDraft}
                  disabled={isSavingNotes}
                >
                  <Text style={[styles.notesSaveButtonText, notesSaved && styles.notesSaveButtonTextSaved]}>
                    {notesSaved ? '✓ Saved' : isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBookingBreakdown = () => {
    debugLog('MBAio3htg5uohg: Rendering booking breakdown with data:', bookingData?.occurrences?.[0]);
    const occurrences = bookingData?.occurrences;
    if (!occurrences || occurrences.length === 0) return null;

    // Get the user's timezone from context
    const { timeSettings } = useContext(AuthContext);
    const userTimezone = timeSettings?.timezone || 'US/Mountain';
    debugLog('MBAio3htg5uohg: userTimezone: ', userTimezone);

    // Check if we're dealing with multiple individual dates
    // Updated logic to properly handle midnight end times
    const isMultipleDates = occurrences.length > 1 || 
      // Consider a booking with 00:00 end time as a multiple date booking even if
      // there's only one occurrence and end_date is different from start_date
      (occurrences.length === 1 && 
       ((occurrences[0].end_date !== occurrences[0].start_date && occurrences[0].end_time === "00:00") ||
        occurrences[0].start_date === occurrences[0].end_date));
    
    debugLog('MBAio3htg5uohg: isMultipleDates detection:', { 
      isMultipleDates, 
      count: occurrences.length,
      firstOccurrence: occurrences[0] ? {
        start_date: occurrences[0].start_date,
        end_date: occurrences[0].end_date,
        end_time: occurrences[0].end_time
      } : null
    });

    if (isMultipleDates) {
      return (
        <View style={[styles.section]}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Booking Breakdown</Text>
          </View>
          <View style={[styles.card, { paddingTop: 16 }]}>
            {occurrences.map((occurrence, index) => {
              // Ensure we have a valid unit_of_time - check in multiple places
              const unitOfTime = 
                (occurrence.unit_of_time) || 
                (occurrence.rates && occurrence.rates.unit_of_time) || 
                'Per Visit';
                
              // Ensure multiple is properly formatted as a number
              const multiple = parseFloat(occurrence.multiple) || 1;
              
              // Log each occurrence for debugging
              debugLog('MBAio3htg5uohg: Processing occurrence in UI:', {
                id: occurrence.occurrence_id,
                unit_of_time: unitOfTime,
                multiple: multiple,
                calculated_cost: occurrence.calculated_cost
              });
              
              return (
                <View key={occurrence.occurrence_id} style={styles.multipleDatesContainer}>
                  <View style={styles.dateHeader}>
                    <View style={styles.dateTextContainer}>
                      <Text style={styles.dateText}>
                        {formatDateTimeRangeFromUTC({
                          startDate: occurrence.start_date,
                          startTime: occurrence.start_time,
                          endDate: occurrence.end_date,
                          endTime: occurrence.end_time,
                          userTimezone: userTimezone,
                          includeTimes: true,
                          includeTimezone: true
                        })}
                      </Text>
                    </View>
                    <Text style={styles.occurrenceCost}>
                      {formatCurrency(occurrence.calculated_cost)}
                    </Text>
                    {/* Edit/Cancel Button - moved here, only one icon */}
                    {editingOccurrenceId === occurrence.occurrence_id ? (
                      <TouchableOpacity onPress={handleCancelEdit}>
                        <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    ) : (
                      showEditControls && (
                        <TouchableOpacity onPress={() => handleEditOccurrence(occurrence)}>
                          <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  {/* Collapsible Rates Section */}
                  <TouchableOpacity 
                    style={styles.ratesToggleButton}
                    onPress={() => {
                      const newExpandedRates = new Set(expandedRates);
                      if (newExpandedRates.has(occurrence.occurrence_id)) {
                        newExpandedRates.delete(occurrence.occurrence_id);
                      } else {
                        newExpandedRates.add(occurrence.occurrence_id);
                      }
                      setExpandedRates(newExpandedRates);
                    }}
                  >
                    <Text style={styles.ratesToggleText}>
                      {expandedRates.has(occurrence.occurrence_id) ? 'Hide Rates' : 'Show Rates'}
                    </Text>
                    <MaterialCommunityIcons 
                      name={expandedRates.has(occurrence.occurrence_id) ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.colors.mainColors.main} 
                    />
                  </TouchableOpacity>

                  {expandedRates.has(occurrence.occurrence_id) && (
                    <View style={styles.ratesBreakdown}>
                      {/* Base Rate */}
                      <View style={styles.rateItem}>
                        {editingOccurrenceId === occurrence.occurrence_id ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Text style={styles.rateLabel}>Base Rate ({unitOfTime})</Text>
                            <TextInput
                              style={{ 
                                width: 80, 
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: 4,
                                padding: 8
                              }}
                              keyboardType="decimal-pad"
                              value={occurrenceEdits.base_rate?.toString() || ''}
                              onChangeText={v => handleOccurrenceInputChange('base_rate', v)}
                            />
                          </View>
                        ) : (
                          <View>
                            <Text style={styles.rateLabel}>Base Rate</Text>
                            <Text style={styles.breakdownCalculation}>
                              {formatCurrency(occurrence.rates.base_rate)} ({unitOfTime}) × {multiple} = {formatCurrency(occurrence.base_total)}
                            </Text>
                          </View>
                        )}
                        {editingOccurrenceId === occurrence.occurrence_id ? null : (
                          <Text style={styles.rateAmount}>{formatCurrency(occurrence.base_total)}</Text>
                        )}
                      </View>

                      {/* Additional Animal Rate */}
                      {occurrence.rates?.additional_animal_rate && parseFloat(occurrence.rates.additional_animal_rate) > 0 && occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 1) && (
                        <View style={styles.rateItem}>
                          {editingOccurrenceId === occurrence.occurrence_id ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Text style={styles.rateLabel}>
                                Additional Pet Rate (after {occurrence.rates.applies_after} {occurrence.rates.applies_after !== 1 ? 'pets' : 'pet'})
                              </Text>
                              <TextInput
                                style={{ 
                                  width: 80, 
                                  borderWidth: 1,
                                  borderColor: theme.colors.border,
                                  borderRadius: 4,
                                  padding: 8
                                }}
                                keyboardType="decimal-pad"
                                value={occurrenceEdits.additional_animal_rate?.toString() || ''}
                                onChangeText={v => handleOccurrenceInputChange('additional_animal_rate', v)}
                              />
                            </View>
                          ) : (
                            <View>
                              <Text style={styles.rateLabel}>
                                Additional Pet Rate (after {occurrence.rates.applies_after} {occurrence.rates.applies_after !== 1 ? 'pets' : 'pet'})
                              </Text>
                              <Text style={styles.breakdownCalculation}>
                                {formatCurrency(occurrence.rates.additional_animal_rate)} / pet / {occurrence.unit_of_time || occurrence.rates?.unit_of_time || 'Per Visit'} × {Math.max(0, (bookingData.pets?.length || 0) - occurrence.rates.applies_after)} additional pets = {formatCurrency(occurrence.rates.additional_animal_rate_total || 0)}
                              </Text>
                            </View>
                          )}
                          {editingOccurrenceId === occurrence.occurrence_id ? null : (
                            <Text style={styles.rateAmount}>{formatCurrency(occurrence.rates.additional_animal_rate_total || 0)}</Text>
                          )}
                        </View>
                      )}

                      {/* Holiday Rate - only show if there are actually holiday days */}
                      {occurrence.rates?.holiday_rate && parseFloat(occurrence.rates.holiday_rate) > 0 && 
                       (occurrence.rates?.holiday_days > 0 || !('holiday_days' in occurrence.rates)) && (
                        <View style={styles.rateItem}>
                          {editingOccurrenceId === occurrence.occurrence_id ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Text style={styles.rateLabel}>Holiday Rate</Text>
                              <TextInput
                                style={{ 
                                  width: 80, 
                                  borderWidth: 1,
                                  borderColor: theme.colors.border,
                                  borderRadius: 4,
                                  padding: 8
                                }}
                                keyboardType="decimal-pad"
                                value={occurrenceEdits.holiday_rate?.toString() || ''}
                                onChangeText={v => handleOccurrenceInputChange('holiday_rate', v)}
                              />
                            </View>
                          ) : (
                            <Text style={styles.rateLabel}>Holiday Rate</Text>
                          )}
                          {editingOccurrenceId === occurrence.occurrence_id ? null : (
                            <Text style={styles.rateAmount}>{formatCurrency(occurrence.rates.holiday_rate)}</Text>
                          )}
                        </View>
                      )}

                      {/* Additional Rates */}
                      {((isEditMode ? editedRates?.additional_rates : occurrence.rates?.additional_rates) || []).length > 0 ? 
                        ((isEditMode ? editedRates?.additional_rates : occurrence.rates?.additional_rates) || []).map((rate, index) => (
                          <View key={index} style={styles.breakdownItem}>
                            <View style={styles.breakdownLabelContainer}>
                              {isEditMode || editingOccurrenceId === occurrence.occurrence_id ? (
                                width < 600 ? (
                                  // Mobile layout - stacked with trash icon on the right
                                  <View style={{ width: '100%' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                      {/* Debug log for rate name */}
                                      {debugLog(`MBA66778 Rendering rate at index ${index}:`, {
                                        isEditMode,
                                        editingOccurrenceId: editingOccurrenceId,
                                        occurrenceId: occurrence.occurrence_id,
                                        rateName: rate.name || rate.title,
                                        rateAmount: rate.amount,
                                        occurrenceEditsRate: occurrenceEdits.additional_rates?.[index],
                                        valueToShow: editingOccurrenceId === occurrence.occurrence_id ? 
                                          (occurrenceEdits.additional_rates && occurrenceEdits.additional_rates[index]?.amount?.toString()) || '0' : 
                                          rate.amount?.toString() || '0'
                                      })}
                                      <TextInput
                                        style={[styles.nameInput, { flex: 1, marginRight: 8 }]}
                                        value={getAdditionalRateValue(occurrence, index, 'name')}
                                        onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                          handleAdditionalRateChange(index, 'name', value) : 
                                          updateAdditionalRate(index, 'name', value)}
                                        placeholder="Rate Name"
                                      />
                                      <TouchableOpacity 
                                        style={styles.deleteButton} 
                                        onPress={() => editingOccurrenceId === occurrence.occurrence_id ? 
                                          deleteRateForOccurrence(occurrence, index) : 
                                          deleteAdditionalRate(index)}
                                      >
                                        <MaterialCommunityIcons 
                                          name="trash-can-outline" 
                                          size={22} 
                                          color={theme.colors.error} 
                                        />
                                      </TouchableOpacity>
                                    </View>
                                    <View style={{ marginTop: 8 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ marginRight: 8 }}>Amount: $</Text>
                                        <TextInput
                                          style={{ 
                                            width: 80, 
                                            borderWidth: 1,
                                            borderColor: theme.colors.border,
                                            borderRadius: 4,
                                            padding: 8
                                          }}
                                          keyboardType="decimal-pad"
                                          value={getAdditionalRateValue(occurrence, index, 'amount') === '' ? '' : 
                                                getAdditionalRateValue(occurrence, index, 'amount').toString()}
                                          onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                            handleAdditionalRateChange(index, 'amount', value) : 
                                            updateAdditionalRate(index, 'amount', value)}
                                        />
                                      </View>
                                    </View>
                                  </View>
                                ) : (
                                  // Desktop layout - side by side
                                  <View style={styles.editableAdditionalRateRow}>
                                    <View style={styles.rateNameAmountRowWithDelete}>
                                      <TextInput
                                        style={styles.nameInput}
                                        value={getAdditionalRateValue(occurrence, index, 'name')}
                                        onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                          handleAdditionalRateChange(index, 'name', value) : 
                                          updateAdditionalRate(index, 'name', value)}
                                        placeholder="Rate Name"
                                      />
                                      <View style={styles.amountInputContainer}>
                                        <Text style={styles.currencySymbol}>$</Text>
                                        <TextInput
                                          style={styles.rateInput}
                                          keyboardType="decimal-pad"
                                          value={getAdditionalRateValue(occurrence, index, 'amount') === '' ? '' : 
                                                getAdditionalRateValue(occurrence, index, 'amount').toString()}
                                          onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                            handleAdditionalRateChange(index, 'amount', value) : 
                                            updateAdditionalRate(index, 'amount', value)}
                                        />
                                      </View>
                                    </View>
                                    <TouchableOpacity 
                                      style={styles.deleteButton} 
                                      onPress={() => editingOccurrenceId === occurrence.occurrence_id ? 
                                        deleteRateForOccurrence(occurrence, index) : 
                                        deleteAdditionalRate(index)}
                                    >
                                      <MaterialCommunityIcons 
                                        name="trash-can-outline" 
                                        size={22} 
                                        color={theme.colors.error} 
                                      />
                                    </TouchableOpacity>
                                  </View>
                                )
                              ) : (
                                <>
                                  <Text style={styles.breakdownLabel}>{rate.name || rate.title}</Text>
                                  <Text style={styles.breakdownCalculation}>{rate.description || "Additional Rate"}</Text>
                                </>
                              )}
                            </View>
                            {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                              <Text style={styles.breakdownAmount}>+{formatCurrency(rate.amount)}</Text>
                            )}
                          </View>
                        ))
                      : null}
                    </View>
                  )}

                  {/* Add New Rate Form for individual occurrence */}
                  {isAddingRateForOccurrence === occurrence.occurrence_id && (
                    <View>
                      <View style={styles.addRateContainer}>
                        <View style={styles.formDivider} />
                        
                        {width < 600 ? (
                          // Mobile layout - stacked
                          <View>
                            <TextInput
                              style={[styles.nameInput, { marginRight: 0, marginBottom: 12 }]}
                              value={newOccurrenceRate.name}
                              onChangeText={(text) => setNewOccurrenceRate(prev => ({ ...prev, name: text }))}
                              placeholder="Rate Name"
                              placeholderTextColor={theme.colors.placeHolderText}
                            />
                            <View style={[styles.amountInputContainer, { marginBottom: 12 }]}>
                              <Text style={styles.currencySymbol}>$</Text>
                              <TextInput
                                style={styles.rateInput}
                                keyboardType="decimal-pad"
                                value={newOccurrenceRate.amount}
                                onChangeText={handleNewOccurrenceRateAmountChange}
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.placeHolderText}
                              />
                            </View>
                            <TextInput
                              style={styles.descriptionInput}
                              value={newOccurrenceRate.description}
                              onChangeText={(text) => setNewOccurrenceRate(prev => ({ ...prev, description: text }))}
                              placeholder="Description (optional)"
                              placeholderTextColor={theme.colors.placeHolderText}
                            />
                          </View>
                        ) : (
                          // Desktop layout - side by side
                          <>
                            <View style={styles.rateNameAmountRow}>
                              <TextInput
                                style={styles.nameInput}
                                value={newOccurrenceRate.name}
                                onChangeText={(text) => setNewOccurrenceRate(prev => ({ ...prev, name: text }))}
                                placeholder="Rate Name"
                                placeholderTextColor={theme.colors.placeHolderText}
                              />
                              <View style={styles.amountInputContainer}>
                                <Text style={styles.currencySymbol}>$</Text>
                                <TextInput
                                  style={styles.rateInput}
                                  keyboardType="decimal-pad"
                                  value={newOccurrenceRate.amount}
                                  onChangeText={handleNewOccurrenceRateAmountChange}
                                  placeholder="0.00"
                                  placeholderTextColor={theme.colors.placeHolderText}
                                />
                              </View>
                            </View>
                            
                            <TextInput
                              style={styles.descriptionInput}
                              value={newOccurrenceRate.description}
                              onChangeText={(text) => setNewOccurrenceRate(prev => ({ ...prev, description: text }))}
                              placeholder="Description (optional)"
                              placeholderTextColor={theme.colors.placeHolderText}
                            />
                          </>
                        )}
                        
                        <View style={styles.formDivider} />
                      </View>
                      <View style={styles.buttonsContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAddingRateForOccurrence(null)}>
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={() => saveNewRateForOccurrence(occurrence)}>
                          <Text style={styles.saveButtonText}>Save New Rate</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Add Rate and Save buttons for edit mode for this occurrence */}
                  {editingOccurrenceId === occurrence.occurrence_id && !isAddingRateForOccurrence && (
                    <View style={styles.buttonsContainer}>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => toggleAddRateForOccurrence(occurrence.occurrence_id)}
                      >
                        <Text style={styles.cancelButtonText}>+ Add Rate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={() => handleSaveOccurrenceRates(occurrence)}
                      >
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      );
    }
   
    // Rest of the function for non-multiple dates case
    const occurrence = occurrences[0];
    if (!occurrence) return null;

    const formattedDateRange = formatDateTimeRangeFromUTC({
      startDate: occurrence.start_date,
      startTime: occurrence.start_time,
      endDate: occurrence.end_date,
      endTime: occurrence.end_time,
      userTimezone: userTimezone,
      includeTimes: true,
      includeTimezone: true
    });

    debugLog('MBA54321 Formatted date range:', formattedDateRange);

    // Initialize rates object if it doesn't exist
    if (!occurrence.rates) {
      debugLog('MBA54321 occurrence.rates is undefined, initializing with defaults');
      occurrence.rates = {
        base_rate: 0,
        additional_animal_rate: 0,
        applies_after: 1,
        holiday_rate: 0,
        holiday_days: 0,
        additional_rates: []
      };
    }

    return (
      <View style={[styles.section, { marginTop: showEditControls ? 24 : 0 }]}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Booking Breakdown</Text>
        </View>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <View style={styles.breakdownSection}>
            <View style={styles.dateHeader}>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {formatDateTimeRangeFromUTC({
                    startDate: occurrence.start_date,
                    startTime: occurrence.start_time,
                    endDate: occurrence.end_date,
                    endTime: occurrence.end_time,
                    userTimezone: userTimezone,
                    includeTimes: true,
                    includeTimezone: true
                  })}
                </Text>
              </View>
              <Text style={styles.occurrenceCost}>
                {formatCurrency(occurrence.calculated_cost)}
              </Text>
              {/* Edit/Cancel Button - moved here, only one icon */}
              {editingOccurrenceId === occurrence.occurrence_id ? (
                <TouchableOpacity onPress={handleCancelEdit}>
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              ) : (
                showEditControls && (
                  <TouchableOpacity onPress={() => handleEditOccurrence(occurrence)}>
                    <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
                  </TouchableOpacity>
                )
              )}
            </View>
            
            {/* Base Rate */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelContainer}>
                <View style={styles.rateNameAmountRow}>
                  <Text style={styles.breakdownLabel}>
                    Base Rate ({(occurrence.unit_of_time) || 
                              (occurrence.rates && occurrence.rates.unit_of_time) || 
                              'Per Visit'})
                  </Text>
                  {isEditMode || editingOccurrenceId === occurrence.occurrence_id ? (
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                                              <TextInput
                          style={styles.rateInput}
                          keyboardType="decimal-pad"
                          value={editingOccurrenceId === occurrence.occurrence_id ? 
                            occurrenceEdits.base_rate?.toString() || '0' : 
                            editedRates?.base_rate?.toString() || '0'}
                          onChangeText={editingOccurrenceId === occurrence.occurrence_id ? 
                            v => handleOccurrenceInputChange('base_rate', v) : 
                            (v) => {
                              debugLog('MBA2oinv5nd Base rate TextInput onChange called with value:', v);
                              updateBaseRate(v);
                            }}
                        />
                    </View>
                  ) : null}
                </View>
                {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                  <Text style={styles.breakdownCalculation}>
                    {occurrence.multiple || 1} × {formatCurrency(occurrence.rates?.base_rate || 0)} = {formatCurrency(occurrence.base_total || occurrence.rates?.base_rate || 0)}
                  </Text>
                )}
              </View>
              {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                <Text style={styles.breakdownAmount}>{formatCurrency(occurrence.base_total || occurrence.rates?.base_rate || 0)}</Text>
              )}
            </View>
            
            {/* Additional Animal Rate */}
            {occurrence.rates?.additional_animal_rate && parseFloat(occurrence.rates.additional_animal_rate) > 0 && occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 1) ? (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLabelContainer}>
                  <View style={styles.rateNameAmountRow}>
                    <Text style={styles.breakdownLabel}>
                      Additional Pet Rate (after {occurrence.rates?.applies_after || 1} {occurrence.rates?.applies_after !== 1 ? 'pets' : 'pet'})
                    </Text>
                    {isEditMode || editingOccurrenceId === occurrence.occurrence_id ? (
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.rateInput}
                          keyboardType="decimal-pad"
                          value={(() => {
                            const value = editingOccurrenceId === occurrence.occurrence_id ? 
                              occurrenceEdits.additional_animal_rate?.toString() || '0' : 
                              editedRates?.additional_animal_rate?.toString() || '0';
                            debugLog('MBA2oinv5nd Additional animal rate TextInput value:', value, 'using editingMode:', editingOccurrenceId === occurrence.occurrence_id);
                            return value;
                          })()}
                          onChangeText={editingOccurrenceId === occurrence.occurrence_id ? 
                            v => handleOccurrenceInputChange('additional_animal_rate', v) : 
                            (v) => {
                              debugLog('MBA2oinv5nd Additional animal rate TextInput onChange called with value:', v);
                              updateAdditionalAnimalRate(v);
                            }}
                        />
                        <Text style={styles.inputLabel}> / pet / {(occurrence.unit_of_time) || 
                                                                (occurrence.rates && occurrence.rates.unit_of_time) || 
                                                                'Per Visit'}</Text>
                      </View>
                    ) : null}
                  </View>
                  {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                    <Text style={styles.breakdownCalculation}>
                      {formatCurrency(occurrence.rates?.additional_animal_rate || 0)} / pet / {(occurrence.unit_of_time) || 
                                                                              (occurrence.rates && occurrence.rates.unit_of_time) || 
                                                                              'Per Visit'} × {Math.max(0, (bookingData.pets?.length || 0) - (occurrence.rates?.applies_after || 1))} additional pets = {formatCurrency(occurrence.rates?.additional_animal_rate_total || 0)}
                    </Text>
                  )}
                </View>
                {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                  <Text style={styles.breakdownAmount}>
                    {(occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 0)) ? '+' : ''}
                    {(occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 0)) 
                      ? formatCurrency(occurrence.rates?.additional_animal_rate_total || 0) 
                      : 'NA'}
                  </Text>
                )}
              </View>
            ) : null}
            
            {/* Holiday Rate */}
            {occurrence.rates?.holiday_rate && occurrence.rates?.holiday_days && occurrence.rates.holiday_days > 0 ? (
              <View style={[styles.breakdownItem, { borderBottomWidth: (occurrence.rates?.additional_rates?.length > 0 || isAddingRate) ? 1 : 0 }]}>
                <View style={styles.breakdownLabelContainer}>
                  <View style={styles.rateNameAmountRow}>
                    <Text style={styles.breakdownLabel}>
                      Holiday Rate
                    </Text>
                    {isEditMode || editingOccurrenceId === occurrence.occurrence_id ? (
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.rateInput}
                          keyboardType="decimal-pad"
                          value={editingOccurrenceId === occurrence.occurrence_id ? 
                            occurrenceEdits.holiday_rate?.toString() || '0' : 
                            editedRates?.holiday_rate?.toString() || '0'}
                          onChangeText={editingOccurrenceId === occurrence.occurrence_id ? 
                            v => handleOccurrenceInputChange('holiday_rate', v) : 
                            updateHolidayRate}
                        />
                        <Text style={styles.inputLabel}> × {occurrence.rates?.holiday_days || 0} {occurrence.rates?.holiday_days !== 1 ? 'holidays' : 'holiday'}</Text>
                      </View>
                    ) : null}
                  </View>
                  {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                    <Text style={styles.breakdownCalculation}>
                      {formatCurrency(occurrence.rates?.holiday_rate || 0)} × {occurrence.rates?.holiday_days || 0} {occurrence.rates?.holiday_days !== 1 ? 'holidays' : 'holiday'}
                    </Text>
                  )}
                </View>
                {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                  <Text style={styles.breakdownAmount}>
                    {occurrence.rates?.holiday_days ? '+' : ''}
                    {occurrence.rates?.holiday_days ? formatCurrency(occurrence.rates?.holiday_rate_total || occurrence.rates?.holiday_rate || 0) : 'NA'}
                  </Text>
                )}
              </View>
            ) : null}
            
            {/* Additional Rates */}
            {((isEditMode ? editedRates?.additional_rates : occurrence.rates?.additional_rates) || []).length > 0 ? 
              ((isEditMode ? editedRates?.additional_rates : occurrence.rates?.additional_rates) || []).map((rate, index) => (
                <View key={index} style={styles.breakdownItem}>
                  <View style={styles.breakdownLabelContainer}>
                    {isEditMode || editingOccurrenceId === occurrence.occurrence_id ? (
                      width < 600 ? (
                        // Mobile layout - stacked with trash icon on the right
                        <View style={{ width: '100%' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Debug log for rate name */}
                            {debugLog(`MBA66778 Rendering rate at index ${index}:`, {
                              isEditMode,
                              editingOccurrenceId: editingOccurrenceId,
                              occurrenceId: occurrence.occurrence_id,
                              rateName: rate.name || rate.title,
                              rateAmount: rate.amount,
                              occurrenceEditsRate: occurrenceEdits.additional_rates?.[index],
                              valueToShow: editingOccurrenceId === occurrence.occurrence_id ? 
                                (occurrenceEdits.additional_rates && occurrenceEdits.additional_rates[index]?.amount?.toString()) || '0' : 
                                rate.amount?.toString() || '0'
                            })}
                            <TextInput
                              style={[styles.nameInput, { flex: 1, marginRight: 8 }]}
                              value={getAdditionalRateValue(occurrence, index, 'name')}
                              onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                handleAdditionalRateChange(index, 'name', value) : 
                                updateAdditionalRate(index, 'name', value)}
                              placeholder="Rate Name"
                            />
                            <TouchableOpacity 
                              style={styles.deleteButton} 
                              onPress={() => editingOccurrenceId === occurrence.occurrence_id ? 
                                deleteRateForOccurrence(occurrence, index) : 
                                deleteAdditionalRate(index)}
                            >
                              <MaterialCommunityIcons 
                                name="trash-can-outline" 
                                size={22} 
                                color={theme.colors.error} 
                              />
                            </TouchableOpacity>
                          </View>
                          <View style={{ marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ marginRight: 8 }}>Amount: $</Text>
                              <TextInput
                                style={{ 
                                  width: 80, 
                                  borderWidth: 1,
                                  borderColor: theme.colors.border,
                                  borderRadius: 4,
                                  padding: 8
                                }}
                                keyboardType="decimal-pad"
                                value={getAdditionalRateValue(occurrence, index, 'amount') === '' ? '' : 
                                      getAdditionalRateValue(occurrence, index, 'amount').toString()}
                                onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                  handleAdditionalRateChange(index, 'amount', value) : 
                                  updateAdditionalRate(index, 'amount', value)}
                              />
                            </View>
                          </View>
                        </View>
                      ) : (
                        // Desktop layout - side by side
                        <View style={styles.editableAdditionalRateRow}>
                          <View style={styles.rateNameAmountRowWithDelete}>
                            <TextInput
                              style={styles.nameInput}
                              value={getAdditionalRateValue(occurrence, index, 'name')}
                              onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                handleAdditionalRateChange(index, 'name', value) : 
                                updateAdditionalRate(index, 'name', value)}
                              placeholder="Rate Name"
                            />
                            <View style={styles.amountInputContainer}>
                              <Text style={styles.currencySymbol}>$</Text>
                              <TextInput
                                style={styles.rateInput}
                                keyboardType="decimal-pad"
                                value={getAdditionalRateValue(occurrence, index, 'amount') === '' ? '' : 
                                      getAdditionalRateValue(occurrence, index, 'amount').toString()}
                                onChangeText={(value) => editingOccurrenceId === occurrence.occurrence_id ? 
                                  handleAdditionalRateChange(index, 'amount', value) : 
                                  updateAdditionalRate(index, 'amount', value)}
                              />
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={styles.deleteButton} 
                            onPress={() => editingOccurrenceId === occurrence.occurrence_id ? 
                              deleteRateForOccurrence(occurrence, index) : 
                              deleteAdditionalRate(index)}
                          >
                            <MaterialCommunityIcons 
                              name="trash-can-outline" 
                              size={22} 
                              color={theme.colors.error} 
                            />
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      <>
                        <Text style={styles.breakdownLabel}>{rate.name || rate.title}</Text>
                        <Text style={styles.breakdownCalculation}>{rate.description || "Additional Rate"}</Text>
                      </>
                    )}
                  </View>
                  {!isEditMode && editingOccurrenceId !== occurrence.occurrence_id && (
                    <Text style={styles.breakdownAmount}>+{formatCurrency(rate.amount)}</Text>
                  )}
                </View>
              ))
            : null}
            
            {/* Add New Rate Form */}
            {isAddingRate ? (
              <View>
                <View style={styles.addRateContainer}>
                  <View style={styles.formDivider} />
                  
                  {width < 600 ? (
                    // Mobile layout - stacked
                    <View>
                      <TextInput
                        style={[styles.nameInput, { marginRight: 0, marginBottom: 12 }]}
                        value={newRate.name}
                        onChangeText={(text) => setNewRate(prev => ({ ...prev, name: text }))}
                        placeholder="Rate Name"
                        placeholderTextColor={theme.colors.placeHolderText}
                      />
                      <View style={[styles.amountInputContainer, { marginBottom: 12 }]}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.rateInput}
                          keyboardType="decimal-pad"
                          value={newRate.amount}
                          onChangeText={handleNewRateAmountChange}
                          placeholder="0.00"
                          placeholderTextColor={theme.colors.placeHolderText}
                        />
                      </View>
                      <TextInput
                        style={styles.descriptionInput}
                        value={newRate.description}
                        onChangeText={(text) => setNewRate(prev => ({ ...prev, description: text }))}
                        placeholder="Description (optional)"
                        placeholderTextColor={theme.colors.placeHolderText}
                      />
                    </View>
                  ) : (
                    // Desktop layout - side by side
                    <>
                      <View style={styles.rateNameAmountRow}>
                        <TextInput
                          style={styles.nameInput}
                          value={newRate.name}
                          onChangeText={(text) => setNewRate(prev => ({ ...prev, name: text }))}
                          placeholder="Rate Name"
                          placeholderTextColor={theme.colors.placeHolderText}
                        />
                        <View style={styles.amountInputContainer}>
                          <Text style={styles.currencySymbol}>$</Text>
                          <TextInput
                            style={styles.rateInput}
                            keyboardType="decimal-pad"
                            value={newRate.amount}
                            onChangeText={handleNewRateAmountChange}
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.placeHolderText}
                          />
                        </View>
                      </View>
                      
                      <TextInput
                        style={styles.descriptionInput}
                        value={newRate.description}
                        onChangeText={(text) => setNewRate(prev => ({ ...prev, description: text }))}
                        placeholder="Description (optional)"
                        placeholderTextColor={theme.colors.placeHolderText}
                      />
                    </>
                  )}
                  
                  <View style={styles.formDivider} />
                </View>
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={toggleAddRate}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveNewRate}>
                    <Text style={styles.saveButtonText}>Save New Rate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            
            {/* Add buttons for edit mode on single occurrence bookings */}
            {isEditMode && !isAddingRate && (
              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={toggleAddRate}>
                  <Text style={styles.cancelButtonText}>+ Add Rate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveRateChanges}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTotalAmount = () => {
    debugLog('MBA54321 Rendering total amount with data:', bookingData?.cost_summary);
    
    // Create default cost summary in case it's missing
    const defaultCostSummary = {
      subtotal: 0,
      client_platform_fee: 0,
      pro_platform_fee: 0,
      taxes: 0,
      tax_state: '',
      total_client_cost: 0,
      total_sitter_payout: 0,
      pro_subscription_plan: 0
    };
    
    // Use the actual cost summary or our default
    const costSummary = bookingData?.cost_summary || defaultCostSummary;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Cost Summary</Text>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalAmount}>{formatCurrency(costSummary.subtotal)}</Text>
          </View>
          
          {/* Platform Fee */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Service Fee</Text>
            <Text style={styles.feeAmount}>{formatCurrency(costSummary.client_platform_fee)}</Text>
          </View>
          
          {/* Taxes */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{costSummary.tax_state}{costSummary.tax_state ? ' - ' : ''}Taxes</Text>
            <Text style={styles.feeAmount}>{formatCurrency(costSummary.taxes)}</Text>
          </View>

          {/* Total Owner Cost */}
          <View style={[styles.totalAmountContainer, { paddingBottom: isProfessional ? 16 : 0, marginBottom: isProfessional ? 16 : 0 }]}>
            <Text style={styles.totalLabel}>Total Owner Cost</Text>
            <Text style={styles.totalAmount}>{formatCurrency(costSummary.total_client_cost)}</Text>
          </View>

          {/* Divider */}
          {isProfessional ? <View style={styles.divider} /> : null}

          {/* Professional Payout - Only show when isProfessional is true */}
          {isProfessional ? (
            <View style={styles.payoutContainer}>
              <Text style={styles.payoutLabel}>Professional Payout</Text>
              <Text style={styles.payoutAmount}>{formatCurrency(costSummary.total_sitter_payout)}</Text>
              <Text style={styles.payoutBreakdown}>
                (Subtotal {formatCurrency(costSummary.subtotal)} - Service Fee {formatCurrency(costSummary.pro_platform_fee)})
              </Text>
              {costSummary.pro_platform_fee === 0 ? (
                <Text style={styles.badge}>{costSummary.pro_subscription_plan === 0 ? 'Free Tier - ' 
                  : costSummary.pro_subscription_plan === 1 ? 'Beta Tier - ' 
                  : costSummary.pro_subscription_plan === 2 ? 'Commission Tier - ' 
                  : costSummary.pro_subscription_plan === 3 ? 'Pro Subscription - ' 
                  : costSummary.pro_subscription_plan === 4 ? 'Pro Subscription - ' 
                  :  costSummary.pro_subscription_plan === 5 ? 'Client Subscription - ' 
                  : ''} Saved {formatCurrency(costSummary.subtotal * 0.15)}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };



  const renderTermsCheckbox = () => {
    // Determine if checkbox should be checked:
    // - If client has previously agreed (currentTosStatus === true), show as checked
    // - If client hasn't agreed yet (currentTosStatus === false), use local termsAgreed state  
    // - If this is a new booking (currentTosStatus === undefined), use local termsAgreed state
    const isChecked = currentTosStatus === true || (currentTosStatus !== true && termsAgreed);
    const hasAgreedTos = currentTosStatus === true;
    
    // Debug checkbox state
    debugLog('MBA54321: Checkbox state calculation:', {
      currentTosStatus,
      termsAgreed,
      isChecked,
      hasAgreedTos,
      fromApprovalModal
    });
    
    // If already agreed, show different text
    if (hasAgreedTos) {
      return (
        <View style={styles.termsContainer}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, styles.checkboxChecked]}>
              <MaterialCommunityIcons name="check" size={16} color="white" />
            </View>
            <Text style={styles.termsText}>
              <Text style={styles.termsAgreedText}>TERMS AGREED</Text> -{' '}
              <Text 
                style={styles.termsLink}
                onPress={() => setShowTermsModal(true)}
              >
                view terms of service
              </Text>
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.termsContainer}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => {
            // Allow toggling if this is a new booking (undefined) or if client hasn't agreed yet (false)
            if (currentTosStatus !== true) {
              const newValue = !termsAgreed;
              setTermsAgreed(newValue);
              if (onTermsAgreed) {
                onTermsAgreed(newValue);
              }
              // Notify parent of TOS agreement change
              if (onTosAgreementChange) {
                debugLog('MBA54321: Notifying parent of TOS agreement change:', {
                  newValue,
                  isProfessional,
                  fromApprovalModal,
                  currentTosStatus
                });
                onTosAgreementChange(newValue);
              }
            }
          }}
        >
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && (
              <MaterialCommunityIcons name="check" size={16} color="white" />
            )}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => setShowTermsModal(true)}
            >
              terms of service
            </Text>
            {' '}for this booking
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  debugLog('MBA2394jv340 ReviewAndRatesCard main render called');
  
  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <ProfessionalAlert isProfessional={isProfessional} fromApprovalModal={fromApprovalModal} />
        {renderServiceAndPets()}
        {renderNotesForClient()}
        {renderServiceAdditionalRates()}
        {renderBookingBreakdown()}
        {renderTotalAmount()}
        {renderTermsCheckbox()}
        
        {/* Support CrittrCove Button */}
        <SupportButton 
          size="compact"
          showTitle={false}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
      
      <TermsOfServiceModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginTop: 24,
  },
  badge: {
    fontSize: 12,
    color: theme.colors.whiteText,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: 'bold',
    backgroundColor: theme.colors.mainColors.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
    marginBottom: 8,
  },
  addRateText: {
    color: theme.colors.mainColors.main,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownSection: {
    width: '100%',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breakdownLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  breakdownLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownCalculation: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalItem: {
    marginTop: 8,
    paddingTop: 16,
  },
  // Fee and total styles
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subtotalLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  subtotalAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  feeLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  feeAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  payoutContainer: {
    alignItems: 'flex-end',
  },
  payoutLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.success,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 4,
  },
  payoutBreakdown: {
    fontSize: 12,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 4,
  },
  // Input styles for editable fields
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addRateContainer: {
    padding: 16,
    width: '100%',
  },
  rateNameAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  rateEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    maxWidth: 150,
  },
  rateInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginRight: 4,
    marginLeft: 2,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    marginLeft: 4,
  },
  nameInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    marginRight: 16,
  },
  descriptionInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
  },
  saveButton: {
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 0,
    marginRight: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  formDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
    width: '100%',
  },
  editableAdditionalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rateNameAmountRowWithDelete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    marginRight: 16,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  multipleDatesContainer: {
    marginBottom: 16,
  },
  occurrenceCost: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  ratesToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
  },
  ratesToggleText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  ratesBreakdown: {
    padding: 16,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rateLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  rateDescription: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  termsContainer: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.mainColors.main,
  },
  termsText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flex: 1,
  },
  termsLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
    textDecorationLine: 'underline',
  },
  termsAgreedText: {
    fontSize: 14,
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: 'bold',
  },
  // Service Additional Rates Styles
  additionalRatesDescription: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 16,
    lineHeight: 20,
  },
  serviceRateItem: {
    marginBottom: 12,
  },
  serviceRateCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceRateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceRateTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceRateAmount: {
    fontSize: 16,
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceRateDescription: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 18,
  },
  serviceContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    paddingBottom: 16,
  },
  serviceDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
    width: '100%',
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    width: 80,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceValue: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  petsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    width: 80,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petsList: {
    flex: 1,
  },
  petItem: {
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petType: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  noPets: {
    fontSize: 16,
    color: theme.colors.placeHolderText,
    fontStyle: 'italic',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  notesDescription: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 12,
  },
  notesTextInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
    height: 100,
    textAlignVertical: 'top',
  },
  notesTextInputReadOnly: {
    backgroundColor: theme.colors.surfaceContrast,
    color: theme.colors.text,
    borderColor: theme.colors.surface,
  },
  notesSaveContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  notesSaveButton: {
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  notesSaveButtonSaved: {
    backgroundColor: theme.colors.success,
  },
  notesSaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  notesSaveButtonTextSaved: {
    color: 'white',
  },
});

export default ReviewAndRatesCard; 