import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL, getMediaUrl } from '../../config/config';
import { getBookingAvailableServices, getBookingAvailablePets } from '../../api/API';
import axios from 'axios';
import { navigateToFrom } from '../Navigation';

const ServiceAndPetsCard = ({ 
  bookingId, 
  onServiceSelect, 
  onPetSelect, 
  selectedService, 
  selectedPets,
  isLoading,
  error,
  onNext,
  currentBookingId,
  navigation,
  onClose
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  const [availableServices, setAvailableServices] = useState([]);
  const [availablePets, setAvailablePets] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingPets, setIsLoadingPets] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [petsError, setPetsError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      fetchAvailableServices();
      fetchAvailablePets();
    }
  }, [bookingId]);

  const fetchAvailableServices = async () => {
    try {
      setIsLoadingServices(true);
      setServiceError(null);
      const response = await getBookingAvailableServices(bookingId);
      if (is_DEBUG) {
        console.log('MBA12345 Available services response:', response);
      }
      setAvailableServices(response.services);
      
      // If there's a selected service in the response and no service is currently selected,
      // automatically select it
      if (response.selected_service_id && !selectedService) {
        const serviceToSelect = response.services.find(s => s.service_id === response.selected_service_id);
        if (serviceToSelect) {
          onServiceSelect({
            ...serviceToSelect,
            isOvernightForced: serviceToSelect.is_overnight
          });
        }
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBA12345 Error fetching services:', error);
      }
      setServiceError('Failed to load available services');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const fetchAvailablePets = async () => {
    try {
      setIsLoadingPets(true);
      setPetsError(null);
      const response = await getBookingAvailablePets(bookingId);
      if (is_DEBUG) {
        console.log('MBA12345 Available pets response:', response);
      }
      setAvailablePets(response.pets);
      
      // If there are selected pets in the response and no pets are currently selected,
      // automatically select them
      if (response.selected_pet_ids && response.selected_pet_ids.length > 0 && selectedPets.length === 0) {
        const petsToSelect = response.pets.filter(p => response.selected_pet_ids.includes(p.pet_id));
        petsToSelect.forEach(pet => onPetSelect(pet));
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBA12345 Error fetching pets:', error);
      }
      setPetsError('Failed to load available pets');
    } finally {
      setIsLoadingPets(false);
    }
  };

  // TODO: change to animal type based icons
  const getServiceIcon = (serviceName) => {
    switch (serviceName.toLowerCase()) {
      case 'dog walking':
        return 'paw';
      case 'house sitting':
        return 'home';
      case 'drop-in visits':
        return 'food-variant';
      case 'boarding':
        return 'home-city';
      default:
        return 'paw';
    }
  };

  const renderServiceCard = (service) => {
    const isSelected = selectedService?.service_id === service.service_id;
    
    return (
      <TouchableOpacity
        key={service.service_id}
        style={[
          styles.serviceCard,
          isSelected && styles.selectedServiceCard
        ]}
        onPress={() => onServiceSelect({
          ...service,
          isOvernightForced: service.is_overnight
        })}
      >
        {/* TODO: change to animal type based icons */}
        <MaterialCommunityIcons 
          name={getServiceIcon(service.service_name)}
          size={24}
          color={isSelected ? theme.colors.mainColors.main : theme.colors.text}
        />
        <Text style={[
          styles.serviceText,
          isSelected && styles.selectedServiceText
        ]}>
          {service.service_name}
        </Text>
        {isSelected && (
          <MaterialCommunityIcons 
            name="check" 
            size={24} 
            color={theme.colors.mainColors.main}
            style={styles.serviceCheckIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderPetCard = (pet) => {
    const isSelected = selectedPets.some(selectedPet => selectedPet.pet_id === pet.pet_id);
    
    return (
      <TouchableOpacity
        key={pet.pet_id}
        style={[
          styles.petCard,
          isSelected && styles.selectedPetCard
        ]}
        onPress={() => onPetSelect(pet)}
      >
        <View style={styles.petImageContainer}>
          {pet.profile_photo ? (
            <Image 
              source={{ uri: getMediaUrl(pet.profile_photo) }} 
              style={styles.petImage}
              defaultSource={require('../../../assets/default-pet-image.png')}
            />
          ) : (
            <View style={styles.defaultPetImage}>
              <MaterialCommunityIcons 
                name="paw" 
                size={24} 
                color={theme.colors.placeHolderText}
              />
            </View>
          )}
        </View>
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{pet.name.toLowerCase().charAt(0).toUpperCase() + pet.name.toLowerCase().slice(1)}</Text>
          <Text style={styles.petDetails}>
            {pet.species ? pet.species.toLowerCase().charAt(0).toUpperCase() + pet.species.toLowerCase().slice(1) : 'No species'} • {pet.breed ? pet.breed.toLowerCase().charAt(0).toUpperCase() + pet.breed.toLowerCase().slice(1) : 'No breed'}
          </Text>
        </View>
        {isSelected && (
          <MaterialCommunityIcons 
            name="check" 
            size={24} 
            color={theme.colors.mainColors.main}
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectedItems = () => {
    if (!selectedService && selectedPets.length === 0) return null;

    return (
      <View style={styles.selectedItemsContainer}>
        <Text style={styles.selectedItemsTitle}>Selected Service & Pets:</Text>
        <View style={styles.selectedItemsContent}>
          {selectedService && (
            <TouchableOpacity 
              style={styles.selectedTag}
              onPress={() => onServiceSelect(null)}
            >
              <Text style={styles.selectedTagText}>{selectedService.service_name}</Text>
              <MaterialCommunityIcons name="close" size={16} color={theme.colors.mainColors.main} />
            </TouchableOpacity>
          )}
          {selectedPets.map(pet => (
            <TouchableOpacity 
              key={pet.pet_id}
              style={styles.selectedTag}
              onPress={() => onPetSelect(pet)}
            >
              <Text style={styles.selectedTagText}>{pet.name}</Text>
              <MaterialCommunityIcons name="close" size={16} color={theme.colors.mainColors.main} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleNext = async () => {
    if (is_DEBUG) {
      console.log('MBA98765 handleNext:', {
        selectedService,
        selectedPets,
        currentBookingId
      });
    }

    if (!selectedService || selectedPets.length === 0) {
      Alert.alert('Error', 'Please select both a service and at least one pet before proceeding.');
      return;
    }

    try {
      // Update the draft with selected service and pets
      const response = await axios.patch(
        `${API_BASE_URL}/api/booking_drafts/v1/${currentBookingId}/update/`,
        {
          service_id: selectedService.service_id,
          pet_ids: selectedPets.map(pet => pet.pet_id)
        }
      );

      if (is_DEBUG) {
        console.log('MBA98765 Draft update response:', response.data);
      }

      // If successful, proceed to next step
      onNext();
    } catch (error) {
      if (is_DEBUG) {
        console.log('MBA98765 Error updating draft:', error);
      }
      Alert.alert('Error', 'Failed to update booking draft. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mainColors.main} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Service</Text>
        {serviceError ? (
          <Text style={styles.errorText}>{serviceError}</Text>
        ) : isLoadingServices ? (
          <ActivityIndicator size="small" color={theme.colors.mainColors.main} />
        ) : availableServices.length > 0 ? (
          <View style={styles.servicesGrid}>
            {availableServices.map(service => renderServiceCard(service))}
          </View>
        ) : (
          <View style={styles.noServicesContainer}>
            <Text style={styles.errorText}>No services available. Please add services to create a booking.</Text>
            <TouchableOpacity 
              style={styles.createServiceButton} 
              onPress={() => {
                onClose();
                navigateToFrom(navigation, 'ServiceManager', 'MessageHistory');
              }}
            >
              <Text style={styles.createServiceButtonText}>Create Services</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Pets</Text>
        {petsError ? (
          <Text style={styles.errorText}>{petsError}</Text>
        ) : isLoadingPets ? (
          <ActivityIndicator size="small" color={theme.colors.mainColors.main} />
        ) : (
          availablePets.length > 0 ? (
            <View style={styles.petsContainer}>
              {availablePets.map(pet => renderPetCard(pet))}
            </View>
          ) : (
            <Text style={styles.errorText}>Please instruct client to add pets to their account so you can create a booking for their pets.</Text>
          )
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 14,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 16,
    color: theme.colors.text,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
    width: '100%',
  },
  serviceCard: {
    width: '31%',
    minWidth: 100,
    maxWidth: 150,
    aspectRatio: 1.2,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  selectedServiceCard: {
    backgroundColor: `${theme.colors.mainColors.main}10`,
    borderColor: theme.colors.mainColors.main,
  },
  serviceText: {
    marginTop: 8,
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
    width: '100%',
  },
  selectedServiceText: {
    color: theme.colors.mainColors.main,
    fontWeight: '600',
  },
  petsContainer: {
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: Platform.OS === 'web' ? 'calc(50% - 6px)' : '100%',
    minWidth: Platform.OS === 'web' ? 250 : 'auto',
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
  },
  selectedPetCard: {
    backgroundColor: `${theme.colors.mainColors.main}10`,
    borderColor: theme.colors.mainColors.main,
  },
  petImageContainer: {
    marginRight: 12,
  },
  petImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultPetImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 4,
    color: theme.colors.text,
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  checkIcon: {
    marginLeft: 12,
  },
  selectedItemsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 16,
    borderRadius: 8,
  },
  selectedItemsTitle: {
    fontSize: Platform.OS === 'web' ? 14 : 10,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 16,
    color: theme.colors.text,
  },
  selectedItemsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.mainColors.main}10`,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  selectedTagText: {
    color: theme.colors.mainColors.main,
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceCheckIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  createServiceButton: {
    backgroundColor: theme.colors.mainColors.main,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createServiceButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ServiceAndPetsCard; 