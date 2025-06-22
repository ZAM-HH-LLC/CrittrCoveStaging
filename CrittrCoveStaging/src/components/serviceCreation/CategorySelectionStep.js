import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Dimensions,
  Picker
} from 'react-native';
import { theme } from '../../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../../context/AuthContext';
import { sanitizeInput, validateName } from '../../validation/validation';

const GENERAL_CATEGORIES = [
  {
    id: 'all',
    name: 'All',
    icon: 'paw-outline',
    animalTypes: [] // Will be populated with all animal types
  },
  {
    id: 'farm_animals',
    name: 'Farm Animals',
    icon: 'horse',
    animalTypes: ['Horse', 'Cow', 'Sheep', 'Goat', 'Pig', 'Other']
  },
  {
    id: 'domestic',
    name: 'Domestic',
    icon: 'paw',
    animalTypes: ['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other']
  },
  {
    id: 'reptiles',
    name: 'Reptiles',
    icon: 'snake',
    animalTypes: ['Snake', 'Lizard', 'Turtle', 'Gecko', 'Chameleon', 'Other']
  },
  {
    id: 'aquatic',
    name: 'Aquatic',
    icon: 'fish',
    animalTypes: ['Fish', 'Frog', 'Newt', 'Axolotl', 'Other']
  },
  {
    id: 'invertebrates',
    name: 'Invertebrates',
    icon: 'spider',
    animalTypes: ['Spider', 'Scorpion', 'Crab', 'Snail', 'Millipede', 'Other']
  }
];

// Animal icons lookup
const ANIMAL_ICONS = {
  // Farm animals
  'Horse': 'horse',
  'Cow': 'cow',
  'Sheep': 'sheep',
  'Goat': 'cow',
  'Pig': 'pig',
  
  // Domestic
  'Dogs': 'dog',
  'Cats': 'cat',
  'Birds': 'bird',
  'Rabbits': 'rabbit',
  'Hamsters': 'rodent',
  
  // Reptiles
  'Snake': 'snake',
  'Lizard': 'snake',
  'Turtle': 'turtle',
  'Gecko': 'snake',
  'Chameleon': 'snake',
  
  // Aquatic
  'Fish': 'fish',
  'Frog': 'snake',
  'Newt': 'fish',
  'Axolotl': 'fish',
  
  // Invertebrates
  'Spider': 'spider',
  'Scorpion': 'spider',
  'Crab': 'fish',
  'Snail': 'snail',
  'Millipede': 'bug',
  
  // Default
  'Other': 'help-circle-outline'
};

// Animal categories lookup - hardcoded mapping of each animal to its proper category
const ANIMAL_CATEGORIES = {
  // Farm animals
  'Horse': 'Farm Animals',
  'Cow': 'Farm Animals',
  'Sheep': 'Farm Animals',
  'Goat': 'Farm Animals',
  'Pig': 'Farm Animals',
  
  // Domestic
  'Dogs': 'Domestic',
  'Cats': 'Domestic',
  'Birds': 'Domestic',
  'Rabbits': 'Domestic',
  'Hamsters': 'Domestic',
  
  // Reptiles
  'Snake': 'Reptiles',
  'Lizard': 'Reptiles',
  'Turtle': 'Reptiles',
  'Gecko': 'Reptiles',
  'Chameleon': 'Reptiles',
  
  // Aquatic
  'Fish': 'Aquatic',
  'Frog': 'Aquatic',
  'Newt': 'Aquatic',
  'Axolotl': 'Aquatic',
  
  // Invertebrates
  'Spider': 'Invertebrates',
  'Scorpion': 'Invertebrates',
  'Crab': 'Invertebrates',
  'Snail': 'Invertebrates',
  'Millipede': 'Invertebrates'
};

// Get all animal types from all categories
const getAllAnimalTypes = () => {
  const allTypes = [];
  GENERAL_CATEGORIES.forEach(category => {
    if (category.id !== 'all') {
      category.animalTypes.forEach(type => {
        if (type !== 'Other' && !allTypes.includes(type)) {
          allTypes.push(type);
        }
      });
    }
  });
  return allTypes;
};

// Populate the 'all' category with all animal types
GENERAL_CATEGORIES[0].animalTypes = getAllAnimalTypes();

const DEFAULT_ANIMAL_TYPES = [
  'Dogs',
  'Cats',
  'Fish',
  'Birds',
  'Rabbits',
  'Snake'
];

// Most common pets to display first when "All" is selected
const COMMON_PETS = [
  'Dogs',
  'Cats',
  'Fish',
  'Birds',
  'Hamsters',
  'Rabbits',
  'Snake',
  'Turtle'
];

// Get the appropriate icon for an animal type
const getAnimalIcon = (animalName, categoryId = null) => {
  // If the animal has a predefined icon, use it
  if (ANIMAL_ICONS[animalName]) {
    return ANIMAL_ICONS[animalName];
  }
  
  // For custom animals, use the category icon if available
  if (categoryId) {
    const category = GENERAL_CATEGORIES.find(cat => cat.id === categoryId);
    if (category) {
      return category.icon;
    }
  }
  
  // Default to paw icon
  return 'paw';
};

const getCategoryIcon = (categoryName) => {
  const category = GENERAL_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.icon : 'paw-outline';
};

const CategorySelectionStep = ({ serviceData, setServiceData }) => {
  const [customAnimalInput, setCustomAnimalInput] = useState('');
  const [customAnimalCategory, setCustomAnimalCategory] = useState('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [customAnimalError, setCustomAnimalError] = useState('');
  const isMobile = Platform.OS !== 'web';

  useEffect(() => {
    const updateLayout = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    Dimensions.addEventListener('change', updateLayout);
    return () => {
      // Remove listener on cleanup
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', updateLayout);
      }
    };
  }, []);

  useEffect(() => {
    // Initialize with first category selected
    if (!customAnimalCategory && GENERAL_CATEGORIES.length > 1) {
      setCustomAnimalCategory(GENERAL_CATEGORIES[1].id);
    }
    
    // Debug log to check what animal types we're receiving
    debugLog('MBA456789', 'CategorySelectionStep received serviceData:', serviceData);
    if (serviceData.animalTypes && serviceData.animalTypes.length > 0) {
      debugLog('MBA456789', 'Initial animal types in CategorySelectionStep:', serviceData.animalTypes);
    }
  }, []);

  const isAnimalTypeSelected = (animalName) => {
    if (!serviceData.animalTypes || !serviceData.animalTypes.length) {
      return false;
    }
    
    // Check all possible formats of animal types
    return serviceData.animalTypes.some(animal => {
      if (typeof animal === 'string') {
        return animal === animalName;
      } else if (typeof animal === 'object' && animal !== null) {
        return animal.name === animalName;
      }
      return false;
    });
  };

  const getCategoryForAnimal = (animalName) => {
    const animal = serviceData.animalTypes.find(a => a.name === animalName);
    if (animal && animal.categoryId) {
      const category = GENERAL_CATEGORIES.find(cat => cat.id === animal.categoryId);
      return category ? category.name : 'Other';
    }
    return 'Other';
  };

  const handleAnimalTypeSelect = (animalName, categoryId = null) => {
    debugLog('MBA456789', `Selecting animal: ${animalName}, categoryId: ${categoryId}`);
    
    if (animalName === 'Other') {
      // No longer need to show custom input since it's always visible
      setCustomAnimalCategory(categoryId || (GENERAL_CATEGORIES[1] && GENERAL_CATEGORIES[1].id));
      return;
    }

    setServiceData(prev => {
      const prevAnimalTypes = prev.animalTypes || [];
      debugLog('MBA456789', 'Current animal types before update:', prevAnimalTypes);
      
      // Check if this animal is already selected
      const existingAnimalIndex = prevAnimalTypes.findIndex(animal => {
        if (typeof animal === 'string') {
          return animal === animalName;
        } else if (typeof animal === 'object' && animal !== null) {
          return animal.name === animalName;
        }
        return false;
      });
      
      debugLog('MBA456789', `Animal ${animalName} is ${existingAnimalIndex !== -1 ? 'already selected' : 'not selected'}`);
      
      if (existingAnimalIndex !== -1) {
        // If already selected, remove it
        const updatedTypes = [...prevAnimalTypes];
        updatedTypes.splice(existingAnimalIndex, 1);
        debugLog('MBA456789', 'Animal types after removal:', updatedTypes);
        
        return {
          ...prev,
          animalTypes: updatedTypes
        };
      } else {
        // If not selected, add it with the hardcoded category
        // Get the proper category from our mapping
        const hardcodedCategory = ANIMAL_CATEGORIES[animalName] || 'Other';
        
        // Find the category ID from the name if needed
        let categoryToUse = categoryId;
        if (!categoryToUse) {
          const foundCategory = GENERAL_CATEGORIES.find(cat => cat.name === hardcodedCategory);
          categoryToUse = foundCategory ? foundCategory.id : 'other';
        }
        
        const newAnimal = {
          name: animalName,
          categoryId: categoryToUse,
          categoryName: hardcodedCategory, // Always use the hardcoded category name
          isCustom: false
        };
        
        debugLog('MBA456789', 'Adding new animal:', newAnimal);
        debugLog('MBA456789', 'Animal types after addition:', [...prevAnimalTypes, newAnimal]);
        
        return {
          ...prev,
          animalTypes: [...prevAnimalTypes, newAnimal]
        };
      }
    });
  };

  const handleCustomAnimalInputChange = (text) => {
    debugLog('MBA1234', 'Custom animal input change:', text);
    
    // Sanitize the input using the universal sanitizer
    const sanitized = sanitizeInput(text, 'name', { maxLength: 30 });
    
    // Validate the sanitized input
    const validation = validateName(sanitized);
    if (!validation.isValid && sanitized.length > 0) {
      setCustomAnimalError(validation.message);
    } else {
      setCustomAnimalError('');
    }
    
    setCustomAnimalInput(sanitized);
  };

  const handleAddCustomAnimal = () => {
    if (!customAnimalInput.trim()) {
      setCustomAnimalError('Animal name is required');
      return;
    }

    // Final validation before adding
    const validation = validateName(customAnimalInput);
    if (!validation.isValid) {
      setCustomAnimalError(validation.message);
      return;
    }

    // Additional business logic validation
    if (customAnimalInput.trim().length < 2) {
      setCustomAnimalError('Animal name must be at least 2 characters long');
      return;
    }

    // Check if animal already exists
    const animalExists = serviceData.animalTypes.some(animal => 
      animal.name.toLowerCase() === customAnimalInput.trim().toLowerCase()
    );
    
    if (animalExists) {
      setCustomAnimalError('This animal type is already added');
      return;
    }

    debugLog('MBA1234', 'Adding custom animal with validated input:', customAnimalInput.trim());

    // Find the category name for the custom animal
    let categoryName = 'Other';
    if (customAnimalCategory) {
      const categoryInfo = GENERAL_CATEGORIES.find(cat => cat.id === customAnimalCategory);
      if (categoryInfo) {
        categoryName = categoryInfo.name;
      }
    }

    setServiceData(prev => ({
      ...prev,
      animalTypes: [...prev.animalTypes, { 
        name: customAnimalInput.trim(),
        categoryId: customAnimalCategory || 'other',
        categoryName: categoryName, // Add the category name
        isCustom: true
      }]
    }));
    
    // Also add the category to generalCategories if it's not already there
    if (customAnimalCategory) {
      const categoryExists = serviceData.generalCategories.some(cat => cat.id === customAnimalCategory);
      if (!categoryExists) {
        const categoryToAdd = GENERAL_CATEGORIES.find(cat => cat.id === customAnimalCategory);
        if (categoryToAdd) {
          setServiceData(prev => ({
            ...prev,
            generalCategories: [...prev.generalCategories, {
              id: categoryToAdd.id,
              name: categoryToAdd.name,
              icon: categoryToAdd.icon
            }]
          }));
        }
      }
    }
    
    setCustomAnimalInput('');
    setCustomAnimalError('');
    // Don't hide the form anymore since it's always visible
  };

  const getFilteredAnimalTypes = () => {
    debugLog('MBA456789', 'Current serviceData.animalTypes:', serviceData.animalTypes);
    
    // Only show Dogs and Cats for MVP
    let animalTypesToShow = [
      {
        name: 'Dogs',
        categoryId: 'domestic',
        categoryName: 'Domestic',
        icon: getAnimalIcon('Dogs', 'domestic')
      },
      {
        name: 'Cats',
        categoryId: 'domestic',
        categoryName: 'Domestic',
        icon: getAnimalIcon('Cats', 'domestic')
      }
    ];
    
    // Add custom animals
    if (serviceData.animalTypes && serviceData.animalTypes.length > 0) {
      serviceData.animalTypes.forEach(animal => {
        // Skip if not an object or has no name
        if (typeof animal !== 'object' || !animal || !animal.name) {
          return;
        }
        
        // Check if it's a custom animal or if its name doesn't match Dogs/Cats
        const isCustomOrUnknown = animal.isCustom || 
          (animal.name !== 'Dogs' && animal.name !== 'Cats');
        
        if (isCustomOrUnknown) {
          let categoryId = animal.categoryId;
          let categoryName = animal.categoryName || 'Other';
          
          // If we have a categoryName but no categoryId, try to find the corresponding categoryId
          if (!categoryId && categoryName) {
            const category = GENERAL_CATEGORIES.find(cat => cat.name === categoryName);
            if (category) {
              categoryId = category.id;
            }
          }
          
          // If we still don't have a categoryName, try to derive from categoryId
          if (!categoryName && categoryId) {
            const category = GENERAL_CATEGORIES.find(cat => cat.id === categoryId);
            if (category) {
              categoryName = category.name;
            }
          }
          
          // Check if this animal is already in the list
          const existing = animalTypesToShow.find(a => a.name === animal.name);
          if (!existing) {
            debugLog('MBA456789', `Adding custom animal to filtered list: ${animal.name}, category: ${categoryName}`);
            
            animalTypesToShow.push({
              name: animal.name,
              categoryId: categoryId,
              categoryName: categoryName,
              icon: getAnimalIcon(animal.name, categoryId),
              isCustom: true
            });
          }
        }
      });
    }
    
    debugLog('MBA456789', 'Filtered animal types to show:', animalTypesToShow);
    
    return { animalTypes: animalTypesToShow, categories: [] };
  };

  const { animalTypes: filteredAnimalTypes } = getFilteredAnimalTypes();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      fontFamily: theme.fonts.header.fontFamily,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 24,
      marginBottom: 16,
      fontFamily: theme.fonts.header.fontFamily,
    },
    instructions: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    animalTypesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    animalTypeItem: {
      flex: 1,
      minWidth: Platform.OS === 'web' ? (screenWidth <= 420 ? '45%' : '30%') : '45%',
      marginBottom: 12,
    },
    animalTypeCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 16,
      height: 70,
      justifyContent: 'center',
    },
    selectedAnimalCard: {
      borderColor: theme.colors.mainColors.main,
      backgroundColor: theme.colors.mainColors.mainLight,
    },
    animalTypeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    animalIconAndName: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    animalTypeName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    customInputContainer: {
      marginTop: 6,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundContrast,
    },
    customInputTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    textInputContainer: {
      flex: 1,
      marginRight: 12,
    },
    textInput: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    textInputError: {
      borderColor: theme.colors.error,
    },
    pickerContainer: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
    },
    picker: {
      height: 48,
      color: theme.colors.text,
    },
    addButton: {
      backgroundColor: theme.colors.mainColors.main,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    addButtonText: {
      color: theme.colors.surface,
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.fonts.regular.fontFamily,
    },
    addButtonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.6,
    },
    addButtonTextDisabled: {
      color: theme.colors.textSecondary,
    },
    selectedAnimalsSection: {
      marginTop: 24,
      marginBottom: 16,
      padding: 16,
      backgroundColor: theme.colors.backgroundContrast,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedAnimalsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    selectedAnimalsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    animalBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 8,
      marginRight: 8,
      gap: 8,
    },
    animalBubbleText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    removeAnimalButton: {
      padding: 2,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 4,
      fontFamily: theme.fonts.regular.fontFamily,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Animal Types for Your Service</Text>
      <Text style={styles.instructions}>
        Choose the animal types your service will cover. You can select Dogs, Cats, or add custom animals.
      </Text>
      
      {/* Selected Animals Summary - Moved above Dogs/Cats cards */}
      {serviceData.animalTypes.length > 0 && (
        <View style={styles.selectedAnimalsSection}>
          <Text style={styles.selectedAnimalsTitle}>
            Selected Animals ({serviceData.animalTypes.length})
          </Text>
          <View style={styles.selectedAnimalsList}>
            {serviceData.animalTypes.map((animal, index) => {
              const animalName = animal.name;
              const icon = getAnimalIcon(animalName, animal.categoryId);
              
              return (
                <View key={index} style={styles.animalBubble}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={18}
                    color={theme.colors.text}
                  />
                  <Text style={styles.animalBubbleText}>{animalName}</Text>
                  <TouchableOpacity 
                    onPress={() => handleAnimalTypeSelect(animalName)}
                    style={styles.removeAnimalButton}
                  >
                    <MaterialCommunityIcons 
                      name="close-circle" 
                      size={16} 
                      color={theme.colors.text} 
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
      
      {/* Animal Types Grid - Only Dogs and Cats */}
      {filteredAnimalTypes.length > 0 ? (
        <View style={styles.animalTypesGrid}>
          {filteredAnimalTypes.filter(animal => animal.name === 'Dogs' || animal.name === 'Cats').map((animalType) => (
            <View key={`${animalType.categoryId}-${animalType.name}`} style={styles.animalTypeItem}>
              <TouchableOpacity
                style={[
                  styles.animalTypeCard,
                  isAnimalTypeSelected(animalType.name) && styles.selectedAnimalCard
                ]}
                onPress={() => handleAnimalTypeSelect(animalType.name, animalType.categoryId)}
              >
                <View style={styles.animalTypeRow}>
                  <View style={styles.animalIconAndName}>
                    <MaterialCommunityIcons
                      name={animalType.icon}
                      size={24}
                      color={theme.colors.text}
                    />
                    <Text style={styles.animalTypeName}>{animalType.name}</Text>
                  </View>
                  {isAnimalTypeSelected(animalType.name) && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={theme.colors.mainColors.main}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      
      {/* Custom Animal Input - Always visible */}
      <View style={styles.customInputContainer}>
        <Text style={styles.customInputTitle}>Add a Custom Animal Type</Text>
        <View style={styles.inputRow}>
          <View style={styles.textInputContainer}>
            <TextInput
              style={[styles.textInput, customAnimalError ? styles.textInputError : null]}
              placeholder="Animal Type (e.g. Hamster)"
              value={customAnimalInput}
              onChangeText={handleCustomAnimalInputChange}
              placeholderTextColor={theme.colors.placeHolderText}
              maxLength={30}
            />
            {customAnimalError ? (
              <Text style={styles.errorText}>{customAnimalError}</Text>
            ) : null}
          </View>
          <View style={styles.pickerContainer}>
            {Platform.OS === 'ios' || Platform.OS === 'android' ? (
              <Picker
                selectedValue={customAnimalCategory}
                style={styles.picker}
                onValueChange={(itemValue) => setCustomAnimalCategory(itemValue)}
              >
                {GENERAL_CATEGORIES.filter(cat => cat.id !== 'all').map(category => (
                  <Picker.Item 
                    key={category.id} 
                    label={category.name} 
                    value={category.id} 
                  />
                ))}
              </Picker>
            ) : (
              <select
                value={customAnimalCategory}
                onChange={(e) => setCustomAnimalCategory(e.target.value)}
                style={styles.picker}
              >
                {GENERAL_CATEGORIES.filter(cat => cat.id !== 'all').map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={[
            styles.addButton,
            (!customAnimalInput.trim() || customAnimalError) ? styles.addButtonDisabled : null
          ]}
          onPress={handleAddCustomAnimal}
          disabled={!customAnimalInput.trim() || customAnimalError}
        >
          <Text style={[
            styles.addButtonText,
            (!customAnimalInput.trim() || customAnimalError) ? styles.addButtonTextDisabled : null
          ]}>Add Animal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default CategorySelectionStep; 