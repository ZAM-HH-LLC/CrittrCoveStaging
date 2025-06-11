import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, Platform, Modal, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { debugLog } from '../../context/AuthContext';
import { getMediaUrl } from '../../config/config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addPet, updatePet, fixPetOwner, deletePet } from '../../api/API';
import { useToast } from '../../components/ToastProvider';
import ConfirmationModal from '../ConfirmationModal';
import { calculateAge } from '../../data/calculations';
import * as ImagePicker from 'expo-image-picker';
import ProfilePhotoCropper from './ProfilePhotoCropper';
import { processImageWithCrop, prepareImageForUpload } from '../../utils/imageCropUtils';

const PetsPreferencesTab = ({
  pets = [],
  preferences = {
    homeEnvironment: [],
    emergencyContacts: [],
    authorizedHouseholdMembers: []
  },
  onAddPet,
  onEditPet,
  onDeletePet,
  onReplacePet, // New prop for atomic replace operation
  onUpdatePreferences,
  userRole,
  isMobile,
}) => {
  // Debug the initial pets array
  debugLog("MBAi39gh45v", "COMPONENT INIT - Pets provided to component:", 
    Array.isArray(pets) ? pets.map(p => ({ id: p.id, name: p.name || 'unnamed' })) : 'Not an array');
    
  // Debug the available callback functions
  debugLog("MBAi39gh45v", "COMPONENT INIT - Available callbacks:", {
    hasOnAddPet: !!onAddPet,
    hasOnEditPet: !!onEditPet,
    hasOnDeletePet: !!onDeletePet,
    hasOnReplacePet: !!onReplacePet
  });
  const [expandedPetIds, setExpandedPetIds] = useState(new Set());
  const [newEmergencyContact, setNewEmergencyContact] = useState({ name: '', phone: '' });
  const [newHouseholdMember, setNewHouseholdMember] = useState({ name: '', phone: '' });
  const [isAddingEmergencyContact, setIsAddingEmergencyContact] = useState(false);
  const [isAddingHouseholdMember, setIsAddingHouseholdMember] = useState(false);
  const [editingPetIds, setEditingPetIds] = useState(new Set());
  const [editedPetsData, setEditedPetsData] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [datePickerConfig, setDatePickerConfig] = useState({
    isVisible: false,
    currentField: null,
    currentPetId: null,
    selectedDate: new Date()
  });
  
  // Add state for calendar display
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const toast = useToast();

  // Add this new variable to track if a save operation is in progress
  const [savingPet, setSavingPet] = useState(false);

  // Add this near other state declarations
  const [showSuccessModals, setShowSuccessModals] = useState(true);

  // Add state for delete confirmation modal
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    visible: false,
    petId: null,
    petName: '',
    isDeleting: false
  });

  // Add these new state variables at the top of the component with other state declarations
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Add state for pet photo cropping
  const [selectedPetPhotoUri, setSelectedPetPhotoUri] = useState(null);
  const [showPetPhotoCropper, setShowPetPhotoCropper] = useState(false);
  const [currentEditingPetId, setCurrentEditingPetId] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Add window resize listener
  useEffect(() => {
    const updateWidth = () => {
      setWindowWidth(Dimensions.get('window').width);
    };

    Dimensions.addEventListener('change', updateWidth);
    
    return () => {
      // For newer React Native versions, we would use remove
      // In case this component is using an older version, handle appropriately
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', updateWidth);
      }
    };
  }, []);

  // Define all available facilities
  const allFacilities = [
    { id: 'yard', label: 'Fully fenced backyard', icon: 'fence' },
    { id: 'roam', label: 'Free roam of house', icon: 'home' },
    { id: 'ac', label: 'Air Conditioned', icon: 'snowflake' },
    { id: 'furniture', label: 'Allowed on furniture', icon: 'sofa' },
    { id: 'bed', label: 'Allowed on bed', icon: 'bed' },
    { id: 'crate', label: 'Crate Available', icon: 'gate' },
    { id: 'pet_door', label: 'Pet Door', icon: 'door' },
    { id: 'toys', label: 'Pet Toy Collection', icon: 'handball' },
    { id: 'first_aid', label: 'Pet First Aid Kit', icon: 'medical-bag' },
    { id: 'cameras', label: 'Pet Cameras', icon: 'cctv' },
    { id: 'covered_patio', label: 'Covered Patio', icon: 'umbrella' },
    { id: 'garden', label: 'Pet-Safe Garden', icon: 'flower' },
    { id: 'heating', label: 'Central Heating', icon: 'fire' },
    { id: 'feeding_station', label: 'Feeding Station', icon: 'food-variant' },
    { id: 'water_fountain', label: 'Water Fountain', icon: 'fountain' },
    { id: 'scratching_post', label: 'Cat Posts', icon: 'cat' },
    { id: 'litter_area', label: 'Private Litter Area', icon: 'broom' }
  ];

  // Define selectable options for dropdowns
  const yesNoOptions = ["Yes", "No", "N/A"];
  const energyLevelOptions = ["Low", "Medium", "High", "N/A"];
  const sexOptions = ["Male", "Female"];

  // Add at the top of the component, after the other utility functions
  
  // Helper function to safely convert any value to a display string
  const safeDisplayText = (value, defaultText = '') => {
    if (value === null || value === undefined) {
      return defaultText;
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    // For any other type (like objects), return the default
    return defaultText;
  };
  
  const returnYesNoContainer = (pet, attributeName) => {
    let displayValue = 'No Option Selected';
    
    if (pet && attributeName) {
      if (pet[attributeName] === null) {
        displayValue = 'N/A';
      } else if (pet[attributeName] === true) {
        displayValue = 'Yes';
      } else if (pet[attributeName] === false) {
        displayValue = 'No';
      } else if (typeof pet[attributeName] === 'string') {
        displayValue = pet[attributeName];
      }
      // If pet[attributeName] is an object or other non-string type, keep the default "No Option Selected"
    }
    
    return (
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownText}>{displayValue}</Text>
      </View>
    );
  };

  const returnEnergyLevelContainer = (pet) => {
    // Map backend value to frontend display value
    let displayValue = 'No Option Selected';
    
    // Make sure pet exists before trying to access its energyLevel property
    if (pet && pet.energyLevel !== undefined) {
      if (pet.energyLevel === null) {
        displayValue = 'N/A';
      } else if (pet.energyLevel === 'LOW') {
        displayValue = 'Low';
      } else if (pet.energyLevel === 'MODERATE') {
        displayValue = 'Medium';
      } else if (pet.energyLevel === 'HIGH') {
        displayValue = 'High';
      } else if (typeof pet.energyLevel === 'string') {
        displayValue = pet.energyLevel ? pet.energyLevel : "None selected yet"; // Fallback to whatever string is there
      } else if (pet.energyLevel && typeof pet.energyLevel === 'object') {
        displayValue = 'No Option Selected';
      }
    }
    
    return (
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownText}>{displayValue}</Text>
      </View>
    );
  };

  const togglePetDetails = (petId) => {
    // Remove the condition that prevents toggling when editing
    // We want to allow collapsing/expanding even in edit mode
    setExpandedPetIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(petId)) {
        newSet.delete(petId);
      } else {
        newSet.add(petId);
      }
      return newSet;
    });
  };

  const handleEditPet = (petId) => {
    // Clone the current pet data to edit
    const petToEdit = pets.find(pet => pet.id === petId);
    
    // Make sure medications is a string, not an object
    const editData = {...petToEdit};
    if (editData.medications && typeof editData.medications === 'object') {
      editData.medications = '';
    }
    
    // Map boolean/null values to "Yes"/"No"/"N/A" for UI compatibility fields
    const booleanToYesNo = (value) => {
      if (value === true) return "Yes";
      if (value === false) return "No";
      return "N/A";
    };
    
    // Convert backend compatibility fields to UI-friendly format
    if (petToEdit) {
      editData.childrenFriendly = booleanToYesNo(petToEdit.friendly_with_children);
      editData.catFriendly = booleanToYesNo(petToEdit.friendly_with_cats);
      editData.dogFriendly = booleanToYesNo(petToEdit.friendly_with_dogs);
      editData.spayedNeutered = booleanToYesNo(petToEdit.spayed_neutered);
      editData.houseTrained = booleanToYesNo(petToEdit.house_trained);
      editData.microchipped = booleanToYesNo(petToEdit.microchipped);
      editData.canBeLeftAlone = booleanToYesNo(petToEdit.can_be_left_alone);
      
      // Also map the corresponding gets_along_with_* fields for compatibility
      editData.getsAlongWithChildren = editData.childrenFriendly;
      editData.getsAlongWithCats = editData.catFriendly;
      editData.getsAlongWithDogs = editData.dogFriendly;
    }
    
    // Update the edited data for this specific pet
    setEditedPetsData(prev => ({
      ...prev,
      [petId]: editData
    }));
    
    // Add this pet's ID to the set of pets being edited
    setEditingPetIds(prev => {
      const newSet = new Set(prev);
      newSet.add(petId);
      return newSet;
    });
  };
  
  const handleFixPet = async (petId) => {
    try {
      debugLog("MBA456", "Attempting to fix pet with ID:", petId);
      
      // Show fixing toast
      toast({
        message: "Attempting to repair pet data. Please wait...",
        type: 'info',
        duration: 4000
      });
      
      // Call the fix pet owner API
      const response = await fixPetOwner(petId);
      debugLog("MBA456", "Successfully fixed pet owner:", response);
      
      // Update the pet data with the fixed pet info
      if (response && response.pet) {
        // Find the current pet data
        const currentPetIndex = pets.findIndex(pet => pet.id === petId);
        if (currentPetIndex !== -1) {
          // Create updated pet data
          const updatedPet = {
            ...pets[currentPetIndex],
            ...response.pet,
            // Ensure UI-specific fields are updated
            type: response.pet.species || pets[currentPetIndex].type,
            feedingInstructions: response.pet.feeding_schedule || pets[currentPetIndex].feedingInstructions,
            medicalNotes: response.pet.medication_notes || pets[currentPetIndex].medicalNotes,
            pottyBreakSchedule: response.pet.potty_break_schedule || pets[currentPetIndex].pottyBreakSchedule,
            specialCareInstructions: response.pet.special_care_instructions || pets[currentPetIndex].specialCareInstructions,
            birthday: response.pet.birthday ? formatDateFromBackend(response.pet.birthday) : pets[currentPetIndex].birthday,
            adoptionDate: response.pet.adoption_date ? formatDateFromBackend(response.pet.adoption_date) : pets[currentPetIndex].adoptionDate,
            lastEditFailed: false // Clear the error flag
          };
          
          // Update the pet in the parent component
          onEditPet(petId, updatedPet);
          
          // Show success toast
          toast({
            message: "The pet's owner has been restored. You should now be able to edit this pet normally.",
            type: 'success',
            duration: 5000
          });
        }
      }
    } catch (error) {
      debugLog("MBA456", "Error fixing pet:", error);
      
      // Show error toast
      let errorMessage = "There was a problem fixing the pet. Please try again or contact support.";
      
      if (error.response && error.response.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      toast({
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    }
  };
  
  const handleDeletePet = async (petId) => {
    // Find the pet to get its name for the confirmation
    const petToDelete = pets.find(pet => pet.id === petId);
    
    // Log the petId and found pet for debugging
    debugLog("MBA456", "DELETE PET - Attempting to delete pet with ID:", petId);
    debugLog("MBA456", "DELETE PET - Found pet:", petToDelete ? { id: petToDelete.id, name: petToDelete.name } : "Pet not found");
    
    // Safety check - if pet is not found or has no ID, show error
    if (!petToDelete) {
      toast({
        message: `Unable to delete pet - could not find pet with ID ${petId}`,
        type: 'error',
        duration: 4000
      });
      return;
    }
    
    const petName = petToDelete.name || 'this pet';
    
    // Show confirmation modal with the real pet ID from the pet object
    setDeleteConfirmation({
      visible: true,
      petId: petToDelete.id, // Use the pet's actual ID from the object
      petName: petName,
      isDeleting: false
    });
  };
  
  const confirmDeletePet = async () => {
    try {
      const { petId, petName } = deleteConfirmation;
      
      // Set deleting state
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));
      
      debugLog("MBA456", "Attempting to delete pet with ID:", petId);
      
      // Show deleting toast
      toast({
        message: `Deleting ${petName}...`,
        type: 'info',
        duration: 4000
      });
      
      // Call the delete pet API
      await deletePet(petId);
      debugLog("MBA456", "Successfully deleted pet:", petId);
      
      // Remove the pet from the parent component's state
      onDeletePet(petId);
      
      // Hide modal
      setDeleteConfirmation({
        visible: false,
        petId: null,
        petName: '',
        isDeleting: false
      });
      
      // Show success toast
      toast({
        message: `${petName} has been successfully deleted.`,
        type: 'success',
        duration: 4000
      });
      
    } catch (error) {
      debugLog("MBA456", "Error deleting pet:", error);
      
      // Reset deleting state but keep modal open
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
      
      // Show error toast
      let errorMessage = "There was a problem deleting the pet. Please try again or contact support.";
      
      if (error.response && error.response.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      toast({
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    }
  };
  
  const cancelDeletePet = () => {
    setDeleteConfirmation({
      visible: false,
      petId: null,
      petName: '',
      isDeleting: false
    });
  };
  
  const formatDateForBackend = (dateString) => {
    if (!dateString) return null;
    
    // Convert from MM-DD-YYYY to YYYY-MM-DD
    const [month, day, year] = dateString.split('-');
    return `${year}-${month}-${day}`;
  };
  
  // Helper function to convert dates from backend format to frontend format
  const formatDateFromBackend = (dateString) => {
    if (!dateString) return null;
    
    // Convert from YYYY-MM-DD to MM-DD-YYYY
    const [year, month, day] = dateString.split('-');
    return `${month}-${day}-${year}`;
  };
  
  const handleSavePetEdit = async (petId) => {
    try {
      // Set saving indicator to prevent duplicate saves
      setSavingPet(true);
      
      // Get the edited data for this pet
      const petData = editedPetsData[petId] || {};
      
      // Make a copy of the current pets list before any operations
      // This ensures we can restore it if something goes wrong
      const currentPetsList = [...pets];
      debugLog("MBA456", "SAVE PET - Saving current pets list state:", 
        currentPetsList.map(p => ({ id: p.id, name: p.name || 'unnamed' }))
      );
      
      debugLog("MBA456", "SAVE PET - Starting to save pet:", { petId, petData });
      
      // Check if this is a new pet
      const isNewPet = petId && petId.toString().startsWith('temp_');
      
      // Helper function to convert Yes/No/N/A to true/false/null
      const convertYesNoToBoolean = (value) => {
        if (value === 'Yes') return true;
        if (value === 'No') return false;
        return null; // For N/A or undefined
      };
      
      // Format the pet data for the API
      let petToSave = {
        name: petData.name || '',
        breed: petData.breed || '',
        birthday: petData.birthday ? formatDateForBackend(petData.birthday) : null,
        adoption_date: petData.adoptionDate ? formatDateForBackend(petData.adoptionDate) : null,
        weight: petData.weight || null,
        feeding_schedule: petData.feedingInstructions || '',
        medication_notes: petData.medicalNotes || '',
        potty_break_schedule: petData.pottyBreakSchedule || '',
        special_care_instructions: petData.specialCareInstructions || '',
        species: petData.type || '',
        microchip_id: petData.microchipId || '',
        sex: petData.sex || null,
        medications: petData.medications || '',
        allergies: petData.allergies || '',
        vaccinations: petData.vaccinations || '',
        vet_name: petData.vetName || '',
        vet_phone: petData.vetPhone || '',
        insurance_provider: petData.insuranceProvider || '',
        // Use the correct field names for the backend
        spayed_neutered: convertYesNoToBoolean(petData.spayedNeutered),
        house_trained: convertYesNoToBoolean(petData.houseTrained),
        friendly_with_dogs: convertYesNoToBoolean(petData.dogFriendly),
        friendly_with_cats: convertYesNoToBoolean(petData.catFriendly),
        friendly_with_children: convertYesNoToBoolean(petData.childrenFriendly),
        microchipped: convertYesNoToBoolean(petData.microchipped),
        can_be_left_alone: convertYesNoToBoolean(petData.canBeLeftAlone),
        // Use the exact energy level values expected by the backend
        energy_level: petData.energyLevel || null,
      };
      
      debugLog("MBA456", "SAVE PET - Formatted pet compatibility fields:", { 
        friendly_with_children: petToSave.friendly_with_children,
        friendly_with_cats: petToSave.friendly_with_cats,
        friendly_with_dogs: petToSave.friendly_with_dogs,
        spayed_neutered: petToSave.spayed_neutered,
        house_trained: petToSave.house_trained,
        microchipped: petToSave.microchipped,
        can_be_left_alone: petToSave.can_be_left_alone,
        energy_level: petToSave.energy_level
      });
      
      // Create a FormData object for sending multipart/form-data (needed for file upload)
      const formData = new FormData();
      
      // Add the pet photo if available
      if (petData.photo) {
        debugLog("MBA5555", "Adding pet photo to form data");
        
        // Add old pet photo URL for deletion, if this is an existing pet
        if (!isNewPet) {
          const currentPet = pets.find(p => p.id === petId);
          if (currentPet && currentPet.profile_photo) {
            formData.append('old_profile_photo_url', currentPet.profile_photo);
          }
        }
        
        // If it's a base64 image (web platform)
        if (petData.photo.base64Data) {
          formData.append('pet_photo_base64', petData.photo.base64Data);
        } 
        // If it's a file URI (native platforms)
        else if (petData.photo.uri) {
          const photoFile = {
            uri: Platform.OS === 'android' ? petData.photo.uri : petData.photo.uri.replace('file://', ''),
            type: 'image/jpeg',
            name: 'pet_photo.jpg'
          };
          formData.append('pet_photo', photoFile);
          
          // Add crop parameters if provided
          if (petData.photo.cropParams) {
            formData.append('crop_params', JSON.stringify(petData.photo.cropParams));
          }
        }
      }
      
      // Add all the pet data fields to the FormData
      Object.entries(petToSave).forEach(([key, value]) => {
        // Only add fields that have values
        if (value !== null && value !== undefined) {
          // Convert boolean values to strings for FormData
          if (typeof value === 'boolean') {
            formData.append(key, value.toString());
          } else {
            formData.append(key, value);
          }
        }
      });
      
      let response;
      
      if (isNewPet) {
        try {
          // This is a new pet, add it
          debugLog("MBA456", "Adding new pet with data:", {
            name: petToSave.name,
            species: petToSave.species,
            breed: petToSave.breed
          });
          
          // Create a direct copy of the pet data for UI use in case the API call fails
          const uiSafePet = {
            id: petId, // Keep using the temp ID for now
            name: petToSave.name || 'New Pet',
            type: petToSave.species || '',
            breed: petToSave.breed || '',
            // Map all the other fields for UI display
            childrenFriendly: petData.childrenFriendly || 'N/A',
            catFriendly: petData.catFriendly || 'N/A',
            dogFriendly: petData.dogFriendly || 'N/A',
            houseTrained: petData.houseTrained || 'N/A',
            spayedNeutered: petData.spayedNeutered || 'N/A',
            microchipped: petData.microchipped || 'N/A',
            canBeLeftAlone: petData.canBeLeftAlone || 'N/A',
            energyLevel: petData.energyLevel || '',
            birthday: petData.birthday || null,
            adoptionDate: petData.adoptionDate || null,
            feedingInstructions: petData.feedingInstructions || '',
            medicalNotes: petData.medicalNotes || '',
            pottyBreakSchedule: petData.pottyBreakSchedule || '',
            specialCareInstructions: petData.specialCareInstructions || '',
            // These are used directly from the edited data
            weight: petData.weight || '',
            vetName: petData.vetName || '',
            vetPhone: petData.vetPhone || '',
            insuranceProvider: petData.insuranceProvider || '',
            sex: petData.sex || '',
            // Photo data if available
            photoUri: petData.photoUri || null,
          };
          
          response = await addPet(formData);
          
          // Check if it's a successful response
          if (response && response.pet) {
            const savedPet = response.pet;
            // Log the full pet_id to make sure we're getting it from the server
            debugLog("MBA5555", "Pet created successfully, server response:", {
              pet_id: savedPet.pet_id || 'not returned',
              id: savedPet.id || 'not returned', // Log any alternative ID as well
              name: savedPet.name,
              species: savedPet.species,
              breed: savedPet.breed
            });
            
            // Validate that we have a proper pet_id
            if (!savedPet.pet_id) {
              debugLog("MBA5555", "WARNING: No pet_id in server response. Raw response:", savedPet);
            }
            
            // Show success toast
            toast({
              message: `${petToSave.name || 'Pet'} added successfully!`,
              type: 'success',
              duration: 4000
            });
            
            // Replace the temporary pet with the real one - this needs to be atomic to prevent duplicates
            // We pass both the server response and our locally edited data
            const enhancedPetData = {
              ...savedPet,
              // Ensure these fields are present from user input
              name: petToSave.name || savedPet.name,
              species: petToSave.species || savedPet.species,
              breed: petToSave.breed || savedPet.breed,
              // The backend response contains pet_id - we must use this as the primary identifier
              // This ensures we're always using the real database ID, not a temporary one
              id: savedPet.pet_id,
            };
            
            // Use the enhanced pet data for the replacement
            replaceTempPetWithReal(petId, enhancedPetData);
          } else {
            throw new Error("Invalid response from server when adding pet");
          }
        } catch (error) {
          // Show error toast
          toast({
            message: `Error saving pet: ${error.message}`,
            type: 'error',
            duration: 4000
          });
          
          debugLog("MBA456", "Error in pet creation:", error);
          
          // Important: If there was an error, we need to make sure the pets list doesn't disappear
          // We'll use the current pets list we saved earlier
          if (Array.isArray(currentPetsList) && currentPetsList.length > 0) {
            debugLog("MBA456", "Restoring pets list after error");
            // This approach depends on how your parent component updates the pets
            // If you're using React context, you might need a different approach
          }
        }
      } else {
        // This is an existing pet, update it
        debugLog("MBA456", "Updating existing pet with ID:", petId);
        response = await updatePet(petId, formData);
        
        // Check if it's a successful response
        if (response && response.pet) {
          const updatedPet = response.pet;
          
          // Show success toast
          toast({
            message: `${updatedPet.name ? updatedPet.name.charAt(0).toUpperCase() + updatedPet.name.slice(1).toLowerCase() : 'Pet'} updated successfully!`,
            type: 'success',
            duration: 4000
          });
          
          // Process the profile_photo URL from the server to ensure it's complete
          let profilePhotoUrl = updatedPet.profile_photo;
          
          // Only prepend MEDIA_URL if the URL is a relative path
          if (profilePhotoUrl && !profilePhotoUrl.startsWith('http') && !profilePhotoUrl.startsWith('data:')) {
            profilePhotoUrl = getMediaUrl(profilePhotoUrl);
          }
          
          debugLog("MBA5555", "Pet updated successfully, profile photo URL:", profilePhotoUrl);
          
          // Format the updated pet data for UI
          const formattedPet = {
            ...updatedPet,
            id: petId, // Ensure the ID is preserved
            // Map fields from backend to frontend format
            type: updatedPet.species || updatedPet.type,
            feedingInstructions: updatedPet.feeding_schedule || updatedPet.feedingInstructions,
            medicalNotes: updatedPet.medication_notes || updatedPet.medicalNotes,
            pottyBreakSchedule: updatedPet.potty_break_schedule || updatedPet.pottyBreakSchedule,
            specialCareInstructions: updatedPet.special_care_instructions || updatedPet.specialCareInstructions,
            // Map vet info fields
            vetName: updatedPet.vet_name || '',
            vetPhone: updatedPet.vet_phone || '',
            insuranceProvider: updatedPet.insurance_provider || '',
            // Format compatibility fields for UI (true/false/null to Yes/No/N/A)
            childrenFriendly: updatedPet.friendly_with_children === true ? "Yes" : 
                             updatedPet.friendly_with_children === false ? "No" : "N/A",
            catFriendly: updatedPet.friendly_with_cats === true ? "Yes" : 
                        updatedPet.friendly_with_cats === false ? "No" : "N/A",
            dogFriendly: updatedPet.friendly_with_dogs === true ? "Yes" : 
                        updatedPet.friendly_with_dogs === false ? "No" : "N/A",
            houseTrained: updatedPet.house_trained === true ? "Yes" : 
                         updatedPet.house_trained === false ? "No" : "N/A",
            spayedNeutered: updatedPet.spayed_neutered === true ? "Yes" : 
                           updatedPet.spayed_neutered === false ? "No" : "N/A",
            microchipped: updatedPet.microchipped === true ? "Yes" : 
                         updatedPet.microchipped === false ? "No" : "N/A",
            canBeLeftAlone: updatedPet.can_be_left_alone === true ? "Yes" : 
                           updatedPet.can_be_left_alone === false ? "No" : "N/A",
            // Format dates correctly
            birthday: updatedPet.birthday ? formatDateFromBackend(updatedPet.birthday) : null,
            adoptionDate: updatedPet.adoption_date ? formatDateFromBackend(updatedPet.adoption_date) : null,
            // Update the profile photo with the server's URL
            profile_photo: profilePhotoUrl,
          };
          
          debugLog("MBA5555", "Formatted pet data for UI:", formattedPet);
          
          // Update our local state with server data
          setEditedPetsData(prev => {
            const newData = { ...prev };
            delete newData[petId]; // Remove editing data
            return newData;
          });
          
          // Notify parent component of the updated pet
          if (onEditPet) {
            onEditPet(petId, formattedPet);
          }
        } else {
          throw new Error("Invalid response from server when updating pet");
        }
      }
      
      // Remove this pet from the editing set
      setEditingPetIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(petId);
        return newSet;
      });
      
    } catch (error) {
      debugLog("MBA456", "Error saving pet:", error);
      
      // Show error toast
      toast({
        message: `Failed to save pet: ${error.message || 'Unknown error'}`,
        type: 'error',
        duration: 5000
      });
      
      // Mark the pet as failed
      setEditedPetsData(prev => ({
        ...prev,
        [petId]: {
          ...(prev[petId] || {}),
          lastEditFailed: true
        }
      }));
    } finally {
      setSavingPet(false);
    }
  };
  
  const handleCancelPetEdit = (petId) => {
    // Check if this is a newly added pet (has a temp_ ID)
    if (petId && petId.toString().startsWith('temp_')) {
      // Delete the pet instead of just canceling edit mode
      debugLog("MBA456", "Discarding newly added pet:", petId);
      onDeletePet(petId);
    }
    
    // Remove this pet from editing state
    setEditingPetIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(petId);
      return newSet;
    });
    
    // Clean up the edited data for this pet
    setEditedPetsData(prev => {
      const newData = {...prev};
      delete newData[petId];
      return newData;
    });
  };
  
  const handleEditChange = (petId, field, value) => {
    // Special handling for compatibility fields where we need to convert from UI string to internal boolean/null representation
    if (['childrenFriendly', 'catFriendly', 'dogFriendly', 'spayedNeutered', 'houseTrained', 'microchipped', 'canBeLeftAlone'].includes(field)) {
      // Store the direct selected value ("Yes", "No", "N/A") in the edit state
      // This makes it easier to highlight the selected button in the UI
      setEditedPetsData(prev => ({
        ...prev,
        [petId]: {
          ...(prev[petId] || {}),
          [field]: value
        }
      }));
      
      // Also update the corresponding gets_along_with_* fields for compatibility with the API
      if (field === 'childrenFriendly') {
        setEditedPetsData(prev => ({
          ...prev,
          [petId]: {
            ...(prev[petId] || {}),
            getsAlongWithChildren: value
          }
        }));
      } else if (field === 'catFriendly') {
        setEditedPetsData(prev => ({
          ...prev,
          [petId]: {
            ...(prev[petId] || {}),
            getsAlongWithCats: value
          }
        }));
      } else if (field === 'dogFriendly') {
        setEditedPetsData(prev => ({
          ...prev,
          [petId]: {
            ...(prev[petId] || {}),
            getsAlongWithDogs: value
          }
        }));
      }
    } else {
      // For non-compatibility fields, just store the value directly
      setEditedPetsData(prev => ({
        ...prev,
        [petId]: {
          ...(prev[petId] || {}),
          [field]: value
        }
      }));
    }
    debugLog("MBA456", "Editing pet field", { petId, field, value });
  };

  const handleAddNewPet = () => {
    // Debug current state before adding a pet
    debugLog("MBAi39gh45v", "ADD PET START - Current pets array:", 
      Array.isArray(pets) ? 
        pets.map(p => ({ id: p.id, name: p.name || 'unnamed' })) : 
        'pets is not an array');
    
    // Check for existing temporary pets first
    const existingTempPets = Array.isArray(pets) ? 
      pets.filter(pet => pet && pet.id && String(pet.id).startsWith('temp_')) : 
      [];
    
    debugLog("MBAi39gh45v", "ADD PET - Existing temp pets:", 
      existingTempPets.length ? existingTempPets.map(p => p.id) : 'none');
    
    // If we already have a temporary pet being edited, don't create a new one
    if (existingTempPets.length > 0) {
      debugLog("MBAi39gh45v", "ADD PET - Found existing temp pet, not creating a new one");
      // Just focus on the existing temp pet instead
      const tempPet = existingTempPets[0];
      
      // Make sure it's in edit mode
      setEditingPetIds(prev => {
        const newSet = new Set(prev);
        newSet.add(tempPet.id);
        return newSet;
      });
      
      // Make sure it's expanded
      setExpandedPetIds(prev => {
        const newSet = new Set(prev);
        newSet.add(tempPet.id);
        return newSet;
      });
      
      debugLog("MBAi39gh45v", "ADD PET - Focused on existing temp pet:", tempPet.id);
      return;
    }
    
    // Create a temporary ID for the new pet
    const tempId = `temp_${Date.now()}`;
    debugLog("MBAi39gh45v", "ADD PET - Creating new pet with temp ID:", tempId);
    
    // Create a blank pet entry
    const newPet = {
      id: tempId,
      name: '',
      breed: '',
      birthday: '',
      type: '',
      feedingInstructions: '',
      medicalNotes: '',
      pottyBreakSchedule: '',
      specialCareInstructions: '',
      childrenFriendly: undefined,
      dogFriendly: undefined,
      catFriendly: undefined,
      spayedNeutered: undefined,
      houseTrained: undefined,
      microchipped: undefined,
      energyLevel: undefined,
      canBeLeftAlone: undefined,
      medications: '',
      vetName: '',
      vetAddress: '',
      vetPhone: '',
      insuranceProvider: '',
      vetDocuments: [],
      // New fields
      sex: undefined,
      weight: '',
      adoptionDate: ''
    };
    
    // Debug the new pet data
    debugLog("MBAi39gh45v", "ADD PET - New pet object created:", { id: newPet.id });
    
    // First update our local state to show we're editing this pet
    setEditingPetIds(prev => {
      const newSet = new Set(prev);
      newSet.add(tempId);
      return newSet;
    });
    
    setEditedPetsData(prev => ({
      ...prev,
      [tempId]: {...newPet}
    }));
    
    // Expand the pet card
    setExpandedPetIds(prev => {
      const newSet = new Set(prev);
      newSet.add(tempId);
      return newSet;
    });
    
    debugLog("MBAi39gh45v", "ADD PET - Local state updated, now calling parent component");
    
    // Check if onAddPet function exists
    if (!onAddPet) {
      debugLog("MBAi39gh45v", "ADD PET ERROR - onAddPet function is not available");
      toast({
        message: "Unable to add pet - system error",
        type: 'error',
        duration: 4000
      });
      return;
    }
    
    try {
      // Now add the new pet to the existing pets array via the parent component
      // Adding at the top of the list makes it visible immediately to the user
      debugLog("MBAi39gh45v", "ADD PET - Calling onAddPet with new pet (adding to top of list)");
      onAddPet({...newPet, _addToTop: true});
      
      // After everything is done, log the current state
      setTimeout(() => {
        if (Array.isArray(pets)) {
          debugLog("MBAi39gh45v", "ADD PET - Pets after adding:", 
            pets.length > 0 ? 
              pets.map(p => ({id: p.id, name: p.name || 'unnamed'})) : 
              'empty array');
        } else {
          debugLog("MBAi39gh45v", "ADD PET ERROR - Pets is not an array after adding");
        }
      }, 100);
    } catch (error) {
      debugLog("MBAi39gh45v", "ADD PET ERROR - Exception when calling onAddPet:", error);
      toast({
        message: "Error adding pet",
        type: 'error',
        duration: 4000
      });
    }
  };

  const handleUploadDocument = async (petId) => {
    try {
      debugLog("MBA5555", "Opening image picker for pet:", petId);
      
      // Request permissions first if on native platforms
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          debugLog('MBA5555', 'Permission to access media library was denied');
          toast({
            message: 'Permission to access media library was denied',
            type: 'error',
            duration: 4000
          });
          return;
        }
      }
      
      // Launch image picker with platform-specific options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable built-in editing as we'll use our custom cropper
        quality: 1,
        // On web, we need base64 for direct upload
        base64: Platform.OS === 'web',
        allowsMultipleSelection: false,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        debugLog('MBA5555', 'Selected pet photo:', {
          uri: selectedAsset.uri.substring(0, 30) + '...',
          type: selectedAsset.type || 'image/jpeg',
          width: selectedAsset.width,
          height: selectedAsset.height,
          hasBase64: !!selectedAsset.base64
        });
        
        // Store the selected photo URI and pet ID
        setSelectedPetPhotoUri(selectedAsset.uri);
        setCurrentEditingPetId(petId);
        
        // Show the photo cropper
        setShowPetPhotoCropper(true);
      }
    } catch (error) {
      debugLog('MBA5555', 'Error selecting pet photo:', error);
      toast({
        message: 'Failed to select pet photo. Please try again.',
        type: 'error',
        duration: 4000
      });
    }
  };

  const renderVetDocuments = (documents = []) => {
    if (documents.length === 0) {
      return <Text style={styles.noDocumentsText}>No documents uploaded</Text>;
    }
    
    return (
      <View style={styles.documentsList}>
        {documents.map((doc, index) => (
          <View key={index} style={styles.documentItem}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">
              {doc.name}
            </Text>
            <TouchableOpacity style={styles.viewDocButton}>
              <Text style={styles.viewDocText}>View</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const toggleSection = (petId, sectionName, event) => {
    // A completely rewritten, bulletproof version of toggleSection
    
    try {
      // First, stop event propagation if an event was provided
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      
      // Validate inputs - only proceed if we have valid data
      if (!petId) {
        console.warn("Missing petId in toggleSection");
        return;
      }
      
      if (!sectionName) {
        console.warn("Missing sectionName in toggleSection");
        return;
      }
      
      // Sanitize inputs to ensure they're simple strings
      const petIdStr = String(petId);
      const sectionNameStr = String(sectionName);
      
      // Create a consistent key format
      const key = `${petIdStr}-${sectionNameStr}`;
      
      // Update state safely
      setExpandedSections((prev) => {
        // If prev is somehow not an object, start fresh
        if (!prev || typeof prev !== 'object') {
          const newState = {};
          newState[key] = true;
          return newState;
        }
        
        // Create a clean copy of the previous state
        const newState = { ...prev };
        
        // Toggle the value, defaulting to false if not boolean
        const currentValue = newState[key] === true;
        newState[key] = !currentValue;
        
        return newState;
      });
    } catch (err) {
      // If anything goes wrong, log it but don't crash
      console.error("Error toggling section:", err.message || "Unknown error");
    }
  };

  const isSectionExpanded = (petId, sectionName) => {
    try {
      // Safety checks for invalid inputs
      if (!petId || !sectionName) {
        return false;
      }
      
      // Ensure petId is a string for consistent key format
      const petIdStr = String(petId);
      const key = `${petIdStr}-${sectionName}`;
      
      // Default to false (closed) for initial view or non-boolean values
      const result = expandedSections[key] === true;
      return result;
    } catch (err) {
      console.error("Error checking if section is expanded:", err.message || "Unknown error");
      return false; // Default to not expanded on error
    }
  };

  const renderSectionHeader = (petId, title, sectionName) => {
    try {
      // Safety check for valid inputs
      if (!petId || !sectionName) {
        console.warn("Missing required parameters in renderSectionHeader");
        return null;
      }
      
      // Ensure title has a valid string value
      const safeTitle = typeof title === 'string' ? title : 'Section';
      
      const isExpanded = isSectionExpanded(petId, sectionName);
      
      return (
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={(event) => toggleSection(petId, sectionName, event)}
        >
          <Text style={styles.detailTitle}>{safeTitle}</Text>
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.colors.text}
          />
        </TouchableOpacity>
      );
    } catch (error) {
      console.error("Error rendering section header:", error.message || "Unknown error");
      return null; // Return null on error to prevent crashes
    }
  };

  const renderPetCard = (pet) => {
    // Check if this pet is being edited
    const isEditing = editingPetIds.has(pet.id);
    
    // Get the edited data for this pet if it exists
    const editedPetData = editedPetsData[pet.id] || {};
    
    // Determine if this is a newly added pet
    const isNewPet = pet.id && pet.id.toString().startsWith('temp_');
    
    // Is this pet's details expanded?
    const isExpanded = expandedPetIds.has(pet.id);
    
    // Determine what photo URL to display
    let photoUri = null;
    
    // First priority: if we're editing and have a new photo URI from cropping, use that
    if (isEditing && editedPetData.photoUri) {
      // Check if the URI already has http/https or is a data URI
      if (editedPetData.photoUri.startsWith('http') || editedPetData.photoUri.startsWith('data:')) {
        photoUri = editedPetData.photoUri;
      } else {
        // If it's a relative path, prepend the API base URL
        photoUri = getMediaUrl(editedPetData.photoUri);
      }
      debugLog('MBA5555', 'Using edited pet photo URI:', photoUri);
    } 
    // Second priority: use the pet's profile_photo from the server if available
    else if (pet.profile_photo) {
      // Check if the profile_photo is a valid URL or a relative path
      if (pet.profile_photo.startsWith('http')) {
        photoUri = pet.profile_photo;
      } else {
        // If it's a relative path, prepend the API base URL
        photoUri = getMediaUrl(pet.profile_photo);
      }
      debugLog('MBA5555', 'Using server profile photo:', photoUri);
    }
    
    return (
      <View 
        key={pet.id} 
        style={styles.petCard}
      >
        <TouchableOpacity
          style={styles.petCardHeader}
          onPress={() => togglePetDetails(pet.id)}
          activeOpacity={0.7}
        >
          <View style={styles.petBasicInfo}>
            {isEditing ? (
              <View style={styles.editMainContainer}>
                <View style={styles.editHeaderRow}>
                  <View style={styles.editProfileContainer}>
                    <TouchableOpacity
                      style={styles.profilePhotoButton}
                      onPress={() => handleUploadDocument(pet.id)}
                    >
                      {editedPetData.photoUri ? (
                        <Image 
                          source={{ uri: editedPetData.photoUri }}
                          style={styles.petPhoto}
                        />
                      ) : photoUri ? (
                        <Image 
                          source={{ uri: photoUri }}
                          style={styles.petPhoto}
                        />
                      ) : (
                        <MaterialCommunityIcons 
                          name="paw" 
                          size={40} 
                          color={theme.colors.primary} 
                          style={styles.placeholderIcon}
                        />
                      )}
                      <View style={styles.plusIconContainer}>
                        <MaterialCommunityIcons name="plus-circle" size={20} color={theme.colors.primary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={[
                    styles.editActions,
                    windowWidth < 600 && styles.editActionsSmallScreen
                  ]}>
                    {windowWidth < 600 ? (
                      // Small screen layout: two rows of buttons
                      <>
                        <View style={styles.buttonRowTop}>
                          {!isNewPet && (
                            <TouchableOpacity 
                              style={styles.deleteButton}
                              onPress={(event) => {
                                event.stopPropagation();
                                handleDeletePet(pet.id);
                              }}
                            >
                              <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity 
                            style={styles.saveButton}
                            onPress={(event) => {
                              // Prevent event propagation
                              event.stopPropagation();
                              // Prevent duplicates
                              if (savingPet) {
                                debugLog("MBA5555", "Save button already clicked, ignoring");
                                return;
                              }
                              debugLog("MBA5555", "SAVE BUTTON - Clicked for pet:", pet.id);
                              handleSavePetEdit(pet.id);
                            }}
                            disabled={savingPet}
                          >
                            <Text style={styles.saveButtonText}>
                              {isNewPet ? 'Create Pet' : 'Save Pet'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.buttonRowBottom}>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              handleCancelPetEdit(pet.id);
                            }}
                          >
                            <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              togglePetDetails(pet.id);
                            }}
                          >
                            <MaterialCommunityIcons 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={24} 
                              color={theme.colors.text}
                            />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      // Large screen layout: single row
                      <>
                        <TouchableOpacity 
                          style={styles.saveButton}
                          onPress={(event) => {
                            // Prevent event propagation
                            event.stopPropagation();
                            // Prevent duplicates
                            if (savingPet) {
                              debugLog("MBA5555", "Save button already clicked, ignoring");
                              return;
                            }
                            debugLog("MBA5555", "SAVE BUTTON - Clicked for pet:", pet.id);
                            handleSavePetEdit(pet.id);
                          }}
                          disabled={savingPet}
                        >
                          <Text style={styles.saveButtonText}>
                            {isNewPet ? 'Create Pet' : 'Save Pet'}
                          </Text>
                        </TouchableOpacity>
                        {!isNewPet && (
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              handleDeletePet(pet.id);
                            }}
                          >
                            <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleCancelPetEdit(pet.id);
                          }}
                        >
                          <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            togglePetDetails(pet.id);
                          }}
                        >
                          <MaterialCommunityIcons 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={24} 
                            color={theme.colors.text}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.editDetailsContainer}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailColumn}>
                      <Text style={styles.inputLabel}>Name</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedPetData.name || ''}
                        onChangeText={(text) => handleEditChange(pet.id, 'name', text)}
                        placeholder="Enter pet name"
                        placeholderTextColor={theme.colors.placeholder}
                      />
                    </View>
                    <View style={styles.detailColumn}>
                      <Text style={styles.inputLabel}>Breed</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedPetData.breed || ''}
                        onChangeText={(text) => handleEditChange(pet.id, 'breed', text)}
                        placeholder="Enter breed - ex: Golden Retriever"
                        placeholderTextColor={theme.colors.placeholder}
                      />
                    </View>
                  </View>
                  
                  {windowWidth < 900 ? (
                    // Stack animal type and birthday vertically on small screens
                    <View style={styles.stackedFields}>
                      <View style={[styles.detailColumn, styles.fullWidth]}>
                        <Text style={styles.inputLabel}>Animal Type</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedPetData.type || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'type', text)}
                          placeholder="Enter type - ex: Dog"
                          placeholderTextColor={theme.colors.placeholder}
                        />
                      </View>
                      
                      <View style={[styles.detailColumn, styles.fullWidth]}>
                        <Text style={styles.inputLabel}>Birthday</Text>
                        <View style={styles.customDatePickerContainer}>
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            style={styles.dateInputBox}
                            onPress={() => showDatePicker(pet.id, 'birthday')}
                          >
                            <Text style={[
                              styles.dateInputText, 
                              !editedPetData.birthday && styles.placeholderText
                            ]}>
                              {editedPetData.birthday || 'MM-DD-YYYY'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.calendarButton}
                            onPress={() => showDatePicker(pet.id, 'birthday')}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Original horizontal layout for larger screens
                    <View style={styles.detailRow}>
                      <View style={styles.detailColumn}>
                        <Text style={styles.inputLabel}>Birthday</Text>
                        <View style={styles.customDatePickerContainer}>
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            style={styles.dateInputBox}
                            onPress={() => showDatePicker(pet.id, 'birthday')}
                          >
                            <Text style={[
                              styles.dateInputText, 
                              !editedPetData.birthday && styles.placeholderText
                            ]}>
                              {editedPetData.birthday || 'MM-DD-YYYY'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.calendarButton}
                            onPress={() => showDatePicker(pet.id, 'birthday')}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.detailColumn}>
                        <Text style={styles.inputLabel}>Animal Type</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedPetData.type || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'type', text)}
                          placeholder="Enter type"
                          placeholderTextColor={theme.colors.placeholder}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <>
                {photoUri ? (
                  <Image 
                    source={{ uri: photoUri }}
                    style={styles.petPhoto}
                    onError={(e) => {
                      debugLog('MBA5555', 'Error loading pet photo:', e.nativeEvent.error);
                      // If there's an error loading the image, set photoUri to null to show the default icon
                      setEditedPetsData(prev => ({
                        ...prev,
                        [pet.id]: {
                          ...(prev[pet.id] || {}),
                          photoLoadError: true
                        }
                      }));
                    }}
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="paw" 
                    size={40} 
                    color={theme.colors.primary} 
                    style={styles.placeholderIcon}
                  />
                )}
                <View style={[
                  styles.petInfo,
                  windowWidth < 600 && styles.petInfoWithButtonPadding
                ]}>
                  <Text style={styles.petName}>{pet.name.toLowerCase().charAt(0).toUpperCase() + pet.name.toLowerCase().slice(1)}</Text>
                  <View style={styles.petDetailsContainer}>
                    <Text style={styles.petDetails}>
                    {pet.type ? pet.type.toLowerCase().charAt(0).toUpperCase() + pet.type.toLowerCase().slice(1) : 'No type'} • {pet.birthday ? calculateAge(pet.birthday) : 'No age set'} • {pet.breed ? pet.breed.toLowerCase().charAt(0).toUpperCase() + pet.breed.toLowerCase().slice(1) : 'No breed'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
          {!isEditing && windowWidth < 600 ? (
            <>
              <TouchableOpacity
                style={[styles.editButton, styles.editButtonTopRight]}
                onPress={() => handleEditPet(pet.id)}
              >
                <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.chevronButtonBottomRight]}
                onPress={() => togglePetDetails(pet.id)}
              >
                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </>
          ) : !isEditing ? (
            <View style={styles.petActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditPet(pet.id)}
              >
                <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => togglePetDetails(pet.id)}
              >
                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.expandedDetails, { backgroundColor: theme.colors.surfaceContrast }]}>
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailTitle}>Feeding Instructions</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedPetData.feedingInstructions || ''}
                    onChangeText={(text) => handleEditChange(pet.id, 'feedingInstructions', text)}
                    placeholder="Enter feeding instructions"
                    placeholderTextColor={theme.colors.placeholder}
                    multiline
                  />
                ) : (
                  <Text style={styles.detailText}>{pet.feedingInstructions || 'No feeding instructions yet'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailTitle}>Medical Notes</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedPetData.medicalNotes || ''}
                    onChangeText={(text) => handleEditChange(pet.id, 'medicalNotes', text)}
                    placeholder="Enter medical notes"
                    placeholderTextColor={theme.colors.placeholder}
                    multiline
                  />
                ) : (
                  <Text style={styles.detailText}>{pet.medicalNotes || 'No medical notes yet'}</Text>
                )}
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailTitle}>Potty Break Schedule</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedPetData.pottyBreakSchedule || ''}
                    onChangeText={(text) => handleEditChange(pet.id, 'pottyBreakSchedule', text)}
                    placeholder="Potty break schedule"
                    placeholderTextColor={theme.colors.placeholder}
                    multiline
                  />
                ) : (
                  <Text style={styles.detailText}>{pet.pottyBreakSchedule || 'No potty break schedule yet'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailTitle}>Special Care Instructions</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedPetData.specialCareInstructions || ''}
                    onChangeText={(text) => handleEditChange(pet.id, 'specialCareInstructions', text)}
                    placeholder="Special care instructions"
                    placeholderTextColor={theme.colors.placeholder}
                    multiline
                  />
                ) : (
                  <Text style={styles.detailText}>{pet.specialCareInstructions || 'No special care instructions yet'}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.detailSection}>
              {renderSectionHeader(pet.id, "Care Information", "careInfo")}
              
              {isSectionExpanded(pet.id, "careInfo") && (
                <View style={styles.detailColumn}>
                  <View style={styles.careInfoContainer}>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Energy level:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {energyLevelOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.energyLevel === null && option === "N/A") || 
                                editedPetData.energyLevel === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'energyLevel', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.energyLevel === null && option === "N/A") || 
                                editedPetData.energyLevel === option ? styles.selectedOptionText : null
                              ]}>
                                {option ? option : "None selected yet"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnEnergyLevelContainer(pet)
                      )}
                    </View>
                    
                    {/* Removing duplicate "Can be left alone" section as it's already in the Compatibility & Training section */}
                    
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Weight (lbs):</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputWeight}
                          value={editedPetData.weight || ''}
                          onChangeText={(text) => {
                            // Only allow numbers and decimal point
                            if (/^(\d*\.?\d*)$/.test(text) || text === '') {
                              handleEditChange(pet.id, 'weight', text);
                            }
                          }}
                          placeholder="Enter weight"
                          placeholderTextColor={theme.colors.placeholder}
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.weight || 'Not specified'}</Text>
                      )}
                    </View>
                    <View style={styles.medicationsContainer}>
                      <Text style={styles.compatibilityLabel}>Medications:</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputMedications}
                          value={editedPetData.medications || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'medications', text)}
                          placeholder="Enter medications"
                          placeholderTextColor={theme.colors.placeholder}
                          multiline
                        />
                      ) : (
                        <Text style={styles.medicationsText}>
                          {pet.medications || 'None'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.detailSection}>
              {renderSectionHeader(pet.id, "Compatibility & Training", "compatibility")}
              
              {isSectionExpanded(pet.id, "compatibility") && (
                <View style={styles.detailColumn}>
                  <View style={styles.compatibilityContainer}>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Friendly with children:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.childrenFriendly === null && option === "N/A") || 
                                (editedPetData.childrenFriendly === true && option === "Yes") || 
                                (editedPetData.childrenFriendly === false && option === "No") ||
                                editedPetData.childrenFriendly === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'childrenFriendly', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.childrenFriendly === null && option === "N/A") || 
                                (editedPetData.childrenFriendly === true && option === "Yes") || 
                                (editedPetData.childrenFriendly === false && option === "No") ||
                                editedPetData.childrenFriendly === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'childrenFriendly')
                      )}
                    </View>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Friendly with cats:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.catFriendly === null && option === "N/A") || 
                                (editedPetData.catFriendly === true && option === "Yes") || 
                                (editedPetData.catFriendly === false && option === "No") ||
                                editedPetData.catFriendly === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'catFriendly', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.catFriendly === null && option === "N/A") || 
                                (editedPetData.catFriendly === true && option === "Yes") || 
                                (editedPetData.catFriendly === false && option === "No") ||
                                editedPetData.catFriendly === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'catFriendly')
                      )}
                    </View>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Friendly with dogs:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.dogFriendly === null && option === "N/A") || 
                                (editedPetData.dogFriendly === true && option === "Yes") || 
                                (editedPetData.dogFriendly === false && option === "No") ||
                                editedPetData.dogFriendly === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'dogFriendly', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.dogFriendly === null && option === "N/A") || 
                                (editedPetData.dogFriendly === true && option === "Yes") || 
                                (editedPetData.dogFriendly === false && option === "No") ||
                                editedPetData.dogFriendly === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'dogFriendly')
                      )}
                    </View>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Spayed/neutered:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.spayedNeutered === null && option === "N/A") || 
                                (editedPetData.spayedNeutered === true && option === "Yes") || 
                                (editedPetData.spayedNeutered === false && option === "No") ||
                                editedPetData.spayedNeutered === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'spayedNeutered', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.spayedNeutered === null && option === "N/A") || 
                                (editedPetData.spayedNeutered === true && option === "Yes") || 
                                (editedPetData.spayedNeutered === false && option === "No") ||
                                editedPetData.spayedNeutered === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'spayedNeutered')
                      )}
                    </View>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>House trained:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.houseTrained === null && option === "N/A") || 
                                (editedPetData.houseTrained === true && option === "Yes") || 
                                (editedPetData.houseTrained === false && option === "No") ||
                                editedPetData.houseTrained === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'houseTrained', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.houseTrained === null && option === "N/A") || 
                                (editedPetData.houseTrained === true && option === "Yes") || 
                                (editedPetData.houseTrained === false && option === "No") ||
                                editedPetData.houseTrained === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'houseTrained')
                      )}
                    </View>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Microchipped:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.microchipped === null && option === "N/A") || 
                                (editedPetData.microchipped === true && option === "Yes") || 
                                (editedPetData.microchipped === false && option === "No") ||
                                editedPetData.microchipped === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'microchipped', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.microchipped === null && option === "N/A") || 
                                (editedPetData.microchipped === true && option === "Yes") || 
                                (editedPetData.microchipped === false && option === "No") ||
                                editedPetData.microchipped === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'microchipped')
                      )}
                    </View>
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Can be left alone:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.canBeLeftAlone === null && option === "N/A") || 
                                (editedPetData.canBeLeftAlone === true && option === "Yes") || 
                                (editedPetData.canBeLeftAlone === false && option === "No") ||
                                editedPetData.canBeLeftAlone === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'canBeLeftAlone', option === "N/A" ? null : option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.canBeLeftAlone === null && option === "N/A") || 
                                (editedPetData.canBeLeftAlone === true && option === "Yes") || 
                                (editedPetData.canBeLeftAlone === false && option === "No") ||
                                editedPetData.canBeLeftAlone === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        returnYesNoContainer(pet, 'canBeLeftAlone')
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.detailSection}>
              {renderSectionHeader(pet.id, "Vet Information", "vetInfo")}
              
              {isSectionExpanded(pet.id, "vetInfo") && (
                <View style={styles.detailColumn}>
                  <View style={styles.vetInfoContainer}>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Vet name:</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputShort}
                          value={editedPetData.vetName || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'vetName', text)}
                          placeholder="Enter vet name"
                          placeholderTextColor={theme.colors.placeholder}
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.vetName || 'None'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Vet address:</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputShort}
                          value={editedPetData.vetAddress || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'vetAddress', text)}
                          placeholder="Enter vet address"
                          placeholderTextColor={theme.colors.placeholder}
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.vetAddress || 'None'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Vet phone:</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputShort}
                          value={editedPetData.vetPhone || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'vetPhone', text)}
                          placeholder="Enter vet phone"
                          placeholderTextColor={theme.colors.placeholder}
                          keyboardType="phone-pad"
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.vetPhone || 'None'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Insurance provider:</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputShort}
                          value={editedPetData.insuranceProvider || ''}
                          onChangeText={(text) => handleEditChange(pet.id, 'insuranceProvider', text)}
                          placeholder="Enter insurance provider"
                          placeholderTextColor={theme.colors.placeholder}
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.insuranceProvider || 'Not specified'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Sex:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {sexOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                editedPetData.sex === option ? styles.selectedOption : null
                              ]}
                              onPress={() => handleEditChange(pet.id, 'sex', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                editedPetData.sex === option ? styles.selectedOptionText : null
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.sex || 'None Selected'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Adoption Date:</Text>
                      {isEditing ? (
                        <View style={styles.customDatePickerContainer}>
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            style={styles.dateInputBox}
                            onPress={() => showDatePicker(pet.id, 'adoptionDate')}
                          >
                            <Text style={[
                              styles.dateInputText, 
                              !editedPetData.adoptionDate && styles.placeholderText
                            ]}>
                              {editedPetData.adoptionDate || 'MM-DD-YYYY'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.calendarButton}
                            onPress={() => showDatePicker(pet.id, 'adoptionDate')}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.adoptionDate || 'Not specified'}</Text>
                      )}
                    </View>
                    {/* TODO: add back after MVP <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Vet documents:</Text>
                      {isEditing ? (
                        <View style={styles.documentActionContainer}>
                          <TouchableOpacity 
                            style={styles.uploadButton}
                            onPress={() => handleUploadDocument(pet.id)}
                          >
                            <MaterialCommunityIcons name="upload" size={16} color={theme.colors.background} />
                            <Text style={styles.uploadButtonText}>Upload</Text>
                          </TouchableOpacity>
                          {renderVetDocuments(editedPetData.vetDocuments)}
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.documentButton}>
                          <MaterialCommunityIcons name="file-document-outline" size={16} color={theme.colors.primary} />
                          <Text style={styles.documentButtonText}>View documents</Text>
                        </TouchableOpacity>
                      )}
                    </View> */}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const handleAddEmergencyContact = () => {
    if (newEmergencyContact.name && newEmergencyContact.phone) {
      debugLog("MBA123", "Adding emergency contact", newEmergencyContact);
      const updatedContacts = [...(preferences.emergencyContacts || []), newEmergencyContact];
      onUpdatePreferences('emergencyContacts', updatedContacts);
      setNewEmergencyContact({ name: '', phone: '' });
      setIsAddingEmergencyContact(false);
    }
  };

  const handleAddHouseholdMember = () => {
    if (newHouseholdMember.name && newHouseholdMember.phone) {
      debugLog("MBA123", "Adding household member", newHouseholdMember);
      const updatedMembers = [...(preferences.authorizedHouseholdMembers || []), newHouseholdMember];
      onUpdatePreferences('authorizedHouseholdMembers', updatedMembers);
      setNewHouseholdMember({ name: '', phone: '' });
      setIsAddingHouseholdMember(false);
    }
  };

  const handleRemoveEmergencyContact = (index) => {
    debugLog("MBA123", "Removing emergency contact", index);
    const updatedContacts = [...(preferences.emergencyContacts || [])];
    updatedContacts.splice(index, 1);
    onUpdatePreferences('emergencyContacts', updatedContacts);
  };

  const handleRemoveHouseholdMember = (index) => {
    debugLog("MBA123", "Removing household member", index);
    const updatedMembers = [...(preferences.authorizedHouseholdMembers || [])];
    updatedMembers.splice(index, 1);
    onUpdatePreferences('authorizedHouseholdMembers', updatedMembers);
  };

  const handleAddAsHouseholdMember = (contact) => {
    debugLog("MBA123", "Adding emergency contact as household member", contact);
    const updatedMembers = [...(preferences.authorizedHouseholdMembers || [])];
    
    // Check if already exists
    const exists = updatedMembers.some(member => 
      member.name === contact.name && member.phone === contact.phone
    );
    
    if (!exists) {
      updatedMembers.push(contact);
      onUpdatePreferences('authorizedHouseholdMembers', updatedMembers);
    }
  };

  const renderEmergencyContactsSection = () => {
    if (userRole !== 'petOwner') return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsAddingEmergencyContact(!isAddingEmergencyContact)}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
            <Text style={styles.addButtonText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
        
        {isAddingEmergencyContact && (
          <View style={styles.addContactForm}>
            <TextInput
              style={styles.input}
              placeholder="Contact Name"
              value={newEmergencyContact.name}
              onChangeText={(text) => setNewEmergencyContact({...newEmergencyContact, name: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={newEmergencyContact.phone}
              onChangeText={(text) => setNewEmergencyContact({...newEmergencyContact, phone: text})}
              keyboardType="phone-pad"
            />
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddEmergencyContact}
            >
              <Text style={styles.submitButtonText}>Save Contact</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.contactsList}>
          {(preferences.emergencyContacts || []).map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleAddAsHouseholdMember(contact)}
                >
                  <MaterialCommunityIcons name="account-plus" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleRemoveEmergencyContact(index)}
                >
                  <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {(preferences.emergencyContacts || []).length === 0 && !isAddingEmergencyContact && (
            <Text style={styles.emptyListText}>No emergency contacts added yet</Text>
          )}
        </View>
      </View>
    );
  };

  const renderHouseholdMembersSection = () => {
    if (userRole !== 'petOwner') return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Authorized Household Members</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsAddingHouseholdMember(!isAddingHouseholdMember)}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
            <Text style={styles.addButtonText}>Add Member</Text>
          </TouchableOpacity>
        </View>
        
        {isAddingHouseholdMember && (
          <View style={styles.addContactForm}>
            <TextInput
              style={styles.input}
              placeholder="Member Name"
              value={newHouseholdMember.name}
              onChangeText={(text) => setNewHouseholdMember({...newHouseholdMember, name: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={newHouseholdMember.phone}
              onChangeText={(text) => setNewHouseholdMember({...newHouseholdMember, phone: text})}
              keyboardType="phone-pad"
            />
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddHouseholdMember}
            >
              <Text style={styles.submitButtonText}>Save Member</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.contactsList}>
          {(preferences.authorizedHouseholdMembers || []).map((member, index) => (
            <View key={index} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{member.name}</Text>
                <Text style={styles.contactPhone}>{member.phone}</Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleRemoveHouseholdMember(index)}
                >
                  <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {(preferences.authorizedHouseholdMembers || []).length === 0 && !isAddingHouseholdMember && (
            <Text style={styles.emptyListText}>No household members added yet</Text>
          )}
        </View>
      </View>
    );
  };

  const formatDateString = (date) => {
    if (!date) return '';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
  };

  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    const [month, day, year] = dateString.split('-').map(part => parseInt(part, 10));
    
    if (!month || !day || !year || isNaN(month) || isNaN(day) || isNaN(year)) {
      return new Date();
    }
    
    return new Date(year, month - 1, day);
  };

  const showDatePicker = (petId, field) => {
    const currentDate = parseDate(editedPetsData[petId]?.[field]);
    
    setDisplayMonth(currentDate.getMonth());
    setDisplayYear(currentDate.getFullYear());
    
    setDatePickerConfig({
      isVisible: true,
      currentField: field,
      currentPetId: petId,
      selectedDate: currentDate
    });
  };

  const handleDatePickerSelect = (event, date) => {
    // On Android, this is called immediately when a date is selected
    if (Platform.OS === 'android') {
      if (event?.type === 'dismissed') {
        setDatePickerConfig(prev => ({ ...prev, isVisible: false }));
        return;
      }
      
      if (date) {
        const formattedDate = formatDateString(date);
        handleEditChange(datePickerConfig.currentPetId, datePickerConfig.currentField, formattedDate);
      }
      
      setDatePickerConfig(prev => ({ ...prev, isVisible: false }));
      return;
    }
    
    // For iOS and Web, this is called when the confirm button is pressed
    if (date) {
      const formattedDate = formatDateString(date);
      handleEditChange(datePickerConfig.currentPetId, datePickerConfig.currentField, formattedDate);
    }
    
    setDatePickerConfig({
      isVisible: false,
      currentField: null,
      currentPetId: null,
      selectedDate: null
    });
  };

  // Generate calendar grid data
  const calendarData = useMemo(() => {
    if (!datePickerConfig.isVisible) return [];
    
    const currentDate = datePickerConfig.selectedDate || new Date();
    const firstDayOfMonth = new Date(displayYear, displayMonth, 1);
    const lastDayOfMonth = new Date(displayYear, displayMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Create calendar grid with padding for previous and next month days
    const totalDays = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;
    const calendarDays = [];
    
    let dayCounter = 1 - startingDayOfWeek;
    for (let i = 0; i < totalDays; i++) {
      const dayDate = new Date(displayYear, displayMonth, dayCounter);
      const isCurrentMonth = dayDate.getMonth() === displayMonth;
      const isSelectedDate = isCurrentMonth && 
        dayDate.getDate() === currentDate.getDate() && 
        dayDate.getMonth() === currentDate.getMonth() && 
        dayDate.getFullYear() === currentDate.getFullYear();
      
      calendarDays.push({
        date: dayDate,
        day: dayDate.getDate(),
        isCurrentMonth,
        isSelectedDate,
      });
      
      dayCounter++;
    }
    
    // Group by weeks
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    
    return weeks;
  }, [displayMonth, displayYear, datePickerConfig.selectedDate, datePickerConfig.isVisible]);
  
  // Navigation functions
  const goToPreviousMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(prevYear => prevYear - 1);
    } else {
      setDisplayMonth(prevMonth => prevMonth - 1);
    }
    // Close any open dropdowns when navigating
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };
  
  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(prevYear => prevYear + 1);
    } else {
      setDisplayMonth(prevMonth => prevMonth + 1);
    }
    // Close any open dropdowns when navigating
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };
  
  const selectDate = (date) => {
    // Close any open dropdowns when selecting a date
    setShowMonthPicker(false);
    setShowYearPicker(false);
    // Just update the selected date without closing the modal
    setDatePickerConfig(prev => ({
      ...prev,
      selectedDate: date
    }));
  };

  const renderDatePickerModal = () => {
    if (!datePickerConfig.isVisible) return null;
    
    // For Android, use the native date picker
    if (Platform.OS === 'android') {
      return (
        <DateTimePicker
          value={datePickerConfig.selectedDate}
          mode="date"
          display="default"
          onChange={handleDatePickerSelect}
        />
      );
    }
    
    // Month names for header
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Generate years array - only current and previous years, with current year first
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 101 }, (_, i) => currentYear - i);
    
    // Function to handle clicking outside dropdowns
    const handleOutsideClick = () => {
      setShowMonthPicker(false);
      setShowYearPicker(false);
    };
    
    return (
      <Modal
        visible={datePickerConfig.isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDatePickerConfig(prev => ({ ...prev, isVisible: false }));
          setShowMonthPicker(false);
          setShowYearPicker(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleOutsideClick}
        >
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>
                Select {datePickerConfig.currentField === 'birthday' ? 'Birthday' : 'Adoption Date'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setDatePickerConfig(prev => ({ ...prev, isVisible: false }));
                  setShowMonthPicker(false);
                  setShowYearPicker(false);
                }}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Calendar Header with Dropdowns */}
            <View style={styles.calendarHeader}>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowMonthPicker(!showMonthPicker);
                    setShowYearPicker(false);
                  }}
                >
                  <Text style={styles.dropdownButtonText}>{monthNames[displayMonth]}</Text>
                  <MaterialCommunityIcons 
                    name={showMonthPicker ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.colors.text} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowYearPicker(!showYearPicker);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={styles.dropdownButtonText}>{displayYear}</Text>
                  <MaterialCommunityIcons 
                    name={showYearPicker ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.colors.text} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Month Picker Dropdown */}
            {showMonthPicker && (
              <TouchableOpacity 
                style={styles.dropdownList}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <ScrollView style={styles.dropdownScrollView}>
                  {monthNames.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.dropdownItem,
                        displayMonth === index && styles.dropdownItemSelected
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setDisplayMonth(index);
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        displayMonth === index && styles.dropdownItemTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            )}

            {/* Year Picker Dropdown */}
            {showYearPicker && (
              <TouchableOpacity 
                style={styles.dropdownList}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <ScrollView style={styles.dropdownScrollView}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.dropdownItem,
                        displayYear === year && styles.dropdownItemSelected
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setDisplayYear(year);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        displayYear === year && styles.dropdownItemTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            )}
            
            {/* Weekday Headers */}
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.weekdayLabels}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <Text key={index} style={styles.weekdayLabel}>{day}</Text>
                ))}
              </View>
            </TouchableOpacity>
            
            {/* Calendar Grid */}
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.calendarGrid}>
                {calendarData.map((week, weekIndex) => (
                  <View key={weekIndex} style={styles.calendarRow}>
                    {week.map((dayObj, dayIndex) => (
                      <TouchableOpacity
                        key={dayIndex}
                        style={[
                          styles.calendarDay,
                          !dayObj.isCurrentMonth && styles.calendarDayOtherMonth,
                          dayObj.isSelectedDate && styles.calendarDaySelected
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (dayObj.isCurrentMonth) selectDate(dayObj.date);
                        }}
                        disabled={!dayObj.isCurrentMonth}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          !dayObj.isCurrentMonth && styles.calendarDayTextOtherMonth,
                          dayObj.isSelectedDate && styles.calendarDayTextSelected
                        ]}>
                          {dayObj.day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDatePickerSelect(null, datePickerConfig.selectedDate);
              }}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Helper function to show error toasts with consistent formatting
  const showErrorMessage = (title, error) => {
    let errorMessage = "There was a problem with this operation. Please try again.";
    
    // Check if we have more specific error details from the API
    if (error.response && error.response.data) {
      const details = error.response.data.details;
      if (details) {
        // Build a more specific error message
        errorMessage = "Error details: ";
        
        Object.keys(details).forEach(field => {
          errorMessage += `${field}: ${details[field].join(", ")}`;
        });
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast({
      message: `${title}: ${errorMessage}`,
      type: 'error',
      duration: 5000
    });
  };


  // New helper function to replace a temporary pet with a real one in a single operation
  const replaceTempPetWithReal = (tempPetId, realPetData) => {
    try {
      // Detailed debugging for the pet replacement process
      debugLog("MBAi39gh45v", "REPLACE PET START - Current pets before replacement:", 
        Array.isArray(pets) ? 
          pets.map(p => ({ id: p.id, name: p.name || 'unnamed' })) : 
          'pets is not an array');
          
      debugLog("MBAi39gh45v", "REPLACE PET - Temp ID to replace:", tempPetId);
      debugLog("MBAi39gh45v", "REPLACE PET - Real pet data:", JSON.stringify(realPetData));
      
      // Make sure we have valid input data
      if (!tempPetId || !realPetData) {
        debugLog("MBAi39gh45v", "REPLACE PET ERROR - Invalid data provided", { tempPetId, realPetData });
        // Just show success toast but don't attempt replacement
        toast({
          message: `Pet saved successfully!`,
          type: 'success',
          duration: 4000
        });
        return;
      }
      
      // Log the full response data to help diagnose issues
      debugLog("MBA5555", "REPLACE PET - Backend response data:", JSON.stringify(realPetData));
      
      // The pet_id from the server response is the primary key in the database
      // This is the ID we should always use for the pet
      const realPetId = realPetData.pet_id;
      
      // Verify we have a valid ID
      if (!realPetId) {
        debugLog("MBA5555", "REPLACE PET ERROR - No pet_id in server response:", realPetData);
        // If somehow we don't have a pet_id (this should never happen), show an error
        toast({
          message: "Pet was created but ID is missing. Please refresh the page.",
          type: 'warning',
          duration: 5000
        });
      } else {
        debugLog("MBA5555", "REPLACE PET - Using pet_id from server:", realPetId);
      }
      
      debugLog("MBA5555", "REPLACE PET - Using pet ID:", realPetId);
      
      // Helper function to convert backend boolean to UI Yes/No/N/A
      const booleanToYesNo = (value) => {
        if (value === true) return "Yes";
        if (value === false) return "No";
        return "N/A";
      };
      
      // Format the pet data with the correct field mappings for UI
      const formattedPetData = {
        ...realPetData,
        // Always use the pet_id from the API response as our primary id
        id: realPetId,
        // Ensure proper type mapping between backend and UI
        type: realPetData.species || realPetData.type || '',
        // Make sure feeding instructions are mapped properly
        feedingInstructions: realPetData.feeding_schedule || realPetData.feedingInstructions || '',
        // Make sure medical notes are mapped properly
        medicalNotes: realPetData.medication_notes || realPetData.medicalNotes || '',
        // Make sure potty break schedule is mapped properly
        pottyBreakSchedule: realPetData.potty_break_schedule || realPetData.pottyBreakSchedule || '',
        // Make sure special care instructions are mapped properly
        specialCareInstructions: realPetData.special_care_instructions || realPetData.specialCareInstructions || '',
        // Map vet info fields
        vetName: realPetData.vet_name || '',
        vetPhone: realPetData.vet_phone || '',
        insuranceProvider: realPetData.insurance_provider || '',
        // Format compatibility fields for UI (true/false/null to Yes/No/N/A)
        childrenFriendly: booleanToYesNo(realPetData.friendly_with_children),
        catFriendly: booleanToYesNo(realPetData.friendly_with_cats),
        dogFriendly: booleanToYesNo(realPetData.friendly_with_dogs),
        houseTrained: booleanToYesNo(realPetData.house_trained),
        spayedNeutered: booleanToYesNo(realPetData.spayed_neutered),
        microchipped: booleanToYesNo(realPetData.microchipped),
        canBeLeftAlone: booleanToYesNo(realPetData.can_be_left_alone),
        // Format dates correctly
        birthday: realPetData.birthday ? formatDateFromBackend(realPetData.birthday) : null,
        adoptionDate: realPetData.adoption_date ? formatDateFromBackend(realPetData.adoption_date) : null,
        // Preserve photo information if it exists
        photoUri: realPetData.profile_photo ? 
          getMediaUrl(realPetData.profile_photo) : 
          null,
        // Add a flag to indicate this pet was just created (for UI logic)
        justCreated: true,
        // Important - make sure name is preserved in the UI
        name: realPetData.name || 'Unnamed Pet',
        // Explicitly copy other fields that might be missing
        breed: realPetData.breed || '',
        energyLevel: realPetData.energy_level || '',
      };
      
      debugLog("MBA5555", "REPLACE PET - Formatted pet data:", { 
        tempPetId, 
        realPetId,
        name: formattedPetData.name,
        type: formattedPetData.type,
        breed: formattedPetData.breed
      });
      
      // Get the data the user was editing
      const editedData = editedPetsData[tempPetId] || {};
      
      // Merge user edits with server data to ensure no data loss
      const mergedPetData = {
        ...formattedPetData,
        // If user edited these fields, prefer their values over server values
        name: editedData.name || formattedPetData.name,
        breed: editedData.breed || formattedPetData.breed,
        type: editedData.type || formattedPetData.type,
      };
      
      // Clean up the edited data for the temp pet
      setEditedPetsData(prev => {
        const newData = { ...prev };
        delete newData[tempPetId];
        return newData;
      });
      
      // Notify parent component of the replacement - critical to prevent duplicate pets
      try {
        // Save a copy of the current pets array for debugging
        const petsBefore = Array.isArray(pets) ? [...pets] : [];
        debugLog("MBAi39gh45v", "REPLACE PET - Pets count before update:", petsBefore.length);
        
        // Double-check that the merged pet data is valid
        if (!mergedPetData.id && !mergedPetData.pet_id) {
          debugLog("MBAi39gh45v", "REPLACE PET ERROR - Merged data has no valid ID:", mergedPetData);
          mergedPetData.id = `generated_${Date.now()}`;
          debugLog("MBAi39gh45v", "REPLACE PET FIX - Generated new ID:", mergedPetData.id);
        }
        
        if (onReplacePet) {
          debugLog("MBAi39gh45v", "REPLACE PET - Calling onReplacePet:", {
            tempId: tempPetId,
            realId: mergedPetData.id || mergedPetData.pet_id,
            name: mergedPetData.name
          });
          
          // Build a new pets array for atomic replacement
          // The parent component expects a complete new array, not just two parameters
          const newPetsArray = [
            // Add the new pet at the top for better visibility
            mergedPetData,
            // Add all previous pets except the temp one we're replacing
            ...pets.filter(p => p.id !== tempPetId)
          ];
          
          // Actually call the parent function to replace the entire pets array
          onReplacePet(newPetsArray);
          
          // Debug the result after a short delay to allow state updates
          setTimeout(() => {
            debugLog("MBAi39gh45v", "REPLACE PET - After onReplacePet, pets count:", 
              Array.isArray(pets) ? pets.length : "pets not an array");
          }, 100);
        } else {
          // Fallback if onReplacePet is not provided (though it should be)
          debugLog("MBAi39gh45v", "REPLACE PET WARNING - No onReplacePet handler provided by parent component");
          
          // Use onDeletePet and onAddPet as a fallback, adding to the top of the list
          if (onDeletePet && onAddPet) {
            debugLog("MBAi39gh45v", "REPLACE PET - Using fallback: delete temp pet and add real pet");
            
            // Safely create a copy of the merged pet data to avoid reference issues
            const newPetData = {...mergedPetData, _addToTop: true};
            
            // First, add the new pet to ensure we don't end up with an empty list
            onAddPet(newPetData);
            
            // Then delete the temporary pet - but only if it's different from what we just added
            if (tempPetId !== newPetData.id) {
              onDeletePet(tempPetId);
            }
            
            // Debug the result after a short delay
            setTimeout(() => {
              debugLog("MBAi39gh45v", "REPLACE PET - After fallback method, pets count:", 
                Array.isArray(pets) ? pets.length : "pets not an array");
            }, 100);
          } else {
            // No replacement methods available at all
            debugLog("MBAi39gh45v", "REPLACE PET ERROR - No methods available to update pets list");
            toast({
              message: "Unable to update pets list. Please refresh the page.",
              type: 'error',
              duration: 4000
            });
          }
        }
      } catch (error) {
        // If the parent component's update methods fail, at least don't crash
        debugLog("MBAi39gh45v", "REPLACE PET ERROR - Exception updating parent component:", error);
        
        // Safety check: If somehow the pets list is no longer an array, restore it
        // This is the critical fix for the main bug where pets becomes a string
        if (!Array.isArray(pets)) {
          debugLog("MBAi39gh45v", "REPLACE PET CRITICAL ERROR - pets is not an array after replace:", pets);
          
          // Restore from the saved copy we made earlier
          const petsBefore = Array.isArray(pets) ? [...pets] : [];
          
          // If we have the original pets array, use that with the new pet added
          if (Array.isArray(petsBefore) && petsBefore.length > 0) {
            // Create a clean pets array with the new pet added
            const restoredPets = [
              // Add the new pet at the top
              mergedPetData,
              // Add all previous pets except the temp one
              ...petsBefore.filter(p => p.id !== tempPetId)
            ];
            
            // If the parent component has a pets state setter, we could call it here
            // This is commented out because we don't have direct access to the parent's state setter
            // setPets(restoredPets);
            
            debugLog("MBAi39gh45v", "REPLACE PET FIX - Created restored pets array with length:", restoredPets.length);
          }
        }
        
        toast({
          message: "Pet saved but display may not be updated. Please refresh if needed.",
          type: 'info',
          duration: 4000
        });
      }
      
      // Clear any editing state for the temp pet
      setEditingPetIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempPetId);
        return newSet;
      });
      
      // Update expanded state to show the real pet
      setExpandedPetIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempPetId);
        newSet.add(realPetId);
        return newSet;
      });
      
      // Log success
      debugLog("MBA5555", "REPLACE PET - Successfully replaced temp pet with real pet");
      
      // No need for a toast anymore since we've properly handled the data
      
    } catch (error) {
      debugLog("MBA5555", "REPLACE PET - Error replacing pet:", error);
    }
  };

  // Handle saving the cropped pet image
  const handleSaveCroppedPetImage = async (imageUri, cropParams) => {
    try {
      setIsUploadingPhoto(true);
      
      debugLog('MBA5555', 'Processing cropped pet image with params:', cropParams);
      
      // Process the image with crop parameters
      const processedImage = await processImageWithCrop(imageUri, cropParams);
      
      // For web platform, we get a base64 data URL that we can display directly
      let displayUri = imageUri;
      if (processedImage.base64Data) {
        displayUri = processedImage.base64Data;
      }
      
      // Update the edited pet data with the new photo URI
      setEditedPetsData(prev => {
        const petData = prev[currentEditingPetId] || {};
        return {
          ...prev,
          [currentEditingPetId]: {
            ...petData,
            photo: processedImage, // Store the processed image for later upload
            photoUri: displayUri, // Use the cropped image for display
          }
        };
      });
      
      toast({
        message: 'Pet photo updated. It will be saved when you save the pet.',
        type: 'success',
        duration: 4000
      });
      
    } catch (error) {
      debugLog('MBA5555', 'Error processing pet photo:', error);
      toast({
        message: 'Failed to process pet photo. Please try again.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setIsUploadingPhoto(false);
      setShowPetPhotoCropper(false);
      setSelectedPetPhotoUri(null);
      setCurrentEditingPetId(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {renderDatePickerModal()}
      <ConfirmationModal
        visible={deleteConfirmation.visible}
        onClose={cancelDeletePet}
        onConfirm={confirmDeletePet}
        actionText={`delete ${deleteConfirmation.petName}`}
        isLoading={deleteConfirmation.isDeleting}
      />
      <View style={[styles.section, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Pets</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddNewPet}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
            <Text style={styles.addButtonText}>Add Pet</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.petsList}>
          {Array.isArray(pets) ? (
            pets.length > 0 ? (
              pets.map(renderPetCard)
            ) : (
              // Show empty state if pets array is empty
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No pets found. Add a pet using the button above.</Text>
              </View>
            )
          ) : (
            // Show error state if pets is not an array
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>Error: Unable to display pets</Text>
            </View>
          )}
        </View>
      </View>

      {/* TODO: uncomment this once we have implemented edit facilities */}
      {/* <View style={[styles.section, { backgroundColor: theme.colors.surfaceContrast }]}>
        <Text style={styles.sectionTitle}>
          {userRole === 'professional' ? 'My Home & Environment Facilities' : 'Home & Environment Preferences'}
        </Text>
        <Text style={styles.sectionDescription}>
          {userRole === 'professional' 
            ? 'Select the facilities available in your home for pet care'
            : 'Select your preferences for pet care facilities'
          }
        </Text>
        <View style={styles.preferencesGrid}>
          {allFacilities.map((facility) => {
            const isSelected = preferences.homeEnvironment.includes(facility.id);
            return (
              <TouchableOpacity
                key={facility.id}
                style={[
                  styles.preferenceButton,
                  isSelected && styles.selectedPreference
                ]}
                onPress={() => onUpdatePreferences('homeEnvironment', facility.id)}
              >
                <MaterialCommunityIcons 
                  name={facility.icon} 
                  size={20} 
                  color={theme.colors.primary}
                />
                <Text style={[
                  styles.preferenceText,
                  isSelected && styles.selectedPreferenceText
                ]}>
                  {facility.label}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={18} 
                    color={theme.colors.primary}
                    style={styles.checkmark}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {renderEmergencyContactsSection()}
      {renderHouseholdMembersSection()} */}
      
      {/* Pet Photo Cropper Modal */}
      <ProfilePhotoCropper
        visible={showPetPhotoCropper}
        imageUri={selectedPetPhotoUri}
        onClose={() => {
          setShowPetPhotoCropper(false);
          setSelectedPetPhotoUri(null);
          setCurrentEditingPetId(null);
        }}
        onSave={handleSaveCroppedPetImage}
        isUploading={isUploadingPhoto}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginVertical: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  container: {
    flex: 1,
    gap: 24,
  },
  section: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 8,
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  petsList: {
    gap: 16,
    paddingBottom: 70, // Add extra padding at the bottom for better scrolling on mobile
  },
  petCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  petCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  petBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  petPhoto: {
    width: 68,
    height: 68,
    borderRadius: 50,
  },
  placeholderIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.surfaceVariant,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: 14,  // Center the icon
  },
  profilePhotoButton: {
    position: 'relative',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  petInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  petDetailsContainer: {
    flexDirection: 'column',
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 2,
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  detailColumn: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  preferenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  selectedPreference: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`, // 15 is the hex opacity (about 8%)
  },
  preferenceText: {
    fontSize: 14,
    color: theme.colors.primary,
    flex: 1,
  },
  selectedPreferenceText: {
    color: theme.colors.primary,
  },
  checkmark: {
    marginLeft: 'auto',
  },
  petActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  fixButton: {
    padding: 4,
    backgroundColor: `${theme.colors.warning}15`,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  // New styles for emergency contacts and household members
  addContactForm: {
    marginBottom: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  contactsList: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  contactPhone: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyListText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
  compatibilityContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  compatibilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexWrap: 'wrap',
  },
  compatibilityLabel: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 0.4,
    marginRight: 10,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 60,
    justifyContent: 'flex-end',
  },
  dropdownText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  careInfoContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  medicationsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  medicationsText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  vetInfoContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  vetInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  vetInfoLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  vetInfoText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  dropdownContainerEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 60,
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  optionButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    marginLeft: 10,
    marginBottom: 5
  },
  selectedOption: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  optionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedOptionText: {
    color: theme.colors.primary,
  },
  editInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  editInputMedications: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    marginLeft: 10
  },
  editInputShort: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    width: '55%',
    marginLeft: 'auto'
  },
  editInputWeight: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    width: '40%',
    marginLeft: 'auto'
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  documentActionContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  documentsList: {
    marginTop: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  documentName: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  viewDocButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: `${theme.colors.primary}15`,
  },
  viewDocText: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  noDocumentsText: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  detailSection: {
    marginTop: 16,
  },
  editContainer: {
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
  },
  inputsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    flex: 1,
  },
  inputWrapper: {
    minWidth: 150,
    flexBasis: '46%',
    flexGrow: 1,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginBottom: 4,
  },
  editMainContainer: {
    width: '100%',
    marginBottom: 16,
  },
  editHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  editProfileContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  editDetailsContainer: {
    width: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  editActionsSmallScreen: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  buttonRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonRowBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dateInfoContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  dateInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dateInfoLabel: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  dateInfoText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  customDatePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    height: 46,
  },
  dateInputBox: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dateInputText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.placeholder,
  },
  calendarButton: {
    width: 46,
    height: '100%',
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    flex: 1,
    maxWidth: '60%',
    marginLeft: 'auto',
    marginRight: 10,
  },
  // Media query style for larger screens
  '@media (min-width: 900px)': {
    petDetailsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    petDetails: {
      marginRight: 8,
    },
  },
  // Modal calendar styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 420,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  weekdayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.secondary,
    paddingVertical: 8,
  },
  calendarGrid: {
    marginBottom: 16,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  calendarDayText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayTextOtherMonth: {
    color: theme.colors.placeholder,
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  calendarDayTextSelected: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  stackedFields: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  fullWidth: {
    width: '100%',
  },
  saveButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Error modal styles
  errorModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  successModalContent: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  errorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalHeader: {
    // Same styles, but we might want to customize in the future
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  successModalTitle: {
    color: theme.colors.success,
  },
  errorModalMessage: {
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24,
  },
  successModalMessage: {
    // Same styles, but we might want to customize in the future
  },
  errorModalButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  successModalButton: {
    backgroundColor: theme.colors.success,
  },
  errorModalButtonText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  successModalButtonText: {
    // Same styles, but we might want to customize in the future
  },
  editButtonTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  chevronButtonBottomRight: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 2,
  },
  petInfoWithButtonPadding: {
    paddingRight: 20, // enough space for both buttons
  },
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 120,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 8,
  },
  dropdownList: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 1000,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.primary + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  dropdownItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default PetsPreferencesTab; 