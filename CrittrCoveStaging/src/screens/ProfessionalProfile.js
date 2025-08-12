import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, getStorage, setStorage, debugLog } from '../context/AuthContext';
import { getProfessionalServicesDetailed, createConversation, getUserReviews, searchProfessionals } from '../api/API';
import { getMediaUrl } from '../config/config';
import { generateProfessionalUrl, shareProfessionalProfile } from '../utils/urlUtils';
import ReviewsModal from '../components/ReviewsModal';
import { BACKEND_TO_FRONTEND_TIME_UNIT } from '../data/mockData';

const ProfessionalProfile = ({ route, navigation }) => {
  const { isSignedIn } = useContext(AuthContext);
  const [professional, setProfessional] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('services');
  const [selectedServiceForRates, setSelectedServiceForRates] = useState(null);
  const [showServiceRatesModal, setShowServiceRatesModal] = useState(false);
  const [loadingProfessional, setLoadingProfessional] = useState(false);
  const [showAnimalTypesModal, setShowAnimalTypesModal] = useState(false);
  const [selectedAnimalTypes, setSelectedAnimalTypes] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    const loadProfessionalData = async () => {
      // Prefer professional from params if it is an object (on web reload, params may contain a string "[object Object]")
      if (route?.params?.professional && typeof route.params.professional === 'object') {
        const profObj = route.params.professional;
        setProfessional(profObj);
        try {
          await setStorage('last_professional_profile_id', String(profObj.professional_id));
          const snapshot = {
            professional_id: profObj.professional_id,
            name: profObj.name,
            location: profObj.location,
            profile_picture_url: profObj.profile_picture_url || profObj.profile_picture || null,
            badges: profObj.badges || null,
            average_rating: profObj.average_rating || 0,
            review_count: profObj.review_count || 0
          };
          await setStorage('last_professional_profile_snapshot', JSON.stringify(snapshot));
          debugLog('MBAa3M$91vkP: Stored professional snapshot from params', snapshot);
        } catch (e) {
          debugLog('MBAa3M$91vkP: Error storing professional snapshot from params', { message: e?.message });
        }
        return;
      }

      // If not in params, try to get from URL parameter or storage
      let professionalId = route?.params?.professionalId;
      const professionalSlug = route?.params?.professionalSlug;
      
      debugLog('MBAa3M$91vkP: Route params received', { 
        professionalId, 
        professionalSlug,
        hasDirectProfessional: !!route?.params?.professional 
      });
      
      if (!professionalId) {
        try {
          professionalId = await getStorage('last_professional_profile_id');
          debugLog('MBAa3M$91vkP: Loaded professionalId from storage', { professionalId });
        } catch (e) {
          debugLog('MBAa3M$91vkP: Error loading professionalId from storage', { message: e?.message });
        }
      }

      // If we have a snapshot in storage, use it for immediate UI hydration
      try {
        const snapStr = await getStorage('last_professional_profile_snapshot');
        if (!route?.params?.professional && snapStr) {
          const snapshot = JSON.parse(snapStr);
          if (snapshot && snapshot.professional_id) {
            setProfessional(snapshot);
            debugLog('MBAa3M$91vkP: Hydrated professional from stored snapshot');
          }
        }
      } catch (e) {
        debugLog('MBAa3M$91vkP: Error hydrating professional snapshot', { message: e?.message });
      }

      if (professionalId) {
        setLoadingProfessional(true);
        try {
          // Use a broad search and filter by ID (no new endpoint)
          const searchParams = {
            animal_types: [],
            location: 'Colorado Springs, Colorado',
            service_query: '',
            overnight_service: false,
            price_min: 0,
            price_max: 999999,
            radius_miles: 500,
            page: 1,
            page_size: 100
          };
          const results = await searchProfessionals(searchParams);
          const foundProfessional = results?.professionals?.find(p => p.professional_id?.toString() === professionalId?.toString());
          if (foundProfessional) {
            setProfessional(foundProfessional);
            // Persist for future reloads
            try {
              await setStorage('last_professional_profile_id', String(foundProfessional.professional_id));
              const snapshot = {
                professional_id: foundProfessional.professional_id,
                name: foundProfessional.name,
                location: foundProfessional.location,
                profile_picture_url: foundProfessional.profile_picture_url || foundProfessional.profile_picture || null,
                badges: foundProfessional.badges || null,
                average_rating: foundProfessional.average_rating || 0,
                review_count: foundProfessional.review_count || 0
              };
              await setStorage('last_professional_profile_snapshot', JSON.stringify(snapshot));
              debugLog('MBAa3M$91vkP: Updated professional snapshot from search', snapshot);
            } catch (e) {
              debugLog('MBAa3M$91vkP: Error storing professional snapshot from search', { message: e?.message });
            }
          } else {
            setErrorMessage('Professional not found');
            setShowErrorModal(true);
          }
        } catch (error) {
          debugLog('MBAa3M$91vkP: Error loading professional via search', { message: error?.message });
          setErrorMessage('Failed to load professional');
          setShowErrorModal(true);
        } finally {
          setLoadingProfessional(false);
        }
      } else {
        setErrorMessage('No professional information provided');
        setShowErrorModal(true);
      }
    };

    loadProfessionalData();
  }, [route?.params?.professional, route?.params?.professionalId, route?.params?.professionalSlug]);

  useEffect(() => {
    if (professional?.professional_id) {
      fetchServices();
      fetchReviews();
    }
  }, [professional?.professional_id]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const servicesData = await getProfessionalServicesDetailed(professional.professional_id);
      setServices(servicesData);
    } catch (err) {
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
      const reviewsData = await getUserReviews(null, professionalId, false);
      
      if (reviewsData && typeof reviewsData === 'object') {
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.average_rating || 0);
        setReviewCount(reviewsData.review_count || 0);
      } else {
        setReviews([]);
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch (err) {
      setReviews([]);
      setAverageRating(0);
      setReviewCount(0);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleBack = () => {
    debugLog('MBAa3M$91vkP: Back button pressed');
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      debugLog('MBAa3M$91vkP: No back stack, navigating to SearchProfessionalsListing');
      navigation.navigate('SearchProfessionalsListing');
    }
  };

  const formatAnimalTypes = (animalTypes, isClickable = false, onPress = null) => {
    if (!animalTypes || typeof animalTypes !== 'object') return 'Various animals';
    const types = Object.keys(animalTypes);
    if (types.length === 0) return 'Various animals';
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]} & ${types[1]}`;
    
    if (isClickable && onPress && types.length > 2) {
      return (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.clickableAnimalTypes}>
            {types[0]}, {types[1]} & <Text style={styles.moreAnimalsLink}>{types.length - 2} more</Text>
          </Text>
        </TouchableOpacity>
      );
    }
    
    return `${types[0]}, ${types[1]} & ${types.length - 2} more`;
  };

  const showAnimalTypes = (animalTypes) => {
    setSelectedAnimalTypes(animalTypes);
    setShowAnimalTypesModal(true);
  };

  const closeAnimalTypesModal = () => {
    setShowAnimalTypesModal(false);
    setSelectedAnimalTypes(null);
  };

  const handleShareProfile = async () => {
    if (!professional) return;
    
    setIsSharing(true);
    try {
      // Get current URL to determine base URL
      const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://crittrcover.com';
      const success = await shareProfessionalProfile(professional, currentUrl);
      
      if (!success) {
        setErrorMessage('Unable to share profile. Please try again.');
        setShowErrorModal(true);
      }
    } catch (error) {
      debugLog('MBAa3M$91vkP: Error sharing profile', { message: error?.message });
      setErrorMessage('Unable to share profile. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSharing(false);
    }
  };

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

  const handleCreateConversation = async () => {
    if (!professional?.professional_id) {
      setErrorMessage('Professional information not available');
      setShowErrorModal(true);
      return;
    }

    if (!isSignedIn) {
      navigation.navigate('SignIn');
      return;
    }

    setIsCreatingConversation(true);
    try {
      const response = await createConversation(professional.professional_id);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const navigationParams = { 
        conversationId: response.conversation_id,
        otherUserName: professional.name,
        otherUserProfilePic: professional.profile_picture || null,
        isProfessional: false,
        fullConversationData: JSON.stringify(response),
        _timestamp: Date.now()
      };
      
      navigation.navigate('MessageHistory', navigationParams);
      
    } catch (err) {
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

  const showServiceRates = (service) => {
    setSelectedServiceForRates(service);
    setShowServiceRatesModal(true);
  };

  const closeServiceRatesModal = () => {
    setShowServiceRatesModal(false);
    setSelectedServiceForRates(null);
  };

  const renderServiceCard = (service) => {
    const displayUnit = BACKEND_TO_FRONTEND_TIME_UNIT[service.unit_of_time] || service.unit_of_time;
    const animalTypes = service.animal_types;
    const hasMultipleTypes = animalTypes && Object.keys(animalTypes).length > 2;
    
    return (
      <TouchableOpacity 
        key={service.service_id} 
        style={styles.serviceCard}
        onPress={() => showServiceRates(service)}
      >
        <View style={styles.serviceCardHeader}>
          <Text style={styles.serviceName}>{service.service_name}</Text>
          <Text style={styles.servicePrice}>from ${service.base_rate}/{displayUnit}</Text>
        </View>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {service.description}
        </Text>
        
        <View style={styles.serviceFooter}>
          <View style={styles.animalTypesContainer}>
            {hasMultipleTypes ? 
              formatAnimalTypes(animalTypes, true, () => showAnimalTypes(animalTypes)) :
              <Text style={styles.animalTypes}>{formatAnimalTypes(animalTypes)}</Text>
            }
          </View>
          <View style={styles.serviceFooterRight}>
            {service.is_overnight && (
              <View style={styles.overnightBadge}>
                <Text style={styles.overnightText}>Overnight</Text>
              </View>
            )}
            <Text style={styles.viewRatesText}>View Rates</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReviewCard = (review) => (
    <View key={review.review_id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            {review.reviewer_profile_picture ? (
              <Image 
                source={{ uri: getMediaUrl(review.reviewer_profile_picture) }}
                style={styles.reviewerImage}
              />
            ) : (
              <MaterialCommunityIcons name="account" size={20} color={theme.colors.text} />
            )}
          </View>
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>{review.client_name || 'Anonymous'}</Text>
            {renderStars(review.rating)}
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {new Date(review.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewText} numberOfLines={3}>
        {review.review_text || 'No comments provided.'}
      </Text>
      <Text style={styles.reviewService}>{review.service_name || 'Service'}</Text>
    </View>
  );

  if (!professional || loadingProfessional) {
    return (
      <View style={styles.fullContainer}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading professional...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header Section with Back Button */}
        <View style={styles.profileHeader}>
          {/* Back Button positioned in top left */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          {/* Share Button positioned in top right */}
          <TouchableOpacity 
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]} 
            onPress={handleShareProfile}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <MaterialCommunityIcons name="export" size={24} color={theme.colors.text} />
            )}
          </TouchableOpacity>
          <View style={styles.profileImageContainer}>
            {professional?.profile_picture_url ? (
              <Image 
                source={{ uri: getMediaUrl(professional.profile_picture_url) }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialCommunityIcons name="account" size={60} color={theme.colors.text} />
              </View>
            )}
            {professional?.badges?.is_elite_pro && (
              <View style={styles.eliteBadge}>
                <MaterialCommunityIcons name="medal" size={20} color="#4CAF50" />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{professional?.name}</Text>
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.secondary} />
              <Text style={styles.location}>{professional?.location}</Text>
            </View>
            
            {reviewCount > 0 ? (
              <TouchableOpacity style={styles.ratingContainer} onPress={handleOpenReviewsModal}>
                <MaterialCommunityIcons name="star" size={16} color={theme.colors.warning} />
                <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
                <Text style={styles.reviewCountText}>({reviewCount} reviews)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            )}
          </View>

          {/* Badges Row */}
          {(professional?.badges?.is_background_checked || professional?.badges?.is_insured) && (
            <View style={styles.badgesContainer}>
              {professional?.badges?.is_background_checked && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="shield-check" size={16} color="#9C27B0" />
                  <Text style={styles.badgeText}>Background Checked</Text>
                </View>
              )}
              {professional?.badges?.is_insured && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="security" size={16} color="#0784C6" />
                  <Text style={styles.badgeText}>Insured</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Contact Button */}
        <View style={styles.contactSection}>
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
              <>
                <MaterialCommunityIcons name="message" size={20} color={theme.colors.whiteText} />
                <Text style={styles.contactButtonText}>Contact {professional?.name}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'services' && styles.activeTab]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
              Services ({services.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
              Reviews ({reviewCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'services' && (
            <View style={styles.servicesGrid}>
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
              ) : services.length > 0 ? (
                services.map(renderServiceCard)
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="briefcase-outline" size={60} color={theme.colors.secondary} />
                  <Text style={styles.emptyStateText}>No services available</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.reviewsGrid}>
              {loadingReviews ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading reviews...</Text>
                </View>
              ) : reviews.length > 0 ? (
                reviews.slice(0, 6).map(renderReviewCard)
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="star-outline" size={60} color={theme.colors.secondary} />
                  <Text style={styles.emptyStateText}>No reviews yet</Text>
                </View>
              )}
              
              {reviews.length > 6 && (
                <TouchableOpacity style={styles.viewAllButton} onPress={handleOpenReviewsModal}>
                  <Text style={styles.viewAllText}>View All Reviews</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowErrorModal(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowErrorModal(false);
          }}
        >
          <View style={styles.errorModalContent}>
            <Text style={styles.errorModalTitle}>Error</Text>
            <Text style={styles.errorModalText}>{errorMessage}</Text>
            <TouchableOpacity 
              style={styles.errorModalButton}
              onPress={() => {
                setShowErrorModal(false);
              }}
            >
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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

      {/* Service Rates Modal */}
      <Modal
        visible={showServiceRatesModal}
        transparent
        animationType="slide"
        onRequestClose={closeServiceRatesModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeServiceRatesModal}
        >
          <View style={styles.serviceRatesModalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={closeServiceRatesModal}
            >
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            
            {selectedServiceForRates && (
              <>
                <Text style={styles.serviceModalTitle}>{selectedServiceForRates.service_name}</Text>
                <Text style={styles.serviceModalDescription}>{selectedServiceForRates.description}</Text>
                
                <View style={styles.ratesSection}>
                  <Text style={styles.ratesSectionTitle}>Pricing Details</Text>
                  
                  {/* Base Rate */}
                  <View style={styles.rateRow}>
                    <Text style={styles.rateLabel}>Base Rate</Text>
                    <Text style={styles.rateValue}>${selectedServiceForRates.base_rate}/{BACKEND_TO_FRONTEND_TIME_UNIT[selectedServiceForRates.unit_of_time] || selectedServiceForRates.unit_of_time}</Text>
                  </View>
                  
                  {/* Additional Animal Rate */}
                  {parseFloat(selectedServiceForRates.additional_animal_rate) > 0 && (
                    <View style={[
                      styles.rateRow,
                      selectedServiceForRates.additional_rates && selectedServiceForRates.additional_rates.length > 0 && 
                      selectedServiceForRates.holiday_rate && selectedServiceForRates.holiday_rate !== "0.00%" && selectedServiceForRates.holiday_rate !== "$0.00"
                        ? {} : styles.lastRateRow
                    ]}>
                      <View style={styles.additionalRateInfo}>
                        <Text style={styles.rateLabel}>Additional Animal</Text>
                        <Text style={styles.rateDescription}>Applies after {selectedServiceForRates.applies_after} animal{selectedServiceForRates.applies_after !== 1 ? 's' : ''}</Text>
                      </View>
                      <Text style={styles.rateValue}>+${selectedServiceForRates.additional_animal_rate}/{BACKEND_TO_FRONTEND_TIME_UNIT[selectedServiceForRates.unit_of_time] || selectedServiceForRates.unit_of_time}</Text>
                    </View>
                  )}
                  
                  {/* Holiday Rate */}
                  {selectedServiceForRates.holiday_rate && selectedServiceForRates.holiday_rate !== "0.00%" && selectedServiceForRates.holiday_rate !== "$0.00" && (
                    <View style={[
                      styles.rateRow,
                      selectedServiceForRates.additional_rates && selectedServiceForRates.additional_rates.length > 0
                        ? {} : styles.lastRateRow
                    ]}>
                      <Text style={styles.rateLabel}>Holiday Rate</Text>
                      <Text style={styles.rateValue}>
                        {selectedServiceForRates.holiday_rate_is_percent ? 
                          `+${selectedServiceForRates.holiday_rate}` : 
                          `+${selectedServiceForRates.holiday_rate}`}
                      </Text>
                    </View>
                  )}
                  
                  {/* Additional Rates */}
                  {selectedServiceForRates.additional_rates && selectedServiceForRates.additional_rates.length > 0 && (
                    <>
                      <Text style={styles.additionalRatesTitle}>Additional Rates</Text>
                      {selectedServiceForRates.additional_rates.map((rate, index) => (
                        <View key={index} style={[
                          styles.rateRow,
                          index === selectedServiceForRates.additional_rates.length - 1 ? styles.lastRateRow : {}
                        ]}>
                          <View style={styles.additionalRateInfo}>
                            <Text style={styles.rateLabel}>{rate.title}</Text>
                            <Text style={styles.rateDescription}>{rate.description}</Text>
                          </View>
                          <Text style={styles.rateValue}>+${rate.rate}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
                
                <View style={styles.serviceModalFooter}>
                  <View style={styles.animalTypesContainer}>
                    {selectedServiceForRates.animal_types && Object.keys(selectedServiceForRates.animal_types).length > 2 ? 
                      formatAnimalTypes(selectedServiceForRates.animal_types, true, () => showAnimalTypes(selectedServiceForRates.animal_types)) :
                      <Text style={styles.animalTypesModal}>{formatAnimalTypes(selectedServiceForRates.animal_types)}</Text>
                    }
                  </View>
                  {selectedServiceForRates.is_overnight && (
                    <View style={styles.overnightBadge}>
                      <Text style={styles.overnightText}>Overnight</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Animal Types Modal */}
      <Modal
        visible={showAnimalTypesModal}
        transparent
        animationType="fade"
        onRequestClose={closeAnimalTypesModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeAnimalTypesModal}
        >
          <View style={styles.animalTypesModalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={closeAnimalTypesModal}
            >
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            
            {selectedAnimalTypes && (
              <>
                <Text style={styles.animalTypesModalTitle}>Supported Animals</Text>
                <ScrollView style={styles.animalTypesScrollContainer} showsVerticalScrollIndicator={true}>
                  <View style={styles.animalTypesList}>
                    {Object.entries(selectedAnimalTypes).map(([animal, category], index) => (
                      <View key={index} style={styles.animalTypeItem}>
                        <Text style={styles.animalTypeName}>{animal}</Text>
                        <Text style={styles.animalTypeCategory}>{category}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  
  // Profile Header
  profileHeader: {
    backgroundColor: theme.colors.surface,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  eliteBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 15,
    padding: 4,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 4,
  },
  reviewCountText: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginLeft: 4,
  },
  noReviewsText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: theme.colors.text,
  },
  
  // Contact Section
  contactSection: {
    padding: 20,
    backgroundColor: theme.colors.surface,
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    maxWidth: 300,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactButtonDisabled: {
    backgroundColor: theme.colors.secondary,
    opacity: 0.7,
  },
  contactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButtonText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
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
    color: theme.colors.secondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  
  // Tab Content
  tabContent: {
    flex: 1,
    padding: 20,
  },
  
  // Services Grid
  servicesGrid: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  serviceDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  animalTypesContainer: {
    flex: 1,
  },
  animalTypes: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  clickableAnimalTypes: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  moreAnimalsLink: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  overnightBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overnightText: {
    color: theme.colors.whiteText,
    fontSize: 10,
    fontWeight: '500',
  },
  viewRatesText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  
  // Reviews Grid
  reviewsGrid: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewService: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  
  // Stars
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginRight: 2,
  },
  
  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Loading/Error States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: 16,
    textAlign: 'center',
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
  
  // View All Button
  viewAllButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    alignItems: 'center',
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  errorModalText: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorModalButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorModalButtonText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Service Rates Modal
  serviceRatesModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    zIndex: 1,
  },
  serviceModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  serviceModalDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  ratesSection: {
    marginBottom: 20,
  },
  ratesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lastRateRow: {
    borderBottomWidth: 0,
  },
  rateLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  additionalRatesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  additionalRateInfo: {
    flex: 1,
    marginRight: 12,
  },
  rateDescription: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  serviceModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  animalTypesModal: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  
  // Animal Types Modal
  animalTypesModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
    position: 'relative',
  },
  animalTypesModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  animalTypesScrollContainer: {
    flex: 1,
    maxHeight: 300, // Limit height to ensure scrolling works
  },
  animalTypesList: {
    gap: 12,
    paddingBottom: 10, // Add some bottom padding for better scroll experience
  },
  animalTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  animalTypeName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  animalTypeCategory: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
});

export default ProfessionalProfile;