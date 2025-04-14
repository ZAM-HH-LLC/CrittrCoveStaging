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
  const [showCustomAnimalInput, setShowCustomAnimalInput] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
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
  }, []);

  const isAnimalTypeSelected = (animalName) => {
    return serviceData.animalTypes.some(animal => animal.name === animalName);
  };

  const getCategoryForAnimal = (animalName) => {
    const animal = serviceData.animalTypes.find(a => a.name === animalName);
    if (animal && animal.categoryId) {
      const category = GENERAL_CATEGORIES.find(cat => cat.id === animal.categoryId);
      return category ? category.name : 'Other';
    }
    return 'Other';
  };

  const handleCategoryFilterSelect = (categoryId) => {
    setSelectedCategoryFilter(categoryId);
  };

  const handleAnimalTypeSelect = (animalName, categoryId = null) => {
    if (animalName === 'Other') {
      setShowCustomAnimalInput(true);
      setCustomAnimalCategory(categoryId || (GENERAL_CATEGORIES[1] && GENERAL_CATEGORIES[1].id));
      return;
    }

    setServiceData(prev => {
      // Check if this animal is already selected
      const existingAnimalIndex = prev.animalTypes.findIndex(animal => animal.name === animalName);
      
      if (existingAnimalIndex !== -1) {
        // If already selected, remove it
        const updatedTypes = [...prev.animalTypes];
        updatedTypes.splice(existingAnimalIndex, 1);
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
        
        return {
          ...prev,
          animalTypes: [...prev.animalTypes, {
            name: animalName,
            categoryId: categoryToUse,
            categoryName: hardcodedCategory, // Always use the hardcoded category name
            isCustom: false
          }]
        };
      }
    });
  };

  const handleAddCustomAnimal = () => {
    if (!customAnimalInput.trim()) return;

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
    setShowCustomAnimalInput(false);
  };

  const handleSelectAll = () => {
    let allAnimalTypes = [];
    
    if (selectedCategoryFilter && selectedCategoryFilter !== 'all') {
      // If a category filter is selected, get all animals from that category
      const categoryData = GENERAL_CATEGORIES.find(cat => cat.id === selectedCategoryFilter);
      if (categoryData) {
        allAnimalTypes = categoryData.animalTypes
          .filter(type => type !== 'Other')
          .map(type => ({ 
            name: type, 
            categoryId: selectedCategoryFilter 
          }));
      }
    } else {
      // Otherwise get animal types from all categories
      GENERAL_CATEGORIES.forEach(category => {
        if (category.id !== 'all') {
          category.animalTypes
            .filter(type => type !== 'Other')
            .forEach(type => {
              allAnimalTypes.push({ 
                name: type, 
                categoryId: category.id 
              });
            });
        }
      });
    }
    
    setServiceData(prev => ({
      ...prev,
      animalTypes: allAnimalTypes
    }));
  };

  const handleClearAll = () => {
    setServiceData(prev => ({
      ...prev,
      animalTypes: []
    }));
  };

  const getFilteredAnimalTypes = () => {
    let animalTypesToShow = [];
    let categoriesUsed = new Set();
    
    if (selectedCategoryFilter && selectedCategoryFilter !== 'all') {
      // If a specific category is selected as filter, show only animals from that category
      const categoryData = GENERAL_CATEGORIES.find(cat => cat.id === selectedCategoryFilter);
      if (categoryData) {
        animalTypesToShow = categoryData.animalTypes
          .filter(type => type !== 'Other')
          .map(type => ({
            name: type,
            categoryId: selectedCategoryFilter,
            categoryName: categoryData.name,
            icon: getAnimalIcon(type, selectedCategoryFilter)
          }));
        categoriesUsed.add(categoryData.name);
      }
    } else {
      // Show all animal types from all categories (except 'all' category)
      GENERAL_CATEGORIES.forEach(category => {
        if (category.id !== 'all') {
          category.animalTypes
            .filter(type => type !== 'Other')
            .forEach(type => {
              animalTypesToShow.push({
                name: type,
                categoryId: category.id,
                categoryName: category.name,
                icon: getAnimalIcon(type, category.id)
              });
              categoriesUsed.add(category.name);
            });
        }
      });
    }
    
    // Add custom animals that match the filter
    serviceData.animalTypes.forEach(animal => {
      if (animal.isCustom) {
        const categoryData = animal.categoryId 
          ? GENERAL_CATEGORIES.find(cat => cat.id === animal.categoryId)
          : null;
        
        const categoryName = categoryData ? categoryData.name : 'Other';
        
        if (selectedCategoryFilter === 'all' || animal.categoryId === selectedCategoryFilter) {
          // Check if this animal is already in the list
          const existing = animalTypesToShow.find(a => a.name === animal.name);
          if (!existing) {
            animalTypesToShow.push({
              name: animal.name,
              categoryId: animal.categoryId,
              categoryName: categoryName,
              icon: getAnimalIcon(animal.name, animal.categoryId), // Use the category icon
              isCustom: true
            });
            categoriesUsed.add(categoryName);
          }
        }
      }
    });
    
    // Sort with common pets first, then alphabetically
    animalTypesToShow.sort((a, b) => {
      const aCommonIndex = COMMON_PETS.indexOf(a.name);
      const bCommonIndex = COMMON_PETS.indexOf(b.name);
      
      // If both are common pets, sort by common pet order
      if (aCommonIndex !== -1 && bCommonIndex !== -1) {
        return aCommonIndex - bCommonIndex;
      }
      
      // If only a is a common pet, it comes first
      if (aCommonIndex !== -1) {
        return -1;
      }
      
      // If only b is a common pet, it comes first
      if (bCommonIndex !== -1) {
        return 1;
      }
      
      // Otherwise sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    return { animalTypes: animalTypesToShow, categories: Array.from(categoriesUsed) };
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
    categoryFiltersContainer: {
      flexDirection: 'row',
      marginBottom: 24,
      paddingLeft: 2,
      paddingRight: 20, // Extra padding at the end for better scrolling
    },
    categoryFiltersScrollView: {
      maxHeight: 60,
    },
    categoryFilterButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 46,
      marginRight: 10,
    },
    selectedCategoryFilter: {
      backgroundColor: theme.colors.mainColors.mainLight,
      borderColor: theme.colors.mainColors.main,
    },
    categoryFilterText: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    selectedCategoryFilterText: {
      color: theme.colors.mainColors.main,
      fontWeight: '600',
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 24,
      // gap: 16,
    },
    actionButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    actionButtonText: {
      fontSize: 16,
      color: theme.colors.mainColors.main,
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
      marginVertical: 24,
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
    textInput: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
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
    selectedAnimalsSection: {
      marginTop: 24,
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
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Animal Types for Your Service</Text>
      <Text style={styles.instructions}>
        Choose the animal types your service will cover. You can filter by category or add custom animals.
      </Text>
      
      {/* Category filters */}
      <ScrollView 
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFiltersContainer}
        style={styles.categoryFiltersScrollView}
      >
        {GENERAL_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryFilterButton,
              selectedCategoryFilter === category.id && styles.selectedCategoryFilter
            ]}
            onPress={() => handleCategoryFilterSelect(category.id)}
          >
            <MaterialCommunityIcons
              name={category.icon}
              size={22}
              color={selectedCategoryFilter === category.id ? theme.colors.mainColors.main : theme.colors.text}
            />
            <Text style={[
              styles.categoryFilterText,
              selectedCategoryFilter === category.id && styles.selectedCategoryFilterText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSelectAll}>
          <Text style={styles.actionButtonText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
          <Text style={styles.actionButtonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowCustomAnimalInput(true)}
        >
          <Text style={styles.actionButtonText}>Add Custom Pet</Text>
        </TouchableOpacity>
      </View>
      
      {/* Custom Animal Input */}
      {showCustomAnimalInput && (
        <View style={styles.customInputContainer}>
          <Text style={styles.customInputTitle}>Add a Custom Animal Type</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Animal Type (e.g. Hamster)"
              value={customAnimalInput}
              onChangeText={setCustomAnimalInput}
              placeholderTextColor={theme.colors.placeHolderText}
            />
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
            style={styles.addButton}
            onPress={handleAddCustomAnimal}
            disabled={!customAnimalInput.trim()}
          >
            <Text style={styles.addButtonText}>Add Animal</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Animal Types Grid */}
      {filteredAnimalTypes.length > 0 ? (
        <View style={styles.animalTypesGrid}>
          {filteredAnimalTypes.map((animalType) => (
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
      ) : (
        <Text style={styles.instructions}>
          No animal types match your current filter. Try selecting a different category or add a custom animal.
        </Text>
      )}
      
      {/* Selected Animals Summary */}
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
    </ScrollView>
  );
};

export default CategorySelectionStep; 