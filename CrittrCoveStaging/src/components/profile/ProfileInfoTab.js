import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext, debugLog } from '../../context/AuthContext';
import FloatingSaveButton from '../../components/FloatingSaveButton';

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
        value={address.state}
        onChangeText={(text) => setAddress(prev => ({ ...prev, state: text }))}
        placeholder="State"
      />
    </View>
    <View style={styles.addressRow}>
      <TextInput
        style={[styles.addressInput, { flex: 1 }]}
        value={address.zip}
        onChangeText={(text) => setAddress(prev => ({ ...prev, zip: text }))}
        placeholder="ZIP Code"
        keyboardType="numeric"
      />
      <TextInput
        style={[styles.addressInput, { flex: 2 }]}
        value={address.country}
        onChangeText={(text) => setAddress(prev => ({ ...prev, country: text }))}
        placeholder="Country"
      />
    </View>
  </View>
);

const EditOverlay = ({ visible, onClose, title, value, onSave, isLocation, isMultiline, isProfessional, isInsurance, selectedInsurance = { type: 'none', card: null }, onInsuranceChange }) => {
  const [localValue, setLocalValue] = useState('');
  const [localInsurance, setLocalInsurance] = useState(selectedInsurance);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [addressForm, setAddressForm] = useState({
    street: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });
  const [insuranceStep, setInsuranceStep] = useState(1); // 1: Choose type, 2: Upload/Select insurance
  const [insuranceType, setInsuranceType] = useState(null); // 'own' or 'platform'

  useEffect(() => {
    if (visible) {
      if (isInsurance) {
        setLocalInsurance(selectedInsurance);
        setInsuranceStep(1);
        setInsuranceType(null);
      } else if (isLocation) {
        // Parse the existing address if available
        const addressParts = value.split(',').map(part => part.trim());
        setAddressForm({
          street: addressParts[0] || '',
          apartment: '',
          city: addressParts[1] || '',
          state: addressParts[2] || '',
          zip: addressParts[3] || '',
          country: addressParts[4] || ''
        });
      } else {
        setLocalValue(value || '');
      }
    }
  }, [visible, value, selectedInsurance]);

  const handleSave = () => {
    if (isInsurance) {
      onSave(localInsurance);
    } else if (isLocation) {
      const formattedAddress = [
        addressForm.street,
        addressForm.apartment,
        addressForm.city,
        addressForm.state,
        addressForm.zip,
        addressForm.country
      ].filter(Boolean).join(', ');
      onSave(formattedAddress);
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
        Alert.alert('Permission denied', 'Please enable location services to use this feature.');
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
          <TouchableOpacity 
            style={styles.insuranceTypeButton}
            onPress={() => handleInsuranceTypeSelect('platform')}
          >
            <MaterialCommunityIcons name="shield-check" size={24} color={theme.colors.primary} />
            <View style={styles.insuranceTypeContent}>
              <Text style={styles.insuranceTypeTitle}>Use Platform Insurance</Text>
              <Text style={styles.insuranceTypeDescription}>Select from our insurance providers</Text>
            </View>
          </TouchableOpacity>
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
                {!isProfessional && (
                  <TouchableOpacity 
                    style={styles.locationButton}
                    onPress={handleGetCurrentLocation}
                    disabled={isLoadingLocation}
                  >
                    {isLoadingLocation ? (
                      <ActivityIndicator color={theme.colors.background} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.colors.background} />
                        <Text style={styles.locationButtonText}>Use Current Location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <AddressForm address={addressForm} setAddress={setAddressForm} />
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
          
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.modalSaveButton,
                isLocation && !addressForm.street && styles.modalSaveButtonDisabled
              ]} 
              onPress={handleSave}
              disabled={isLocation && !addressForm.street}
            >
              <Text style={styles.modalSaveText}>Continue Editing</Text>
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
  bio,
  about_me,
  emergencyContact,
  authorizedHouseholdMembers,
  editMode,
  toggleEditMode,
  onChangeText,
  pickImage,
  setHasUnsavedChanges,
  onSaveChanges,
  isMobile,
  rating,
  reviews,
  role,
  isProfessional,
  insurance = { type: 'none', card: null },
  onNavigateToTab,
}) => {
  const { name: authName } = useContext(AuthContext);
  
  // Track direct user edits
  const [hasEdits, setHasEdits] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [selectedInsurance, setSelectedInsurance] = useState(insurance);
  // Add state to track edited values that should display in the UI
  const [displayValues, setDisplayValues] = useState({
    name: authName || "Your Name",
    email: email || "",
    bio: isProfessional ? bio : about_me,
    location: `${city}${state ? `, ${state}` : ''}`,
  });
  
  // Log initial props
  useEffect(() => {
    debugLog('MBA230uvj0834h9', 'ProfileInfoTab mounted with props:', { 
      name: authName, email, address, bio, about_me, profilePhoto 
    });
    
    // Initialize location once
    const locationText = `${city}${state ? `, ${state}` : ''}`;
    setDisplayValues(prev => ({ ...prev, location: locationText }));
  }, []);
  
  // Handle edit field
  const handleEdit = (field, currentValue) => {
    debugLog('MBA230uvj0834h9', `Edit ${field}:`, currentValue);
    setEditValue(currentValue);
    setEditingField(field);
  };

  // Handle location save specifically
  const formatLocation = (locationValue) => {
    if (!locationValue || locationValue.trim() === '') return '';
    
    // Parse the parts
    const parts = locationValue.split(',').map(part => part.trim());
    const city = parts[0] || '';
    const state = parts[1] || '';
    
    // Format according to our standard
    return `${city}${state ? `, ${state}` : ''}`;
  };

  // Handle save of edited field
  const handleSave = (value) => {
    debugLog('MBA230uvj0834h9', `Save ${editingField} from ${editValue} to:`, value);
    
    if (editingField === 'insurance') {
      setSelectedInsurance(value);
      onChangeText('insurance', value);
    } else if (editingField === 'location') {
      // Format location
      const formattedLocation = formatLocation(value);
      setDisplayValues(prev => ({
        ...prev,
        location: formattedLocation
      }));
      
      onChangeText('location', value);
      onChangeText('address', value);
    } else {
      // For text fields, update displayValues to show changes immediately
      setDisplayValues(prev => ({
        ...prev,
        [editingField]: value
      }));
      
      onChangeText(editingField, value);
    }
    
    // Mark that user has made an edit
    setHasEdits(true);
    setHasUnsavedChanges(true);
    setEditingField(null);
  };

  // Handle profile photo change
  const handleProfilePhotoUpdate = async () => {
    const result = await pickImage();
    if (result) {
      debugLog('MBA230uvj0834h9', 'Profile photo updated');
      setHasEdits(true);
      setHasUnsavedChanges(true);
    }
  };
  
  // Handle portfolio photo addition
  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const newPhotos = [...portfolioPhotos, result.assets[0].uri];
      setPortfolioPhotos(newPhotos);
      onChangeText('portfolioPhotos', newPhotos);
      setHasEdits(true);
      setHasUnsavedChanges(true);
    }
  };
  
  // Handle insurance change
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
        setSelectedInsurance(newInsurance);
        onChangeText('insurance', newInsurance);
        setHasEdits(true);
        setHasUnsavedChanges(true);
      }
    } else {
      const newInsurance = { type: insuranceType, card: null };
      setSelectedInsurance(newInsurance);
      onChangeText('insurance', newInsurance);
      setHasEdits(true);
      setHasUnsavedChanges(true);
    }
  };
  
  // Handle save all changes
  const handleSaveAllChanges = () => {
    debugLog('MBA230uvj0834h9', 'Saving all changes', displayValues);
    
    // Call parent's save function
    onSaveChanges();
    
    // Reset flags for edits
    setHasEdits(false);
    setHasUnsavedChanges(false);
    
    // Log saved values for verification
    debugLog('MBA230uvj0834h9', 'Changes saved. Current values:', {
      name: displayValues.name,
      email: displayValues.email,
      bio: displayValues.bio,
      location: displayValues.location
    });
  };

  const location = `${city}${state ? `, ${state}` : ''}`;
  
  // Display name (use context value if available)
  const displayName = authName || "Your Name";
  
  const renderFacilitiesSection = () => {
    if (isProfessional) return null;

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
              <TouchableOpacity onPress={handleProfilePhotoUpdate} style={styles.profilePhotoContainer}>
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
                  <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.secondary} />
                  <Text style={styles.location}>{displayValues.location || 'Select Location'}</Text>
                  <TouchableOpacity 
                    style={styles.editIcon}
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
                <Text style={styles.sectionTitle}>About Me</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEdit('bio', displayValues.bio)}
                >
                  <Text style={styles.editButtonText}>Edit Bio</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.bioText}>
                {displayValues.bio || 'Tell us about yourself...'}
              </Text>
            </View>

            {/* Show either Home & Facilities (for owners) or Insurance (for professionals) */}
            {isProfessional ? renderInsuranceSection() : renderFacilitiesSection()}

            {/* Portfolio Photos Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Portfolio Photos</Text>
                <TouchableOpacity 
                  style={styles.addPhotoButton}
                  onPress={handleAddPhoto}
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
            </View>
          </View>
        </View>
      </View>

      {/* Profile FloatingSaveButton - simple approach with direct visibility */}
      <FloatingSaveButton 
        visible={hasEdits}
        onSave={handleSaveAllChanges}
        btnText="Save Changes"
      />

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
        onInsuranceChange={handleInsuranceChange}
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
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    fontSize: 14,
    color: theme.colors.secondary,
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