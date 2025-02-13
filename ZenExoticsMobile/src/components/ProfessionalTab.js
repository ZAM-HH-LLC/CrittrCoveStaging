import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import ServiceManager from './ServiceManager';
import { theme } from '../styles/theme';
import RecordedPets from './RecordedPets';
import EditableSection from './EditableSection';
import * as ImagePicker from 'expo-image-picker';

const ProfessionalTab = ({ 
  services, 
  setServices, 
  setHasUnsavedChanges,
  getContentWidth,
  pets,
  editMode,
  toggleEditMode
}) => {
  const [professionalPhoto, setProfessionalPhoto] = useState(null);
  const [professionalBio, setProfessionalBio] = useState('');
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [facilities, setFacilities] = useState('');
  const [skills, setSkills] = useState({
    certifications: [],
    experience: '',
    specialties: [],
  });
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [facilitiesModalVisible, setFacilitiesModalVisible] = useState(false);
  const [tempSelectedFacilities, setTempSelectedFacilities] = useState([]);

  const FACILITY_OPTIONS = [
    // Living Situation
    { id: 'apartment', label: 'Lives in an apartment' },
    { id: 'house', label: 'Lives in a house' },
    { id: 'fenced_yard', label: 'Has a fenced yard' },
    
    // Household Environment
    { id: 'non_smoking', label: 'Non-smoking household' },
    { id: 'no_children', label: 'No children present' },
    { id: 'has_children', label: 'Children present' },
    { id: 'security_system', label: 'Has security system' },
    
    // Pet Policies
    { id: 'dogs_bed', label: 'Dogs allowed on bed' },
    { id: 'dogs_furniture', label: 'Dogs allowed on furniture' },
    { id: 'crate_available', label: 'Crate available' },
    { id: 'separate_areas', label: 'Can separate pets' },
    
    // Care Details
    { id: 'potty_0_2', label: 'Potty breaks every 0-2 hours' },
    { id: 'potty_2_4', label: 'Potty breaks every 2-4 hours' },
    { id: 'potty_4_6', label: 'Potty breaks every 4-6 hours' },
    
    // Resident Pets
    { id: 'no_pets', label: 'No resident pets' },
    { id: 'has_dogs', label: 'Has resident dogs' },
    { id: 'has_cats', label: 'Has resident cats' },
    
    // Additional Features
    { id: 'air_conditioned', label: 'Air-conditioned' },
    { id: 'outdoor_area', label: 'Has outdoor play area' },
    { id: 'emergency_transport', label: 'Emergency transport available' },
  ];

  const pickProfessionalPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfessionalPhoto(result.assets[0].uri);
      setHasUnsavedChanges(true);
    }
  };

  const addPortfolioPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      aspect: [4, 3],
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(asset => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        uri: asset.uri,
        caption: 'New portfolio photo'
      }));
      
      setPortfolioPhotos(prev => [...prev, ...newPhotos]);
      setHasUnsavedChanges(true);
    }
  };

  const renderEditableField = (label, value, onChangeText, section, multiline = false) => {
    return editMode[section] ? (
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setHasUnsavedChanges(true);
        }}
        style={[
          styles.input,
          { width: getContentWidth() },
          multiline && { height: 100, textAlignVertical: 'top' }
        ]}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    ) : (
      <Text style={[styles.fieldText, { width: getContentWidth() }]}>
        {value || `No ${label.toLowerCase()} provided`}
      </Text>
    );
  };

  const toggleFacility = (facilityId) => {
    setSelectedFacilities(prev => {
      if (prev.includes(facilityId)) {
        return prev.filter(id => id !== facilityId);
      } else {
        return [...prev, facilityId];
      }
    });
    setHasUnsavedChanges(true);
  };

  const openFacilitiesModal = () => {
    setTempSelectedFacilities([...selectedFacilities]);
    setFacilitiesModalVisible(true);
  };

  const saveFacilities = () => {
    setSelectedFacilities(tempSelectedFacilities);
    setFacilitiesModalVisible(false);
    setHasUnsavedChanges(true);
  };

  const toggleTempFacility = (facilityId) => {
    setTempSelectedFacilities(prev => {
      if (prev.includes(facilityId)) {
        return prev.filter(id => id !== facilityId);
      } else {
        return [...prev, facilityId];
      }
    });
  };

  return (
    <View style={styles.centeredContent}>
      {/* Professional Photo Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Photo (Professional)</Text>
        </View>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickProfessionalPhoto}>
            {professionalPhoto ? (
              <Image source={{ uri: professionalPhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                <Ionicons name="person" size={60} color={theme.colors.placeholder} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Professional Bio Section */}
      <EditableSection
        title="Professional Bio"
        value={professionalBio}
        onChangeText={setProfessionalBio}
        editMode={editMode.professionalBio}
        toggleEditMode={() => toggleEditMode('professionalBio')}
        setHasUnsavedChanges={setHasUnsavedChanges}
        getContentWidth={getContentWidth}
      />

      {/* Services Section */}
      <View style={styles.section}>
        <ServiceManager
          services={services || []}
          setServices={setServices}
          setHasUnsavedChanges={setHasUnsavedChanges}
          isProfessionalTab={true}
        />
      </View>

      {/* Portfolio Photos Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Portfolio Photos</Text>
          <TouchableOpacity onPress={addPortfolioPhoto}>
            <MaterialCommunityIcons 
              name="plus" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.portfolioGrid}>
          {portfolioPhotos.map((photo) => (
            <TouchableOpacity 
              key={photo.id} 
              style={styles.portfolioCard}
              onPress={() => {
                // Handle photo edit/view
                // Could add modal to edit caption or view full size
              }}
            >
              <View style={styles.portfolioImageContainer}>
                <Image 
                  source={{ uri: photo.uri }} 
                  style={styles.portfolioPhoto} 
                />
              </View>
              <Text style={styles.portfolioCaption}>{photo.caption}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {portfolioPhotos.length === 0 && (
          <Text style={styles.emptyText}>
            No portfolio photos added yet
          </Text>
        )}
      </View>
        
      { /* My Pets Section (Read-Only) */}
      <RecordedPets pets={pets} />

      {/* Home & Facilities Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Home & Facilities</Text>
          <TouchableOpacity onPress={openFacilitiesModal}>
            <MaterialCommunityIcons 
              name="pencil" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.facilitiesContainer}>
          {selectedFacilities.map((facilityId) => {
            const facility = FACILITY_OPTIONS.find(f => f.id === facilityId);
            return (
              <View key={facilityId} style={styles.facilityTag}>
                <Text style={styles.facilityTagText}>{facility.label}</Text>
              </View>
            );
          })}
          {selectedFacilities.length === 0 && (
            <Text style={styles.emptyText}>No facilities selected</Text>
          )}
        </View>

        {/* Facilities Selection Modal */}
        <Modal
          visible={facilitiesModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setFacilitiesModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Home & Facilities</Text>
                <TouchableOpacity onPress={() => setFacilitiesModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {FACILITY_OPTIONS.map((facility) => (
                  <TouchableOpacity
                    key={facility.id}
                    style={[
                      styles.modalFacilityTag,
                      tempSelectedFacilities.includes(facility.id) && styles.facilityTagSelected
                    ]}
                    onPress={() => toggleTempFacility(facility.id)}
                  >
                    <Text style={[
                      styles.modalFacilityText,
                      tempSelectedFacilities.includes(facility.id) && styles.facilityTagTextSelected
                    ]}>
                      {facility.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setFacilitiesModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveFacilities}
                >
                  <Text style={styles.modalButtonText2}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Skills & Experience Section */}
      {/* <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills & Experience</Text>
          <TouchableOpacity onPress={() => toggleEditMode('skills')}>
            <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {renderEditableField('Experience', skills.experience, 
          (text) => setSkills(prev => ({ ...prev, experience: text })), 
          'skills', 
          true
        )}
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContent: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    alignSelf: 'center',
  },
  section: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.large,
    marginBottom: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePhotoPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 5,
  },
  fieldText: {
    width: '100%',
    maxWidth: 600,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 10,
  },
  portfolioGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  portfolioCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  portfolioImageContainer: {
    aspectRatio: 4/3,
    width: '100%',
  },
  portfolioPhoto: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  portfolioCaption: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.placeholder,
    marginTop: 16,
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  facilityTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 8,
  },
  facilityTagSelected: {
    backgroundColor: theme.colors.primary,
  },
  facilityTagText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.small,
  },
  facilityTagTextSelected: {
    color: theme.colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: '70%',
  },
  modalFacilityTag: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 8,
  },
  modalFacilityText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  modalButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
  },
  modalButtonText2: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
  },
});

export default ProfessionalTab;