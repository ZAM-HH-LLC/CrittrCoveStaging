import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, debugLog } from '../context/AuthContext';
import ReviewAndRatesCard from './bookingComponents/ReviewAndRatesCard';
import { getBookingDetails, approveBooking, requestBookingChanges } from '../api/API';
import { capitalizeWords } from '../utils/formatStrings';

const BookingApprovalModal = ({ 
  visible, 
  onClose, 
  bookingId,
  onApproveSuccess,
  onApproveError,
  onRequestChangesSuccess,
  onRequestChangesError,
  initialData = null,
  isProfessional = true,
  modalTitle = "Booking Approval Request",
  hideButtons = false
}) => {
  const { screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;
  
  // Create a safe default initial data structure if initialData is null
  const defaultInitialData = initialData || {
    booking_id: bookingId,
    service_type: 'Loading...',
    pets: [],
    occurrences: [],
    cost_summary: {
      subtotal: 0,
      client_platform_fee: 0,
      pro_platform_fee: 0,
      taxes: 0,
      tax_state: '',
      total_client_cost: 0,
      total_sitter_payout: 0,
      pro_subscription_plan: 0
    }
  };
  
  const [bookingData, setBookingData] = useState(defaultInitialData);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading booking details...");
  const [error, setError] = useState(null);
  const [changeRequestMessage, setChangeRequestMessage] = useState('');
  const [showChangeRequestInput, setShowChangeRequestInput] = useState(false);
  
  // Use a ref to store a cached copy of the booking data that won't be affected by re-renders
  const bookingDataRef = useRef(defaultInitialData);
  // Flag to track if data has been fully loaded
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (visible && bookingId) {
      fetchBookingDetails();
    }
  }, [visible, bookingId]);

  // Update bookingData when initialData changes
  useEffect(() => {
    if (initialData && !dataLoadedRef.current) {
      debugLog('MBAio3htg5uohg: Updating bookingData from initialData');
      setBookingData(initialData);
      bookingDataRef.current = initialData;
    }
  }, [initialData]);

  // Add this useEffect to detect when a websocket update or unread count changes might occur
  // and protect the bookingData from being affected
  useEffect(() => {
    // This sets a regular interval to check if bookingData is still intact
    const dataProtectionInterval = setInterval(() => {
      if (visible && dataLoadedRef.current) {
        // Check if booking data has been unexpectedly cleared
        const hasNoData = !bookingData || 
                         !bookingData.occurrences || 
                         bookingData.occurrences.length === 0;
                         
        const hasRefData = bookingDataRef.current && 
                          bookingDataRef.current.occurrences && 
                          bookingDataRef.current.occurrences.length > 0;
        
        if (hasNoData && hasRefData) {
          debugLog('MBAio3htg5uohg: Detected that bookingData was cleared unexpectedly, restoring from cache');
          setBookingData({...bookingDataRef.current});
        }
      }
    }, 1000); // Check every second
    
    return () => {
      // Clean up interval on unmount
      clearInterval(dataProtectionInterval);
    };
  }, [visible, bookingData]);

  const fetchBookingDetails = async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      setError(null);
      setLoadingText("Loading booking details...");
      
      debugLog('MBAio3htg5uohg: Fetching booking details for ID:', bookingId);
      const response = await getBookingDetails(bookingId);
      
      debugLog('MBAio3htg5uohg: Booking details fetched:', response);
      
      // Ensure the response has the expected structure
      const safeResponse = {
        ...response,
        occurrences: response.occurrences || [],
        pets: response.pets || [],
        cost_summary: response.cost_summary || {
          subtotal: 0,
          client_platform_fee: 0,
          pro_platform_fee: 0,
          taxes: 0,
          tax_state: '',
          total_client_cost: 0,
          total_sitter_payout: 0,
          pro_subscription_plan: 0
        },
        service_type: response.service_type || 'N/A'
      };
      
      // Make sure we have at least one occurrence with required fields
      if (safeResponse.occurrences.length === 0) {
        safeResponse.occurrences = [{
          occurrence_id: '0',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '17:00',
          unit_of_time: 'visit',
          multiple: 1,
          base_total: 0,
          rates: {
            base_rate: 0,
            additional_animal_rate: 0,
            applies_after: 1,
            holiday_rate: 0,
            holiday_days: 0,
            additional_rates: []
          }
        }];
      } else {
        // Ensure each occurrence has a rates object and that unit_of_time is preserved
        safeResponse.occurrences = safeResponse.occurrences.map(occ => {
          // Log detailed info about each occurrence for debugging
          debugLog('MBAio3htg5uohg: Processing occurrence:', {
            id: occ.occurrence_id,
            unit_of_time: occ.unit_of_time,
            multiple: occ.multiple
          });
          
          return {
            ...occ,
            unit_of_time: occ.unit_of_time || 'visit',
            multiple: parseFloat(occ.multiple) || 1,
            base_total: occ.base_total || 0,
            rates: occ.rates || {
              base_rate: 0,
              additional_animal_rate: 0,
              applies_after: 1,
              holiday_rate: 0,
              holiday_days: 0,
              additional_rates: []
            }
          };
        });
      }
      
      // Store the processed response both in state and ref
      setBookingData(safeResponse);
      bookingDataRef.current = safeResponse;
      dataLoadedRef.current = true;
      
      debugLog('MBAio3htg5uohg: Booking data processed and stored');
    } catch (err) {
      debugLog('MBAio3htg5uohg: Error fetching booking details:', err);
      setError('Failed to load booking details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Add a safety effect that restores booking data from ref if it's cleared unexpectedly
  useEffect(() => {
    // Only run this check if we have actually loaded data before
    if (dataLoadedRef.current) {
      // Check if booking data was cleared but we have a cache in the ref
      const hasNoData = !bookingData || !bookingData.occurrences || bookingData.occurrences.length === 0;
      const hasRefData = bookingDataRef.current && bookingDataRef.current.occurrences && bookingDataRef.current.occurrences.length > 0;
      
      if (hasNoData && hasRefData) {
        debugLog('MBAio3htg5uohg: Booking data was cleared unexpectedly, restoring from cache');
        setBookingData(bookingDataRef.current);
      }
    }
  }, [bookingData]);

  const handleApprove = async () => {
    try {
      setLoading(true);
      setLoadingText("Approving booking...");
      setError(null);
      
      const response = await approveBooking(bookingId);
      
      if (onApproveSuccess) {
        onApproveSuccess(response);
      }
      
      onClose();
    } catch (err) {
      debugLog('MBA77788 Error approving booking:', err);
      setError('Failed to approve booking. Please try again.');
      
      if (onApproveError) {
        onApproveError(err.response?.data?.error || 'Failed to approve booking');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShowChangeRequest = () => {
    setShowChangeRequestInput(true);
  };

  const handleCancelChangeRequest = () => {
    setShowChangeRequestInput(false);
    setChangeRequestMessage('');
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeRequestMessage.trim()) {
      setError('Please provide details about your requested changes.');
      return;
    }
    
    try {
      setLoading(true);
      setLoadingText("Submitting change request...");
      setError(null);
      
      const response = await requestBookingChanges(bookingId, changeRequestMessage);
      
      if (onRequestChangesSuccess) {
        debugLog('MBA77788 Notifying parent of successful change request submission');
        onRequestChangesSuccess(response);
      }
      
      onClose();
    } catch (err) {
      debugLog('MBA77788 Error requesting booking changes:', err);
      setError('Failed to submit change request. Please try again.');
      
      if (onRequestChangesError) {
        onRequestChangesError(err.response?.data?.error || 'Failed to submit change request');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setShowChangeRequestInput(false);
    setChangeRequestMessage('');
    onClose();
  };

  // Main content of the modal
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookingDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!bookingData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No booking data available</Text>
        </View>
      );
    }

    return (
      <>
        <View style={[styles.section, { marginTop: 0 }]}>
          <Text style={styles.sectionHeader}>Service & Pets</Text>
          <View style={styles.card}>
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
        
        {/* ReviewAndRatesCard for booking details */}
        {bookingData && (
          <ReviewAndRatesCard 
            bookingData={bookingData} 
            bookingId={bookingId}
            onRatesUpdate={(updatedData) => setBookingData(updatedData)}
            showEditControls={false}
            isProfessional={isProfessional}
          />
        )}
      </>
    );
  };

  // Render change request input
  const renderChangeRequestInput = () => {
    return (
      <View style={styles.changeRequestContainer}>
        <Text style={styles.changeRequestTitle}>Request Changes</Text>
        <Text style={styles.changeRequestDescription}>
          Please describe the changes you'd like to request:
        </Text>
        <TextInput
          style={styles.changeRequestInput}
          multiline
          numberOfLines={4}
          placeholder="Explain what changes you need..."
          placeholderTextColor={theme.colors.placeHolderText}
          value={changeRequestMessage}
          onChangeText={setChangeRequestMessage}
        />
        <View style={styles.changeRequestButtons}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancelChangeRequest}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmitChangeRequest}
          >
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Footer with action buttons
  const renderFooter = () => {
    if (hideButtons || showChangeRequestInput) {
      return null;
    }
    
    return (
      <>
      {!isProfessional ? (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.requestChangesButton}
            onPress={handleShowChangeRequest}
          >
            <Text style={styles.requestChangesText}>Request Changes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.approveButton}
            onPress={handleApprove}
          >
            <Text style={styles.approveText}>Approve Booking</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[
          styles.container, 
          isDesktop ? styles.desktopContainer : {}
        ]}>
          {/* Header with customizable title */}
          <View style={styles.header}>
            <Text style={styles.title}>{modalTitle}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Scrollable Content */}
          {showChangeRequestInput ? (
            renderChangeRequestInput()
          ) : (
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
              {renderContent()}
            </ScrollView>
          )}
          
          {/* Footer with action buttons */}
          {renderFooter()}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    margin: Platform.OS === 'web' ? 0 : 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  desktopContainer: {
    maxWidth: 800,
    maxHeight: '90%',
    alignSelf: 'center',
    marginTop: '5%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  closeButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  requestChangesButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  requestChangesText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  approveButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  approveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  // Service and Pets section styles
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 20,
    // fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  // Change request styles
  changeRequestContainer: {
    padding: 16,
    flex: 1,
  },
  changeRequestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  changeRequestDescription: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  changeRequestInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  changeRequestButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BookingApprovalModal; 