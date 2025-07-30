import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { formatFromUTC, FORMAT_TYPES } from '../utils/time_utils';
import { debugLog } from '../context/AuthContext';
import { getMediaUrl } from '../config/config';
import moment from 'moment-timezone';

const ReviewsModal = ({ visible, onClose, reviews, averageRating, reviewCount, userName, forProfessional, userTimezone }) => {
  // Format date for display
  const formatReviewDate = (dateString) => {
    try {
      if (!dateString) return '';
      
      debugLog('MBA3456', 'formatReviewDate input:', dateString);
      
      const timezone = userTimezone || 'US/Mountain'; // fallback to default
      
      // Use moment to parse the date string directly and convert to user timezone
      const parsedMoment = moment.utc(dateString);
      
      if (!parsedMoment.isValid()) {
        debugLog('MBA3456', 'Invalid moment created from:', dateString);
        return dateString;
      }
      
      // Convert to user timezone and format as "MMM D, YYYY"
      const localMoment = parsedMoment.tz(timezone);
      const formatted = localMoment.format('MMM D, YYYY');
      
      debugLog('MBA3456', 'Successfully formatted date:', { input: dateString, output: formatted });
      return formatted;
      
    } catch (error) {
      debugLog('MBA3456', 'Error formatting review date:', { dateString, error });
      return dateString;
    }
  };

  // Render stars based on rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color={theme.colors.warning}
          style={styles.starIcon}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // Render profile picture or default icon
  const renderProfilePicture = (profilePicture) => {
    if (profilePicture) {
      const imageUrl = getMediaUrl(profilePicture);
      return (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.profileImage} 
          resizeMode="cover"
        />
      );
    } else {
      return (
        <View style={styles.defaultProfileImage}>
          <MaterialCommunityIcons 
            name="account" 
            size={32} 
            color={theme.colors.surface} 
          />
        </View>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Reviews for {userName}</Text>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={20} color={theme.colors.warning} />
                <Text style={styles.ratingText}>{averageRating.toFixed(2)}</Text>
                <Text style={styles.reviewCountText}>({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="star-outline" size={60} color={theme.colors.placeholder} />
              <Text style={styles.emptyStateText}>No reviews yet</Text>
            </View>
          ) : (
            <ScrollView style={styles.reviewsList} contentContainerStyle={styles.reviewsContent}>
              {[...reviews].sort((a, b) => b.rating - a.rating).map((review) => (
                <View key={review.review_id} style={styles.reviewCard}>
                  <View style={styles.reviewUserInfo}>
                    <View style={styles.profileContainer}>
                      {renderProfilePicture(review.reviewer_profile_picture)}
                    </View>
                    <View style={styles.reviewUserDetails}>
                      <View style={styles.nameAndStarsRow}>
                        <Text style={styles.reviewerName}>{forProfessional ? review.client_name : review.professional_name || 'Anonymous'}</Text>
                        {renderStars(review.rating)}
                      </View>
                      <View style={styles.serviceRow}>
                        <MaterialCommunityIcons name="briefcase-outline" size={14} color={theme.colors.textSecondary} style={styles.calendarIcon} />
                        <Text style={styles.serviceName}>{review.service_name || 'No Service Found'}</Text>
                        <Text style={styles.serviceName}>•</Text>
                        <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.textSecondary} style={styles.calendarIcon} />
                        <Text style={styles.serviceInfoText}>
                          {formatReviewDate(review.last_occurrence_end_date || review.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.reviewText}>{review.review_text || 'No comments provided.'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
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
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 4,
    marginRight: 8,
  },
  reviewCountText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: 8,
  },
  reviewsList: {
    flex: 1,
  },
  reviewsContent: {
    padding: 16,
  },
  reviewCard: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewUserDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameAndStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginRight: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  serviceName: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  calendarIcon: {
    marginRight: 4,
  },
  serviceInfoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
});

export default ReviewsModal; 