import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { debugLog } from '../../context/AuthContext';
import DatePicker from '../DatePicker';
import { addPet } from '../../api/API';

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
  const yesNoOptions = ["Yes", "No"];
  const energyLevelOptions = ["Low", "Medium", "High"];
  const sexOptions = ["Male", "Female"];

  const returnYesNoContainer = (pet, attributeName) => {
    return (
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownText}>{pet && attributeName && pet[attributeName] !== undefined ? pet[attributeName] : 'Yes'}</Text>
      </View>
    );
  };

  const returnEnergyLevelContainer = (pet) => {
    // Map backend value to frontend display value
    let displayValue = 'Medium';
    if (pet && pet.energyLevel) {
      if (pet.energyLevel === 'LOW') displayValue = 'Low';
      else if (pet.energyLevel === 'MODERATE') displayValue = 'Medium';
      else if (pet.energyLevel === 'HIGH') displayValue = 'High';
      else displayValue = pet.energyLevel; // Fallback to whatever is there
    }
    
    return (
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownText}>{displayValue}</Text>
      </View>
    );
  };

  const togglePetDetails = (petId) => {
    // Don't toggle if this pet is being edited
    if (editingPetIds.has(petId)) {
      return;
    }
    
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
  
  const handleSavePetEdit = async (petId) => {
    // Get the edited data for this pet
    const editedData = editedPetsData[petId];
    
    try {
      // Check if this is a newly added pet (has a temp_ ID)
      if (petId && petId.toString().startsWith('temp_')) {
        debugLog("MBA456", "Saving new pet to backend:", editedData);
        
        // Map frontend fields to backend fields
        const petData = {
          name: editedData.name,
          species: editedData.type?.toUpperCase() || 'OTHER', // Convert to uppercase for backend enum
          breed: editedData.breed,
          pet_type: editedData.type,
          sex: (editedData.sex === 'Male') ? 'M' : 'F',
          weight: editedData.weight ? parseFloat(editedData.weight) : null,
          birthday: editedData.birthday || null,
          adoption_date: editedData.adoptionDate || null,
          pet_description: '',
          friendly_with_children: editedData.childrenFriendly === 'Yes',
          friendly_with_cats: editedData.catFriendly === 'Yes',
          friendly_with_dogs: editedData.dogFriendly === 'Yes',
          spayed_neutered: editedData.spayedNeutered === 'Yes',
          house_trained: editedData.houseTrained === 'Yes',
          microchipped: editedData.microchipped === 'Yes',
          feeding_schedule: editedData.feedingInstructions || '',
          potty_break_schedule: editedData.pottyBreakSchedule || '',
          energy_level: editedData.energyLevel === 'Low' ? 'LOW' : 
                       editedData.energyLevel === 'Medium' ? 'MODERATE' : 
                       editedData.energyLevel === 'High' ? 'HIGH' : 'MODERATE',
          can_be_left_alone: editedData.canBeLeftAlone === 'Yes',
          medications: typeof editedData.medications === 'string' ? { notes: editedData.medications } : editedData.medications,
          medication_notes: editedData.medicalNotes || '',
          special_care_instructions: editedData.specialCareInstructions || '',
          vet_name: editedData.vetName || '',
          vet_address: editedData.vetAddress || '',
          vet_phone: editedData.vetPhone || '',
          insurance_provider: editedData.insuranceProvider || '',
          vet_documents: editedData.vetDocuments || [],
        };
        
        // Call the API to create the pet
        await addPet(petData);
        debugLog("MBA456", "Pet added successfully to backend");
      }
      
      // Save the changes to local state regardless
      onEditPet(petId, editedData);
      
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
    } catch (error) {
      debugLog("MBA456", "Error saving pet:", error);
      // You might want to show an error message to the user here
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
    // Create a temporary ID for the new pet
    const tempId = `temp_${Date.now()}`;
    
    // Create a blank pet entry
    const newPet = {
      id: tempId,
      name: '',
      breed: '',
      age: '',
      type: '',
      feedingInstructions: '',
      medicalNotes: '',
      pottyBreakSchedule: '',
      specialCareInstructions: '',
      childrenFriendly: 'Yes',
      dogFriendly: 'Yes',
      catFriendly: 'Yes',
      spayedNeutered: 'Yes',
      houseTrained: 'Yes',
      microchipped: 'Yes',
      energyLevel: 'Medium',
      canBeLeftAlone: 'Yes',
      medications: '',
      vetName: '',
      vetAddress: '',
      vetPhone: '',
      insuranceProvider: '',
      vetDocuments: [],
      // New fields
      sex: 'Male',
      weight: '',
      birthday: '',
      adoptionDate: ''
    };
    
    // Add the new pet to the existing pets array via the parent component
    onAddPet(newPet);
    
    // Start editing the new pet immediately
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
    
    debugLog("MBA456", "Added new blank pet", newPet);
  };

  const handleUploadDocument = async (petId) => {
    try {
      // For web compatibility, we just simulate document upload
      if (Platform.OS === 'web') {
        debugLog("MBA456", "Web document upload simulated");
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
        return;
      }

      // This code would only run on native platforms where the module is available
      debugLog("MBA456", "Native document picker would be triggered here");
      alert("Document upload feature will be available soon on this platform");
      
      // When actual document picker is implemented, we would update the state here
    } catch (error) {
      debugLog("MBA456", "Error with document upload", error);
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
    // Stop event propagation to prevent triggering the pet card expansion
    if (event) {
      event.stopPropagation();
    }
    
    setExpandedSections(prev => {
      const key = `${petId}-${sectionName}`;
      const newState = { ...prev };
      newState[key] = !prev[key];
      return newState;
    });
  };

  const isSectionExpanded = (petId, sectionName) => {
    const key = `${petId}-${sectionName}`;
    // Default to false (closed) for initial view
    return expandedSections[key] === true;
  };

  const renderSectionHeader = (petId, title, sectionName) => {
    const isExpanded = isSectionExpanded(petId, sectionName);
    
    return (
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={(event) => toggleSection(petId, sectionName, event)}
      >
        <Text style={styles.detailTitle}>{title}</Text>
        <MaterialCommunityIcons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.colors.text}
        />
      </TouchableOpacity>
    );
  };

  const renderPetCard = (pet) => {
    const isExpanded = expandedPetIds.has(pet.id);
    const isEditing = editingPetIds.has(pet.id);
    const editedPetData = editedPetsData[pet.id] || pet;

    return (
      <View key={pet.id} style={styles.petCard}>
        <TouchableOpacity 
          style={[
            styles.petHeader,
            { backgroundColor: theme.colors.surface }
          ]} 
          onPress={() => togglePetDetails(pet.id)}
          activeOpacity={isEditing ? 1 : 0.2}
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
                  <View style={styles.editActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleSavePetEdit(pet.id)}
                    >
                      <MaterialCommunityIcons name="check" size={20} color={theme.colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleCancelPetEdit(pet.id)}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                    <MaterialCommunityIcons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={theme.colors.text}
                    />
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
                      />
                    </View>
                    <View style={styles.detailColumn}>
                      <Text style={styles.inputLabel}>Breed</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedPetData.breed || ''}
                        onChangeText={(text) => handleEditChange(pet.id, 'breed', text)}
                        placeholder="Enter breed"
                      />
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <View style={styles.detailColumn}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedPetData.age || ''}
                        onChangeText={(text) => handleEditChange(pet.id, 'age', text)}
                        placeholder="Enter age"
                      />
                    </View>
                    <View style={styles.detailColumn}>
                      <Text style={styles.inputLabel}>Animal Type</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedPetData.type || ''}
                        onChangeText={(text) => handleEditChange(pet.id, 'type', text)}
                        placeholder="Enter type"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Image 
                  source={require('../../../assets/default-pet-image.png')}
                  style={styles.petPhoto}
                />
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petDetails}>
                    {pet.breed} • {pet.age} • {pet.type}
                  </Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.petActions}>
            {!isEditing ? (
              <>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEditPet(pet.id)}
                >
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <MaterialCommunityIcons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={theme.colors.text}
                />
              </>
            ) : null}
          </View>
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
                    placeholder="Enter potty break schedule"
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
                    placeholder="Enter special care instructions"
                    multiline
                  />
                ) : (
                  <Text style={styles.detailText}>{pet.specialCareInstructions || 'Don\'t touch his butt, he will eat your ass'}</Text>
                )}
              </View>
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
                                (editedPetData.childrenFriendly || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'childrenFriendly', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.childrenFriendly || 'Yes') === option && styles.selectedOptionText
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
                                (editedPetData.catFriendly || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'catFriendly', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.catFriendly || 'Yes') === option && styles.selectedOptionText
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
                                (editedPetData.dogFriendly || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'dogFriendly', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.dogFriendly || 'Yes') === option && styles.selectedOptionText
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
                                (editedPetData.spayedNeutered || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'spayedNeutered', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.spayedNeutered || 'Yes') === option && styles.selectedOptionText
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
                                (editedPetData.houseTrained || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'houseTrained', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.houseTrained || 'Yes') === option && styles.selectedOptionText
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
                                (editedPetData.microchipped || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'microchipped', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.microchipped || 'Yes') === option && styles.selectedOptionText
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
                  </View>
                </View>
              )}
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
                                (editedPetData.energyLevel || 'Medium') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'energyLevel', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.energyLevel || 'Medium') === option && styles.selectedOptionText
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
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Can be left alone:</Text>
                      {isEditing ? (
                        <View style={styles.dropdownContainerEdit}>
                          {yesNoOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.optionButton,
                                (editedPetData.canBeLeftAlone || 'Yes') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'canBeLeftAlone', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.canBeLeftAlone || 'Yes') === option && styles.selectedOptionText
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
                    <View style={styles.compatibilityItem}>
                      <Text style={styles.compatibilityLabel}>Weight (lbs):</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInputShort}
                          value={editedPetData.weight || ''}
                          onChangeText={(text) => {
                            // Only allow numbers and decimal point
                            if (/^(\d*\.?\d*)$/.test(text) || text === '') {
                              handleEditChange(pet.id, 'weight', text);
                            }
                          }}
                          placeholder="Enter weight"
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
                          multiline
                        />
                      ) : (
                        <Text style={styles.medicationsText}>{pet.medications || 'None'}</Text>
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
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.vetName || 'Dr. Smith Animal Hospital'}</Text>
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
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.vetAddress || '123 Main St, Anytown, USA'}</Text>
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
                          keyboardType="phone-pad"
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.vetPhone || '(555) 123-4567'}</Text>
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
                        />
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.insuranceProvider || 'Pet Insurance Co.'}</Text>
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
                                (editedPetData.sex || 'Male') === option && styles.selectedOption
                              ]}
                              onPress={() => handleEditChange(pet.id, 'sex', option)}
                            >
                              <Text style={[
                                styles.optionText,
                                (editedPetData.sex || 'Male') === option && styles.selectedOptionText
                              ]}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.sex || 'Male'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Birthday:</Text>
                      {isEditing ? (
                        <View style={styles.datePickerContainer}>
                          <DatePicker
                            value={editedPetData.birthday || ''}
                            onChange={(date) => handleEditChange(pet.id, 'birthday', date)}
                            placeholder="Select birthday"
                          />
                        </View>
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.birthday || 'Not specified'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
                      <Text style={styles.vetInfoLabel}>Adoption Date:</Text>
                      {isEditing ? (
                        <View style={styles.datePickerContainer}>
                          <DatePicker
                            value={editedPetData.adoptionDate || ''}
                            onChange={(date) => handleEditChange(pet.id, 'adoptionDate', date)}
                            placeholder="Select adoption date"
                          />
                        </View>
                      ) : (
                        <Text style={styles.vetInfoText}>{pet.adoptionDate || 'Not specified'}</Text>
                      )}
                    </View>
                    <View style={styles.vetInfoItem}>
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
                    </View>
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

  return (
    <ScrollView style={styles.container}>
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

      <View style={[styles.section, { backgroundColor: theme.colors.surfaceContrast }]}>
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
      {renderHouseholdMembersSection()}
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
    gap: 4,
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.secondary,
    flexWrap: 'wrap',
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
  },
  compatibilityLabel: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
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
  },
  optionButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
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
  },
  editInputShort: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    width: '100%',
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
  datePickerContainer: {
    flex: 1,
    maxWidth: '60%',
  },
});

export default PetsPreferencesTab; 