import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CrossPlatformView from '../components/CrossPlatformView';
import BackHeader from '../components/BackHeader';
import { fetchBookingDetails, createBooking, updateBookingStatus, mockMessages, mockConversations, CURRENT_USER_ID, BOOKING_STATES } from '../data/mockData';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddRateModal from '../components/AddRateModal';
import { format } from 'date-fns';
import AddOccurrenceModal from '../components/AddOccurrenceModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { AuthContext, getStorage } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { handleBack, navigateToFrom } from '../components/Navigation';
import SnackBar from '../components/SnackBar';
import { convertToUTC, formatOccurrenceFromUTC } from '../utils/time_utils';
import { approveBooking } from '../api/API';

const LAST_VIEWED_BOOKING_ID = 'last_viewed_booking_id';

// Replace with Services that professional offers
const SERVICE_OPTIONS = ['Dog Walking', 'Pet Sitting', 'House Sitting', 'Drop-In Visits'];
// Replace with Animal types that the owner owns
const ANIMAL_OPTIONS = ['Dog', 'Cat', 'Bird', 'Small Animal'];

const calculateTimeUnits = (startDate, endDate, startTime, endTime, timeUnit) => {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  const diffMs = end - start;
  
  switch(timeUnit) {
    case '15 Min':
      return Math.ceil(diffMs / (15 * 60 * 1000));
    case '30 Min':
      return Math.ceil(diffMs / (30 * 60 * 1000));
    case '45 Min':
      return Math.ceil(diffMs / (45 * 60 * 1000));
    case '1 Hour':
      return Math.ceil(diffMs / (60 * 60 * 1000));
    case '2 Hour':
      return Math.ceil(diffMs / (2 * 60 * 60 * 1000));
    case '3 Hour':
      return Math.ceil(diffMs / (3 * 60 * 60 * 1000));
    case '4 Hour':
      return Math.ceil(diffMs / (4 * 60 * 60 * 1000));
    case '5 Hour':
      return Math.ceil(diffMs / (5 * 60 * 60 * 1000));
    case '6 Hour':
      return Math.ceil(diffMs / (6 * 60 * 60 * 1000));
    case '7 Hour':
      return Math.ceil(diffMs / (7 * 60 * 60 * 1000));
    case '8 Hour':
      return Math.ceil(diffMs / (8 * 60 * 60 * 1000));
    case '24 Hour':
    case 'Per Day':
      return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    case 'Per Visit':
      return 1; // Per visit is counted as one unit
    default:
      return 1;
  }
};

const RequestChangesModal = ({ visible, onClose, onSubmit, loading }) => {
  const [reason, setReason] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Request Changes</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter reason for changes..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.submitButton]}
              onPress={() => onSubmit(reason)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BookingDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { is_DEBUG, timeSettings } = useContext(AuthContext);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProfessionalView, setIsProfessionalView] = useState(false);
  const [isPetsEditMode, setIsPetsEditMode] = useState(false);
  const [isServiceEditMode, setIsServiceEditMode] = useState(false);
  const [expandedOccurrenceIds, setExpandedOccurrenceIds] = useState([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const [defaultOccurrenceRates, setDefaultOccurrenceRates] = useState(null);
  const [showAddOccurrenceModal, setShowAddOccurrenceModal] = useState(false);
  const [occurrenceError, setOccurrenceError] = useState(null);
  const [editedBooking, setEditedBooking] = useState({
    serviceDetails: {
      type: '',
      animalType: '',
      numberOfPets: 0
    },
    rates: {
      additionalPetRate: 0,
      holidayFee: 0,
      weekendFee: 0,
      extraServices: []
    }
  });
  const [timeDropdownPosition, setTimeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const timeInputRef = useRef(null);
  const [showAddRateModal, setShowAddRateModal] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showAnimalDropdown, setShowAnimalDropdown] = useState(false);
  const [selectedPets, setSelectedPets] = useState([]);
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [isPetsSaving, setIsPetsSaving] = useState(false);
  const [isServiceSaving, setIsServiceSaving] = useState(false);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    visible: false,
    actionText: '',
    onConfirm: null,
    isLoading: false
  });
  const [availablePets, setAvailablePets] = useState([]);
  const [isLoadingPets, setIsLoadingPets] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [snackBar, setSnackBar] = useState({ visible: false, message: '', type: 'success' });

  // Add useEffect to set isProfessionalView from route params
  useEffect(() => {
    if (route.params?.isProfessional !== undefined) {
      if (is_DEBUG) {
        console.log('MBA44321 Setting isProfessionalView from route params:', route.params.isProfessional);
      }
      setIsProfessionalView(route.params.isProfessional);
    }
  }, [route.params?.isProfessional]);

  useEffect(() => {
    const fetchBooking = async () => {
      setLoading(true);
      
      try {
        let bookingId = route.params?.bookingId;
        let initialData = route.params?.initialData;

        if (is_DEBUG) {
          console.log('MBA77123 BookingDetails: Fetching booking with params:', {
            bookingId,
            initialData
          });
        }

        // Real API call
        if (!bookingId) {
          navigation.replace('MyBookings');
          return;
        }

        let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get(
          `${API_BASE_URL}/api/bookings/v1/${bookingId}/?is_prorated=true`,
          { headers: { Authorization: `Bearer ${token}` }}
        );

        // Format the occurrences with proper timezone handling
        const formattedOccurrences = response.data.occurrences.map(occ => {
          try {
            if (is_DEBUG) {
              console.log('MBA134njo0vh03 Processing occurrence from backend:', {
                occurrence: occ,
                timezone: timeSettings.timezone,
                utcTimes: {
                  start: `${occ.start_date} ${occ.start_time}`,
                  end: `${occ.end_date} ${occ.end_time}`
                }
              });
            }

            const formattedOccurrence = formatOccurrenceFromUTC(occ, timeSettings.timezone);

            if (is_DEBUG) {
              console.log('MBA134njo0vh03 Final formatted occurrence:', formattedOccurrence);
            }

            return formattedOccurrence;

          } catch (error) {
            console.error('MBA134njo0vh03 Error formatting occurrence:', error, {
              occurrence: occ,
              timezone: timeSettings.timezone
            });
            return {
              ...occ,
              formatted_start: 'Error formatting date',
              formatted_end: 'Error formatting date',
              duration: 'Unknown',
              timezone: timeSettings.timezone_abbrev,
              dst_message: ''
            };
          }
        });

        if (is_DEBUG) {
          console.log('MBA134njo0vh03 All formatted occurrences:', formattedOccurrences);
        }

        // Transform API response to match the expected format
        const transformedBooking = {
          ...response.data,
          id: response.data.booking_id,
          ownerName: response.data.owner_name,
          professionalName: response.data.professional_name,
          serviceType: response.data.service_details.service_type,
          animalType: response.data.service_details.animal_type,
          numberOfPets: response.data.service_details.num_pets,
          costs: response.data.cost_summary,
          status: response.data.status,
          occurrences: formattedOccurrences
        };

        if (is_DEBUG) {
          console.log('MBA77123 BookingDetails: Fetched and transformed booking data:', {
            original: response.data,
            transformed: transformedBooking
          });
        }

        setBooking(transformedBooking);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        Alert.alert(
          'Error',
          'Unable to load booking details. Please try again.',
          [{ text: 'OK', onPress: () => navigation.replace('MyBookings') }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [route.params?.bookingId, navigation, timeSettings]);

  // Add helper function to safely display data
  const getDisplayValue = (value, placeholder = 'TBD') => {
    if (value === null || value === undefined || value === '') {
      return placeholder;
    }
    return value;
  };

  // Reset edit mode when component mounts or reloads
  useEffect(() => {
    setIsPetsEditMode(false);
    setIsServiceEditMode(false);
  }, []);

  // Add this useEffect to properly initialize editedBooking
  useEffect(() => {
    if (booking) {
      if (is_DEBUG) {
        console.log('BookingDetails: Booking updated, current value:', booking);
      }
      setEditedBooking({
        ...booking,
        serviceDetails: {
          type: booking.serviceType || '',
          animalType: booking.animalType || '',
          numberOfPets: (booking.pets || []).length  // Initialize based on pets array length
        },
        rates: {
          additionalPetRate: booking.rates?.additionalPetRate ?? 0,
          holidayFee: booking.rates?.holidayFee ?? 0,
          weekendFee: booking.rates?.weekendFee ?? 0,
          extraServices: booking.rates?.extraServices || []
        }
      });
    }
  }, [booking]);

  const canEdit = () => {

    if (!booking) {
      console.log('BookingDetails: Booking is undefined');
      return false;
    }

    if (is_DEBUG) {
      console.log('Booking edit ability:', booking.can_edit);
    }

    // For real API mode, use the backend's can_edit field
    return booking.can_edit;
  };

  // Add function to fetch available pets
  const fetchAvailablePets = async () => {
    if (is_DEBUG) {
      console.log('fetching available pets with booking id:', booking.booking_id);
    }
    try {
      const token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      setIsLoadingPets(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/booking_drafts/v1/${booking.booking_id}/available_pets/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setAvailablePets(response.data);
      if (is_DEBUG) {
        console.log('available pets:', response.data);
      }
    } catch (error) {
      console.error('Error fetching available pets:', error);
      Alert.alert('Error', 'Failed to fetch available pets');
    } finally {
      setIsLoadingPets(false);
    }
  };

  // This function also saves the pets to the booking draft
  const togglePetsEditMode = async () => {
    if (isPetsEditMode) {
      // Check if pets have changed before saving
      const currentPets = new Set(booking.pets.map(pet => pet.pet_id));
      const selectedPetsSet = new Set(selectedPets.map(pet => pet.pet_id));
  
      if (![...currentPets].every(id => selectedPetsSet.has(id)) || 
      ![...selectedPetsSet].every(id => currentPets.has(id))) {
        // Pets have changed, show confirmation modal
        if (is_DEBUG) {
          console.log('MBA2573 Pets have changed, saving...');
        }
        // Save changes
        try {
          setIsPetsSaving(true);
          
          if (is_DEBUG) {
            console.log('MBA2573 Saving pets:', selectedPets);
          }

          const token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
          if (!token) {
            throw new Error('No authentication token found');
          }

          // Call the new booking drafts endpoint with correct URL format
          const response = await fetch(`${API_BASE_URL}/api/booking_drafts/v1/${booking.booking_id}/update_pets/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              pets: selectedPets.map(pet => pet.pet_id)
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (is_DEBUG) {
            console.log('MBA2573 Backend response:', data);
          }

          // Update local state with all the new data
          if (data.draft_data) {
            if (is_DEBUG) {
              console.log('MBA2573 Backend response:', data);
            }

            // Format occurrences with proper timezone handling
            const formattedOccurrences = data.draft_data.occurrences.map(occ => {
              try {
                if (is_DEBUG) {
                  console.log('MBA134njo0vh03 Processing occurrence from pets update:', {
                    occurrence: occ,
                    timezone: timeSettings.timezone
                  });
                }

                return formatOccurrenceFromUTC(occ, timeSettings.timezone);
              } catch (error) {
                console.error('MBA134njo0vh03 Error formatting occurrence:', error);
                return {
                  ...occ,
                  formatted_start: 'Error formatting date',
                  formatted_end: 'Error formatting date',
                  duration: 'Unknown',
                  timezone: timeSettings.timezone_abbrev,
                  dst_message: ''
                };
              }
            });

            setBooking(prev => ({
              ...prev,
              status: data.draft_data.status,
              pets: data.draft_data.pets,
              occurrences: formattedOccurrences,
              cost_summary: data.draft_data.cost_summary,
              can_edit: data.draft_data.can_edit
            }));

            // Keep the expanded state as is
            setExpandedOccurrenceIds(prev => [...prev]);
          }

          setIsPetsEditMode(false);

        } catch (error) {
          if (is_DEBUG) {
            console.error('MBA2573 Error updating pets:', error);
          }
          Alert.alert('Error', 'Failed to update pets');
        } finally {
          setIsPetsSaving(false);
        }
     } else {
      setIsPetsEditMode(false);
      if (is_DEBUG) {
        console.log('MBA2573 NO PET CHANGES');
      }
     }
    } else {
      setSelectedPets(booking.pets || []);
      setIsPetsEditMode(true);
    }
  };

  const renderPetSelector = () => {
    if (!isPetsEditMode) {
      return (
        <View>
          {booking?.pets?.length > 0 ? (
            booking.pets.map((pet, index) => (
              <View key={index} style={styles.petRow}>
                <Text style={styles.petName}>
                  {pet.name} • {pet.species} {pet.breed && `• ${pet.breed}`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noContentText}>No pets added to this booking</Text>
          )}
        </View>
      );
    }

    return (
      <View>
        {selectedPets.map((pet, index) => (
          <View key={index} style={styles.petRow}>
            <Text style={styles.petName}>
              {pet.name} • {pet.species} {pet.breed && `• ${pet.breed}`}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedPets(prev => prev.filter((_, i) => i !== index))}
            >
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addPetButton}
          onPress={async () => {
            if (!showPetDropdown) {
              await fetchAvailablePets();
            }
            setShowPetDropdown(!showPetDropdown);
          }}
        >
          <Text style={styles.addPetText}>Add Pet</Text>
          <MaterialCommunityIcons 
            name={showPetDropdown ? "chevron-up" : "chevron-down"} 
            size={24} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>

        {showPetDropdown && (
          <View style={styles.dropdownList}>
            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
              {isLoadingPets ? (
                <ActivityIndicator style={{ padding: 10 }} />
              ) : (
                availablePets.filter(pet => !selectedPets.some(selected => selected.pet_id === pet.pet_id))
                  .map((pet) => (
                    <TouchableOpacity
                      key={pet.pet_id || pet.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedPets(prev => [...prev, pet]);
                        setShowPetDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {pet.name} • {pet.species} {pet.breed && `• ${pet.breed}`}
                      </Text>
                    </TouchableOpacity>
                  ))
              )}
              {!isLoadingPets && availablePets.length === 0 && (
                <Text style={styles.noContentText}>No pets available</Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Add function to fetch available services
  const fetchAvailableServices = async () => {
    if (is_DEBUG) {
      console.log('fetching available services with booking id:', booking.booking_id);
    }
    try {
      const token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      setIsLoadingServices(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/v1/${booking.booking_id}/available_services/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setAvailableServices(response.data);
      if (is_DEBUG) {
        console.log('available services:', response.data);
      }
    } catch (error) {
      console.error('Error fetching available services:', error);
      Alert.alert('Error', 'Failed to fetch available services');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const toggleServiceEditMode = async () => {
    try {
      if (isServiceEditMode) {
        if (is_DEBUG) console.log('MBA123a73hv - Service type change initiated:', editedBooking?.service_details?.service_id);
        setIsServiceSaving(true);

        // Call the API to update the service type
        const result = await updateServiceType(booking.booking_id, editedBooking?.service_details?.service_id);

        // Update the local state with the new draft data
        if (result.draft_data) {
          if (is_DEBUG) console.log('MBA123a73hv - Received draft data:', result.draft_data);
          
          // Format occurrences with proper timezone handling
          const formattedOccurrences = result.draft_data.occurrences.map(occ => {
            try {
              if (is_DEBUG) {
                console.log('MBA134njo0vh03 Processing occurrence from service update:', {
                  occurrence: occ,
                  timezone: timeSettings.timezone
                });
              }

              return formatOccurrenceFromUTC(occ, timeSettings.timezone);
            } catch (error) {
              console.error('MBA134njo0vh03 Error formatting occurrence:', error);
              return {
                ...occ,
                formatted_start: 'Error formatting date',
                formatted_end: 'Error formatting date',
                duration: 'Unknown',
                timezone: timeSettings.timezone_abbrev,
                dst_message: ''
              };
            }
          });

          setBooking(prevBooking => ({
            ...prevBooking,
            ...result.draft_data,
            occurrences: formattedOccurrences,
            service_details: {
              ...prevBooking.service_details,
              ...result.draft_data.service_details
            },
            serviceType: result.draft_data.service_details.service_type,
            status: result.booking_status
          }));

          // Also update editedBooking to match
          setEditedBooking(prev => ({
            ...prev,
            service_details: result.draft_data.service_details
          }));
        }

        // Show success message
        setSnackBar({
          visible: true,
          message: 'Service updated successfully',
          type: 'success'
        });
      } else {
        setEditedBooking(prev => ({
          ...prev,
          service_details: {
            ...booking.service_details
          }
        }));
        await fetchAvailableServices();
      }
      setIsServiceEditMode(!isServiceEditMode);
    } catch (error) {
      setSnackBar({
        visible: true,
        message: error.message || 'Failed to update service',
        type: 'error'
      });
    } finally {
      setIsServiceSaving(false);
    }
  };

  const StatusBadge = ({ status }) => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusLabel}>Booking Status:</Text>
      <View style={[
        styles.statusBadge,
        { backgroundColor: getStatusColor(status).backgroundColor }
      ]}>
        <Text style={[
          styles.statusText,
          { color: getStatusColor(status).textColor }
        ]}>
          {status}
        </Text>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    const colors = {
      Pending: { backgroundColor: theme.colors.warning + '20', textColor: theme.colors.warning },
      Confirmed: { backgroundColor: theme.colors.success + '20', textColor: theme.colors.success },
      Canceled: { backgroundColor: theme.colors.error + '20', textColor: theme.colors.error },
      Completed: { backgroundColor: theme.colors.primary + '20', textColor: theme.colors.primary },
    };
    return colors[status] || colors.Pending;
  };

  const renderEditButton = () => (
    canEdit() && (
      <TouchableOpacity 
        onPress={togglePetsEditMode}
        style={[styles.editButton, isPetsEditMode && styles.saveButton]}
        testID="edit-button"
        disabled={isPetsSaving}
      >
        {isPetsSaving ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          isPetsEditMode ? (
            <Text style={styles.saveButtonText}>Save Pets</Text>
          ) : (
            <MaterialCommunityIcons 
              name="pencil" 
              size={24} 
              color={theme.colors.primary} 
            />
          )
        )}
      </TouchableOpacity>
    )
  );

  const handleUpdateDuration = (newDuration) => {
    setEditedBooking(prev => ({
      ...prev,
      duration: parseInt(newDuration),
    }));
    setHasUnsavedChanges(true);
    recalculateTotals();
  };

  const handleRemoveRate = (index) => {
    const updatedRates = [...editedBooking.rates.extraServices];
    updatedRates.splice(index, 1);
    
    setEditedBooking(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        extraServices: updatedRates
      }
    }));
    setHasUnsavedChanges(true);
    recalculateTotals();
  };

  const recalculateTotals = async () => {
    try {
      const baseTotal = editedBooking.rates.baseRate * editedBooking.quantity;
      const extraServicesTotal = editedBooking.rates.extraServices.reduce((sum, service) => sum + service.amount, 0);
      const holidayFee = editedBooking.rates.holidayFee || 0;
      const weekendFee = editedBooking.rates.weekendFee || 0;
      
      // Calculate additional pet fees (assuming 1 pet included in base rate)
      const additionalPets = Math.max(0, editedBooking.numberOfPets - 1);
      const additionalPetTotal = additionalPets * (editedBooking.rates.additionalPetRate || 0);
      
      const subtotal = baseTotal + extraServicesTotal + holidayFee + weekendFee + additionalPetTotal;
      const ownerFee = subtotal * 0.10;
      const taxes = subtotal * 0.09;
      const totalOwnerCost = subtotal + ownerFee + taxes;
      const professionalPayout = subtotal * 0.90;

      setEditedBooking(prev => ({
        ...prev,
        costs: {
          baseTotal,
          extraServicesTotal,
          additionalPetTotal,
          subtotal,
          ownerFee,
          taxes,
          totalOwnerCost,
          professionalPayout
        }
      }));
    } catch (error) {
      console.error('Error recalculating totals:', error);
    }
  };

  const calculateTotalCosts = (occurrences) => {
    const subtotal = occurrences.reduce((sum, occ) => 
      sum + parseFloat(occ.calculated_cost || 0), 0);
    const platformFee = subtotal * 0.10; // 10% platform fee
    const taxes = (subtotal + platformFee) * 0.09; // 9% tax
    const totalOwnerCost = subtotal + platformFee + taxes;
    const totalSitterPayout = subtotal * 0.90; // 90% of subtotal goes to sitter
    
    return {
      subtotal,
      platform_fee: platformFee,
      taxes,
      total_owner_cost: totalOwnerCost,
      total_sitter_payout: totalSitterPayout
    };
  };

  const handleSaveOccurrence = async (updatedOccurrence) => {
    try {
      if (is_DEBUG) {
        console.log('MBA9740174 handleSaveOccurrence - Start:', {
          updatedOccurrence,
          currentBookingOccurrences: booking.occurrences
        });
      }

      const token = await getStorage('userToken');
      const userTimezone = timeSettings.timezone;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Find the occurrence index by matching dates and times
      const occurrenceIndex = booking.occurrences.findIndex((occ) => {
        // First try to match by occurrence_id
        if (updatedOccurrence.occurrence_id && occ.occurrence_id === updatedOccurrence.occurrence_id) {
          if (is_DEBUG) {
            console.log('MBA9740174 Found match by occurrence_id:', occ.occurrence_id);
          }
          return true;
        }

        // Convert the updated times to UTC for comparison
        const updatedStartTimeUTC = convertToUTC(
          updatedOccurrence.startDate,
          updatedOccurrence.startTime,
          userTimezone
        );

        const updatedEndTimeUTC = convertToUTC(
          updatedOccurrence.endDate,
          updatedOccurrence.endTime,
          userTimezone
        );

        if (is_DEBUG) {
          console.log('MBA9740174 Comparing occurrence:', {
            original: {
              start_date: occ.start_date,
              start_time: occ.start_time,
              end_date: occ.end_date,
              end_time: occ.end_time
            },
            updated: {
              start_date: updatedOccurrence.startDate,
              start_time: updatedStartTimeUTC.time,
              end_date: updatedOccurrence.endDate,
              end_time: updatedEndTimeUTC.time
            }
          });
        }

        return occ.start_date === updatedOccurrence.startDate &&
               occ.start_time === updatedStartTimeUTC.time &&
               occ.end_date === updatedOccurrence.endDate &&
               occ.end_time === updatedEndTimeUTC.time;
      });

      if (is_DEBUG) {
        console.log('MBA9740174 Found occurrence at index:', occurrenceIndex);
      }

      // If no match found by exact comparison, try to find by start date/time only
      let finalIndex = occurrenceIndex;
      if (finalIndex === -1) {
        const updatedStartTimeUTC = convertToUTC(
          updatedOccurrence.startDate,
          updatedOccurrence.startTime,
          userTimezone
        );
        
        finalIndex = booking.occurrences.findIndex((occ) => {
          return occ.start_date === updatedOccurrence.startDate && 
                 occ.start_time === updatedStartTimeUTC.time;
        });

        if (is_DEBUG) {
          console.log('MBA9740174 Fallback search by start time only. Found at index:', finalIndex);
        }
      }

      if (finalIndex === -1) {
        throw new Error('Could not find matching occurrence to update');
      }

      // Convert times to UTC
      const startUTC = convertToUTC(
        updatedOccurrence.startDate,
        updatedOccurrence.startTime,
        userTimezone
      );

      const endUTC = convertToUTC(
        updatedOccurrence.endDate,
        updatedOccurrence.endTime,
        userTimezone
      );

      if (is_DEBUG) {
        console.log('MBA9740174 Converted times to UTC:', {
          start: startUTC,
          end: endUTC
        });
      }

      // Format the updated occurrence data
      const updatedOccurrenceData = {
        occurrence_id: booking.occurrences[finalIndex]?.occurrence_id,
        start_date: startUTC.date,
        end_date: endUTC.date,
        start_time: startUTC.time,
        end_time: endUTC.time,
        rates: {
          base_rate: updatedOccurrence.rates.baseRate,
          additional_animal_rate: updatedOccurrence.rates.additionalAnimalRate,
          applies_after: updatedOccurrence.rates.appliesAfterAnimals,
          holiday_rate: updatedOccurrence.rates.holidayRate,
          unit_of_time: updatedOccurrence.rates.unit_of_time,
          additional_rates: updatedOccurrence.rates.additionalRates.map(rate => ({
            title: rate.name,
            description: rate.description || '',
            amount: rate.amount
          }))
        },
        is_updated: true
      };

      if (is_DEBUG) {
        console.log('MBA9740174 Formatted updatedOccurrenceData:', updatedOccurrenceData);
      }

      // Get all existing occurrences and format them
      const existingOccurrences = booking.occurrences.map((occ, index) => {
        if (index === finalIndex) {
          if (is_DEBUG) {
            console.log('MBA9740174 Updating occurrence at index:', index);
          }
          return {
            ...updatedOccurrenceData,
            occurrence_id: occ.occurrence_id  // Preserve the original occurrence_id
          };
        }
        return {
          occurrence_id: occ.occurrence_id,
          start_date: occ.start_date,
          end_date: occ.end_date,
          start_time: occ.start_time,
          end_time: occ.end_time,
          rates: occ.rates
        };
      });

      if (is_DEBUG) {
        console.log('MBA9740174 Final request data:', {
          booking_id: booking.booking_id,
          occurrences: existingOccurrences
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/booking_drafts/v1/${booking.booking_id}/update_occurrences/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: booking.booking_id,
          occurrences: existingOccurrences
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (is_DEBUG) {
        console.log('MBA9740174 Backend response:', data);
      }

      // Update the local state with the response data
      if (data.draft_data) {
        if (is_DEBUG) {
          console.log('MBA9740174 Updating local state with draft data:', {
            oldOccurrences: booking.occurrences,
            newOccurrences: data.draft_data.occurrences
          });
        }

        // Format the occurrences with proper timezone handling
        const formattedOccurrences = data.draft_data.occurrences.map(occ => 
          formatOccurrenceFromUTC(occ, timeSettings.timezone)
        );

        setBooking(prev => ({
          ...prev,
          ...data.draft_data,
          occurrences: formattedOccurrences,
          status: data.draft_data.status
        }));

        setSnackBar({
          visible: true,
          message: 'Occurrence updated successfully',
          type: 'success'
        });

        setShowAddOccurrenceModal(false);
        return true;
      }

      throw new Error('Invalid response from server');

    } catch (error) {
      if (is_DEBUG) {
        console.log('MBA9740174 Error saving occurrence:', error);
      }
      setSnackBar({
        visible: true,
        message: error.message || 'Failed to update occurrence',
        type: 'error'
      });
      return false;
    }
  };

  // This is the callback function for the AddOccurrenceModal when the submit button is pressed
  // It calls the update_occurrences endpoint to add the new occurrence to the booking
  const handleAddOccurrence = async (newOccurrence) => {
    if (is_DEBUG) {
      console.log('MBA134njo0vh03 Adding new occurrence:', newOccurrence);
    }

    try {
      let token = await getStorage('userToken');
      const userTimezone = timeSettings.timezone;

      // Format the new occurrence data
      let newOccurrenceData;
      
      if (newOccurrence.startDateTime && newOccurrence.endDateTime) {
        // Owner-initiated format with DateTime objects
        const startDate = format(newOccurrence.startDateTime, 'yyyy-MM-dd');
        const startTime = format(newOccurrence.startDateTime, 'HH:mm');
        const endDate = format(newOccurrence.endDateTime, 'yyyy-MM-dd');
        const endTime = format(newOccurrence.endDateTime, 'HH:mm');

        // Convert to UTC using existing function
        const startUTC = convertToUTC(startDate, startTime, userTimezone);
        const endUTC = convertToUTC(endDate, endTime, userTimezone);

        if (is_DEBUG) {
          console.log('MBA134njo0vh03 Converted owner times to UTC:', {
            local: {
              start: `${startDate} ${startTime}`,
              end: `${endDate} ${endTime}`
            },
            utc: {
              start: startUTC,
              end: endUTC
            }
          });
        }

        newOccurrenceData = {
          start_date: startUTC.date,
          end_date: endUTC.date,
          start_time: startUTC.time,
          end_time: endUTC.time
        };
      } else {
        // Professional-initiated format with separate date and time
        const startUTC = convertToUTC(
          newOccurrence.startDate,
          newOccurrence.startTime,
          userTimezone
        );
        const endUTC = convertToUTC(
          newOccurrence.endDate,
          newOccurrence.endTime,
          userTimezone
        );

        if (is_DEBUG) {
          console.log('MBA134njo0vh03 Converted professional times to UTC:', {
            local: {
              start: `${newOccurrence.startDate} ${newOccurrence.startTime}`,
              end: `${newOccurrence.endDate} ${newOccurrence.endTime}`
            },
            utc: {
              start: startUTC,
              end: endUTC
            }
          });
        }

        newOccurrenceData = {
          start_date: startUTC.date,
          end_date: endUTC.date,
          start_time: startUTC.time,
          end_time: endUTC.time
        };
      }

      // Add rates if they exist
      if (newOccurrence.rates) {
        newOccurrenceData.rates = {
          base_rate: newOccurrence.rates.baseRate,
          additional_animal_rate: newOccurrence.rates.additionalAnimalRate,
          applies_after: newOccurrence.rates.appliesAfterAnimals,
          holiday_rate: newOccurrence.rates.holidayRate,
          unit_of_time: newOccurrence.rates.unit_of_time,
          additional_rates: newOccurrence.rates.additionalRates.map(rate => ({
            title: rate.name,
            description: rate.description || '',
            amount: rate.amount
          }))
        };
      }

      // Get all existing occurrences and format them
      const existingOccurrences = (booking?.occurrences || []).map(occ => ({
        occurrence_id: occ.occurrence_id,
        start_date: occ.start_date,
        end_date: occ.end_date,
        start_time: occ.start_time,
        end_time: occ.end_time,
        rates: occ.rates
      }));

      // Combine existing occurrences with new occurrence
      const allOccurrences = [...existingOccurrences, newOccurrenceData];

      if (is_DEBUG) {
        console.log('MBA134njo0vh03 Sending all occurrences:', allOccurrences);
      }

      // Make the API call
      const response = await fetch(`${API_BASE_URL}/api/booking_drafts/v1/${booking.booking_id}/update_occurrences/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: booking.booking_id,
          occurrences: allOccurrences
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (is_DEBUG) {
        console.log('MBA134njo0vh03 Add event response:', data);
      }

      // Update the local state with the response data
      if (data.draft_data.occurrences && data.draft_data.occurrences.length > 0) {
        // Format the occurrences using our new helper function
        const formattedOccurrences = data.draft_data.occurrences.map(occ => 
          formatOccurrenceFromUTC(occ, timeSettings.timezone)
        );

        setBooking(prev => ({
          ...prev,
          occurrences: formattedOccurrences,
          cost_summary: data.draft_data.cost_summary
        }));

        if (is_DEBUG) {
          console.log('MBA134njo0vh03 Adding Occurrence was Successful', {
            original: data.draft_data.occurrences,
            formatted: formattedOccurrences
          });
        }
        
        return {
          status: 'success',
          data: formattedOccurrences,
          message: 'New occurrence added successfully'
        };
      }

      return {
        status: 'error',
        message: 'Failed to add event - no data returned'
      };

    } catch (error) {
      console.error('MBA134njo0vh03 Error adding occurrence:', error);
      return {
        status: 'error',
        message: error.message || 'Failed to add event. Please try again.'
      };
    }
  };

  const handleStatusUpdateAfterEdit = async () => {
    if (!booking) return;

    // If booking is already in a pending changes state, no need to update
    if ([
      BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES,
      BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
      BOOKING_STATES.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
    ].includes(booking.status)) {
      return;
    }

    // Update status based on current status
    let newStatus;
    if (booking.status === BOOKING_STATES.CONFIRMED) {
      newStatus = BOOKING_STATES.CONFIRMED_PENDING_PROFESSIONAL_CHANGES;
    } else {
      newStatus = BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES;
    }

    await handleStatusUpdate(newStatus);
  };

  const handleDateTimeCardPress = (occurrence) => {
    // Clear default rates when editing an existing occurrence
    setDefaultOccurrenceRates(null);
    
    if (is_DEBUG) {
        console.log('MBA9740174 handleDateTimeCardPress - Original occurrence:', occurrence);
    }

    // Calculate base total from the rates and time unit
    const calculateBaseTotal = (occurrence) => {
        const baseRate = parseFloat(occurrence.rates?.base_rate || 0);
        const timeUnit = occurrence.rates?.unit_of_time;
        const timeUnits = calculateTimeUnits(
            occurrence.start_date,
            occurrence.end_date,
            occurrence.start_time,
            occurrence.end_time,
            timeUnit
        );
        if (is_DEBUG) {
            console.log('MBA9740174 calculateBaseTotal:', {
                baseRate,
                timeUnit,
                timeUnits,
                total: baseRate * timeUnits
            });
        }
        return baseRate * timeUnits;
    };

    const baseTotal = calculateBaseTotal(occurrence);

    // Parse dates and times correctly
    const parseDateTime = (dateStr, timeStr) => {
        if (is_DEBUG) {
            console.log('MBA9740174 parseDateTime input:', { dateStr, timeStr });
        }

        try {
            // Create a UTC date from the date and time strings
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hours, minutes] = timeStr.split(':').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

            if (is_DEBUG) {
                console.log('MBA9740174 UTC date created:', utcDate.toISOString());
            }

            // Convert to local date
            const localDate = new Date(utcDate);

            // Format the time in 12-hour format
            let localHours = localDate.getHours();
            const period = localHours >= 12 ? 'PM' : 'AM';
            localHours = localHours % 12 || 12;
            const formattedTime = `${localHours.toString().padStart(2, '0')}:${localDate.getMinutes().toString().padStart(2, '0')} ${period}`;

            if (is_DEBUG) {
                console.log('MBA9740174 Converted to local:', {
                    date: dateStr,
                    time: formattedTime,
                    originalTime: timeStr
                });
            }

            return {
                date: dateStr,
                time: formattedTime
            };
        } catch (error) {
            console.error('MBA9740174 Error in parseDateTime:', error);
            return {
                date: dateStr,
                time: timeStr
            };
        }
    };

    const startDateTime = parseDateTime(occurrence.start_date, occurrence.start_time);
    const endDateTime = parseDateTime(occurrence.end_date, occurrence.end_time);

    // Extract the occurrence ID, ensuring we get the correct one
    const occurrenceId = occurrence.occurrence_id;
    
    if (is_DEBUG) {
        console.log('MBA9740174 Using occurrence ID:', occurrenceId);
    }

    const transformedOccurrence = {
        occurrence_id: occurrenceId,  // Use the actual occurrence_id from the database
        startDate: startDateTime.date,
        endDate: endDateTime.date,
        startTime: startDateTime.time,
        endTime: endDateTime.time,
        rates: {
            baseRate: occurrence.rates?.base_rate?.toString() || '0',
            additionalAnimalRate: occurrence.rates?.additional_animal_rate?.toString() || '0',
            appliesAfterAnimals: occurrence.rates?.applies_after?.toString() || '1',
            holidayRate: occurrence.rates?.holiday_rate?.toString() || '0',
            unit_of_time: occurrence.rates?.unit_of_time,
            additionalRates: (occurrence.rates?.additional_rates || [])
                .filter(rate => rate.title !== 'Booking Details Cost')
                .map(rate => ({
                    name: rate.title,
                    description: rate.description || '',
                    amount: (rate.amount?.replace(/[^0-9.]/g, '') || '0').toString()
                }))
        },
        totalCost: occurrence.calculated_cost?.toString() || '0',
        baseTotal: baseTotal.toString(),
        multiple: calculateMultiple(baseTotal.toString(), occurrence.rates?.base_rate)
    };

    if (is_DEBUG) {
        console.log('MBA9740174 transformedOccurrence:', transformedOccurrence);
        console.log('MBA9740174 Original occurrence:', occurrence);
    }
    setSelectedOccurrence(transformedOccurrence);
    setShowAddOccurrenceModal(true);
};

  const calculateMultiple = (baseTotal, baseRate) => {
    if (!baseRate || baseRate === 0) return 0;
    const total = parseFloat(baseTotal.replace('$', ''));
    const rate = parseFloat(baseRate);
    return (total / rate).toFixed(2);
  };

  const toggleOccurrenceExpansion = (occurrenceId) => {
    if (is_DEBUG) {
      console.log('MBA912341 ---- Toggle Start ----');
      console.log('MBA912341 Clicked occurrence ID:', occurrenceId);
      console.log('MBA912341 Current state type:', typeof expandedOccurrenceIds);
      console.log('MBA912341 Current state value:', expandedOccurrenceIds);
    }

    setExpandedOccurrenceIds(prevIds => {
      if (is_DEBUG) {
        console.log('MBA912341 Previous state in setter:', prevIds);
      }

      // Ensure we're working with an array
      const currentIds = Array.isArray(prevIds) ? prevIds : [];
      
      if (is_DEBUG) {
        console.log('MBA912341 Normalized current IDs:', currentIds);
        console.log('MBA912341 Does array include ID?', currentIds.includes(occurrenceId));
      }

      let newIds;
      if (currentIds.includes(occurrenceId)) {
        newIds = currentIds.filter(id => id !== occurrenceId);
        if (is_DEBUG) {
          console.log('MBA912341 Removing ID - New state:', newIds);
        }
      } else {
        newIds = [...currentIds, occurrenceId];
        if (is_DEBUG) {
          console.log('MBA912341 Adding ID - New state:', newIds);
        }
      }

      if (is_DEBUG) {
        console.log('MBA912341 Final new state:', newIds);
        console.log('MBA912341 ---- Toggle End ----');
      }
      return newIds;
    });
  };

  const formatOccurrenceDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      // First try to parse as formatted date (MMM dd, yyyy)
      const formattedMatch = dateStr.match(/([A-Za-z]{3})\s+(\d{2}),\s+(\d{4})/);
      if (formattedMatch) {
        const date = new Date(dateStr.split('(')[0].trim());
        return format(date, 'MMM dd');
      }
      
      // If that fails, try to parse as raw date (YYYY-MM-DD)
      const rawDate = new Date(dateStr);
      if (!isNaN(rawDate.getTime())) {
        return format(rawDate, 'MMM dd');
      }
      
      return dateStr; // Return original string if parsing fails
    } catch (error) {
      console.error('Error formatting occurrence date:', error);
      return dateStr;
    }
  };

  const renderCostBreakdown = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cost Breakdown</Text>
      
      {(booking?.occurrences || []).map((occurrence, index) => {
        if (is_DEBUG) {
          console.log('MBA912341 Full occurrence object:', occurrence);
          console.log('MBA912341 Rendering occurrence:', {
            index,
            occurrence_id: occurrence.occurrence_id,
            expanded: expandedOccurrenceIds.includes(occurrence.occurrence_id)
          });
        }
        
        return (
          <TouchableOpacity 
            key={index}
            style={styles.occurrenceCostRow}
            onPress={() => {
              if (is_DEBUG) {
                console.log('MBA912341 Occurrence being toggled:', occurrence);
              }
              toggleOccurrenceExpansion(occurrence.id || occurrence.occurrence_id || index);
            }}
          >
            <View style={styles.occurrenceCostHeader}>
              <Text style={styles.occurrenceCostHeaderText}>
                {formatOccurrenceDate(occurrence.formatted_start)} - {formatOccurrenceDate(occurrence.formatted_end)}
              </Text>
              <View style={styles.costAndIcon}>
                <Text style={styles.occurrenceCost}>
                  ${parseFloat(occurrence.calculated_cost || 0).toFixed(2)}
                </Text>
                <MaterialCommunityIcons 
                  name={expandedOccurrenceIds.includes(occurrence.id || occurrence.occurrence_id || index) ? "chevron-up" : "chevron-down"}
                  size={20} 
                  color={theme.colors.text} 
                />
              </View>
            </View>
            
            {expandedOccurrenceIds.includes(occurrence.id || occurrence.occurrence_id || index) && (
              <View style={styles.expandedCostDetails}>
                <View style={styles.costDetailRow}>
                  <Text style={styles.costDetailText}>Base Rate ({occurrence.rates?.unit_of_time}):</Text>
                  <Text style={styles.costDetailText}>
                    ${parseFloat(occurrence.rates?.base_rate || 0).toFixed(2)} × {
                      parseFloat(occurrence?.multiple || 0).toFixed(2)
                    } = ${parseFloat(occurrence.base_total?.replace(/[^0-9.-]/g, '') || 0).toFixed(2)}
                  </Text>
                </View>
                {console.log('MBA12341234 additional_animal_rate_applies:', occurrence.rates?.additional_animal_rate_applies)}
                {occurrence.rates?.additional_animal_rate_applies !== 0 && parseFloat(occurrence.rates?.additional_animal_rate || 0) > 0 && (
                  <View style={styles.costDetailRow}>
                    <Text style={styles.costDetailText}>Additional Pet Rate (after {occurrence.rates.applies_after} {occurrence.rates.applies_after > 1 ? 'pets' : 'pet'}):</Text>
                    <Text style={styles.costDetailText}>
                      ${parseFloat(occurrence.rates.additional_animal_rate || 0).toFixed(2)} × {
                        booking.pets.length - occurrence.rates.applies_after
                      } = ${(parseFloat(occurrence.rates.additional_animal_rate || 0) * (booking.pets.length - occurrence.rates.applies_after)).toFixed(2)}
                    </Text>
                  </View>
                )}
                {occurrence.rates?.holiday_days > 0 && parseFloat(occurrence.rates?.holiday_rate || 0) > 0 && (
                  <View style={styles.costDetailRow}>
                    <Text style={styles.costDetailText}>Holiday Rate ({occurrence.rates.holiday_days} day{occurrence.rates.holiday_days > 1 ? 's' : ''}):</Text>
                    <Text style={styles.costDetailText}>${(parseFloat(occurrence.rates.holiday_rate || 0) * occurrence.rates.holiday_days).toFixed(2)}</Text>
                  </View>
                )}
                {(occurrence.rates?.additional_rates || [])
                  .filter(rate => rate.title !== 'Booking Details Cost')
                  .map((rate, idx) => (
                    <View key={idx} style={styles.costDetailRow}>
                      <Text style={styles.costDetailText}>{rate.title}:</Text>
                      <Text style={styles.costDetailText}>${parseFloat(rate.amount?.replace(/[^0-9.-]/g, '') || 0).toFixed(2)}</Text>
                    </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.costSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Subtotal:</Text>
          <Text style={styles.summaryText}>${parseFloat(booking?.cost_summary?.subtotal || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Platform Fee (10%):</Text>
          <Text style={styles.summaryText}>${parseFloat(booking?.cost_summary?.platform_fee || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Taxes (8%):</Text>
          <Text style={styles.summaryText}>${parseFloat(booking?.cost_summary?.taxes || 0).toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Cost to Owner:</Text>
          <Text style={styles.totalAmount}>
            ${parseFloat(booking?.cost_summary?.total_owner_cost || 0).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.payoutRow]}>
          <Text style={styles.payoutLabel}>Sitter Payout:</Text>
          <Text style={styles.payoutAmount}>
            ${parseFloat(booking?.cost_summary?.total_sitter_payout || 0).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );

  const formatTimeString = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(dateStr);
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(date, 'h:mm a');
  };

  const sendBookingMessage = async (bookingId, recipientId, messageType) => {
    try {
      if (!booking) {
        throw new Error('No booking data available');
      }

      if (is_DEBUG) {
        console.log('Sending booking message:', {
          bookingId,
          recipientId,
          messageType,
          booking
        });
      }

      // Find the existing conversation with Dr. Mike Johnson
      const conversationId = 'conv_2'; // This is the existing conversation ID from mockData
      if (is_DEBUG) {
        console.log('Using existing conversation:', conversationId);
      }

      const bookingMessage = {
        message_id: Date.now().toString(),
        participant1_id: CURRENT_USER_ID,
        participant2_id: recipientId,
        sender: CURRENT_USER_ID,
        type: 'booking_request',
        data: {
          bookingId: bookingId,
          messageType: messageType,
          serviceType: booking.serviceType,
          dates: booking.occurrences.map(occ => ({
            startDate: occ.start_date,
            endDate: occ.end_date,
            startTime: occ.start_time,
            endTime: occ.end_time
          })),
          totalCost: booking.costs.totalOwnerCost,
          status: booking.status
        },
        timestamp: new Date().toISOString(),
        status: "sent",
        is_booking_request: true,
        metadata: {}
      };

      // Add message to existing conversation
      if (!mockMessages[conversationId]) {
        mockMessages[conversationId] = [];
      }
      mockMessages[conversationId].push(bookingMessage);

      // Update the conversation's last message
      const conversation = mockConversations.find(conv => conv.id === conversationId);
      if (conversation) {
        conversation.lastMessage = "Approval Request sent";
        conversation.timestamp = new Date().toISOString();
        conversation.unread = true;
      }

      if (is_DEBUG) {
        console.log('Message sent successfully to conversation:', conversationId);
        console.log('Updated conversation messages:', mockMessages[conversationId]);
      }
      return true;
    } catch (error) {
      console.error('Error sending booking message:', error);
      return false;
    }
  };

  const handleStatusUpdate = async (newStatus, reason = '', metadata = {}) => {
    setConfirmationModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      // First send the message
      if (newStatus === BOOKING_STATES.PENDING_CLIENT_APPROVAL) {
        const messageSent = await sendBookingMessage(
          booking.id,
          booking.ownerId || 'owner123',
          'professional_changes'
        );
        if (!messageSent) {
          throw new Error('Failed to send booking message');
        }
      }

      // Then update the booking status
      if (is_DEBUG) {
        console.log('Updating booking status:', {
          bookingId: booking.id,
          currentStatus: booking.status,
          newStatus,
          reason,
          metadata
        });
      }

      const updatedBooking = await updateBookingStatus(
        booking.id, 
        newStatus, 
        reason, 
        {
          ...metadata,
          occurrences: booking.occurrences,
          costs: booking.costs
        }
      );

      setBooking(updatedBooking);
      setHasUnsavedChanges(false);
      Alert.alert('Success', `Booking ${newStatus.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setConfirmationModal(prev => ({ 
        ...prev, 
        isLoading: false,
        visible: false
      }));
    }
  };

  const handleRequestChanges = async (reason) => {
    await handleStatusUpdate(BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES, reason);
    setShowRequestChangesModal(false);
  };

  const showConfirmation = (actionText, onConfirm) => {
    setConfirmationModal({
      visible: true,
      actionText,
      onConfirm,
      isLoading: false
    });
  };

  const hideConfirmation = () => {
    setConfirmationModal({
      visible: false,
      actionText: '',
      onConfirm: null,
      isLoading: false
    });
  };

  const handleActionButtonClick = async (action, additionalData = null) => {
    if (is_DEBUG) {
      console.log('MBA12345 Action button clicked:', action, additionalData);
    }
    if (action === 'Send to Owner') {
      try {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        
        const token = await getStorage('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        if (is_DEBUG) {
          console.log('MBA12345 Sending booking update to owner for booking:', booking.booking_id);
        }

        // Call the update endpoint
        const response = await axios.post(
          `${API_BASE_URL}/api/bookings/v1/${booking.booking_id}/update/`,
          {},  // Empty body since all data is in the draft
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (is_DEBUG) {
          console.log('MBA12345 Update response:', response.data);
        }

        // Show success message
        setSnackBar({
          visible: true,
          message: response.data.message || 'Booking sent to owner successfully',
          type: 'success'
        });

        navigateToFrom(navigation, 'MessageHistory', 'BookingDetails', {
          messageId: response.data.message_id,
          conversationId: response.data.conversation_id,
        });

      } catch (error) {
        console.error('Error in handleActionButtonClick:', error);
        
        if (error.response?.status === 400) {
          // Show error for no draft data
          setSnackBar({
            visible: true,
            message: error.response.data.error || 'No draft data found',
            type: 'error'
          });
        } else {
          setSnackBar({
            visible: true,
            message: 'Failed to process action. Please try again.',
            type: 'error'
          });
        }
      } finally {
        setConfirmationModal(prev => ({ 
          ...prev, 
          isLoading: false,
          visible: false
        }));
      }
    } else if (action === 'Deny') {
      // Handle deny action
      try {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        await handleStatusUpdate(BOOKING_STATES.DENIED);
        setSnackBar({
          visible: true,
          message: 'Booking denied successfully',
          type: 'success'
        });
      } catch (error) {
        console.error('Error denying booking:', error);
        setSnackBar({
          visible: true,
          message: 'Failed to deny booking. Please try again.',
          type: 'error'
        });
      } finally {
        setConfirmationModal(prev => ({ 
          ...prev, 
          isLoading: false,
          visible: false
        }));
      }
    } else if (action === 'Approve') {
      try {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        
        if (is_DEBUG) {
          console.log('MBA12345 Approving booking:', booking.booking_id);
        }

        const response = await approveBooking(booking.booking_id);

        if (is_DEBUG) {
          console.log('MBA12345 Approve response:', response);
        }

        // Update the local booking status
        setBooking(prev => ({
          ...prev,
          status: response.status
        }));

        // Show success message
        setSnackBar({
          visible: true,
          message: response.message || 'Booking approved successfully',
          type: 'success'
        });

      } catch (error) {
        console.error('Error approving booking:', error);
        setSnackBar({
          visible: true,
          message: error.response?.data?.error || 'Failed to approve booking. Please try again.',
          type: 'error'
        });
      } finally {
        setConfirmationModal(prev => ({ 
          ...prev, 
          isLoading: false,
          visible: false
        }));
      }
    }
  };

  const renderActionButtons = () => {
    if (!booking) return null;

    const buttons = [];

    if (isProfessionalView) {
      // Deny button - Professional Only
      if (booking.status === BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES) {
        buttons.push(
          <TouchableOpacity
            key="deny"
            style={[styles.button, styles.denyButton]}
            onPress={() => showConfirmation(
              'deny this booking',
              () => handleActionButtonClick('Deny')
            )}
          >
            <Text style={styles.denybuttonText}>Deny</Text>
          </TouchableOpacity>
        );
      }

      // Send to Owner button - Professional Only
      if ([
        BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
        BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES,
        BOOKING_STATES.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
      ].includes(booking.status)) {
        buttons.push(
          <TouchableOpacity
            key="send"
            style={[styles.button, styles.primaryButton]}
            onPress={() => showConfirmation(
              'send these changes to the owner',
              () => handleActionButtonClick('Send to Owner')
            )}
          >
            <Text style={styles.buttonText}>Send to Owner</Text>
          </TouchableOpacity>
        );
      }
    }

    // Cancel button - Both Professional and Owner
    if ([
      BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES,
      BOOKING_STATES.CONFIRMED,
      BOOKING_STATES.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
      BOOKING_STATES.CONFIRMED_PENDING_CLIENT_APPROVAL
    ].includes(booking.status)) {
      buttons.push(
        <TouchableOpacity
          key="cancel"
          style={[styles.button, styles.cancelButton]}
          onPress={() => showConfirmation(
            'cancel this booking',
            () => handleActionButtonClick('Cancel')
          )}
        >
          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      );
    }

    // Owner-specific buttons
    if (!isProfessionalView) {
      // Approve button - Owner Only
      if ([
        BOOKING_STATES.PENDING_CLIENT_APPROVAL,
        BOOKING_STATES.CONFIRMED_PENDING_CLIENT_APPROVAL
      ].includes(booking.status)) {
        buttons.push(
          <TouchableOpacity
            key="approve"
            style={[styles.button, styles.approveButton]}
            onPress={() => showConfirmation(
              'approve this booking',
              () => handleActionButtonClick('Approve')
            )}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
        );
      }
    }

    return (
      <View style={styles.actionButtonsContainer}>
        {buttons}
      </View>
    );
  };

  // Add this effect to update editedBooking when booking changes
  useEffect(() => {
    if (booking) {
      setEditedBooking(booking);
    }
  }, [booking]);

  const renderServiceTypeDropdown = () => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownInput}
        onPress={() => setShowServiceDropdown(!showServiceDropdown)}
      >
        <Text>{editedBooking?.service_details?.service_type || 'Select Service Type'}</Text>
        <MaterialCommunityIcons 
          name={showServiceDropdown ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={theme.colors.text} 
        />
      </TouchableOpacity>

      {showServiceDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView nestedScrollEnabled={true}>
            {isLoadingServices ? (
              <ActivityIndicator style={{ padding: 10 }} />
            ) : (
              availableServices.map((service) => (
                <TouchableOpacity
                  key={service.service_id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setEditedBooking(prev => ({
                      ...prev,
                      service_details: {
                        ...prev.service_details,
                        service_type: service.service_name,
                        service_id: service.service_id
                      }
                    }));
                    setShowServiceDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    editedBooking?.service_details?.service_type === (service.service_name) && styles.selectedOption
                  ]}>
                    {service.service_name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
            {!isLoadingServices && availableServices.length === 0 && (
              <Text style={styles.noContentText}>No services available</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  // When the user clicks the "Add Event" button
  const handleAddOccurrenceClick = async () => {
    // Clear any previous errors
    setOccurrenceError(null);

    // Validate pets
    if (!booking?.pets?.length) {
      setOccurrenceError('Please add and save pets before adding an event');
      return;
    }

    // Validate service type
    if (!booking?.service_details?.service_type) {
      setOccurrenceError('Please select and save a service before adding an event');
      return;
    }

    try {
      // Fetch service rates before opening modal
      const token = await getStorage('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (is_DEBUG) {
        console.log('MBA565656 Fetching service rates for booking:', booking.booking_id);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/bookings/v1/${booking.booking_id}/service_rates/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (is_DEBUG) {
        console.log('MBA565656 Service rates response:', data);
      }

      if (data.status === 'success' && data.rates) {
        // Create default rates object
        const defaultRates = {
          base_rate: data.rates.base_rate,
          additional_animal_rate: data.rates.additional_animal_rate,
          applies_after: data.rates.applies_after,
          holiday_rate: data.rates.holiday_rate,
          unit_of_time: data.rates.unit_of_time,
          additional_rates: data.rates.additional_rates.map(rate => ({
            title: rate.title,
            description: rate.description,
            amount: rate.amount
          })),
          calculated_cost: Math.round(data.rates.calculated_cost * 100) / 100
        };

        if (is_DEBUG) {
          console.log('MBA565656 Setting defaultOccurrenceRates:', defaultRates);
        }

        // Set the default rates
        setDefaultOccurrenceRates(defaultRates);
        
        // Clear selected occurrence
        setSelectedOccurrence(null);

        // Open the modal
        setShowAddOccurrenceModal(true);
      } else {
        throw new Error('Invalid response format from service rates endpoint');
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBA565656 Error fetching service rates:', error);
      }
      setOccurrenceError('Failed to load service rates. Please try again.');
    }
  };

  const renderDateTimeSection = () => (
    <View>
      <Text style={styles.sectionTitle}>
        {canEdit() ? "Dates & Times (Set Rates For Dates)" : "Dates & Times"}
      </Text>
      {occurrenceError && (
        <Text style={styles.errorMessage}>{occurrenceError}</Text>
      )}
      {(booking?.occurrences || []).map((occ, index) => (
        <TouchableOpacity
          key={index}
          style={styles.occurrenceCard}
          onPress={() => canEdit() ? handleDateTimeCardPress(occ) : null}
          disabled={!canEdit()}
        >
          <Text style={styles.dateTimeText}>
            {occ.formatted_start} - {occ.formatted_end}
            {'\n'}<Text style={[{ fontWeight: '525' }]}>Total: {occ.duration} ({occ.timezone})</Text>
            {occ.dst_message && (
              <Text style={[{ color: theme.colors.danger, fontSize: 12 }]}>
                {'\n'}{occ.dst_message}
              </Text>
            )}
          </Text>
          {canEdit() && (
            <MaterialCommunityIcons 
              name="pencil" 
              size={24} 
              color={theme.colors.primary} 
            />
          )}
        </TouchableOpacity>
      ))}
      
      {canEdit() && (
        <TouchableOpacity
          style={styles.addOccurrenceButton}
          onPress={handleAddOccurrenceClick}
        >
          <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
          <Text style={styles.addOccurrenceText}>Add Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleDeleteOccurrence = async (occurrenceId) => {
    setConfirmationModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedOccurrences = booking.occurrences.filter(occ => occ.occurrence_id !== occurrenceId);
      
      setBooking(prev => ({
        ...prev,
        occurrences: updatedOccurrences,
        costs: calculateTotalCosts(updatedOccurrences)
      }));
      
      handleStatusUpdateAfterEdit();
    } catch (error) {
      console.error('Error deleting occurrence:', error);
      Alert.alert('Error', 'Failed to delete occurrence');
    } finally {
      setConfirmationModal(prev => ({ 
        ...prev, 
        isLoading: false,
        visible: false
      }));
      
      setTimeout(() => {
        setConfirmationModal({ 
          visible: false, 
          actionText: '', 
          onConfirm: null, 
          isLoading: false 
        });
      }, 300);
    }
  };

  const confirmDeleteOccurrence = (occurrenceId) => {
    setConfirmationModal({
      visible: true,
      actionText: 'delete this occurrence',
      onConfirm: () => handleDeleteOccurrence(occurrenceId),
      isLoading: false
    });
  };

  const updateServiceType = async (bookingId, serviceId) => {
    try {
      if (is_DEBUG) console.log('MBA123a73hv - Updating service type:', { bookingId, serviceId });
      const token = await getStorage('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/booking_drafts/v1/${bookingId}/update_service_type/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ service_id: serviceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (is_DEBUG) console.error('MBA123a73hv - Error updating service type:', errorData);
        throw new Error(errorData.error || 'Failed to update service type');
      }

      const data = await response.json();
      if (is_DEBUG) console.log('MBA123a73hv - Service type update response:', data);
      return data;
    } catch (error) {
      if (is_DEBUG) console.error('MBA123a73hv - Error updating service type:', error);
      throw error;
    }
  };

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader
        title="Booking Details"
        onBackPress={() => handleBack(navigation)}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !booking ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load booking details</Text>
        </View>
      ) : (
        <ScrollView style={styles.container}>
          <StatusBadge status={getDisplayValue(booking?.status, 'Pending Professional Changes')} />
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Parties</Text>
            <View style={styles.serviceDetailRow}>
              <Text style={styles.label}>Owner: </Text>
              <Text style={styles.value}>{getDisplayValue(booking?.ownerName)}</Text>
            </View>
            <View style={styles.serviceDetailRow}>
              <Text style={styles.label}>Professional:  </Text>
              <Text style={styles.value}>{getDisplayValue(booking?.professionalName)}</Text>
            </View>
          </View>

          <View style={[styles.section, styles.petsSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Booking Pets</Text>
              {renderEditButton()}
            </View>
            
            {renderPetSelector()}
          </View>

          <View style={[styles.section, { zIndex: 2 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              {canEdit() && (
                <TouchableOpacity 
                  onPress={toggleServiceEditMode}
                  style={[styles.sectionEditButton, isServiceEditMode && styles.saveButton]}
                  disabled={isServiceSaving}
                  testID="edit-button"
                >
                  {isServiceEditMode ? (
                    isServiceSaving ? (
                      <ActivityIndicator size="small" color={theme.colors.surface} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Service Details</Text>
                    )
                  ) : (
                    <MaterialCommunityIcons 
                      name="pencil"
                      size={24} 
                      color={theme.colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            {isServiceEditMode ? (
              <View style={styles.serviceEditContainer}>
                <View style={[styles.serviceInputRow, { zIndex: 3 }]}>
                  <Text style={styles.inputLabel}>Service Type:</Text>
                  <View style={styles.inputContainer}>
                    {renderServiceTypeDropdown()}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.serviceDetailsContainer}>
                <View style={styles.serviceDetailRow}>
                  <Text style={styles.label}>Service Type: </Text>
                  <Text style={styles.value}>{booking.service_details.service_type}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.section, styles.dateTimeSection]}>
            {renderDateTimeSection()}
          </View>

          {renderCostBreakdown()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Policy</Text>
            <Text style={styles.policyText}>
              • No refund if canceled within 1 hour of booking start time{'\n'}
              • 50% refund if canceled between 1-24 hours before start time{'\n'}
              • Full refund if canceled more than 24 hours before the booking
            </Text>
          </View>

          {renderActionButtons()}

          <RequestChangesModal
            visible={showRequestChangesModal}
            onClose={() => setShowRequestChangesModal(false)}
            onSubmit={handleRequestChanges}
            loading={actionLoading}
          />
        </ScrollView>
      )}
      <AddRateModal
        visible={showAddRateModal}
        onClose={() => setShowAddRateModal(false)}
        onAdd={(newRate) => {
          setEditedBooking(prev => ({
            ...prev,
            rates: {
              ...prev.rates,
              extraServices: [...(prev.rates.extraServices || []), newRate]
            }
          }));
          recalculateTotals();
          setShowAddRateModal(false);
        }}
      />
      <AddOccurrenceModal
        visible={showAddOccurrenceModal}
        onClose={() => {
          setShowAddOccurrenceModal(false);
          setDefaultOccurrenceRates(null);
          setTimeout(() => {
            setSelectedOccurrence(null);
          }, 300);
        }}
        onAdd={selectedOccurrence ? 
          (updatedData) => handleSaveOccurrence({...updatedData, occurrence_id: selectedOccurrence.occurrence_id}) : 
          handleAddOccurrence}
        defaultRates={defaultOccurrenceRates}
        initialOccurrence={selectedOccurrence}
        isEditing={!!selectedOccurrence}
        booking={booking}
      />
      <ConfirmationModal
        visible={confirmationModal.visible}
        actionText={confirmationModal.actionText}
        onClose={() => {
          if (!confirmationModal.isLoading) {
            setConfirmationModal({ 
              visible: false, 
              actionText: confirmationModal.actionText, 
              onConfirm: null, 
              isLoading: false 
            });
          }
        }}
        onConfirm={confirmationModal.onConfirm}
        isLoading={confirmationModal.isLoading}
      />
      <SnackBar 
        visible={snackBar.visible} 
        message={snackBar.message} 
        type={snackBar.type}
      />
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  label: {
    fontSize: theme.fontSizes.mediumLarge,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    alignSelf: 'center',
    fontWeight: '500',
  },
  value: {
    fontSize: theme.fontSizes.mediumLarge,
    color: theme.colors.text,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
    alignSelf: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  payoutRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  payoutLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.success,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  denybuttonText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  primaryButton: {
    backgroundColor: theme.colors.mainColors.main,
  },
  denyButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.error,
    textColor: theme.colors.error,
  },
  approveButton: {
    backgroundColor: theme.colors.mainColors.tertiary,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 8,
    borderRadius: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  cancelButtonText: {
    color: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 8,
    borderRadius: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {  
    fontSize: theme.fontSizes.largeLarge,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    marginRight: 8,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  addOccurrenceText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceCost: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  noContentText: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  editButton: {
  },
  editField: {
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  editableServiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeServiceButton: {
    marginLeft: 8,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  editInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 8,
    width: 80,
    textAlign: 'right',
  },
  addRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  addRateText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  dropdownContainer: {
    position: 'relative',
    width: 150,
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 4,
    backgroundColor: theme.colors.surface,
  },
  timeDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 5,
    marginTop: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedOption: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  bookingDatesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  datePickerContainer: {
    flex: 1,
    marginRight: 10,
  },
  timePickerContainer: {
    width: 120,
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 8,
    backgroundColor: theme.colors.surface,
  },
  dropdownList: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rateSection: {
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  rateSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
  },
  rateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rateInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: theme.fontSizes.largeLarge,
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  additionalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  removeButton: {
    padding: 4,
  },
  summarySection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  columnHeader: {
    fontSize: 12,
    color: theme.colors.placeholder,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  rateAmountColumn: {
    alignItems: 'flex-start',
  },
  rateActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72,
    gap: 8,
  },
  infoButton: {
    padding: 4,
  },
  actionButtonsContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButtonText: {
    color: theme.colors.surface,
    fontWeight: '500',
  },
  serviceEditContainer: {
    gap: 16,
  },
  serviceInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: theme.fontSizes.largeLarge,
    color: theme.colors.text,
    flex: 1,
  },
  inputContainer: {
    width: 150, // Fixed width for dropdowns and number input
  },
  numberInput: {
    height: 40,
    width: 150, // Match the width of dropdowns
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  serviceDetailsContainer: {
    gap: 12,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: theme.fontSizes.mediumLarge,
    color: theme.colors.text,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
    alignSelf: 'center',
  },
  occurrenceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 140,  // Ensure enough width for the text
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.surface,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  actionButtons: {
    width: 72, // Approximate width of both buttons + gap
  },
  additionalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  occurrenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  occurrenceDetails: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  editOccurrenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },
  editOccurrenceText: {
    color: theme.colors.primary,
    marginLeft: 5,
  },
  addOccurrenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 12,
  },
  addOccurrenceText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  occurrenceCostRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  occurrenceCostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occurrenceCostHeaderText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  costAndIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  occurrenceCost: {
    fontSize: 16,
    fontWeight: '500',
  },
  costSummary: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  expandedCostDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  costDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  costDetailText: {
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEditButton: {
    padding: 8,
  },
  petItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  petInfo: {
    flex: 1,
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.placeholder,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addPetText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  petDropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownPetName: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownPetDetails: {
    fontSize: 14,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  noPetsText: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
  },
  petsSection: {
    zIndex: 3,
    elevation: 3,
  },
  dateTimeSection: {
    zIndex: 1,
    elevation: 1,
  },
  payoutRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  payoutLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.success,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'normal',
    marginBottom: 4,
    fontFamily: theme.fonts.header.fontFamily,
  },
  proName: {
    fontSize: 18,
    fontWeight: 'normal',
    marginBottom: 4,
    fontFamily: theme.fonts.header.fontFamily,
  },
  serviceTypeLabel: {
    fontSize: theme.fontSizes.mediumLarge,
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    fontWeight: 'normal',
  },
  petListTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
    fontFamily: theme.fonts.header.fontFamily,
  },
  petInfo: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  occurrenceDate: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceTime: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  costBreakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  costLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  costAmount: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  additionalRateLabel: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  additionalRateAmount: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceDetailLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceDetailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: theme.fonts.header.fontFamily,
  },
  occurrenceCardDate: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceCardTime: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  editOccurrenceText: {
    color: theme.colors.primary,
    marginLeft: 5,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  occurrenceCardText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorMessage: {
    color: theme.colors.error,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 8,
    marginBottom: 8,
  },
});

export default BookingDetails;