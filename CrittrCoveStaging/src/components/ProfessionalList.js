import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { getMediaUrl } from '../config/config';
import { BACKEND_TO_FRONTEND_TIME_UNIT } from '../data/mockData';
import { debugLog } from '../context/AuthContext';

const ProfessionalCard = ({ professional, index, onPress }) => {
  // Debug log for unit_of_time mapping
  if (professional.primary_service?.unit_of_time) {
    debugLog("MBA4001: Unit of time mapping", {
      backend_value: professional.primary_service.unit_of_time,
      frontend_value: BACKEND_TO_FRONTEND_TIME_UNIT[professional.primary_service.unit_of_time],
      professional_name: professional.name
    });
  }
  
  // Debug log for review data
  if (professional.reviews) {
    debugLog("MBA4001: Professional reviews data", {
      professional_name: professional.name,
      has_reviews: professional.reviews.average_rating > 0,
      average_rating: professional.reviews.average_rating,
      review_count: professional.reviews.review_count,
      has_review_text: !!professional.reviews.latest_highest_review_text,
      has_author_profile_pic: !!professional.reviews.latest_review_author_profile_pic,
      has_reviewer_profile_pic: !!professional.reviews.reviewer_profile_picture,
      author_pic_url: professional.reviews.latest_review_author_profile_pic || 'none',
      reviewer_pic_url: professional.reviews.reviewer_profile_picture || 'none'
    });
  }
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Render either profile picture or fallback icon
  const renderProfileImage = () => {
    if (professional.profile_picture_url) {
      return (
        <Image 
          source={{ uri: getMediaUrl(professional.profile_picture_url) }}
          style={styles.profileImage}
        />
      );
    }
    
    // Return fallback icon inside a circular view with the same dimensions
    return (
      <View style={[styles.profileImage, styles.fallbackIconContainer]}>
        <MaterialCommunityIcons 
          name="account" 
          size={50} 
          color={theme.colors.textSecondary} 
        />
      </View>
    );
  };

  // Check if we should display reviews
  const hasReviews = professional.reviews && professional.reviews.average_rating > 0;
  const hasBadges = professional.badges?.is_background_checked || professional.badges?.is_insured || professional.badges?.is_elite_pro;

  return (
    <TouchableOpacity style={styles.listItem} onPress={handlePress}>
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          {renderProfileImage()}
        </View>
        
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <View style={styles.nameSection}>
              {/* TODO: styling naming is messed up here, we should fix it. */}
              <Text style={styles.name}>{index + 1}. {professional.primary_service?.service_name || 'Various Services'}</Text>
              <Text style={styles.location}>{professional.name}</Text>
              <Text style={styles.distance}>{professional.location}</Text>
            </View>
            
            <View style={styles.priceSection}>
              <Text style={styles.fromText}>from</Text>
              <Text style={styles.amount}>
                <Text style={styles.dollarSign}>$</Text>
                {professional.primary_service ? professional.primary_service.price_per_visit : 'N/A'}
              </Text>
              <Text style={styles.perNight}>
                {professional.primary_service ? 
                  (BACKEND_TO_FRONTEND_TIME_UNIT[professional.primary_service.unit_of_time] || professional.primary_service.unit_of_time) : 
                  'per visit'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {(hasReviews || hasBadges) && (
        <View style={[styles.reviewSection]}>
          {hasReviews && (
            <View style={[styles.ratingContainer, {marginBottom: hasBadges ? theme.spacing.small : 0}]}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{professional.reviews.average_rating.toFixed(2)}</Text>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.reviews}>{professional.reviews.review_count} reviews</Text>
            </View>
          )}
          
          {hasBadges && (
            <View style={styles.badgesContainer}>
              {professional.badges?.is_background_checked && (
                <View style={[styles.badge, styles.backgroundCheckedBadge]}>
                  <MaterialCommunityIcons name="shield-check" size={14} color="#9C27B0" />
                  <Text style={[styles.badgeText, styles.backgroundCheckedBadgeText]}>Background Checked</Text>
                </View>
              )}
              {professional.badges?.is_insured && (
                <View style={[styles.badge, styles.insuredBadge]}>
                  <MaterialCommunityIcons name="security" size={14} color="#0784C6" />
                  <Text style={[styles.badgeText, styles.insuredBadgeText]}>Insured</Text>
                </View>
              )}
              {professional.badges?.is_elite_pro && (
                <View style={[styles.badge, styles.eliteProBadge]}>
                  <MaterialCommunityIcons name="medal" size={14} color="#4CAF50" />
                  <Text style={[styles.badgeText, styles.eliteProBadgeText]}>Elite Pro</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const ProfessionalList = ({ professionals, onLoadMore, onProfessionalSelect, isMobile, filters, onFilterPress, searchParams = null, fallbackMessage = null }) => {
  
  // Function to generate appropriate empty state message
  const getEmptyStateMessage = () => {
    if (!searchParams) {
      return {
        title: "No professionals found",
        message: "Please try adjusting your search criteria."
      };
    }

    const { animal_types = [], location = '', service_query = '', overnight_service = false } = searchParams;
    
    // Check if location is Colorado Springs area
    const isColoradoSprings = location.toLowerCase().includes('colorado springs') || 
                             location.toLowerCase().includes('colorado') ||
                             location === '';

    // If no professionals in Colorado Springs area at all
    if (isColoradoSprings && animal_types.length === 0 && !service_query && !overnight_service) {
      return {
        title: "No professionals in the Colorado Springs area yet!",
        message: "Please come back later when we onboard more professionals to your area."
      };
    }

    // Build specific message based on search criteria
    let criteria = [];
    
    if (animal_types.length > 0) {
      const animalText = animal_types.length === 1 ? 
        `${animal_types[0]} care` : 
        `care for ${animal_types.join(', ')}`;
      criteria.push(animalText);
    }
    
    if (service_query) {
      criteria.push(`"${service_query}" services`);
    }
    
    if (overnight_service) {
      criteria.push('overnight services');
    }
    
    if (location && !isColoradoSprings) {
      criteria.push(`in ${location}`);
    }

    if (criteria.length > 0) {
      const criteriaText = criteria.join(', ');
      return {
        title: `No professionals found with ${criteriaText}`,
        message: "Please try adjusting your search parameters or expanding your search area."
      };
    }

    return {
      title: "No professionals found",
      message: "Please try adjusting your search criteria."
    };
  };

  const renderEmptyState = () => {
    const emptyState = getEmptyStateMessage();
    
    debugLog("MBA4001: Showing empty state", {
      searchParams,
      emptyStateTitle: emptyState.title,
      emptyStateMessage: emptyState.message
    });
    
    return (
      <View style={styles.emptyStateContainer}>
        <MaterialCommunityIcons 
          name="account-search" 
          size={80} 
          color={theme.colors.textSecondary} 
        />
        <Text style={styles.emptyStateTitle}>{emptyState.title}</Text>
        <Text style={styles.emptyStateMessage}>{emptyState.message}</Text>
        <TouchableOpacity 
          style={styles.adjustSearchButton}
          onPress={() => onFilterPress && onFilterPress()}
        >
          <Text style={styles.adjustSearchButtonText}>Adjust Search</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, {borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: theme.spacing.medium}]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, {paddingTop: theme.spacing.medium}]}>Pet Care Professionals</Text>
        <View style={styles.filterChips}>
          {filters?.categories?.map((filter, index) => (
            <View key={index} style={styles.filterChip}>
              <Text style={styles.filterChipText}>{filter}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.headerButtons, {paddingTop: 8}]}>
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <MaterialCommunityIcons name="filter" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        {isMobile && (
          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => {
              // Navigate to the map view
              if (onFilterPress) {
                // Pass a special parameter to indicate we want to switch to map view
                onFilterPress('map');
              }
            }}
          >
            <MaterialCommunityIcons name="map" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // If no professionals, show empty state
  if (!professionals || professionals.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {/* Fallback Message Section */}
      {fallbackMessage && (
        <View style={styles.fallbackMessageContainer}>
          <MaterialCommunityIcons 
            name="information" 
            size={24} 
            color={theme.colors.warning} 
          />
          <View style={styles.fallbackTextContainer}>
            <Text style={styles.fallbackMessageText}>{fallbackMessage}</Text>
            <Text style={styles.fallbackSubtext}>Showing available professionals in Colorado Springs instead:</Text>
          </View>
        </View>
      )}
      <FlatList
        data={professionals}
        renderItem={({ item, index }) => (
          <ProfessionalCard 
            professional={item}
            index={index}
            onPress={() => onProfessionalSelect(item)}
          />
        )}
        keyExtractor={(item) => item.professional_id.toString()}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
  },
  listContent: {
    flexGrow: 1,
    // padding: theme.spacing.medium,
  },
  listItem: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.medium,
    paddingTop: theme.spacing.medium,
    paddingBottom: theme.spacing.medium,
  },
  leftSection: {
    marginRight: theme.spacing.medium,
    justifyContent: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameSection: {
    flex: 1,
    marginRight: theme.spacing.medium,
  },
  name: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  location: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  distance: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  fromText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  amount: {
    fontSize: theme.fontSizes.large + 4,
    fontWeight: '600',
    color: theme.colors.primary,
    marginVertical: 2,
  },
  dollarSign: {
    color: theme.colors.primary,
  },
  perNight: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    maxWidth: 50,
  },
  reviewSection: {
    paddingHorizontal: theme.spacing.medium,
    paddingBottom: theme.spacing.medium,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    marginTop: 0,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  ratingText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontWeight: '500',
    marginLeft: 4,
  },
  dot: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  reviews: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  repeatOwners: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  bestReviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: theme.spacing.small,
  },
  bestReviewTextContainer: {
    flex: 1,
  },
  bestReview: {
    flex: 1,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  readMore: {
    color: theme.colors.primary,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: theme.spacing.small,
    // paddingTop: theme.spacing.medium,
    backgroundColor: theme.colors.surfaceContrast,
    
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: theme.spacing.medium,
  },
  headerTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
  },
  filterChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
  },
  filterButton: {
    padding: theme.spacing.small,
    borderRadius: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.small,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large,
  },
  emptyStateTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.small,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.large,
    lineHeight: 22,
  },
  adjustSearchButton: {
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.medium,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  adjustSearchButtonText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    color: theme.colors.whiteText,
  },
  fallbackIconContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackReviewerIconContainer: {
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
    marginTop: theme.spacing.small,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  backgroundCheckedBadge: {
    borderColor: '#9C27B0',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  backgroundCheckedBadgeText: {
    color: '#9C27B0',
  },
  insuredBadge: {
    borderColor: '#0784C6',
    backgroundColor: 'rgba(7, 132, 198, 0.1)',
  },
  insuredBadgeText: {
    color: '#0784C6',
  },
  eliteProBadge: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  eliteProBadgeText: {
    color: '#4CAF50',
  },
  fallbackMessageContainer: {
    backgroundColor: theme.colors.warning + '20', // 20% opacity
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    padding: theme.spacing.medium,
    marginHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.small,
  },
  fallbackTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  fallbackMessageText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    color: theme.colors.warning,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  fallbackSubtext: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: theme.spacing.small,
  },
});

export default ProfessionalList;