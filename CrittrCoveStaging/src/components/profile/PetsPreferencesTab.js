import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const PetsPreferencesTab = ({
  pets = [],
  preferences = {
    homeEnvironment: []
  },
  onAddPet,
  onEditPet,
  onDeletePet,
  onUpdatePreferences,
  userRole,
  isMobile,
}) => {
  const [expandedPetIds, setExpandedPetIds] = useState(new Set());

  // Define all available facilities
  const allFacilities = [
    { id: 'yard', label: 'Fully fenced backyard', icon: 'fence' },
    { id: 'roam', label: 'Free roam of house', icon: 'home' },
    { id: 'ac', label: 'Air Conditioned', icon: 'snowflake' },
    { id: 'furniture', label: 'Allowed on furniture', icon: 'sofa' },
    { id: 'bed', label: 'Allowed on bed', icon: 'bed' },
    { id: 'pool', label: 'Pool', icon: 'pool' },
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

  const togglePetDetails = (petId) => {
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

  const renderPetCard = (pet) => {
    const isExpanded = expandedPetIds.has(pet.id);

    return (
      <View key={pet.id} style={styles.petCard}>
        <TouchableOpacity 
          style={[
            styles.petHeader,
            { backgroundColor: theme.colors.surface }
          ]} 
          onPress={() => togglePetDetails(pet.id)}
        >
          <View style={styles.petBasicInfo}>
            <Image 
              source={require('../../../assets/default-pet-image.png')}
              style={styles.petPhoto}
            />
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petDetails}>
                {pet.breed} • {pet.age} years • {pet.size}
              </Text>
            </View>
          </View>
          <View style={styles.petActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => onEditPet(pet.id)}
            >
              <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={theme.colors.text}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.expandedDetails, { backgroundColor: theme.colors.surfaceContrast }]}>
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailTitle}>Feeding Instructions</Text>
                <Text style={styles.detailText}>{pet.feedingInstructions || '2 cups of dry food twice daily (morning/evening)'}</Text>
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailTitle}>Medical Notes</Text>
                <Text style={styles.detailText}>{pet.medicalNotes || 'Hip dysplasia, daily joint supplement in AM meal'}</Text>
              </View>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Behavior Notes</Text>
              <Text style={styles.detailText}>{pet.behaviorNotes || 'Friendly, good with other dogs, loves fetch'}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.section, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Pets</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddPet}
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
    </View>
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
  },
  petPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  petInfo: {
    gap: 4,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.secondary,
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
});

export default PetsPreferencesTab; 