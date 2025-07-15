import React, { useState, useEffect, useContext } from 'react';
import { View, TouchableOpacity, Text, Modal, FlatList, Platform } from 'react-native';
import { debugLog, AuthContext } from '../../context/AuthContext';
import { getIncompleteBookings, markBookingCompleted } from '../../api/API';
import { formatDateTimeRangeFromUTC } from '../../utils/time_utils';
import Toast from '../Toast';

const FloatingMarkCompleteButton = ({ conversationId, theme, onMarkComplete, onRefreshMessages, isProfessional }) => {
  const { timeSettings } = useContext(AuthContext);
  const userTimezone = timeSettings?.timezone || 'America/Denver';
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [incompleteBookings, setIncompleteBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  
  // Toast state for error handling
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  // Fetch incomplete bookings when component mounts or conversationId changes
  useEffect(() => {
    if (!conversationId) return;
    
    const fetchIncompleteBookings = async () => {
      try {
        debugLog('MBA1234: Fetching incomplete bookings for conversation:', conversationId);
        const response = await getIncompleteBookings(conversationId);
        setIncompleteBookings(response.incomplete_bookings || []);
        debugLog('MBA1234: Incomplete bookings fetched:', response.incomplete_bookings);
      } catch (error) {
        debugLog('MBA1234: Error fetching incomplete bookings:', error);
        setIncompleteBookings([]);
      }
    };

    fetchIncompleteBookings();
  }, [conversationId]);

  // Don't render if not a professional or no incomplete bookings
  if (!isProfessional || incompleteBookings.length === 0) {
    return null;
  }

  const handleSelectBooking = (bookingId) => {
    debugLog('MBA1234: Selecting booking for completion', { bookingId });
    setSelectedBookingId(bookingId);
  };

  const handleMarkComplete = async () => {
    if (!selectedBookingId) return;
    
    try {
      debugLog('MBA1234: Marking booking as complete', { bookingId: selectedBookingId });
      
      await markBookingCompleted(selectedBookingId);
      
      // Call parent callback if provided (before refresh so we have access to the booking data)
      if (onMarkComplete) {
        const completedBooking = incompleteBookings.find(b => b.booking_id === selectedBookingId);
        onMarkComplete(completedBooking);
      }
      
      // Refresh messages to show new review request message
      // This will automatically trigger the useEffect to refetch incomplete bookings
      if (onRefreshMessages) {
        debugLog('MBA1234: Refreshing messages after marking booking complete');
        await onRefreshMessages();
      }
      
      // Reset selection and close modal
      setSelectedBookingId(null);
      setIsModalVisible(false);
      
      debugLog('MBA1234: Booking marked as complete successfully');
    } catch (error) {
      debugLog('MBA1234: Error marking booking as complete:', error);
      
      // Extract error message from response
      let errorMessage = 'Failed to mark booking as completed';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      // Show toast with error message
      setToastMessage(errorMessage);
      setToastType('error');
      setToastVisible(true);
      
      // Close modal on error
      setSelectedBookingId(null);
      setIsModalVisible(false);
    }
  };

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity
      style={[
        bookingItemStyles.bookingItem,
        selectedBookingId === item.booking_id && bookingItemStyles.selectedBookingItem
      ]}
      onPress={() => handleSelectBooking(item.booking_id)}
    >
      <View style={bookingItemStyles.bookingContent}>
        <Text style={[bookingItemStyles.serviceTitle, { color: theme.colors.text }]}>
          Service: {item.service_type}
        </Text>
        <Text style={[bookingItemStyles.bookingId, { color: theme.colors.textSecondary }]}>
          Booking ID: {item.booking_id}
        </Text>
        <Text style={[bookingItemStyles.cost, { color: theme.colors.textSecondary }]}>
          Total Payout: ${item.total_sitter_payout}
        </Text>
        {item.last_occurrence_end_date && item.last_occurrence_end_time && (
          <Text style={[bookingItemStyles.endDate, { color: theme.colors.textSecondary }]}>
            {(() => {
              const formattedDateTime = formatDateTimeRangeFromUTC({
                startDate: item.last_occurrence_end_date,
                startTime: item.last_occurrence_end_time,
                endDate: item.last_occurrence_end_date,
                endTime: item.last_occurrence_end_time,
                userTimezone: userTimezone,
                includeTimes: true,
                includeTimezone: true
              }).split(' - ')[0];
              
              // Create date objects for comparison
              const endDateObj = new Date(`${item.last_occurrence_end_date}T${item.last_occurrence_end_time}Z`);
              const currentDate = new Date();
              
              // Compare if end date is in the past
              const isInPast = endDateObj < currentDate;
              
              return `${isInPast ? 'Ended' : 'Ends'}: ${formattedDateTime}`;
            })()}
          </Text>
        )}
      </View>
      {selectedBookingId === item.booking_id && (
        <View style={bookingItemStyles.selectedIndicator}>
          <Text style={bookingItemStyles.selectedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const floatingButtonStyles = {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    right: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  };

  const buttonTextStyles = {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '600',
  };

  const modalStyles = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const modalContentStyles = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  };

  const modalTitleStyles = {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  };

  const closeButtonStyles = {
    marginTop: 16,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  };

  const closeButtonTextStyles = {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  };

  const bookingItemStyles = {
    bookingItem: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectedBookingItem: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.colors.primary + '10',
    },
    bookingContent: {
      flexDirection: 'column',
      flex: 1,
    },
    serviceTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    bookingId: {
      fontSize: 14,
      marginBottom: 4,
    },
    cost: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4,
    },
    endDate: {
      fontSize: 12,
      fontStyle: 'italic',
    },
    selectedIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedText: {
      color: theme.colors.surface,
      fontSize: 14,
      fontWeight: 'bold',
    },
  };

  return (
    <>
      <TouchableOpacity
        style={floatingButtonStyles}
        onPress={() => {
          setSelectedBookingId(null);
          setIsModalVisible(true);
        }}
      >
        <Text style={buttonTextStyles}>
          Mark as Complete ({incompleteBookings.length})
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={modalStyles}>
          <View style={modalContentStyles}>
            <Text style={modalTitleStyles}>
              Select Booking to Mark Complete
            </Text>
            
            <FlatList
              data={incompleteBookings}
              renderItem={renderBookingItem}
              keyExtractor={(item, index) => `booking-${item.booking_id}-${index}`}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity
                style={[closeButtonStyles, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setSelectedBookingId(null);
                  setIsModalVisible(false);
                }}
              >
                <Text style={closeButtonTextStyles}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  closeButtonStyles,
                  { 
                    flex: 1, 
                    marginLeft: 8,
                    backgroundColor: selectedBookingId ? theme.colors.primary : theme.colors.border,
                    opacity: selectedBookingId ? 1 : 0.5
                  }
                ]}
                onPress={handleMarkComplete}
                disabled={!selectedBookingId}
              >
                <Text style={[
                  closeButtonTextStyles,
                  { color: selectedBookingId ? theme.colors.surface : theme.colors.text }
                ]}>
                  Mark Complete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
        addMarginBottom={40}
        duration={7000}
      />
    </>
  );
};

export default FloatingMarkCompleteButton;