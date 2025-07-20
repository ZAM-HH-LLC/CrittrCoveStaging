import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { debugLog } from '../context/AuthContext';
import Toast from './Toast';

const ReviewModal = ({ 
  visible, 
  onClose, 
  isProfessional,
  bookingId,
  conversationId,
  onSubmitReview
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setRating(0);
      setReviewText('');
      setIsSubmitting(false);
      setToast({ visible: false, message: '', type: 'success' });
    }
  }, [visible]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      // Show toast for rating required
      setToast({
        visible: true,
        message: 'Please select a star rating',
        type: 'error'
      });
      return;
    }

    if (!reviewText.trim()) {
      // Show toast for review text required
      setToast({
        visible: true,
        message: 'Please write a review',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmitReview) {
        await onSubmitReview({
          bookingId,
          rating,
          reviewText,
          isProfessional,
          conversationId
        });
      }
      
      // Show success toast and close modal immediately
      setToast({
        visible: true,
        message: 'Review submitted successfully!',
        type: 'success'
      });
      
      // Close modal immediately
      onClose();
    } catch (error) {
      debugLog('MBA8675309: Error submitting review:', error);
      setToast({
        visible: true,
        message: 'Failed to submit review. Please try again.',
        type: 'error'
      });
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starContainer}
        >
          <MaterialCommunityIcons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#FFD700' : theme.colors.border}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContainer}
              onPress={(e) => {
                // Prevent touch events from bubbling to parent
                e.stopPropagation();
              }}
            >
              {/* Header with close button */}
              <View style={styles.header}>
                <Text style={styles.headerText}>
                  {isProfessional ? 'Please Review Your Client' : 'Please Rate Your Experience'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* Star Rating */}
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                <View style={styles.starsRow}>
                  {renderStars()}
                </View>
              </View>
              
              {/* Review Text */}
              <View style={styles.reviewTextContainer}>
                <Text style={styles.reviewTextLabel}>Your Review</Text>
                <TextInput
                  style={styles.reviewTextInput}
                  placeholder="Write your review here..."
                  placeholderTextColor={theme.colors.placeHolderText}
                  multiline={true}
                  numberOfLines={Platform.OS === 'ios' ? null : 4}
                  minHeight={Platform.OS === 'ios' ? 80 : null}
                  textAlignVertical="top"
                  value={reviewText}
                  onChangeText={setReviewText}
                />
              </View>
              
              {/* Notice */}
              <View style={styles.noticeContainer}>
                <Text style={styles.noticeText}>
                  Note: Your review won't be visible to the other user until the other user posts their review or 14 days after the booking.
                </Text>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    (rating === 0 || !reviewText.trim() || isSubmitting) ? styles.disabledButton : {}
                  ]} 
                  onPress={handleSubmitReview}
                  disabled={rating === 0 || !reviewText.trim() || isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Posting...' : 'Post Review'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Toast notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
        duration={3000}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  closeButton: {
    padding: 5,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 10,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starContainer: {
    padding: 5,
  },
  reviewTextContainer: {
    marginBottom: 20,
  },
  reviewTextLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 10,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    fontFamily: theme.fonts.regular.fontFamily,
    minHeight: 100,
  },
  noticeContainer: {
    backgroundColor: theme.colors.error + '15',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },
  noticeText: {
    fontSize: 14,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ReviewModal; 