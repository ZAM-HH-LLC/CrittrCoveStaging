import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { getProfessionalServicesDetailed, createConversation, getUserReviews } from '../api/API';
import { AuthContext, debugLog } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getMediaUrl } from '../config/config';
import { formatFromUTC } from '../utils/time_utils';
import ReviewsModal from './ReviewsModal';

const ProfessionalServicesModal = ({ visible, onClose, professional, primaryService }) => {
  const navigation = useNavigation();
  const { isSignedIn } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);
  const [mobileView, setMobileView] = useState('services'); // 'services' or 'details'
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'reviews'
  
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth <= 768;
  const isSmallMobile = screenWidth <= 600;

  useEffect(() => {
    if (visible && professional?.professional_id) {
      fetchServices();
      fetchReviews();
    }
  }, [visible, professional?.professional_id]);

  useEffect(() => {
    // Set the primary service as selected when services load
    if (services.length > 0 && primaryService) {
      const primaryServiceData = services.find(s => s.service_id === primaryService.service_id);
      if (primaryServiceData) {
        setSelectedService(primaryServiceData);
      } else {
        // Fallback to first service if primary not found
        setSelectedService(services[0]);
      }
    } else if (services.length > 0) {
      setSelectedService(services[0]);
    }
  }, [services, primaryService]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      debugLog('MBA9999', 'Fetching services for professional:', professional.professional_id);
      const servicesData = await getProfessionalServicesDetailed(professional.professional_id);
      setServices(servicesData);
    } catch (err) {
      debugLog('MBA9999', 'Error fetching professional services:', err);
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!professional?.professional_id) return;
    
    setLoadingReviews(true);
    try {
      const professionalId = professional.professional_id.toString();
      debugLog('MBA4001', 'Fetching reviews for professional:', professionalId);
      const reviewsData = await getUserReviews(null, professionalId, false);
      debugLog('MBA4001', 'Reviews fetched successfully:', reviewsData);
      
      // Check if the response has the expected structure
      if (reviewsData && typeof reviewsData === 'object') {
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.average_rating || 0);
        setReviewCount(reviewsData.review_count || 0);
        
        // Log information about reviewer profile pictures
        if (reviewsData.reviews && reviewsData.reviews.length > 0) {
          debugLog('MBA4001', 'First review has profile picture:', {
            has_profile_pic: !!reviewsData.reviews[0].reviewer_profile_picture,
            profile_pic_url: reviewsData.reviews[0].reviewer_profile_picture || 'none'
          });
        }
        
        if (reviewsData.detail) {
          debugLog('MBA4001', 'Review fetch message:', reviewsData.detail);
        }
      } else {
        debugLog('MBA4001', 'Unexpected reviews data format:', reviewsData);
        setReviews([]);
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch (err) {
      debugLog('MBA4001', 'Error fetching professional reviews:', err);
      // Don't set an error state here, as we don't want to block the UI
      setReviews([]);
      setAverageRating(0);
      setReviewCount(0);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleClose = () => {
    setSelectedService(null);
    setServices([]);
    setError(null);
    setShowTooltip(null);
    setMobileView('services');
    setShowErrorModal(false);
    setErrorMessage('');
    setReviews([]);
    setAverageRating(0);
    setReviewCount(0);
    setActiveTab('services');
    onClose();
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    if (isMobile) {
      setMobileView('details');
    }
  };

  const handleBackToServices = () => {
    setMobileView('services');
  };

  const formatAnimalTypes = (animalTypes) => {
    if (!animalTypes || typeof animalTypes !== 'object') return 'Various animals';
    const types = Object.keys(animalTypes);
    if (types.length === 0) return 'Various animals';
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]} & ${types[1]}`;
    return `${types[0]}, ${types[1]} & ${types.length - 2} more`;
  };

  // Format date for review display
  const formatReviewDate = (dateString) => {
    try {
      return formatFromUTC(dateString);
    } catch (error) {
      debugLog('MBA6789', 'Error formatting review date:', error);
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
          style={styles.reviewProfileImage} 
          resizeMode="cover"
        />
      );
    } else {
      return (
        <View style={styles.defaultReviewProfileImage}>
          <MaterialCommunityIcons 
            name="account" 
            size={32} 
            color={theme.colors.surface} 
          />
        </View>
      );
    }
  };

  const renderAdditionalRates = (rates) => {
    if (!rates || rates.length === 0) return null;
    
    return (
      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Additional Rates</Text>
        {rates.map((rate) => (
          <View key={rate.rate_id} style={styles.additionalRateItem}>
            <View style={styles.additionalRateRow}>
              <View style={styles.additionalRateTitleContainer}>
                {rate.description && (
                  <TouchableOpacity 
                    style={styles.infoIcon}
                    onPress={() => setShowTooltip(showTooltip === rate.rate_id ? null : rate.rate_id)}
                  >
                    <MaterialCommunityIcons 
                      name="information-outline" 
                      size={16} 
                      color={theme.colors.primary} 
                    />
                  </TouchableOpacity>
                )}
                <Text style={styles.additionalRateTitle}>{rate.title}</Text>
              </View>
              <Text style={styles.additionalRatePrice}>${rate.rate}</Text>
            </View>

          </View>
        ))}
      </View>
    );
  };

  const renderServiceDetails = (service) => (
    <>
      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Description</Text>
        <Text style={styles.detailText}>{service.description}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Animal Types</Text>
        <Text style={styles.detailText}>{formatAnimalTypes(service.animal_types)}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Base Rate</Text>
        <Text style={styles.detailText}>${service.base_rate} per {service.unit_of_time}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Additional Animal Rate</Text>
        <Text style={styles.detailText}>
          ${service.additional_animal_rate} (applies after {service.applies_after} animal{service.applies_after > 1 ? 's' : ''})
        </Text>
      </View>

      {service.holiday_rate && 
       service.holiday_rate !== '$0' && 
       service.holiday_rate !== '$0.00' && 
       service.holiday_rate !== '0%' && 
       service.holiday_rate !== '0.00%' && 
       service.holiday_rate !== '0' && (
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Holiday Rate</Text>
          <Text style={styles.detailText}>{service.holiday_rate}</Text>
        </View>
      )}

      {service.is_overnight && (
        <View style={styles.detailSection}>
          <Text style={styles.overnightBadge}>Overnight Service</Text>
        </View>
      )}

      {renderAdditionalRates(service.additional_rates)}
    </>
  );

  const renderReviews = () => {
    if (loadingReviews) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      );
    }

    if (reviews.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="star-outline" size={60} color={theme.colors.placeholder} />
          <Text style={styles.emptyStateText}>No reviews yet</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.reviewsList} contentContainerStyle={styles.reviewsContent}>
        {[...reviews].sort((a, b) => b.rating - a.rating).map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewUserInfo}>
              <View style={styles.profileContainer}>
                {renderProfilePicture(review.reviewer_profile_picture)}
              </View>
              <View style={styles.reviewUserDetails}>
                <View style={styles.nameAndStarsRow}>
                  <Text style={styles.reviewerName}>{review.client_name || 'Anonymous'}</Text>
                  {renderStars(review.rating)}
                </View>
                <View style={styles.serviceRow}>
                  <MaterialCommunityIcons name="briefcase-outline" size={14} color={theme.colors.textSecondary} style={styles.calendarIcon} />
                  <Text style={styles.serviceName}>{review.service_name || 'No Service Found'}</Text>
                  <Text style={styles.serviceName}>•</Text>
                  <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.textSecondary} style={styles.calendarIcon} />
                  <Text style={styles.serviceInfoText}>
                    {review.last_occurrence_end_date || review.created_at}
                  </Text>
                </View>
                <Text style={styles.reviewText}>{review.review_text || 'No comments provided.'}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const handleCreateConversation = async () => {
    if (!professional?.professional_id) {
      Alert.alert('Error', 'Professional information not available');
      return;
    }

    // Check if user is signed in before making API call
    if (!isSignedIn) {
      debugLog('MBA24u45vn', 'User not signed in, redirecting to login');
      
      // Close the modal first
      onClose();
      
      // Navigate to sign in screen
      navigation.navigate('SignIn');
      return;
    }

    setIsCreatingConversation(true);
    try {
      // Log navigation state before creating conversation
      debugLog('MBA24u45vn', 'Navigation state before creating conversation', {
        current_route: navigation.getState()?.routes?.[navigation.getState()?.index]?.name,
        current_params: JSON.stringify(navigation.getState()?.routes?.[navigation.getState()?.index]?.params || {}),
        route_count: navigation.getState()?.routes?.length,
        current_index: navigation.getState()?.index,
        timestamp: Date.now()
      });
      
      debugLog('MBA24u45vn', 'Creating conversation with professional - START', {
        professional_id: professional.professional_id,
        professional_name: professional.name,
        from_screen: navigation.getState()?.routes?.[navigation.getState()?.index]?.name || 'unknown',
        previous_screen: navigation.getState()?.routes?.[navigation.getState()?.index - 1]?.name || 'unknown',
        timestamp: Date.now()
      });
      
      const response = await createConversation(professional.professional_id);
      
      debugLog('MBA24u45vn', 'Conversation created successfully', {
        conversation_id: response.conversation_id,
        other_user_name: response.other_user_name,
        status: response.status,
        is_professional: response.is_professional,
        full_response: JSON.stringify(response),
        timestamp: Date.now()
      });
      
      // Get current navigation state for logging
      const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index]?.name;
      const currentParams = navigation.getState()?.routes?.[navigation.getState()?.index]?.params;
      
      debugLog('MBA24u45vn', 'About to navigate to MessageHistory', {
        from_route: currentRoute,
        current_params: JSON.stringify(currentParams),
        conversation_id: response.conversation_id,
        navigation_timestamp: Date.now(),
        navigation_state: JSON.stringify(navigation.getState())
      });
      
      // Close the modal first
      onClose();
      
      // Add a small delay to ensure backend has processed the conversation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create navigation params with exact conversation data to help MessageHistory
      const navigationParams = { 
        conversationId: response.conversation_id,
        otherUserName: professional.name,
        otherUserProfilePic: professional.profile_picture || null,
        isProfessional: false,
        fullConversationData: JSON.stringify(response),
        _timestamp: Date.now()
      };
      
      debugLog('MBA24u45vn', 'Navigation params prepared', {
        params: JSON.stringify(navigationParams),
        timestamp: Date.now()
      });
      
      // Navigate to MessageHistory with the conversation ID
      navigation.navigate('MessageHistory', navigationParams);
      
      debugLog('MBA24u45vn', 'Navigation to MessageHistory completed', {
        conversation_id: response.conversation_id,
        timestamp: Date.now()
      });
      
      // Log navigation state after navigation
      setTimeout(() => {
        debugLog('MBA24u45vn', 'Navigation state after navigation (with timeout)', {
          current_route: navigation.getState()?.routes?.[navigation.getState()?.index]?.name,
          current_params: JSON.stringify(navigation.getState()?.routes?.[navigation.getState()?.index]?.params || {}),
          route_count: navigation.getState()?.routes?.length,
          current_index: navigation.getState()?.index,
          timestamp: Date.now()
        });
      }, 100);
    } catch (err) {
      debugLog('MBA3456', 'Error creating conversation:', err);
      
      // Check if this is the "cannot contact yourself" error
      if (err.response?.status === 400 && 
          err.response?.data?.error === 'Cannot create conversation with yourself') {
        setErrorMessage('You cannot contact yourself.');
        setShowErrorModal(true);
      } else {
        setErrorMessage('Failed to create conversation. Please try again.');
        setShowErrorModal(true);
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleOpenReviewsModal = () => {
    setShowReviewsModal(true);
  };

  const handleCloseReviewsModal = () => {
    setShowReviewsModal(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        onRequestClose={handleClose}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isSmallMobile && styles.modalContainerSmallMobile]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  {professional?.profile_picture_url ? (
                    <Image 
                      source={{ uri: getMediaUrl(professional.profile_picture_url) }} 
                      style={styles.professionalProfilePhoto} 
                    />
                  ) : (
                    <View style={styles.professionalProfilePhotoPlaceholder}>
                      <MaterialCommunityIcons name="account" size={24} color={theme.colors.placeholder} />
                    </View>
                  )}
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.professionalName}>{professional?.name}</Text>
                    <View style={styles.headerLocationContainer}>
                      {reviewCount > 0 ? (
                        <TouchableOpacity 
                          style={styles.reviewBadge}
                          onPress={handleOpenReviewsModal}
                        >
                          <MaterialCommunityIcons name="star" size={16} color={theme.colors.warning} />
                          <Text style={styles.reviewBadgeText}>{averageRating.toFixed(2)} • {reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.noReviewsText}>No reviews yet</Text>
                      )}
                      {/* <Text style={styles.professionalLocation}>•</Text> */}
                      <Text style={styles.professionalLocation}>• {professional?.location}</Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              {/* Professional Badges */}
              <View style={styles.headerBadgesContainer}>
                                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.headerBadgesScrollContent}
                  >
                    {professional?.badges?.is_background_checked && (
                      <View style={[styles.headerBadge, styles.headerBackgroundCheckedBadge]}>
                        <MaterialCommunityIcons name="shield-check" size={12} color="#9C27B0" />
                        <Text style={[styles.headerBadgeText, styles.headerBackgroundCheckedBadgeText]}>Background Checked</Text>
                      </View>
                    )}
                    {professional?.badges?.is_insured && (
                      <View style={[styles.headerBadge, styles.headerInsuredBadge]}>
                        <MaterialCommunityIcons name="security" size={12} color="#0784C6" />
                        <Text style={[styles.headerBadgeText, styles.headerInsuredBadgeText]}>Insured</Text>
                      </View>
                    )}
                    {professional?.badges?.is_elite_pro && (
                      <View style={[styles.headerBadge, styles.headerEliteProBadge]}>
                        <MaterialCommunityIcons name="medal" size={12} color="#4CAF50" />
                        <Text style={[styles.headerBadgeText, styles.headerEliteProBadgeText]}>Elite Pro</Text>
                      </View>
                    )}
                  </ScrollView>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchServices}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.content, isMobile && styles.contentMobile]}>
                {/* Mobile: Tabs and Content */}
                {isMobile && mobileView === 'services' && (
                  <View style={styles.mobileMainView}>
                    {/* Tab Headers */}
                    <View style={styles.tabContainer}>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'services' && styles.activeTab]}
                        onPress={() => setActiveTab('services')}
                      >
                        <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
                          Services
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                        onPress={() => setActiveTab('reviews')}
                      >
                        <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
                          Reviews {reviewCount > 0 && `(${reviewCount})`}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    {activeTab === 'services' ? (
                      <ScrollView style={styles.servicesScrollView}>
                        {services.map((service) => (
                          <TouchableOpacity
                            key={service.service_id}
                            style={styles.mobileServiceItem}
                            onPress={() => handleServiceSelect(service)}
                          >
                            <View style={styles.mobileServiceContent}>
                              <Text style={styles.mobileServiceName}>
                                {service.service_name}
                              </Text>
                              <Text style={styles.mobileServicePrice}>
                                ${service.base_rate}/{service.unit_of_time}
                              </Text>
                            </View>
                            <MaterialCommunityIcons 
                              name="chevron-right" 
                              size={24} 
                              color={theme.colors.textSecondary} 
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={styles.reviewsTabContent}>
                        {renderReviews()}
                      </View>
                    )}
                  </View>
                )}

                {/* Mobile: Service Details View */}
                {isMobile && mobileView === 'details' && selectedService && (
                  <View style={styles.mobileDetailsView}>
                    <View style={styles.mobileDetailsHeader}>
                      <TouchableOpacity 
                        style={styles.backButton}
                        onPress={handleBackToServices}
                      >
                        <MaterialCommunityIcons 
                          name="arrow-left" 
                          size={24} 
                          color={theme.colors.primary} 
                        />
                      </TouchableOpacity>
                      <Text style={styles.mobileDetailsTitle}>{selectedService.service_name}</Text>
                    </View>
                    <ScrollView style={styles.mobileDetailsScrollView}>
                      {renderServiceDetails(selectedService)}
                    </ScrollView>
                  </View>
                )}

                {/* Desktop: Two-panel layout */}
                {!isMobile && (
                  <>
                    {/* Left Side with Tabs */}
                    <View style={styles.servicesList}>
                      {/* Tab Headers */}
                      <View style={styles.tabContainer}>
                        <TouchableOpacity
                          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
                          onPress={() => setActiveTab('services')}
                        >
                          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
                            Services
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                          onPress={() => setActiveTab('reviews')}
                        >
                          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
                            Reviews {reviewCount > 0 && `(${reviewCount})`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Tab Content */}
                      {activeTab === 'services' ? (
                        <ScrollView style={styles.servicesScrollView}>
                          {services.map((service) => (
                            <TouchableOpacity
                              key={service.service_id}
                              style={[
                                styles.serviceItem,
                                selectedService?.service_id === service.service_id && styles.serviceItemSelected
                              ]}
                              onPress={() => handleServiceSelect(service)}
                            >
                              <Text style={[
                                styles.serviceName,
                                selectedService?.service_id === service.service_id && styles.serviceNameSelected
                              ]}>
                                {service.service_name}
                              </Text>
                              <Text style={[
                                styles.servicePrice,
                                selectedService?.service_id === service.service_id && styles.servicePriceSelected
                              ]}>
                                ${service.base_rate}/{service.unit_of_time}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.reviewsTabContent}>
                          {renderReviews()}
                        </View>
                      )}
                    </View>

                    {/* Service Details (Right Side) - Only show when Services tab is active */}
                    {activeTab === 'services' && (
                      <View style={styles.serviceDetails}>
                        {selectedService ? (
                          <ScrollView style={styles.detailsScrollView}>
                            <Text style={styles.detailsTitle}>{selectedService.service_name}</Text>
                            {renderServiceDetails(selectedService)}
                          </ScrollView>
                        ) : (
                          <View style={styles.noSelectionContainer}>
                            <Text style={styles.noSelectionText}>Select a service to view details</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Contact Button */}
            {!loading && !error && (
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={[styles.contactButton, isCreatingConversation && styles.contactButtonDisabled]} 
                  onPress={handleCreateConversation}
                  disabled={isCreatingConversation}
                >
                  {isCreatingConversation ? (
                    <View style={styles.contactButtonContent}>
                      <ActivityIndicator size="small" color={theme.colors.whiteText} />
                      <Text style={[styles.contactButtonText, { marginLeft: 8 }]}>Creating conversation...</Text>
                    </View>
                  ) : (
                    <Text style={styles.contactButtonText}>Contact {professional?.name}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Separate Modal for Tooltip */}
        <Modal
          visible={showTooltip !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTooltip(null)}
        >
          <TouchableOpacity 
            style={styles.tooltipModalOverlay}
            activeOpacity={1}
            onPress={() => setShowTooltip(null)}
          >
            <View style={styles.tooltipModalContent}>
              <View style={styles.tooltipHeader}>
                <Text style={styles.tooltipTitle}>
                  {services.find(s => s.additional_rates?.find(r => r.rate_id === showTooltip))?.additional_rates?.find(r => r.rate_id === showTooltip)?.title || 'Rate Info'}
                </Text>
                <TouchableOpacity 
                  style={styles.tooltipCloseButton}
                  onPress={() => setShowTooltip(null)}
                >
                  <MaterialCommunityIcons 
                    name="close" 
                    size={18} 
                    color={theme.colors.text} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.tooltipText}>
                {services.find(s => s.additional_rates?.find(r => r.rate_id === showTooltip))?.additional_rates?.find(r => r.rate_id === showTooltip)?.description || ''}
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={showErrorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowErrorModal(false)}
        >
          <TouchableOpacity 
            style={styles.tooltipModalOverlay}
            activeOpacity={1}
            onPress={() => setShowErrorModal(false)}
          >
            <TouchableOpacity 
              style={styles.errorModalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.errorModalHeader}>
                <Text style={styles.errorModalTitle}>Error</Text>
                <TouchableOpacity 
                  style={styles.errorModalCloseButton}
                  onPress={() => setShowErrorModal(false)}
                >
                  <MaterialCommunityIcons 
                    name="close" 
                    size={20} 
                    color={theme.colors.text} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.errorModalText}>
                {errorMessage}
              </Text>
              <TouchableOpacity 
                style={styles.errorModalOkButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.errorModalOkText}>OK</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </Modal>

      {/* Reviews Modal */}
      <ReviewsModal
        visible={showReviewsModal}
        onClose={handleCloseReviewsModal}
        reviews={reviews}
        averageRating={averageRating}
        reviewCount={reviewCount}
        userName={professional?.name}
        forProfessional={true}
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
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '90%',
    maxWidth: 800,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalContainerSmallMobile: {
    width: 'calc(100% - 10px)',
    height: 'calc(100% - 10px)',
    maxWidth: 'none',
    maxHeight: 'none',
    borderRadius: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  professionalName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  professionalLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginRight: 8,
  },
  headerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reviewBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    // backgroundColor: theme.colors.background,
    paddingTop: 4,
    paddingRight: 4,
    borderRadius: 12,
  },
  reviewBadgeText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.whiteText,
    fontWeight: '500',
  },
  content: {
    flexDirection: 'row',
    flex: 1,
  },
  contentMobile: {
    flexDirection: 'column',
  },
  // Mobile styles
  mobileMainView: {
    flex: 1,
    padding: 20,
  },
  mobileServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mobileServiceContent: {
    flex: 1,
  },
  mobileServiceName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mobileServicePrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  mobileDetailsView: {
    flex: 1,
  },
  mobileDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  mobileDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  mobileDetailsScrollView: {
    flex: 1,
    padding: 20,
  },
  // Desktop styles
  servicesList: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  servicesScrollView: {
    flex: 1,
  },
  serviceItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceItemSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: theme.colors.whiteText,
  },
  servicePrice: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  servicePriceSelected: {
    color: theme.colors.whiteText,
  },
  serviceDetails: {
    flex: 1,
    padding: 20,
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
    fontFamily: theme.fonts.header.fontFamily,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  overnightBadge: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.whiteText,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  additionalRateItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
  },
  additionalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  additionalRateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  additionalRateTitle: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    marginLeft: 4,
  },
  infoIcon: {
    padding: 2,
    marginTop: -2,
  },
  additionalRatePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: 16,
  },
  tooltipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipModalContent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  tooltipCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  tooltipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonDisabled: {
    backgroundColor: theme.colors.placeholder,
    opacity: 0.7,
  },
  contactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
  },
  errorModalContent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  errorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  errorModalCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorModalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  errorModalOkButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  errorModalOkText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
  },
  professionalProfilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  professionalProfilePhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 15,
  },
  noReviewsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Reviews styles
  reviewsTabContent: {
    flex: 1,
  },
  reviewsList: {
    flex: 1,
  },
  reviewsContent: {
    paddingBottom: 16,
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
  reviewProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultReviewProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  // Header badges styles
  headerBadgesContainer: {
    marginTop: 16,
  },
  headerBadgesScrollContent: {
    flexDirection: 'row',
    gap: 6,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 10,
    marginLeft: 3,
    fontWeight: '500',
  },
  headerBackgroundCheckedBadge: {
    borderColor: '#9C27B0',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  headerBackgroundCheckedBadgeText: {
    color: '#9C27B0',
  },
  headerInsuredBadge: {
    borderColor: '#0784C6',
    backgroundColor: 'rgba(7, 132, 198, 0.1)',
  },
  headerInsuredBadgeText: {
    color: '#0784C6',
  },
  headerEliteProBadge: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  headerEliteProBadgeText: {
    color: '#4CAF50',
  },
});

export default ProfessionalServicesModal; 