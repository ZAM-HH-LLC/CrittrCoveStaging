import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Modal, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext, debugLog } from '../../context/AuthContext';
import { updateProfileInfo } from '../../api/API';
import { useToast } from '../../components/ToastProvider';
import { geocodeAddressGraceful } from '../../utils/geocoding';
import AddressAutocomplete from '../AddressAutocomplete';

const FACILITY_PRESETS = [
  { id: 'fenced_yard', icon: 'fence', title: 'Fenced Yard', description: 'Secure outdoor space for pets' },
  { id: 'pet_door', icon: 'door', title: 'Pet Door', description: 'Easy access to outdoor areas' },
  { id: 'air_conditioning', icon: 'air-conditioner', title: 'Climate Control', description: 'Temperature controlled environment' },
  { id: 'security_cameras', icon: 'cctv', title: 'Security Cameras', description: '24/7 monitoring capability' },
  { id: 'separate_room', icon: 'door-closed', title: 'Separate Pet Room', description: 'Dedicated space for pets' },
  { id: 'pet_gates', icon: 'gate', title: 'Pet Gates', description: 'Indoor barriers for pet safety' },
  { id: 'pool', icon: 'pool', title: 'Pool', description: 'Swimming area (with safety features)' },
  { id: 'cleaning_station', icon: 'shower-head', title: 'Pet Cleaning Station', description: 'Dedicated pet washing area' },
  { id: 'first_aid', icon: 'medical-bag', title: 'Pet First Aid Kit', description: 'Emergency medical supplies' },
  { id: 'food_storage', icon: 'food-variant', title: 'Pet Food Storage', description: 'Dedicated food storage area' },
];

const INSURANCE_OPTIONS = [
  { id: 'none', label: 'No Insurance', description: 'I do not have insurance' },
  { id: 'petplan', label: 'PetPlan Insurance', description: 'Comprehensive pet insurance coverage' },
  { id: 'trupanion', label: 'Trupanion', description: 'Lifetime coverage for your pets' },
  { id: 'custom', label: 'Custom Insurance', description: 'Upload my own insurance card' }
];

// Legacy AddressForm - keeping for reference but not used
const AddressForm = ({ address, setAddress }) => (
  <View style={styles.addressForm}>
    <TextInput
      style={styles.addressInput}
      value={address.street}
      onChangeText={(text) => setAddress(prev => ({ ...prev, street: text }))}
      placeholder="Street Address"
    />
    <TextInput
      style={styles.addressInput}
      value={address.apartment}
      onChangeText={(text) => setAddress(prev => ({ ...prev, apartment: text }))}
      placeholder="Apartment/Suite (optional)"
    />
    <View style={styles.addressRow}>
      <TextInput
        style={[styles.addressInput, { flex: 2 }]}
        value={address.city}
        onChangeText={(text) => setAddress(prev => ({ ...prev, city: text }))}
        placeholder="City"
      />
      <TextInput
        style={[styles.addressInput, { flex: 1 }]}
        value={address.state || 'Colorado'}
        onChangeText={(text) => setAddress(prev => ({ ...prev, state: text }))}
        placeholder="State"
      />
    </View>
    <TextInput
      style={styles.addressInput}
      value={address.zip}
      onChangeText={(text) => setAddress(prev => ({ ...prev, zip: text }))}
      placeholder="ZIP Code"
      keyboardType="numeric"
    />
  </View>
);

const EditOverlay = ({ visible, onClose, title, value, onSave, isLocation, isMultiline, isProfessional, isInsurance, selectedInsurance = { type: 'none', card: null }, onInsuranceChange }) => {
  const [localValue, setLocalValue] = useState('');
  const [localInsurance, setLocalInsurance] = useState(selectedInsurance);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [currentAddressValue, setCurrentAddressValue] = useState('');
  const [insuranceStep, setInsuranceStep] = useState(1); // 1: Choose type, 2: Upload/Select insurance
  const [insuranceType, setInsuranceType] = useState(null); // 'own' or 'platform'

  useEffect(() => {
    if (visible) {
      if (isInsurance) {
        setLocalInsurance(selectedInsurance);
        setInsuranceStep(1);
        setInsuranceType(null);
      } else if (isLocation) {
        // Initialize address autocomplete with current value
        setCurrentAddressValue(value || '');
        setSelectedAddress(null);
      } else {
        setLocalValue(value || '');
      }
    }
  }, [visible]); // Only depend on visibility changing - nothing else

  const handleSave = () => {
    if (isInsurance) {
      onSave(localInsurance);
    } else if (isLocation) {
      if (!selectedAddress) {
        // Show error - address must be validated
        Alert.alert('Invalid Address', 'Please select a valid address from the suggestions.');
        return;
      }
      // Pass the selected address object with all components and coordinates
      debugLog('MBA8901', 'Saving location with selected address:', selectedAddress);
      onSave(selectedAddress);
    } else {
      onSave(localValue);
    }
    onClose();
  };

  const handleInsuranceTypeSelect = (type) => {
    setInsuranceType(type);
    setInsuranceStep(2);
  };

  const handleInsuranceChange = async (insuranceType) => {
    if (insuranceType === 'custom') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        const newInsurance = { type: 'custom', card: result.assets[0].uri };
        setLocalInsurance(newInsurance);
        onInsuranceChange(insuranceType);
      }
    } else {
      const newInsurance = { type: insuranceType, card: null };
      setLocalInsurance(newInsurance);
      onInsuranceChange(insuranceType);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          Alert.alert('Permission denied: Please enable location services to use this feature.');
        }
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Get the address from coordinates
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (address) {
        setAddressForm({
          street: address.street || '',
          apartment: '',
          city: address.city || '',
          state: address.region || '',
          zip: address.postalCode || '',
          country: address.country || ''
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please enter address manually.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const renderInsuranceContent = () => {
    if (insuranceStep === 1) {
      return (
        <View style={styles.insuranceStepContent}>
          <Text style={styles.insuranceStepTitle}>Choose Insurance Type</Text>
          <TouchableOpacity 
            style={styles.insuranceTypeButton}
            onPress={() => handleInsuranceTypeSelect('own')}
          >
            <MaterialCommunityIcons name="file-document" size={24} color={theme.colors.primary} />
            <View style={styles.insuranceTypeContent}>
              <Text style={styles.insuranceTypeTitle}>Use My Own Insurance</Text>
              <Text style={styles.insuranceTypeDescription}>Upload your existing insurance card</Text>
            </View>
          </TouchableOpacity>
          {/* TODO: Implement after MVP
           <TouchableOpacity 
            style={styles.insuranceTypeButton}
            onPress={() => handleInsuranceTypeSelect('platform')}
          >
            <MaterialCommunityIcons name="shield-check" size={24} color={theme.colors.primary} />
            <View style={styles.insuranceTypeContent}>
              <Text style={styles.insuranceTypeTitle}>Use Platform Insurance</Text>
              <Text style={styles.insuranceTypeDescription}>Select from our insurance providers</Text>
            </View>
          </TouchableOpacity> */}
        </View>
      );
    }

    if (insuranceStep === 2) {
      if (insuranceType === 'own') {
        return (
          <View style={styles.insuranceStepContent}>
            <Text style={styles.insuranceStepTitle}>Upload Insurance Card</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => handleInsuranceChange('custom')}
            >
              <MaterialCommunityIcons name="file-upload" size={24} color={theme.colors.primary} />
              <Text style={styles.uploadText}>Upload Insurance Card</Text>
            </TouchableOpacity>
            {localInsurance.type === 'custom' && localInsurance.card && (
              <View style={styles.customInsuranceCard}>
                <Image 
                  source={{ uri: localInsurance.card }} 
                  style={styles.insuranceCardImage}
                />
                <Text style={styles.insuranceCardText}>Custom Insurance Card</Text>
              </View>
            )}
          </View>
        );
      }

      return (
        <View style={styles.insuranceStepContent}>
          <Text style={styles.insuranceStepTitle}>Select Insurance Provider</Text>
          {INSURANCE_OPTIONS.filter(opt => opt.id !== 'custom').map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.insuranceOption,
                localInsurance.type === option.id && styles.selectedInsuranceOption
              ]}
              onPress={() => {
                const newInsurance = { type: option.id, card: null };
                setLocalInsurance(newInsurance);
                onInsuranceChange(option.id);
              }}
            >
              <MaterialCommunityIcons 
                name={option.id === 'none' ? 'shield-off' : 'shield-check'} 
                size={24} 
                color={theme.colors.primary} 
              />
              <View style={styles.insuranceOptionContent}>
                <Text style={styles.insuranceOptionTitle}>{option.label}</Text>
                <Text style={styles.insuranceOptionDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          isInsurance && styles.insuranceModalContent
        ]}>
          <View style={styles.modalHeader}>
            {isInsurance && insuranceStep === 2 && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setInsuranceStep(1)}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <Text style={[
              styles.modalTitle,
              isInsurance && insuranceStep === 2 && styles.modalTitleCentered
            ]}>{title}</Text>
          </View>
          
          {isInsurance ? renderInsuranceContent() : (
            isLocation ? (
              <View style={styles.locationContent}>
                <Text style={styles.addressInstructions}>
                Enter your complete street address (e.g., "123 Main Street"). Only valid street addresses will appear in suggestions.
                </Text>
                <AddressAutocomplete
                  value={currentAddressValue}
                  onAddressSelect={(address) => {
                    setSelectedAddress(address);
                    setCurrentAddressValue(address.formatted_address);
                    debugLog('MBA8901', 'Address selected in modal:', address);
                  }}
                  placeholder="Enter address in Colorado Springs..."
                  style={styles.addressAutocomplete}
                />
                {selectedAddress && (
                  <View style={styles.selectedAddressInfo}>
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={16} 
                      color={theme.colors.success} 
                    />
                    <Text style={styles.selectedAddressText}>
                      Address validated and ready to save
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <TextInput
                style={[styles.modalInput, isMultiline && styles.multilineInput]}
                value={localValue}
                onChangeText={setLocalValue}
                multiline={isMultiline}
                numberOfLines={isMultiline ? 4 : 1}
                autoFocus
              />
            )
          )}
          
          <View style={[styles.modalButtons, { zIndex: -1 }]}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.modalSaveButton,
                isLocation && !selectedAddress && styles.modalSaveButtonDisabled
              ]} 
              onPress={handleSave}
              disabled={isLocation && !selectedAddress}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ProfileInfoTab = ({
  profilePhoto,
  email,
  phone,
  age,
  address,
  city,
  state,
  zip,
  country,
  coordinates,
  bio,
  about_me,
  emergencyContact,
  authorizedHouseholdMembers,
  editMode,
  toggleEditMode,
  onChangeText,
  pickImage,
  setHasUnsavedChanges,
  onSaveComplete,
  isMobile,
  rating,
  reviews,
  role,
  isProfessional,
  insurance = { type: 'none', card: null },
  onNavigateToTab,
  name,
}) => {
  const { name: authName } = useContext(AuthContext);
  
  // Track direct user edits
  const [hasEdits, setHasEdits] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [selectedInsurance, setSelectedInsurance] = useState(insurance);
  const [isSaving, setIsSaving] = useState(false);
  
  // Add state to track edited values that should display in the UI
  const [displayValues, setDisplayValues] = useState({
    name: name || authName || "Your Name",
    email: email || "",
    bio: isProfessional ? bio : about_me,
    location: `${address || ''}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`,
  });
  
  const showToast = useToast();
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    insurance: { type: 'none', card: null }
  });

  // Make sure parent component is notified about unsaved changes
  useEffect(() => {
    if (setHasUnsavedChanges) {
      debugLog('MBA230uvj0834h9', 'Updating parent component with hasUnsavedChanges:', hasEdits);
      setHasUnsavedChanges(hasEdits);
    }
  }, [hasEdits, setHasUnsavedChanges]);
  
  // Update the initial useEffect to only run once
  useEffect(() => {
    debugLog('MBA230uvj0834h9', 'ProfileInfoTab mounted with props:', { 
      propName: name,
      authName, 
      email, 
      address, 
      bio, 
      about_me, 
      profilePhoto,
      isProfessional
    });
    
    // Use formatted address if available, otherwise fall back to constructed address
    const locationDisplay = coordinates?.formatted_address || 
                           `${address || ''}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`;
    
    // Initialize display values on mount ONLY
    setDisplayValues({
      name: name || authName || "Your Name",
      email: email || "",
      bio: isProfessional ? bio : about_me,
      location: locationDisplay
    });
  }, []); // Empty dependency array - only run on mount

  // Add effect to update bio when isProfessional changes
  useEffect(() => {
    // Update the bio/about_me when the role changes
    setDisplayValues(prev => ({
      ...prev,
      bio: isProfessional ? bio : about_me
    }));
    
    debugLog('MBA230uvj0834h9', 'Role changed - updating bio/about_me:', { 
      isProfessional, 
      bio, 
      about_me 
    });
  }, [isProfessional, bio, about_me]);
  
  // Simplify hasFieldChanged to be more direct
  const hasFieldChanged = (field, value) => {
    // For insurance, we need to do a deep comparison
    if (field === 'insurance') {
      return JSON.stringify(value) !== JSON.stringify(originalValues.insurance);
    }
    
    // For location, we can use a simpler comparison
    if (field === 'location') {
      // If it's an object, check all address fields
      if (typeof value === 'object') {
        // Handle AddressAutocomplete format (with components)
        const newAddress = value.components?.street || value.street || value.address || '';
        const newApartment = value.components?.apartment || value.apartment || '';
        const newCity = value.components?.city || value.city || '';
        const newState = value.components?.state || value.state || 'Colorado';
        const newZip = value.components?.zip || value.zip || '';
        
        debugLog('MBA12345', 'Checking location changes:', {
          originalAddress: originalValues.address,
          newAddress: newAddress,
          originalApartment: originalValues.apartment,
          newApartment: newApartment,
          originalCity: originalValues.city,
          newCity: newCity,
          originalState: originalValues.state,
          newState: newState,
          originalZip: originalValues.zip,
          newZip: newZip
        });
        
        // Check all fields that could have changed
        const hasChanges = newAddress !== originalValues.address ||
                          newApartment !== originalValues.apartment ||
                          newCity !== originalValues.city ||
                          newState !== originalValues.state ||
                          newZip !== originalValues.zip;
        
        debugLog('MBA12345', `Location has changes: ${hasChanges}`);
        return hasChanges;
      }
    }
    
    // For other fields, direct comparison
    return value !== originalValues[field];
  };

  // Handle edit field
  const handleEdit = (field, currentValue) => {
    debugLog('MBA230uvj0834h9', `Edit ${field}:`, currentValue);
    
    // For location field, pass the current display value as a string for the modal
    if (field === 'location') {
      // Use the current display value (formatted address or constructed address)
      setEditValue(currentValue || '');
    } else {
      setEditValue(currentValue);
    }
    
    // This triggers the modal to open
    setEditingField(field);
    
    // Mark that we're starting an edit
    setHasEdits(true);
    
    // Notify parent component
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  // Update extractAddressComponents to handle address objects correctly
  const extractAddressComponents = async (locationData) => {
    let addressComponents = {};
    
    // If we're getting a validated address object from AddressAutocomplete
    if (locationData && typeof locationData === 'object' && 'components' in locationData) {
      debugLog('MBA8901', 'Processing validated address from autocomplete:', locationData);
      
      addressComponents = {
        address: locationData.components.street || '',
        apartment: locationData.components.apartment || '',
        city: locationData.components.city || '',
        state: locationData.components.state || 'Colorado',
        zip: locationData.components.zip || ''
      };
      
      // Coordinates are already included from the autocomplete
      if (locationData.coordinates) {
        addressComponents.coordinates = locationData.coordinates;
        debugLog('MBA8901', 'Using coordinates from validated address:', locationData.coordinates);
      }
    }
    // Legacy: If we're getting an addressForm object from our old modal
    else if (locationData && typeof locationData === 'object') {
      // If it's an address form with street property
      if ('street' in locationData) {
        addressComponents = {
          address: locationData.street || '',
          apartment: locationData.apartment || '',
          city: locationData.city || '',
          state: locationData.state || 'Colorado',
          zip: locationData.zip || ''
        };
      }
      // If it's our own object with address property
      else if ('address' in locationData) {
        addressComponents = {
          address: locationData.address || '',
          apartment: locationData.apartment || '',
          city: locationData.city || '',
          state: locationData.state || 'Colorado',
          zip: locationData.zip || ''
        };
      }
      
      // Only try to geocode if we don't already have coordinates
      if (!addressComponents.coordinates && addressComponents.address && addressComponents.city && addressComponents.state) {
        debugLog('MBA7890', 'Attempting to geocode legacy address:', addressComponents);
        
        const coordinates = await geocodeAddressGraceful({
          street: addressComponents.address,
          apartment: addressComponents.apartment,
          city: addressComponents.city,
          state: addressComponents.state,
          zip: addressComponents.zip
        });

        if (coordinates) {
          debugLog('MBA7890', 'Geocoding successful, adding coordinates:', coordinates);
          addressComponents.coordinates = coordinates;
        } else {
          debugLog('MBA7890', 'Geocoding failed, saving address without coordinates');
        }
      }
    }
    // If we're getting a string (legacy format)
    else if (typeof locationData === 'string') {
      const components = locationData.split(',').map(part => part.trim());
      addressComponents = {
        address: components[0] || '',
        apartment: '',
        city: components[1] || '',
        state: components[2] || 'Colorado',
        zip: components[3] || ''
      };
      
      // Try to geocode string addresses
      if (addressComponents.address && addressComponents.city && addressComponents.state) {
        const coordinates = await geocodeAddressGraceful({
          street: addressComponents.address,
          apartment: addressComponents.apartment,
          city: addressComponents.city,
          state: addressComponents.state,
          zip: addressComponents.zip
        });

        if (coordinates) {
          addressComponents.coordinates = coordinates;
        }
      }
    }
    // Default empty object if all else fails
    else {
      addressComponents = {
        address: '',
        apartment: '',
        city: '',
        state: 'Colorado',
        zip: ''
      };
    }
    
    return addressComponents;
  };

  // Set original values when props change
  useEffect(() => {
    // Only set original values once on component mount
    const locationDisplay = `${city || ''}${state ? `, ${state}` : ''}`;
    
    setOriginalValues({
      name: name || authName || "Your Name",
      email: email || "",
      bio: isProfessional ? bio : about_me,
      location: locationDisplay,
      address: address || '',
      apartment: '',
      city: city || '',
      state: state || 'Colorado',
      zip: zip || '',
      insurance: insurance
    });
  }, []); // Empty dependency array - only run once on mount
  
  // Simplify the handleSaveField function to avoid state update loops
  const handleSaveField = async (field, value) => {
    // Skip if no changes (keep this logic)
    if (!hasFieldChanged(field, value)) {
      debugLog('MBA230uvj0834h9', `No changes detected for ${field}, skipping save.`);
      setEditingField(null);
      
      // Reset state since no changes were made
      setHasEdits(false);
      if (setHasUnsavedChanges) {
        setHasUnsavedChanges(false);
      }
      return;
    }

    debugLog('MBA12345', `Changes detected for ${field}, proceeding with save.`, { value });
    setIsSaving(true);
    
    try {
      let profileData = {};
      
      switch (field) {
        case 'name':
          profileData = { name: value };
          break;
        case 'email':
          profileData = { email: value };
          break;
        case 'bio':
          // Make it clearer which field we're updating
          if (isProfessional) {
            profileData = { bio: value };
            debugLog('MBA4928', 'Saving professional bio:', value);
          } else {
            profileData = { about_me: value };
            debugLog('MBA4928', 'Saving client about_me:', value);
          }
          break;
        case 'location':
          debugLog('MBA12345', 'Extracting address components from:', value);
          const locationComponents = await extractAddressComponents(value);
          debugLog('MBA12345', 'Extracted components:', locationComponents);
          
          profileData = {
            address: locationComponents.address,
            apartment: locationComponents.apartment,
            city: locationComponents.city,
            state: locationComponents.state,
            zip: locationComponents.zip
          };

          // Add coordinates if geocoding was successful
          if (locationComponents.coordinates) {
            profileData.coordinates = locationComponents.coordinates;
            debugLog('MBA7890', 'Including coordinates in profile update:', locationComponents.coordinates);
          }
          break;
        case 'insurance':
          profileData = { insurance: value };
          break;
        default:
          break;
      }
      
      // Call API to update only the changed field
      debugLog('MBA4928', `Saving ${field} to backend:`, profileData);
      const updatedProfile = await updateProfileInfo(profileData);
      debugLog('MBA4928', `Backend response for ${field}:`, updatedProfile);
      
      // Update display values first
      if (field === 'name') {
        setDisplayValues({
          ...displayValues, 
          name: updatedProfile.name || displayValues.name
        });
        
        // Update original values to match the new values from the server
        setOriginalValues(prevValues => ({
          ...prevValues,
          name: updatedProfile.name || prevValues.name
        }));
      } else if (field === 'email') {
        setDisplayValues({
          ...displayValues, 
          email: updatedProfile.email || displayValues.email
        });
        
        // Update original values
        setOriginalValues(prevValues => ({
          ...prevValues,
          email: updatedProfile.email || prevValues.email
        }));
      } else if (field === 'bio') {
        // Update display values with the correct field from the response
        if (isProfessional) {
          setDisplayValues({
            ...displayValues, 
            bio: updatedProfile.bio || displayValues.bio
          });
          
          // Update original values
          setOriginalValues(prevValues => ({
            ...prevValues,
            bio: updatedProfile.bio || prevValues.bio
          }));
        } else {
          setDisplayValues({
            ...displayValues, 
            bio: updatedProfile.about_me || displayValues.bio
          });
          
          // Update original values
          setOriginalValues(prevValues => ({
            ...prevValues,
            bio: updatedProfile.about_me || prevValues.bio
          }));
        }
      } else if (field === 'location') {
        // Use formatted address if available, otherwise construct from components
        const newLocation = updatedProfile.coordinates?.formatted_address || 
                           `${updatedProfile.address || ''}${updatedProfile.city ? `, ${updatedProfile.city}` : ''}${updatedProfile.state ? `, ${updatedProfile.state}` : ''}`;
        setDisplayValues({
          ...displayValues, 
          location: newLocation
        });
        
        // Update original values for all address components
        setOriginalValues(prevValues => ({
          ...prevValues,
          location: newLocation,
          address: updatedProfile.address || prevValues.address,
          apartment: updatedProfile.apartment || prevValues.apartment,
          city: updatedProfile.city || prevValues.city,
          state: updatedProfile.state || prevValues.state,
          zip: updatedProfile.zip || prevValues.zip
        }));
      } else if (field === 'insurance') {
        setSelectedInsurance(value);
        
        // Update original values
        setOriginalValues(prevValues => ({
          ...prevValues,
          insurance: value
        }));
      }
      
      // Log the updated original values for debugging
      debugLog('MBA4928', `Original values updated after save for ${field}`, { 
        originalValues: {
          ...originalValues,
          [field]: field === 'location' ? 
            `${updatedProfile.address || ''}${updatedProfile.city ? `, ${updatedProfile.city}` : ''}${updatedProfile.state ? `, ${updatedProfile.state}` : ''}` : 
            updatedProfile[field]
        }
      });
      
      // Success notification
      showToast({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
        type: 'success',
        duration: 3000
      });
      
      // Reset state since changes were saved
      setHasEdits(false);
      if (setHasUnsavedChanges) {
        setHasUnsavedChanges(false);
      }
      
      // Notify parent component if needed
      if (onSaveComplete) {
        onSaveComplete(updatedProfile);
      }
    } catch (error) {
      debugLog('MBA4928', `Error saving ${field}:`, error);
      
      // Show error toast
      showToast({
        message: `Failed to update ${field}. Please try again.`,
        type: 'error',
        duration: 4000
      });
      
      // Keep edit state if there was an error
      if (setHasUnsavedChanges) {
        setHasUnsavedChanges(true);
      }
    } finally {
      setIsSaving(false);
      setEditingField(null);
    }
  };

  // Update handle save to call the new function
  const handleSave = (value) => {
    debugLog('MBA4928', `Save ${editingField} to value:`, value);
    
    if (editingField === 'insurance') {
      handleSaveField('insurance', value);
    } else if (editingField === 'location') {
      handleSaveField('location', value);
    } else {
      // For text fields, update the display value first
      const newDisplayValues = { ...displayValues };
      newDisplayValues[editingField] = value;
      setDisplayValues(newDisplayValues);
      
      // Then save to backend
      handleSaveField(editingField, value);
    }
  };

  const location = `${city}${state ? `, ${state}` : ''}`;
  
  // Display name (use display values instead of context)
  const displayName = displayValues.name || "Your Name";
  
  // Simplify the profile photo handler
  const handleProfilePhotoSelection = async () => {
    try {
      // Let the parent component handle the actual image picking
      const newPhotoUri = await pickImage();
      
      if (newPhotoUri) {
        setIsSaving(true);
        
        // Create form data for photo upload
        const formData = new FormData();
        const photoFile = {
          uri: newPhotoUri,
          type: 'image/jpeg',
          name: 'profile_photo.jpg'
        };
        
        formData.append('profile_picture', photoFile);
        
        // Upload the photo directly
        debugLog('MBA4928', 'Uploading profile photo');
        await updateProfileInfo(formData);
        
        showToast({
          message: 'Profile photo updated successfully',
          type: 'success',
          duration: 3000
        });
        
        // No need to update local state - let the parent handle it via onSaveComplete
      }
    } catch (error) {
      debugLog('MBA4928', 'Error uploading profile photo:', error);
      showToast({
        message: 'Failed to update profile photo. Please try again.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Simplify the portfolio photo handler
  const handleAddPortfolioPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled) {
        setIsSaving(true);
        
        // Create form data for photo upload
        const formData = new FormData();
        const photoFile = {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'portfolio_photo.jpg'
        };
        
        formData.append('portfolio_photo', photoFile);
        
        // Upload the photo - don't update state based on response
        debugLog('MBA4928', 'Uploading portfolio photo');
        await updateProfileInfo(formData);
        
        // Just add to local portfolio photos
        setPortfolioPhotos([...portfolioPhotos, result.assets[0].uri]);
        
        showToast({
          message: 'Portfolio photo added successfully',
          type: 'success',
          duration: 3000
        });
      }
    } catch (error) {
      debugLog('MBA4928', 'Error adding portfolio photo:', error);
      showToast({
        message: 'Failed to add portfolio photo. Please try again.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderFacilitiesSection = () => {
    // TODO: Remove the !isProfessional once we have a way to edit facilities
    if (isProfessional || !isProfessional) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Home & Facilities</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => onNavigateToTab('pets_preferences')}
          >
            <View style={styles.editButtonContent}>
              <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
              <Text style={styles.editButtonText}>Edit Facilities</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.facilitiesGrid}>
          {[
            { icon: 'home', title: 'Housing Type', value: 'Private House' },
            { icon: 'tree', title: 'Outdoor Space', value: 'Fenced Yard' },
            { icon: 'shield-check', title: 'Security', value: '24/7 Monitoring' }
          ].map((facility, index) => (
            <View 
              key={facility.title} 
              style={[
                styles.facilityItem,
                { backgroundColor: index % 2 === 0 ? 
                  theme.colors.proDashboard.secondary : 
                  theme.colors.proDashboard.tertiary 
                }
              ]}
            >
              <MaterialCommunityIcons name={facility.icon} size={24} color={theme.colors.text} />
              <View style={styles.facilityContent}>
                <Text style={styles.facilityTitle}>{facility.title}</Text>
                <Text style={styles.facilityValue}>{facility.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderInsuranceSection = () => {
    if (!isProfessional) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Insurance</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEdit('insurance', JSON.stringify(selectedInsurance))}
          >
            <View style={styles.editButtonContent}>
              <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
              <Text style={styles.editButtonText}>Edit Insurance</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.insuranceContent}>
          {selectedInsurance.type === 'custom' && selectedInsurance.card ? (
            <View style={styles.customInsuranceCard}>
              <Image 
                source={{ uri: selectedInsurance.card }} 
                style={styles.insuranceCardImage}
              />
              <Text style={styles.insuranceCardText}>Custom Insurance Card</Text>
            </View>
          ) : (
            <View style={styles.insuranceOption}>
              <MaterialCommunityIcons 
                name={selectedInsurance.type === 'none' ? 'shield-off' : 'shield-check'} 
                size={24} 
                color={theme.colors.primary} 
              />
              <View style={styles.insuranceOptionContent}>
                <Text style={styles.insuranceOptionTitle}>
                  {INSURANCE_OPTIONS.find(opt => opt.id === selectedInsurance.type)?.label || 'No Insurance'}
                </Text>
                <Text style={styles.insuranceOptionDescription}>
                  {INSURANCE_OPTIONS.find(opt => opt.id === selectedInsurance.type)?.description || 'No insurance selected'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={[styles.mainContent, !isMobile && styles.desktopLayout]}>
          {/* Profile Photo Section */}
          <View style={[styles.profileSection, !isMobile && styles.profileSectionDesktop]}>
            <View style={styles.profileCard}>
              <TouchableOpacity onPress={handleProfilePhotoSelection} style={styles.profilePhotoContainer}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                    <MaterialCommunityIcons name="camera-plus" size={40} color={theme.colors.placeholder} />
                  </View>
                )}
                <View style={styles.cameraButton}>
                  <MaterialCommunityIcons name="camera" size={20} color={theme.colors.background} />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <View style={styles.nameContainer}>
                  <Text style={styles.name}>{displayValues.name}</Text>
                  <TouchableOpacity 
                    style={styles.editIcon}
                    onPress={() => handleEdit('name', displayValues.name)}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.emailContainer}>
                  <MaterialCommunityIcons name="email" size={16} color={theme.colors.secondary} />
                  <Text style={styles.email}>{displayValues.email || 'No email provided'}</Text>
                  <TouchableOpacity 
                    style={styles.editIcon}
                    onPress={() => handleEdit('email', displayValues.email)}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.locationContainer}>
                  <View style={styles.locationIconWrapper}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.secondary} />
                  </View>
                  <Text style={styles.location}>{displayValues.location || 'Set Location'}</Text>
                  <TouchableOpacity 
                    style={styles.locationEditIcon}
                    onPress={() => handleEdit('location', displayValues.location)}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.reviewsContainer}>
                  {rating ? (
                    <View style={styles.ratingContainer}>
                      <MaterialCommunityIcons name="star" size={20} color={theme.colors.warning} />
                      <Text style={styles.rating}>{rating}</Text>
                      <Text style={styles.reviews}>({reviews} reviews)</Text>
                    </View>
                  ) : (
                    <Text style={styles.noReviews}>No reviews yet</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Right Side Sections */}
          <View style={[styles.sectionsContainer, !isMobile && styles.sectionsContainerDesktop]}>
            {/* About Me Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{isProfessional ? 'Professional Bio' : 'About Me'}</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEdit('bio', displayValues.bio)}
                >
                  <Text style={styles.editButtonText}>Edit {isProfessional ? 'Bio' : 'About Me'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.bioText}>
                {displayValues.bio || 'Tell us about yourself...'}
              </Text>
            </View>

            {/* Show either Home & Facilities (for owners) or Insurance (for professionals) */}
            {/* TODO: UNCOMMONT THIS SECTION after mvp launch and implementation of facilities and insurance */}
            {/* {isProfessional ? renderInsuranceSection() : renderFacilitiesSection()} */}

            {/* TODO: UNCOMMONT THIS SECTION
            Portfolio Photos Section - comment this out for now
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Portfolio Photos</Text>
                <TouchableOpacity 
                  style={styles.addPhotoButton}
                  onPress={handleAddPortfolioPhoto}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
                  <Text style={styles.addPhotoText}>Add Photos</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.photoGrid}>
                {portfolioPhotos.map((photo, index) => (
                  <Image 
                    key={index} 
                    source={{ uri: photo }} 
                    style={styles.portfolioPhoto} 
                  />
                ))}
                {portfolioPhotos.length === 0 && (
                  <Text style={styles.noPhotosText}>No photos added yet</Text>
                )}
              </View>
            </View> */}
          </View>
        </View>
      </View>

      <EditOverlay
        visible={!!editingField}
        onClose={() => setEditingField(null)}
        title={`Edit ${editingField?.charAt(0).toUpperCase()}${editingField?.slice(1)}`}
        value={editValue}
        onSave={handleSave}
        isLocation={editingField === 'location'}
        isMultiline={editingField === 'bio' || editingField === 'about_me'}
        isProfessional={isProfessional}
        isInsurance={editingField === 'insurance'}
        selectedInsurance={selectedInsurance}
        onInsuranceChange={setSelectedInsurance}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  contentWrapper: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 16,
  },
  mainContent: {
    width: '100%',
  },
  desktopLayout: {
    flexDirection: 'row',
    gap: 24,
  },
  profileSection: {
    marginBottom: 24,
  },
  profileSectionDesktop: {
    width: 300,
    marginBottom: 0,
  },
  profileCard: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 16,
  },
  profilePhotoContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  profilePhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  cameraButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
  locationContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
    position: 'relative',
    paddingHorizontal: 20,
  },
  locationIconWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  location: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontFamily: theme.fonts?.regular?.fontFamily,
    textAlign: 'center',
    flex: 1,
  },
  locationEditIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  editIcon: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  reviews: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  sectionsContainer: {
    flex: 1,
  },
  sectionsContainerDesktop: {
    paddingLeft: 24,
  },
  section: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  editButton: {
    backgroundColor: 'transparent',
  },
  editButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  bioInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: theme.colors.text,
  },
  facilitiesGrid: {
    gap: 16,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  facilityContent: {
    marginLeft: 12,
  },
  facilityTitle: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  facilityValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 2,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addPhotoText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  reviewsContainer: {
    marginBottom: 12,
  },
  noReviews: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  bioText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
  locationButtons: {
    gap: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
  },
  locationButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
  orText: {
    textAlign: 'center',
    color: theme.colors.secondary,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  portfolioPhoto: {
    width: '30%',
    aspectRatio: 4/3,
    borderRadius: 8,
  },
  noPhotosText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  facilitiesModalContent: {
    height: '80%',
    width: '90%',
    maxWidth: 500,
  },
  facilitiesScrollView: {
    flex: 1,
    marginBottom: 16,
  },
  facilityPresetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  selectedFacilityPreset: {
    backgroundColor: theme.colors.primary,
  },
  facilityPresetContent: {
    flex: 1,
    marginLeft: 12,
  },
  facilityPresetTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  facilityPresetDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  selectedFacilityText: {
    color: theme.colors.background,
  },
  checkIcon: {
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
  },
  modalCancelText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  modalSaveText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  locationModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  locationContent: {
    gap: 16,
    paddingBottom: 16,
  },
  addressInstructions: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  addressAutocomplete: {
    marginBottom: 12,
  },
  selectedAddressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.success + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  selectedAddressText: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '500',
  },
  addressForm: {
    gap: 12,
  },
  addressInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 44,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  maxFacilitiesText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  insuranceContent: {
    gap: 16,
  },
  customInsuranceCard: {
    alignItems: 'center',
    gap: 8,
  },
  insuranceCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  insuranceCardText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  insuranceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 8,
    gap: 16,
  },
  insuranceOptionContent: {
    flex: 1,
  },
  insuranceOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  insuranceOptionDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  editButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  insuranceStepContent: {
    gap: 16,
  },
  insuranceStepTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 16,
  },
  insuranceTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 8,
    gap: 16,
  },
  insuranceTypeContent: {
    flex: 1,
  },
  insuranceTypeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  insuranceTypeDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  selectedInsuranceOption: {
    backgroundColor: theme.colors.primary + '20',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.fonts?.header?.fontFamily,
  },
  modalTitleCentered: {
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    left: 0,
    padding: 8,
    zIndex: 1,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalCloseText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileInfoTab; 