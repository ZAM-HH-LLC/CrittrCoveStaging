import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../context/AuthContext';
import BookingApprovalModal from './BookingApprovalModal';
import ReviewModal from './ReviewModal';
import { submitBookingReview } from '../api/API';

/**
 * A card component for review requests that spans the full width of the message list
 */
const ReviewRequestCard = ({ 
  data, 
  isProfessional,
  onPress
}) => {
  // Log the data for debugging
  debugLog('MBA8675309: ReviewRequestCard data:', data);
  
  // State for the approval modal
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [safeInitialData, setSafeInitialData] = useState(null);
  
  // State for the review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Determine the message content based on the user role
  const getReviewMessage = () => {
    if (isProfessional) {
      return "Please review your client";
    } else {
      return "Please review your experience";
    }
  };
  
  // Handle opening the approval modal
  const handleOpenApprovalModal = () => {
    // Ensure we have basic data for the modal
    const preparedData = {
      ...data,
      occurrences: data.occurrences?.map(occ => ({
        ...occ,
        rates: occ.rates || {
          base_rate: 0,
          additional_animal_rate: 0,
          applies_after: 1,
          holiday_rate: 0,
          holiday_days: 0,
          additional_rates: []
        }
      })) || []
    };
    setSafeInitialData(preparedData);
    setApprovalModalVisible(true);
  };
  
  // Handle opening the review modal
  const handleOpenReviewModal = () => {
    setReviewModalVisible(true);
  };
  
  // Handle submitting a review
  const handleSubmitReview = async (reviewData) => {
    try {
      const response = await submitBookingReview(reviewData);
      debugLog('MBA8675309: Review submitted successfully:', response);

      
      // If there's a callback from the parent component
      if (onPress) {
        onPress('reviewSubmitted', response);
      }
      
      return response;
    } catch (error) {
      debugLog('MBA8675309: Error submitting review:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      {/* Booking Completed Banner */}
      <View style={styles.completedBanner}>
        <MaterialCommunityIcons 
          name="check-circle" 
          size={24} 
          color={theme.colors.success} 
        />
        <Text style={styles.completedText}>Booking Completed</Text>
      </View>
      
      {/* Review Request Card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <MaterialCommunityIcons 
            name="star-outline" 
            size={24} 
            color={theme.colors.primary} 
          />
          <Text style={styles.title}>{getReviewMessage()}</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.infoSection}>
            <View style={styles.row}>
              <Text style={styles.label}>Booking ID:</Text>
              <Text style={styles.value}>{data.booking_id || 'N/A'}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Service:</Text>
              <Text style={styles.value}>{data.service_type || 'N/A'}</Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={handleOpenApprovalModal}
            >
              <Text style={styles.detailsButtonText}>View Booking Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={handleOpenReviewModal}
            >
              <Text style={styles.reviewButtonText}>Leave a Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Approval Modal */}
      <BookingApprovalModal
        visible={approvalModalVisible}
        onClose={() => setApprovalModalVisible(false)}
        bookingId={data.booking_id}
        initialData={safeInitialData}
        isProfessional={isProfessional}
        isReadOnly={true}  // Always read-only for completed bookings
        hideButtons={true}  // Hide approval buttons
        modalTitle="Booking Details"
      />
      
      {/* Review Modal */}
      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        isProfessional={isProfessional}
        bookingId={data.booking_id}
        onSubmitReview={handleSubmitReview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success + '15', // Light green background
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.success,
    gap: 8,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
    fontFamily: theme.fonts.header.fontFamily,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  content: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    minWidth: 80,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#6b705c', // Olive green color to match the screenshot
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  reviewButton: {
    flex: 1,
    backgroundColor: '#6b705c', // Olive green color to match the screenshot
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ReviewRequestCard; 