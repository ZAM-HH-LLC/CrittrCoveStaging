import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { getClientPets, getUserReviews } from '../api/API';
import { getMediaUrl } from '../config/config';
import { AuthContext, debugLog, is_professional } from '../context/AuthContext';
import ReviewsModal from './ReviewsModal';

const ClientPetsModal = ({ visible, onClose, conversation, otherUserName, onCreateBooking, otherUserProfilePhoto }) => {
  const [pets, setPets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileView, setMobileView] = useState('pets'); // 'pets' or 'details'
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const { userRole } = useContext(AuthContext);
  
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth <= 768;
  const isSmallMobile = screenWidth <= 600;

  useEffect(() => {
    if (visible && conversation?.id) {
      debugLog('MBA3456', 'ClientPetsModal became visible with conversation ID:', conversation.id);
      fetchPets();
      fetchReviews();
    }
  }, [visible, conversation?.id]);

  const fetchPets = async () => {
    setLoading(true);
    setError(null);
    try {
      debugLog('MBA3456', 'Fetching pets for conversation:', conversation.id);
      const petsData = await getClientPets(conversation.id);
      debugLog('MBA3456', 'Successfully fetched pets:', petsData.length);
      setPets(petsData);
      if (petsData.length > 0) {
        setSelectedPet(petsData[0]);
      }
    } catch (err) {
      debugLog('MBA3456', 'Error fetching client pets:', err.response?.data || err.message);
      setError('Failed to load pets');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReviews = async () => {
    try {
      debugLog('MBA387c439h', 'Fetching reviews for conversation:', conversation.id);
      // We need to pass true if the current user is a professional, false if they're a client
      const isProfessional = userRole === 'professional';
      debugLog('MBA387c439h', 'Current user isProfessional:', isProfessional);
      
      const reviewsData = await getUserReviews(conversation.id, null, isProfessional);
      debugLog('MBA387c439h', 'Successfully fetched reviews:', reviewsData);
      setReviews(reviewsData.reviews || []);
      setAverageRating(reviewsData.average_rating || 0);
      setReviewCount(reviewsData.review_count || 0);
    } catch (err) {
      debugLog('MBA387c439h', 'Error fetching user reviews:', err.response?.data || err.message);
      // Don't set error state here to avoid blocking pet display
    }
  };

  const handleClose = () => {
    setSelectedPet(null);
    setPets([]);
    setReviews([]);
    setAverageRating(0);
    setReviewCount(0);
    setError(null);
    setMobileView('pets');
    onClose();
  };

  const handlePetSelect = (pet) => {
    setSelectedPet(pet);
    if (isMobile) {
      setMobileView('details');
    }
  };

  const handleBackToPets = () => {
    setMobileView('pets');
  };

  const handleCreateBooking = () => {
    // Close the modal
    handleClose();
    // Call the provided callback
    onCreateBooking && onCreateBooking();
  };

  const handleOpenReviewsModal = () => {
    setShowReviewsModal(true);
  };

  const handleCloseReviewsModal = () => {
    setShowReviewsModal(false);
  };

  const renderPetDetails = (pet) => (
    <>
      <View style={styles.petImageContainer}>
        {pet.profile_photo ? (
          <Image source={{ uri: getMediaUrl(pet.profile_photo) }} style={styles.petImage} />
        ) : (
          <View style={styles.petImagePlaceholder}>
            <MaterialCommunityIcons name="paw" size={50} color={theme.colors.placeholder} />
          </View>
        )}
      </View>
      
      {/* Basic Information - Always show this section */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionHeader}>Basic Information</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailText}>{pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase() || 'Not specified'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Breed</Text>
          <Text style={styles.detailText}>{pet.breed.charAt(0).toUpperCase() + pet.breed.slice(1).toLowerCase() || 'Not specified'}</Text>
        </View>

        

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailText}>{pet.age || 'Not specified'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Weight</Text>
          <Text style={styles.detailText}>{pet.weight ? `${pet.weight} lbs` : 'Not specified'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Sex</Text>
          <Text style={styles.detailText}>{pet.sex || 'Not specified'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Birthday</Text>
          <Text style={styles.detailText}>
            {pet.birthday ? new Date(pet.birthday).toLocaleDateString() : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Adoption Date</Text>
          <Text style={styles.detailText}>
            {pet.adoption_date ? new Date(pet.adoption_date).toLocaleDateString() : 'Not specified'}
          </Text>
        </View>

      </View>

      {/* Care Information - Always show this section */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionHeader}>Care Instructions</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Feeding Schedule</Text>
          <Text style={styles.detailText}>{pet.feeding_schedule || 'Not provided'}</Text>
        </View>

        {/* Show potty break schedule for all pets, with "Not applicable" for non-dogs */}
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Potty Break Schedule</Text>
          <Text style={styles.detailText}>
            {pet.is_dog 
              ? (pet.potty_break_schedule || 'Not provided') 
              : 'Not applicable for this pet type'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Special Care Instructions</Text>
          <Text style={styles.detailText}>{pet.special_care_instructions || 'None provided'}</Text>
        </View>
      </View>

      {/* Behavioral Information - Always show this section */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionHeader}>Behavioral Information</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Energy Level</Text>
          <Text style={styles.detailText}>{pet.energy_level || 'Not specified'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Can be Left Alone</Text>
          <Text style={styles.detailText}>
            {pet.can_be_left_alone === true ? 'Yes' : 
             pet.can_be_left_alone === false ? 'No' : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Friendly with Children</Text>
          <Text style={styles.detailText}>
            {pet.friendly_with_children === true ? 'Yes' : 
             pet.friendly_with_children === false ? 'No' : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Friendly with Cats</Text>
          <Text style={styles.detailText}>
            {pet.friendly_with_cats === true ? 'Yes' : 
             pet.friendly_with_cats === false ? 'No' : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Friendly with Dogs</Text>
          <Text style={styles.detailText}>
            {pet.friendly_with_dogs === true ? 'Yes' : 
             pet.friendly_with_dogs === false ? 'No' : 'Not specified'}
          </Text>
        </View>
      </View>

      {/* Medical Information - Always show this section */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionHeader}>Medical Information</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Spayed/Neutered</Text>
          <Text style={styles.detailText}>
            {pet.spayed_neutered === true ? 'Yes' : 
             pet.spayed_neutered === false ? 'No' : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>House Trained</Text>
          <Text style={styles.detailText}>
            {pet.house_trained === true ? 'Yes' : 
             pet.house_trained === false ? 'No' : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Microchipped</Text>
          <Text style={styles.detailText}>
            {pet.microchipped === true ? 'Yes' : 
             pet.microchipped === false ? 'No' : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Medications</Text>
          <Text style={styles.detailText}>
            {pet.medications || 'No medications listed'}
          </Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Medication Notes</Text>
          <Text style={styles.detailText}>{pet.medication_notes || 'None provided'}</Text>
        </View>
      </View>

      {/* Veterinary Information - Always show this section */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionHeader}>Veterinary Information</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Veterinarian</Text>
          <Text style={styles.detailText}>{pet.vet_name || 'Not provided'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Vet Phone</Text>
          <Text style={styles.detailText}>{pet.vet_phone || 'Not provided'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Vet Address</Text>
          <Text style={styles.detailText}>{pet.vet_address || 'Not provided'}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Insurance Provider</Text>
          <Text style={styles.detailText}>{pet.insurance_provider || 'Not provided'}</Text>
        </View>
      </View>
    </>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialCommunityIcons name="paw" size={60} color={theme.colors.placeholder} />
      <Text style={styles.emptyStateTitle}>No Pets Found</Text>
      <Text style={styles.emptyStateText}>
        This client doesn't have any pets registered yet. They will need to add pets to create a booking.
      </Text>
    </View>
  );

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
              <View style={styles.headerLeft}>
                {otherUserProfilePhoto ? (
                  <Image source={{ uri: getMediaUrl(otherUserProfilePhoto) }} style={styles.clientProfilePhoto} />
                ) : (
                  <View style={styles.clientProfilePhotoPlaceholder}>
                    <MaterialCommunityIcons name="account" size={24} color={theme.colors.placeholder} />
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  <Text style={styles.clientName}>{otherUserName || 'Client'}</Text>
                  <View style={styles.clientSubtitleContainer}>
                    {reviewCount > 0 ? (
                      <TouchableOpacity 
                        style={styles.reviewBadge}
                        onPress={handleOpenReviewsModal}
                      >
                        <MaterialCommunityIcons name="star" size={16} color={theme.colors.warning} />
                        <Text style={styles.reviewBadgeText}>{averageRating} • {reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.reviewBadgeText}>No reviews yet</Text>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading pets...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchPets}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : pets.length === 0 ? (
              renderEmptyState()
            ) : (
              <View style={[styles.content, isMobile && styles.contentMobile]}>
                {/* Mobile: Pets List View */}
                {isMobile && mobileView === 'pets' && (
                  <View style={styles.mobilePetsView}>
                    <Text style={styles.sectionTitle}>Pets</Text>
                    <ScrollView style={styles.petsScrollView}>
                      {pets.map((pet) => (
                        <TouchableOpacity
                          key={pet.pet_id}
                          style={styles.mobilePetItem}
                          onPress={() => handlePetSelect(pet)}
                        >
                          <View style={styles.mobilePetContent}>
                            <View style={styles.petListImageContainer}>
                              {pet.profile_photo ? (
                                <Image source={{ uri: getMediaUrl(pet.profile_photo) }} style={styles.petListImage} />
                              ) : (
                                <View style={styles.petListImagePlaceholder}>
                                  <MaterialCommunityIcons name="paw" size={16} color={theme.colors.placeholder} />
                                </View>
                              )}
                            </View>
                            <View style={styles.petTextContainer}>
                              <Text style={styles.mobilePetName}>
                                {pet.name.charAt(0).toUpperCase() + pet.name.slice(1).toLowerCase()}
                              </Text>
                              <Text style={styles.mobilePetType}>
                                {pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase()}
                              </Text>
                            </View>
                          </View>
                          <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={24} 
                            color={theme.colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Mobile: Pet Details View */}
                {isMobile && mobileView === 'details' && selectedPet && (
                  <View style={styles.mobileDetailsView}>
                    <View style={styles.mobileDetailsHeader}>
                      <TouchableOpacity 
                        style={styles.backButton}
                        onPress={handleBackToPets}
                      >
                        <MaterialCommunityIcons 
                          name="arrow-left" 
                          size={24} 
                          color={theme.colors.primary} 
                        />
                      </TouchableOpacity>
                      <Text style={styles.mobileDetailsTitle}>{selectedPet.name.charAt(0).toUpperCase() + selectedPet.name.slice(1).toLowerCase()}</Text>
                    </View>
                    <ScrollView style={styles.mobileDetailsScrollView}>
                      {renderPetDetails(selectedPet)}
                    </ScrollView>
                  </View>
                )}

                {/* Desktop: Two-panel layout */}
                {!isMobile && (
                  <>
                    {/* Pets List (Left Side) */}
                    <View style={styles.petsList}>
                      <Text style={styles.sectionTitle}>Pets</Text>
                      <ScrollView style={styles.petsScrollView}>
                        {pets.map((pet) => (
                          <TouchableOpacity
                            key={pet.pet_id}
                            style={[
                              styles.petItem,
                              selectedPet?.pet_id === pet.pet_id && styles.petItemSelected
                            ]}
                            onPress={() => handlePetSelect(pet)}
                          >
                            <View style={styles.petItemContent}>
                              <View style={styles.petListImageContainer}>
                                {pet.profile_photo ? (
                                  <Image source={{ uri: getMediaUrl(pet.profile_photo) }} style={styles.petListImage} />
                                ) : (
                                  <View style={styles.petListImagePlaceholder}>
                                    <MaterialCommunityIcons name="paw" size={16} color={theme.colors.placeholder} />
                                  </View>
                                )}
                              </View>
                              <View style={styles.petTextContainer}>
                                <Text style={[
                                  styles.petName,
                                  selectedPet?.pet_id === pet.pet_id && styles.petNameSelected
                                ]}>
                                  {pet.name.charAt(0).toUpperCase() + pet.name.slice(1).toLowerCase()}
                                </Text>
                                <Text style={[
                                  styles.petType,
                                  selectedPet?.pet_id === pet.pet_id && styles.petTypeSelected
                                ]}>
                                  {pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase()}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Pet Details (Right Side) */}
                    <View style={styles.petDetails}>
                      {selectedPet ? (
                        <ScrollView style={styles.detailsScrollView}>
                          <Text style={styles.detailsTitle}>{selectedPet.name.charAt(0).toUpperCase() + selectedPet.name.slice(1).toLowerCase()}</Text>
                          {renderPetDetails(selectedPet)}
                        </ScrollView>
                      ) : (
                        <View style={styles.noSelectionContainer}>
                          <Text style={styles.noSelectionText}>Select a pet to view details</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Create Booking Button */}
            {!loading && !error && (
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={styles.createBookingButton}
                  onPress={handleCreateBooking}
                >
                  <Text style={styles.createBookingButtonText}>Create Booking</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Reviews Modal - Outside the main modal to prevent nesting issues */}
      <ReviewsModal
        visible={showReviewsModal}
        onClose={handleCloseReviewsModal}
        reviews={reviews}
        averageRating={averageRating}
        reviewCount={reviewCount}
        userName={otherUserName}
        forProfessional={false}
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
  petListImageContainer: {
    marginRight: 12,
  },
  petListImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  petListImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  petItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petTextContainer: {
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  clientProfilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  clientProfilePhotoPlaceholder: {
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
  clientName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  clientSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  clientSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 2,
    borderRadius: 12,
  },
  reviewBadgeText: {
    fontSize: 16,
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
  mobilePetsView: {
    flex: 1,
    padding: 20,
  },
  mobilePetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mobilePetContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobilePetName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mobilePetType: {
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
  petsList: {
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
  petsScrollView: {
    flex: 1,
  },
  petItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  petItemSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  petName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  petNameSelected: {
    color: theme.colors.whiteText,
  },
  petType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  petTypeSelected: {
    color: theme.colors.whiteText,
  },
  petDetails: {
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
  detailsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40', // 40% opacity
  },
  petImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  petImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  petImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  createBookingButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBookingButtonText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reviewCountText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reviewsScrollView: {
    flex: 1,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default ClientPetsModal; 