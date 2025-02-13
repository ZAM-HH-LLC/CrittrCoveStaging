import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

const RecordedPets = ({ pets }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>My Pets</Text>
      {pets.map((pet) => (
        <TouchableOpacity key={pet.id} style={styles.petItem}>
          <View style={styles.petItemContent}>
            <Image source={{ uri: pet.photo }} style={styles.petPhoto} />
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petDetails}>{pet.type} • {pet.breed} • {pet.age} years old</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  petItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 5,
    width: '100%',
    maxWidth: 600,
  },
  petItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  petName: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
  },
  petInfo: {
    flex: 1,
  },
  petDetails: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.placeholder,
    flexWrap: 'wrap',
  },
});

export default RecordedPets;