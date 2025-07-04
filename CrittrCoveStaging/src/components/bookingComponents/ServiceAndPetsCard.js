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
import { AuthContext, debugLog } from '../../context/AuthContext';
import { API_BASE_URL, getMediaUrl } from '../../config/config';
import { getBookingAvailableServices, getBookingAvailablePets } from '../../api/API';
import axios from 'axios';
import { navigateToFrom } from '../Navigation';

const ServiceAndPetsCard = ({ 
  bookingId, 
  onServiceSelect, 
  onPetSelect, 
  onBatchPetSelect,
  selectedService, 
  selectedPets,
  isLoading,
  error,
  onNext,
  currentBookingId,
  navigation,
  onClose,
  shouldFetchServices,
  shouldFetchPets,
  markServicesInitialized,
  markPetsInitialized,
  // New props for parent-managed data
  availableServices: parentAvailableServices = [],
  availablePets: parentAvailablePets = [],
  onServicesData,
  onPetsData
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  
  if (is_DEBUG) {
    console.log('MBA2ou09hv595: ServiceAndPetsCard component rendered/re-rendered', {
      bookingId,
      timestamp: new Date().toISOString()
    });
  }
  // Use parent-provided data if available, otherwise fall back to local state
  const [localAvailableServices, setLocalAvailableServices] = useState([]);
  const [localAvailablePets, setLocalAvailablePets] = useState([]);
  
  // Use parent data if provided, otherwise use local state
  const availableServices = parentAvailableServices.length > 0 ? parentAvailableServices : localAvailableServices;
  const availablePets = parentAvailablePets.length > 0 ? parentAvailablePets : localAvailablePets;
  
  // Add debugging for state changes
  useEffect(() => {
    debugLog('MBA2ou09hv595', 'availableServices state changed', {
      bookingId,
      count: availableServices.length,
      services: availableServices.map(s => ({ id: s.service_id, name: s.service_name })),
      source: parentAvailableServices.length > 0 ? 'parent' : 'local'
    });
  }, [availableServices, parentAvailableServices]);
  
  useEffect(() => {
    debugLog('MBA2ou09hv595', 'availablePets state changed', {
      bookingId,
      count: availablePets.length,
      pets: availablePets.map(p => ({ id: p.pet_id, name: p.name })),
      source: parentAvailablePets.length > 0 ? 'parent' : 'local'
    });
  }, [availablePets, parentAvailablePets]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingPets, setIsLoadingPets] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [petsError, setPetsError] = useState(null);

  useEffect(() => {
    debugLog('MBA2ou09hv595', 'useEffect triggered', {
      bookingId,
      selectedService,
      selectedPetsCount: selectedPets.length,
      selectedPetIds: selectedPets.map(p => p.pet_id),
      currentAvailableServicesCount: availableServices.length,
      currentAvailablePetsCount: availablePets.length,
      timestamp: new Date().toISOString()
    });
    
    // Use parent-controlled initialization logic
    if (shouldFetchServices && shouldFetchServices()) {
      debugLog('MBA2ou09hv595', 'Parent says should fetch services', {
        bookingId,
        timestamp: new Date().toISOString()
      });
      fetchAvailableServices();
    } else {
      debugLog('MBA2ou09hv595', 'Parent says skip services fetch', {
        bookingId,
        timestamp: new Date().toISOString()
      });
    }

    if (shouldFetchPets && shouldFetchPets()) {
      debugLog('MBA2ou09hv595', 'Parent says should fetch pets', {
        bookingId,
        timestamp: new Date().toISOString()
      });
      fetchAvailablePets();
    } else {
      debugLog('MBA2ou09hv595', 'Parent says skip pets fetch', {
        bookingId,
        timestamp: new Date().toISOString()
      });
    }
  }, [bookingId]);

  const fetchAvailableServices = async () => {
    try {
      if (is_DEBUG) {
        console.log('MBA2ou09hv595: fetchAvailableServices started', {
          bookingId,
          timestamp: new Date().toISOString()
        });
      }
      setIsLoadingServices(true);
      setServiceError(null);
      const response = await getBookingAvailableServices(bookingId);
      if (is_DEBUG) {
        console.log('MBA2ou09hv595: fetchAvailableServices completed', {
          bookingId,
          servicesCount: response.services?.length,
          timestamp: new Date().toISOString()
        });
      }
      
      debugLog('MBA2ou09hv595', 'Setting available services in state', {
        bookingId,
        services: response.services,
        servicesCount: response.services?.length,
        responseKeys: Object.keys(response),
        timestamp: new Date().toISOString()
      });
      
      // Safety check: only update if we actually have services data
      if (response.services && Array.isArray(response.services)) {
        // Use parent data handler if available, otherwise update local state
        if (onServicesData) {
          onServicesData(response.services, response.selected_service_id);
        } else {
          setLocalAvailableServices(response.services);
        }
      } else {
        debugLog('MBA2ou09hv595', 'WARNING: Invalid services response', {
          bookingId,
          response,
          responseType: typeof response,
          servicesType: typeof response.services
        });
      }
      
      // Mark services as initialized
      if (markServicesInitialized) {
        markServicesInitialized();
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBA12345 Error fetching services:', error);
      }
      setServiceError('Failed to load available services');
      
      // Reset the in-progress flag on error so it can be retried
      if (markServicesInitialized) {
        // Call with error flag to reset progress without marking as initialized
        markServicesInitialized(true); // true indicates error
      }
    } finally {
      setIsLoadingServices(false);
    }
  };

  const fetchAvailablePets = async () => {
    try {
      if (is_DEBUG) {
        console.log('MBA2ou09hv595: fetchAvailablePets started', {
          bookingId,
          currentSelectedPets: selectedPets.map(p => ({ id: p.pet_id, name: p.name })),
          timestamp: new Date().toISOString()
        });
      }
      setIsLoadingPets(true);
      setPetsError(null);
      
      const response = await getBookingAvailablePets(bookingId);
      if (is_DEBUG) {
        console.log('MBA2ou09hv595: fetchAvailablePets completed', {
          bookingId,
          petsCount: response.pets?.length,
          selectedPetIds: response.selected_pet_ids,
          timestamp: new Date().toISOString()
        });
      }
      
      debugLog('MBA2ou09hv595', 'Setting available pets in state', {
        bookingId,
        pets: response.pets,
        petsCount: response.pets?.length,
        responseKeys: Object.keys(response),
        timestamp: new Date().toISOString()
      });
      
      // Safety check: only update if we actually have pets data
      if (response.pets && Array.isArray(response.pets)) {
        // Use parent data handler if available, otherwise update local state
        if (onPetsData) {
          onPetsData(response.pets, response.selected_pet_ids);
        } else {
          setLocalAvailablePets(response.pets);
        }
      } else {
        debugLog('MBA2ou09hv595', 'WARNING: Invalid pets response', {
          bookingId,
          response,
          responseType: typeof response,
          petsType: typeof response.pets
        });
      }
      
      // Mark pets as initialized
      if (markPetsInitialized) {
        markPetsInitialized();
      }
    } catch (error) {
      if (is_DEBUG) {
        console.error('MBAio4wo4nou: Error fetching pets:', error);
      }
      setPetsError('Failed to load available pets');
      
      // Reset the in-progress flag on error so it can be retried
      if (markPetsInitialized) {
        // Call with error flag to reset progress without marking as initialized
        markPetsInitialized(true); // true indicates error
      }
    } finally {
      if (is_DEBUG) {
        console.log('MBAio4wo4nou: fetchAvailablePets completed');
      }
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
    
    if (is_DEBUG) {
      console.log(`MBAio4wo4nou: Rendering pet card for ${pet.name}`, {
        petId: pet.pet_id,
        isSelected,
        selectedPetsCount: selectedPets.length
      });
    }
    
    return (
      <TouchableOpacity
        key={pet.pet_id}
        style={[
          styles.petCard,
          isSelected && styles.selectedPetCard
        ]}
        onPress={() => {
          if (is_DEBUG) {
            console.log('MBAio4wo4nou: Pet card clicked:', { id: pet.pet_id, name: pet.name });
          }
          onPetSelect(pet);
        }}
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

  // Debug render state
  debugLog('MBA2ou09hv595', 'ServiceAndPetsCard rendering with state', {
    bookingId,
    availableServicesCount: availableServices.length,
    availablePetsCount: availablePets.length,
    isLoadingServices,
    isLoadingPets,
    serviceError,
    petsError,
    selectedServiceId: selectedService?.service_id,
    selectedPetsCount: selectedPets.length,
    timestamp: new Date().toISOString()
  });

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