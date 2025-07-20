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
  conversationId,
  navigation,
  onPress
}) => {
  // Log the data for debugging
  debugLog('MBA8675309: ReviewRequestCard data:', data);
  
  // State for the approval modal
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [safeInitialData, setSafeInitialData] = useState(null);
  
  // State for the review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Determine the message content and button states based on review permissions
  const getReviewState = () => {
    const proReviewAllowed = data.pro_review_allowed !== false;
    const clientReviewAllowed = data.client_review_allowed !== false;
    const reviewsVisible = data.reviews_visible === true;
    const past14Days = data.past_14_day_window === true;
    
    debugLog('MBA8675309: Review state analysis:', {
      isProfessional,
      proReviewAllowed,
      clientReviewAllowed,
      reviewsVisible,
      past14Days,
      metadata: data
    });

    // If reviews are visible, both users have reviewed
    if (reviewsVisible) {
      return {
        message: "Reviews have been exchanged",
        buttonText: "View Review",
        buttonAction: "viewReviews",
        canReview: false,
        subtitle: "Both reviews are now visible. If you wish to dispute a review, please contact support."
      };
    }

    // If 14-day window has passed
    if (past14Days) {
      return {
        message: "Review window has expired",
        buttonText: "View Available Review",
        buttonAction: "viewReviews", 
        canReview: false,
        subtitle: "The 14-day review window has passed. Any submitted reviews are now visible."
      };
    }

    // Professional user scenarios
    if (isProfessional) {
      if (!proReviewAllowed && clientReviewAllowed) {
        // Pro has reviewed, waiting for client
        return {
          message: "You have reviewed your client",
          buttonText: "Review Submitted",
          buttonAction: "none",
          canReview: false,
          subtitle: "Waiting for your client to leave a review. Once they do, both reviews will be visible."
        };
      } else if (proReviewAllowed && !clientReviewAllowed) {
        // Client has reviewed, pro hasn't
        return {
          message: "Your client has reviewed you",
          buttonText: "Leave Your Review",
          buttonAction: "leaveReview",
          canReview: true,
          subtitle: "Leave a review for your client to see their review of you."
        };
      } else if (proReviewAllowed && clientReviewAllowed) {
        // Neither has reviewed
        return {
          message: "Please review your client",
          buttonText: "Leave a Review",
          buttonAction: "leaveReview", 
          canReview: true,
          subtitle: "Your review won't be visible until your client also leaves a review or 14 days pass."
        };
      }
    } 
    // Client user scenarios
    else {
      if (!clientReviewAllowed && proReviewAllowed) {
        // Client has reviewed, waiting for pro
        return {
          message: "You have reviewed your experience",
          buttonText: "Review Submitted",
          buttonAction: "none",
          canReview: false,
          subtitle: "Waiting for the professional to leave a review. Once they do, both reviews will be visible."
        };
      } else if (clientReviewAllowed && !proReviewAllowed) {
        // Pro has reviewed, client hasn't
        return {
          message: "The professional has reviewed you",
          buttonText: "Leave Your Review", 
          buttonAction: "leaveReview",
          canReview: true,
          subtitle: "Leave a review for the professional to see their review of you."
        };
      } else if (clientReviewAllowed && proReviewAllowed) {
        // Neither has reviewed
        return {
          message: "Please review your experience",
          buttonText: "Leave a Review",
          buttonAction: "leaveReview",
          canReview: true,
          subtitle: "Your review won't be visible until the professional also leaves a review or 14 days pass."
        };
      }
    }

    // Fallback case
    return {
      message: "Review status unavailable",
      buttonText: "Check Status",
      buttonAction: "none",
      canReview: false,
      subtitle: "Please contact support if you need assistance with reviews."
    };
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

  // Handle button press based on action type
  const handleButtonPress = (action) => {
    switch (action) {
      case 'leaveReview':
        handleOpenReviewModal();
        break;
      case 'viewReviews':
        debugLog('MBA8675309: Navigating to MyProfile to view reviews');
        // Navigate to MyProfile with profile_info tab to show reviews
        if (navigation) {
          navigation.navigate('MyProfile', { initialTab: 'profile_info' });
        } else {
          debugLog('MBA8675309: Navigation object not available');
        }
        break;
      case 'none':
      default:
        // Do nothing for disabled buttons
        break;
    }
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

  // Get the current review state
  const reviewState = getReviewState();

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
          <Text style={styles.title}>{reviewState.message}</Text>
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
            
            {/* Subtitle with additional information */}
            {reviewState.subtitle && (
              <View style={styles.subtitleContainer}>
                <Text style={styles.subtitle}>{reviewState.subtitle}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={handleOpenApprovalModal}
            >
              <Text style={styles.detailsButtonText}>View Booking Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.reviewButton,
                !reviewState.canReview && styles.disabledButton
              ]}
              onPress={() => handleButtonPress(reviewState.buttonAction)}
              disabled={!reviewState.canReview && reviewState.buttonAction === 'none'}
            >
              <Text style={[
                styles.reviewButtonText,
                !reviewState.canReview && styles.disabledButtonText
              ]}>
                {reviewState.buttonText}
              </Text>
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
        conversationId={conversationId}
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
  subtitleContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary || '#666',
    fontStyle: 'italic',
    lineHeight: 18,
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
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#999',
  },
});

export default ReviewRequestCard; 