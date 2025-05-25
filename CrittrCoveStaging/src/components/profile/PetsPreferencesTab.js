import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, Platform, Modal, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { debugLog } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addPet, updatePet, fixPetOwner, deletePet } from '../../api/API';
import { useToast } from '../../components/ToastProvider';
import ConfirmationModal from '../ConfirmationModal';
import { calculateAge } from '../../data/calculations';

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
        displayValue = pet.energyLevel; // Fallback to whatever string is there
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
    
    // Update the edited data for this specific pet
    setEditedPetsData(prev => ({
      ...prev,
      [petId]: {...petToEdit}
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
        duration: 3000
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
    const petName = petToDelete ? petToDelete.name : 'this pet';
    
    // Show confirmation modal
    setDeleteConfirmation({
      visible: true,
      petId: petId,
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
        duration: 3000
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
        duration: 3000
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
    // Prevent multiple clicks
    if (savingPet) {
      debugLog("MBA5555", "SAVE PET - Already saving, ignoring duplicate click");
      return;
    }
    
    try {
      // Mark that we're starting a save operation
      setSavingPet(true);
      
      // Log current state for debugging
      debugLog("MBA5555", "SAVE PET - Starting save with pets:", pets.map(p => ({id: p.id, name: p.name || 'unnamed'})));
      debugLog("MBA5555", "SAVE PET - Saving petId:", petId);
      
      // Get the edited data for this pet
      const editedData = editedPetsData[petId] || {};
      
      // Format the pet data for the backend
      const petData = {
        name: editedData.name || '',
        species: editedData.type || '',
        breed: editedData.breed || '',
        age_years: editedData.ageYears,
        age_months: editedData.ageMonths,
        weight: editedData.weight,
        birthday: editedData.birthday ? formatDateForBackend(editedData.birthday) : null,
        sex: editedData.sex,
        adoption_date: editedData.adoptionDate ? formatDateForBackend(editedData.adoptionDate) : null,
        pet_description: editedData.description || '',
        friendly_with_children: editedData.childrenFriendly,
        friendly_with_cats: editedData.catFriendly,
        friendly_with_dogs: editedData.dogFriendly,
        spayed_neutered: editedData.spayedNeutered,
        house_trained: editedData.houseTrained,
        microchipped: editedData.microchipped,
        feeding_schedule: editedData.feedingInstructions || '',
        potty_break_schedule: editedData.pottyBreakSchedule || '',
        energy_level: editedData.energyLevel || 'LOW',
        can_be_left_alone: editedData.canBeLeftAlone,
        medication_notes: editedData.medicalNotes || '',
        special_care_instructions: editedData.specialCareInstructions || '',
        vet_name: editedData.vetName || '',
        vet_address: editedData.vetAddress || '',
        vet_phone: editedData.vetPhone || '',
        insurance_provider: editedData.insuranceProvider || '',
        vet_documents: editedData.vetDocuments || [],
      };
      
      debugLog("MBA5555", "SAVE PET - Pet data being sent:", petData);
      
      const isNewPet = String(petId).startsWith('temp_');
      debugLog("MBA5555", "SAVE PET - Is this a new pet?", isNewPet);
      
      let successMessage = "";
      
      if (isNewPet) {
        debugLog("MBA5555", "SAVE PET - Creating a new pet with backend API call");
        
        try {
          // Call the API to create the pet
          const response = await addPet(petData);
          debugLog("MBA5555", "SAVE PET - API response from addPet:", response);
          
          // If we have a valid response with pet data
          if (response && response.pet && response.pet.pet_id) {
            // Extract the real pet ID from the backend response
            const newPetId = response.pet.pet_id; 
            
            // Update our pet data with the real ID and all data from the response
            const updatedPetData = {
              ...editedData, // Keep our local edited data
              ...response.pet, // Add all the pet data from the response
              id: newPetId, // Ensure the ID field is set properly
              type: response.pet.species || editedData.type, // Map species to type for UI consistency
              // Make sure UI-specific fields are properly mapped from backend data
              feedingInstructions: response.pet.feeding_schedule || editedData.feedingInstructions,
              medicalNotes: response.pet.medication_notes || editedData.medicalNotes,
              pottyBreakSchedule: response.pet.potty_break_schedule || editedData.pottyBreakSchedule,
              specialCareInstructions: response.pet.special_care_instructions || editedData.specialCareInstructions,
              // Format birthday properly if it exists
              birthday: response.pet.birthday ? formatDateFromBackend(response.pet.birthday) : editedData.birthday,
              // Format adoption date properly if it exists
              adoptionDate: response.pet.adoption_date ? formatDateFromBackend(response.pet.adoption_date) : editedData.adoptionDate,
            };
            
            debugLog("MBA5555", "SAVE PET - Successfully created pet. Old ID:", petId, "New ID:", newPetId);
            
            // *** CRITICAL FIX: Use replacePet instead of separate delete and add operations ***
            replaceTempPetWithReal(petId, updatedPetData);
            
            // Set success message
            successMessage = `Pet "${updatedPetData.name}" was successfully created!`;
            
            // Show success toast
            toast({
              message: successMessage,
              type: 'success',
              duration: 3000
            });
            
            // Reset all editing state for this pet
            setEditingPetIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(petId);
              return newSet;
            });
            
            setEditedPetsData(prev => {
              const newData = {...prev};
              delete newData[petId];
              return newData;
            });
            
            // Update expanded state to show the real pet
            setExpandedPetIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(petId);
              newSet.add(newPetId);
              return newSet;
            });
          }
        } catch (apiError) {
          debugLog("MBA5555", "SAVE PET - API error adding pet:", apiError);
          setSavingPet(false); // Reset saving flag
          
          // Show error message with details from the API error
          showErrorMessage("Failed to Create Pet", apiError);
          return; // Exit the function early to prevent further processing
        }
      } else {
        debugLog("MBA5555", "SAVE PET - Updating existing pet:", petId);
        
        try {
          const response = await updatePet(petId, petData);
          debugLog("MBA5555", "SAVE PET - API response from updatePet:", response);
          
          // Update our local pet data with the response data
          if (response) {
            const updatedPetData = {
              ...editedData,
              ...response,
              id: petId,
              type: response.species || editedData.type,
              feedingInstructions: response.feeding_schedule || editedData.feedingInstructions,
              medicalNotes: response.medication_notes || editedData.medicalNotes,
              pottyBreakSchedule: response.potty_break_schedule || editedData.pottyBreakSchedule,
              specialCareInstructions: response.special_care_instructions || editedData.specialCareInstructions,
              birthday: response.birthday ? formatDateFromBackend(response.birthday) : editedData.birthday,
              adoptionDate: response.adoption_date ? formatDateFromBackend(response.adoption_date) : editedData.adoptionDate,
            };
            
            // Update the pet in the parent component
            onEditPet(petId, updatedPetData);
            
            // Set success message
            successMessage = `Pet "${updatedPetData.name}" was successfully updated!`;
            
            // Show success toast
            toast({
              message: successMessage,
              type: 'success',
              duration: 3000
            });
            
            // Reset editing state for this pet
            setEditingPetIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(petId);
              return newSet;
            });
            
            setEditedPetsData(prev => {
              const newData = {...prev};
              delete newData[petId];
              return newData;
            });
            
            debugLog("MBA5555", "SAVE PET - Successfully updated pet:", petId);
          }
        } catch (apiError) {
          debugLog("MBA5555", "SAVE PET - API error updating pet:", apiError);
          
          // Show error message with details from the API error
          showErrorMessage("Failed to Update Pet", apiError);
          setSavingPet(false); // Reset saving flag
          return; // Exit early
        }
      }
      
      // Reset saving flag
      setTimeout(() => {
        setSavingPet(false);
        debugLog("MBA5555", "SAVE PET - Final state after all operations:", pets.map(p => ({id: p.id, name: p.name || 'unnamed'})));
      }, 100);
    } catch (error) {
      debugLog("MBA5555", "SAVE PET - Unexpected error saving pet:", error);
      setSavingPet(false); // Reset saving flag even on error
      
      // Show generic error message for unexpected errors
      showErrorMessage("Failed to Save Pet", error);
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
    setEditedPetsData(prev => ({
      ...prev,
      [petId]: {
        ...(prev[petId] || {}),
        [field]: value
      }
    }));
    debugLog("MBA456", "Editing pet field", { petId, field, value });
  };

  const handleAddNewPet = () => {
    
    // Check for existing temporary pets first
    const existingTempPets = pets.filter(pet => String(pet.id).startsWith('temp_'));
    debugLog("MBA5555", "ADD PET - Existing temp pets:", existingTempPets.map(p => p.id));
    
    // If we already have a temporary pet being edited, don't create a new one
    if (existingTempPets.length > 0) {
      debugLog("MBA5555", "ADD PET - Found existing temp pet, not creating a new one");
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
      
      return;
    }
    
    // Create a temporary ID for the new pet
    const tempId = `temp_${Date.now()}`;
    debugLog("MBA5555", "ADD PET - Creating new pet with temp ID:", tempId);
    
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
    
    // Now add the new pet to the existing pets array via the parent component
    // Adding at the top of the list instead of the bottom
    debugLog("MBA5555", "ADD PET - Calling onAddPet with new pet (adding to top of list)");
    onAddPet({...newPet, _addToTop: true});
    
    // After everything is done, log the current state
    setTimeout(() => {
      debugLog("MBA5555", "ADD PET - Final state:", pets.map(p => ({id: p.id, name: p.name || 'unnamed'})));
    }, 100);
  };

  const handleUploadDocument = async (petId) => {
    try {
      debugLog("MBA456", "Document upload simulated");
      // Simulate a document being selected
      const mockDocument = {
        name: `Document_${new Date().getTime()}.pdf`,
        size: 1024 * 1024 * 2, // 2MB
        type: 'application/pdf'
      };
      
      setEditedPetsData(prev => ({
        ...prev,
        [petId]: {
          ...(prev[petId] || {}),
          vetDocuments: [...(prev[petId]?.vetDocuments || []), mockDocument]
        }
      }));
      
      // Show a toast notification
      toast({
        message: "Document added successfully. Full document upload feature coming soon.",
        type: 'info',
        duration: 3000
      });
    } catch (error) {
      debugLog("MBA456", "Error with document upload", error);
      
      // Show error toast notification
      toast({
        message: "Failed to add document",
        type: 'error',
        duration: 3000
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
    try {
      // Safety check to ensure we have a valid pet object
      if (!pet || typeof pet !== 'object' || !pet.id) {
        console.warn("Invalid pet in renderPetCard");
        return null;
      }
      
      const isExpanded = expandedPetIds.has(pet.id);
      const isEditing = editingPetIds.has(pet.id);
      const editedPetData = editedPetsData[pet.id] || pet;
      const isSmallScreen = windowWidth < 500;
      // Check if this is a pet that hasn't been saved to the database yet
      const isNewPet = pet.id && String(pet.id).startsWith('temp_');
      
      // Safely extract text properties with defaults to prevent rendering objects
      const petName = typeof pet.name === 'string' ? pet.name : '';
      const petBreed = typeof pet.breed === 'string' ? pet.breed : '';
      const petType = typeof pet.type === 'string' ? pet.type : '';
      const petAgeString = pet.birthday ? calculateAge(pet.birthday) : 'No age set';
      
      return (
        <View key={pet.id} style={styles.petCard}>
          <TouchableOpacity 
            style={[
              styles.petHeader,
              { backgroundColor: theme.colors.surface }
            ]} 
            onPress={(event) => {
              // Important: only toggle details if not in edit mode
              // This prevents any side effects during editing
              if (!isEditing) {
                debugLog("MBA5555", "PET HEADER - Toggle clicked for pet:", pet.id);
                togglePetDetails(pet.id);
              } else {
                debugLog("MBA5555", "PET HEADER - Ignoring click while in edit mode for pet:", pet.id);
                // Stop propagation to prevent triggering other events
                event.stopPropagation();
              }
            }}
            activeOpacity={0.2}
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
                        <Image 
                          source={require('../../../assets/default-pet-image.png')}
                          style={styles.petPhoto}
                        />
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
                          placeholder="Enter breed"
                          placeholderTextColor={theme.colors.placeholder}
                        />
                      </View>
                    </View>
                    
                    {isSmallScreen ? (
                      // Stack animal type and birthday vertically on small screens
                      <View style={styles.stackedFields}>
                        <View style={[styles.detailColumn, styles.fullWidth]}>
                          <Text style={styles.inputLabel}>Animal Type</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editedPetData.type || ''}
                            onChangeText={(text) => handleEditChange(pet.id, 'type', text)}
                            placeholder="Enter type"
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
                  <Image 
                    source={require('../../../assets/default-pet-image.png')}
                    style={styles.petPhoto}
                  />
                  <View style={[
                    styles.petInfo,
                    windowWidth < 600 && styles.petInfoWithButtonPadding
                  ]}>
                    <Text style={styles.petName}>{petName}</Text>
                    <View style={styles.petDetailsContainer}>
                      <Text style={styles.petDetails}>
                        {petBreed ? petBreed : 'No breed'} • {petAgeString} • {petType ? petType : 'No type'}
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
                    <Text style={styles.detailText}>{pet.feedingInstructions || '2 cups of dry food twice daily (morning/evening)'}</Text>
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
                    <Text style={styles.detailText}>{pet.medicalNotes || 'Hip dysplasia, daily joint supplement in AM meal'}</Text>
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
                    <Text style={styles.detailText}>{pet.pottyBreakSchedule || '15 minutes after each meal'}</Text>
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
                    <Text style={styles.detailText}>{pet.specialCareInstructions || 'Don\'t touch his butt, he will eat your ass'}</Text>
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
                                  {option}
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
                            value={typeof editedPetData.medications === 'string' ? editedPetData.medications : ''}
                            onChangeText={(text) => handleEditChange(pet.id, 'medications', text)}
                            placeholder="Enter medications"
                            placeholderTextColor={theme.colors.placeholder}
                            multiline
                          />
                        ) : (
                          <Text style={styles.medicationsText}>
                            {typeof pet.medications === 'string' ? pet.medications : 
                             (pet.medications === null ? 'None' : 
                              (typeof pet.medications === 'object' ? 'None' : String(pet.medications)))}
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
    } catch (error) {
      console.error("Error rendering pet card: " + (error.message || "Unknown error"));
      return null; // Return null on error to prevent crashes
    }
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
  };
  
  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(prevYear => prevYear + 1);
    } else {
      setDisplayMonth(prevMonth => prevMonth + 1);
    }
  };
  
  const selectDate = (date) => {
    handleDatePickerSelect(null, date);
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
    
    return (
      <Modal
        visible={datePickerConfig.isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerConfig(prev => ({ ...prev, isVisible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>
                Select {datePickerConfig.currentField === 'birthday' ? 'Birthday' : 'Adoption Date'}
              </Text>
              <TouchableOpacity 
                onPress={() => setDatePickerConfig(prev => ({ ...prev, isVisible: false }))}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.calendarNavButton}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              
              <Text style={styles.calendarMonthYear}>{monthNames[displayMonth]} {displayYear}</Text>
              
              <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Weekday Headers */}
            <View style={styles.weekdayLabels}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Text key={index} style={styles.weekdayLabel}>{day}</Text>
              ))}
            </View>
            
            {/* Calendar Grid */}
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
                      onPress={() => dayObj.isCurrentMonth && selectDate(dayObj.date)}
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
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => handleDatePickerSelect(null, datePickerConfig.selectedDate)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      debugLog("MBA5555", "REPLACE PET - Replacing temp pet with real pet in parent state");
      
      // Find the current pets array and create a new one with the temp pet replaced by the real one
      const currentPetsArray = [...pets];
      const tempPetIndex = currentPetsArray.findIndex(p => p.id === tempPetId);
      
      if (tempPetIndex !== -1) {
        // Create a new array with the temp pet replaced by the real one
        const updatedPets = [
          ...currentPetsArray.slice(0, tempPetIndex),
          realPetData,
          ...currentPetsArray.slice(tempPetIndex + 1)
        ];
        
        // Log the before and after state for debugging
        debugLog("MBA5555", "REPLACE PET - Before replace:", currentPetsArray.map(p => ({id: p.id, name: p.name || 'unnamed'})));
        debugLog("MBA5555", "REPLACE PET - After replace:", updatedPets.map(p => ({id: p.id, name: p.name || 'unnamed'})));
        
        // Update the parent's state with the new array
        try {
          debugLog("MBA5555", "REPLACE PET - Calling onReplacePet with new array");
          onReplacePet(updatedPets);
          debugLog("MBA5555", "REPLACE PET - Atomic replacement completed");
        } catch (callbackError) {
          debugLog("MBA5555", "REPLACE PET - Error in onReplacePet callback:", callbackError);
          // If the callback fails, try the fallback approach
          try {
            debugLog("MBA5555", "REPLACE PET - Trying fallback: delete + add");
            onDeletePet(tempPetId);
            setTimeout(() => {
              onAddPet(realPetData);
            }, 50);
          } catch (fallbackError) {
            debugLog("MBA5555", "REPLACE PET - Even fallback failed:", fallbackError);
            // At this point, we've tried everything - just re-throw
            throw fallbackError;
          }
        }
      } else {
        debugLog("MBA5555", "REPLACE PET - Temp pet not found in array of length " + currentPetsArray.length);
        debugLog("MBA5555", "REPLACE PET - Current pet IDs: " + currentPetsArray.map(p => p.id).join(', '));
        debugLog("MBA5555", "REPLACE PET - Temp pet ID we're looking for: " + tempPetId);
        debugLog("MBA5555", "REPLACE PET - Falling back to add");
        
        try {
          onAddPet(realPetData);
        } catch (addError) {
          debugLog("MBA5555", "REPLACE PET - Error in onAddPet fallback:", addError);
          throw addError;
        }
      }
    } catch (error) {
      debugLog("MBA5555", "REPLACE PET - Unexpected error during pet replacement:", error);
      // Re-throw the error so the caller can handle it
      throw error;
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
          {pets.map(renderPetCard)}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  },
  petCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  petHeader: {
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
  profilePhotoButton: {
    position: 'relative',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    color: theme.colors.white,
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
    color: theme.colors.white,
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
});

export default PetsPreferencesTab; 