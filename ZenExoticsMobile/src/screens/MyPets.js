import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, SafeAreaView, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import { handleBack } from '../components/Navigation';
import { AuthContext } from '../context/AuthContext';
const { width: screenWidth } = Dimensions.get('window');

const MyPets = ({ navigation }) => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { screenWidth } = useContext(AuthContext);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockPets = [
        {
          id: '1',
          name: 'Max',
          animal_type: 'Dog',
          breed: 'border collie',
          age: {
            months: 0,
            years: 5,
          },
          weight: 32,
          sex: 'Male',
          friendlyWithChildren: true,
          friendlyWithCats: false,
          friendlyWithDogs: true,
          spayedNeutered: true,
          houseTrained: true,
          microchipped: true,
          adoptionDate: '2020-01-15',
          description: 'Loves to play fetch and go for walks.',
          energyLevel: 'High',
          feedingSchedule: 'Morning',
          leftAlone: '1-4 hours',
          medication: null,
          additionalInstructions: 'Needs daily exercise.',
          vetName: 'Dr. Smith',
          vetAddress: '123 Vet St.',
          vetPhone: '555-1234',
          insuranceProvider: 'Pet Insurance Co.',
          vetDocuments: [],
          galleryImages: [],
        },
        {
          id: '2',
          name: 'Whiskers',
          animal_type: 'Cat',
          breed: 'tammy ammy',
          age: {
            months: 3,
            years: 4,
          },
          weight: 16,
          sex: 'Female',
          friendlyWithChildren: true,
          friendlyWithCats: true,
          friendlyWithDogs: false,
          spayedNeutered: true,
          houseTrained: true,
          microchipped: false,
          adoptionDate: '2019-05-20',
          description: 'Enjoys lounging in the sun.',
          energyLevel: 'Low',
          feedingSchedule: 'Twice a day',
          leftAlone: '4-8 hours',
          medication: null,
          additionalInstructions: 'Prefers quiet environments.',
          vetName: 'Dr. Jones',
          vetAddress: '456 Vet Ave.',
          vetPhone: '555-5678',
          insuranceProvider: 'Pet Health Insurance',
          vetDocuments: [],
          galleryImages: [],
        },
        {
          id: '3',
          name: 'Buddy',
          animal_type: 'Lizard',
          breed: 'leopard gecko',
          age: {
            months: 0,
            years: 2,
          },
          weight: 1,
          sex: 'Male',
          friendlyWithChildren: false,
          friendlyWithCats: false,
          friendlyWithDogs: false,
          spayedNeutered: false,
          houseTrained: false,
          microchipped: false,
          adoptionDate: '2021-08-10',
          description: 'A calm and quiet pet.',
          energyLevel: 'Low',
          feedingSchedule: ['Custom', '3 times a day with liquid food.'],
          leftAlone: 'Can be left alone indefinitely',
          medication: null,
          additionalInstructions: 'Keep in a warm environment.',
          vetName: 'Dr. Green',
          vetAddress: '789 Vet Blvd.',
          vetPhone: '555-9012',
          insuranceProvider: 'Reptile Insurance Co.',
          vetDocuments: [],
          galleryImages: [],
        },
      ];

      setPets(mockPets);
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const PetCard = ({ pet }) => (
    <TouchableOpacity 
      onPress={() => {
        if (Platform.OS === 'web') {
          // Store pet data before navigation
          sessionStorage.setItem('editPetData', JSON.stringify(pet));
          // Navigate and immediately clean URL
          navigation.navigate('AddPet');
          window.history.replaceState({}, '', '/AddPet');
        } else {
          navigation.navigate('AddPet', { pet });
        }
      }}
    >
      <Card style={styles.petCard}>
        <Card.Content style={styles.petCardContent}>
          {pet.image ? (
            <Image source={{ uri: pet.image }} style={styles.petImage} />
          ) : (
            <View style={styles.petImagePlaceholder}>
              <MaterialCommunityIcons 
                name={getAnimalIcon(pet.animal_type ? pet.animal_type : 'paw')} 
                size={40} 
                color={theme.colors.primary} 
              />
            </View>
          )}
          <View style={styles.petInfo}>
            <Title>{pet.name}</Title>
            <Paragraph>{pet.animal_type ? pet.animal_type : 'paw'}</Paragraph>
            <Paragraph>{pet.age.years} years {pet.age.months} months old</Paragraph>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const getAnimalIcon = (animalType) => {
    switch (animalType.toLowerCase()) {
      case 'dog':
        return 'dog';
      case 'cat':
        return 'cat';
      case 'rabbit':
        return 'rabbit';
      case 'reptile':
      case 'lizard':
        return 'snake';
      case 'snake':
        return 'snake';
      case 'turtle':
        return 'turtle';
      case 'bird':
      case 'parrot':
        return 'bird';
      case 'horse':
        return 'horse';
      case 'fish':
        return 'fish';
      default:
        return 'paw';
    }
  };

  const getCardWidth = () => {
    if (screenWidth <= 600) {
      return '90%';
    } else if (screenWidth <= 800) {
      return '60%';
    } else {
      return '30%';
    }
  };

  const Content = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        Platform.OS === 'web' && { alignItems: 'center' },
        { marginBottom: 15 }
      ]}>
        <View style={[styles.contentWrapper, { width: getCardWidth() }]}>
          {pets.map(pet => (
            <PetCard key={pet.id} pet={pet} />
          ))}
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AddPet', { pet: {} })}
            style={styles.addButton}
            icon={({ size, color }) => (
              <MaterialCommunityIcons name="plus" size={size} color={color} />
            )}
          >
            Add Pet
          </Button>
        </View>
      </ScrollView>
    );
  };

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <BackHeader 
          title="My Pets" 
          onBackPress={() => handleBack(navigation)}
        />
        <Content />
      </SafeAreaView>
    );
  } else if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, { paddingTop: StatusBar.currentHeight }]}>
        <BackHeader 
          title="My Pets" 
          onBackPress={() => handleBack(navigation)}
        />
        <Content />
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <BackHeader 
          title="My Pets" 
          onBackPress={() => handleBack(navigation)}
        />
        <Content />
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  contentWrapper: {
    alignSelf: 'center',
  },
  title: {
    fontSize: theme.fontSizes.large,
    color: theme.colors.text,
    marginBottom: 16,
  },
  petCard: {
    marginBottom: 16,
    transform: [{ scale: Platform.OS === 'web' ? (screenWidth <= 800 && screenWidth > 600 ? 1.15 : 1) : 1 }],
  },
  petCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  petImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petInfo: {
    flex: 1,
  },
  addButton: {
    marginTop: 5,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyPets;
