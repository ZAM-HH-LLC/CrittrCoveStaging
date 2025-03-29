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
} from 'react-native';
import { theme } from '../../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const GENERAL_CATEGORIES = [
  {
    id: 'farm_animals',
    name: 'Farm Animals',
    icon: 'horse',
    animalTypes: ['Horse', 'Cow', 'Sheep', 'Goat', 'Pig', 'Other']
  },
  {
    id: 'domestic',
    name: 'Domestic',
    icon: 'dog',
    animalTypes: ['Dogs', 'Cats', 'Birds', 'Rabbits', 'Hamsters', 'Other']
  },
  {
    id: 'exotic',
    name: 'Exotic',
    icon: 'snake',
    animalTypes: ['Snake', 'Lizard', 'Parrot', 'Ferret', 'Hedgehog', 'Other']
  },
  {
    id: 'aquatic',
    name: 'Aquatic',
    icon: 'fish',
    animalTypes: ['Fish', 'Turtle', 'Frog', 'Newt', 'Axolotl', 'Other']
  },
  {
    id: 'invertebrates',
    name: 'Invertebrates',
    icon: 'bug',
    animalTypes: ['Spider', 'Scorpion', 'Crab', 'Snail', 'Millipede', 'Other']
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'paw',
    animalTypes: ['Guinea Pig', 'Chinchilla', 'Gerbil', 'Mouse', 'Rat', 'Other']
  }
];

const DEFAULT_ANIMAL_TYPES = [
  'Dogs',
  'Rabbits',
  'Cats',
  'Birds',
  'Fish',
  'Other'
];

const CategorySelectionStep = ({ serviceData, setServiceData }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [customAnimalInput, setCustomAnimalInput] = useState('');
  const [showCustomAnimalInput, setShowCustomAnimalInput] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [customAnimalCategory, setCustomAnimalCategory] = useState(null);
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

  const isCategorySelected = (categoryId) => {
    return serviceData.generalCategories.some(cat => cat.id === categoryId);
  };

  const isAnimalTypeSelected = (animalType, categoryId = null) => {
    return serviceData.animalTypes.some(type => 
      type.name === animalType && (!categoryId || type.categoryId === categoryId)
    );
  };

  const handleCategorySelect = (category) => {
    if (isCategorySelected(category.id)) {
      if (selectedCategoryId === category.id) {
        // Second click on the same category - show delete modal
        setCategoryToDelete(category);
        setShowDeleteModal(true);
      } else {
        // First click on a selected category - just switch view
        setSelectedCategoryId(category.id);
      }
      return;
    }

    setServiceData(prev => ({
      ...prev,
      generalCategories: [...prev.generalCategories, {
        id: category.id,
        name: category.name,
        icon: category.icon
      }]
    }));
    setSelectedCategoryId(category.id);
  };

  const handleAnimalTypeSelect = (animalType, categoryId = null) => {
    if (animalType === 'Other') {
      setShowCustomAnimalInput(true);
      setCustomAnimalCategory(categoryId);
      return;
    }

    setServiceData(prev => {
      const existingType = prev.animalTypes.find(type => 
        type.name === animalType && (!categoryId || type.categoryId === categoryId)
      );

      const updatedTypes = existingType
        ? prev.animalTypes.filter(type => 
            !(type.name === animalType && (!categoryId || type.categoryId === categoryId))
          )
        : [...prev.animalTypes, { name: animalType, categoryId }];

      return {
        ...prev,
        animalTypes: updatedTypes
      };
    });
  };

  const handleAddCustomAnimal = () => {
    if (!customAnimalInput.trim()) return;

    setServiceData(prev => ({
      ...prev,
      animalTypes: [...prev.animalTypes, { 
        name: customAnimalInput.trim(),
        categoryId: customAnimalCategory,
        isCustom: true
      }]
    }));
    setCustomAnimalInput('');
    setShowCustomAnimalInput(false);
    setCustomAnimalCategory(null);
  };

  const handleDeleteCategory = (option) => {
    if (!categoryToDelete) return;

    if (option === 'all') {
      setServiceData(prev => ({
        ...prev,
        generalCategories: prev.generalCategories.filter(cat => cat.id !== categoryToDelete.id),
        animalTypes: prev.animalTypes.filter(type => type.categoryId !== categoryToDelete.id)
      }));
    } else if (option === 'category') {
      setServiceData(prev => ({
        ...prev,
        generalCategories: prev.generalCategories.filter(cat => cat.id !== categoryToDelete.id)
      }));
    }

    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const handleSelectAll = () => {
    const allAnimalTypes = [];
    
    // If no categories selected, select all default types
    if (serviceData.generalCategories.length === 0) {
      DEFAULT_ANIMAL_TYPES.forEach(type => {
        if (type !== 'Other') {  // Skip 'Other' type
          allAnimalTypes.push({ name: type, categoryId: null });
        }
      });
    } else {
      // Get all animal types from selected categories
      serviceData.generalCategories.forEach(category => {
        const categoryData = GENERAL_CATEGORIES.find(cat => cat.id === category.id);
        if (categoryData) {
          categoryData.animalTypes.forEach(type => {
            allAnimalTypes.push({ name: type, categoryId: category.id });
          });
        }
      });
    }

    setServiceData(prev => ({
      ...prev,
      animalTypes: allAnimalTypes
    }));
  };

  const renderAnimalTypes = () => {
    const selectedCategories = serviceData.generalCategories;
    let animalTypesToShow = [];

    if (selectedCategories.length === 0) {
      // Show default animal types when no category is selected
      animalTypesToShow = DEFAULT_ANIMAL_TYPES.map(type => ({
        name: type,
        categoryId: null
      }));
    } else if (selectedCategoryId) {
      // Show animal types from selected category
      const categoryData = GENERAL_CATEGORIES.find(cat => cat.id === selectedCategoryId);
      if (categoryData) {
        animalTypesToShow = categoryData.animalTypes.map(type => ({
          name: type,
          categoryId: selectedCategoryId
        }));
      }
    } else {
      // Show all animal types from all selected categories
      selectedCategories.forEach(category => {
        const categoryData = GENERAL_CATEGORIES.find(cat => cat.id === category.id);
        if (categoryData) {
          animalTypesToShow.push(...categoryData.animalTypes.map(type => ({
            name: type,
            categoryId: category.id
          })));
        }
      });
    }

    // Get custom animals for the current view
    const customAnimals = serviceData.animalTypes.filter(type => 
      type.isCustom && 
      (type.categoryId === selectedCategoryId || (!selectedCategoryId && type.categoryId === null))
    );

    // Remove 'Other' from the list if custom input is showing
    if (showCustomAnimalInput) {
      animalTypesToShow = animalTypesToShow.filter(type => type.name !== 'Other');
    }

    return (
      <View style={styles.animalTypesContainer}>
        {/* Regular animal types */}
        {animalTypesToShow.filter(type => type.name !== 'Other').map((animalType) => (
          <View key={`${animalType.categoryId || 'default'}-${animalType.name}`} style={styles.animalTypeItem}>
            <TouchableOpacity
              style={styles.animalTypeRow}
              onPress={() => handleAnimalTypeSelect(animalType.name, animalType.categoryId)}
            >
              <View style={[
                styles.checkbox,
                isAnimalTypeSelected(animalType.name, animalType.categoryId) && styles.checkedBox
              ]}>
                {isAnimalTypeSelected(animalType.name, animalType.categoryId) && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={theme.colors.surface}
                  />
                )}
              </View>
              <Text style={styles.animalTypeName}>{animalType.name}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Custom animals */}
        {customAnimals.map((animalType) => (
          <View key={`custom-${animalType.categoryId || 'default'}-${animalType.name}`} style={styles.animalTypeItem}>
            <TouchableOpacity
              style={styles.animalTypeRow}
              onPress={() => handleAnimalTypeSelect(animalType.name, animalType.categoryId)}
            >
              <View style={[
                styles.checkbox,
                isAnimalTypeSelected(animalType.name, animalType.categoryId) && styles.checkedBox
              ]}>
                {isAnimalTypeSelected(animalType.name, animalType.categoryId) && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={theme.colors.surface}
                  />
                )}
              </View>
              <Text style={styles.animalTypeName}>{animalType.name}</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Custom input or Other option */}
        {showCustomAnimalInput ? (
          <View style={[styles.animalTypeItem, styles.customInputWrapper]}>
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder="Enter animal type"
                value={customAnimalInput}
                onChangeText={setCustomAnimalInput}
                placeholderTextColor={theme.colors.placeHolderText}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCustomAnimal}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Show 'Other' option if not showing custom input
          <View style={styles.animalTypeItem}>
            <TouchableOpacity
              style={styles.animalTypeRow}
              onPress={() => handleAnimalTypeSelect('Other', selectedCategoryId)}
            >
              <View style={[
                styles.checkbox,
                isAnimalTypeSelected('Other', selectedCategoryId) && styles.checkedBox
              ]}>
                {isAnimalTypeSelected('Other', selectedCategoryId) && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={theme.colors.surface}
                  />
                )}
              </View>
              <Text style={styles.animalTypeName}>Other</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 24,
      fontFamily: theme.fonts.header.fontFamily,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    categoryCard: {
      flex: 1,
      minWidth: '30%',
      aspectRatio: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedCategoryCard: {
      backgroundColor: theme.colors.mainColors.mainLight,
      borderColor: theme.colors.mainColors.main,
      borderWidth: 2,
    },
    categoryName: {
      marginTop: 8,
      fontSize: 16,
      color: theme.colors.text,
      textAlign: 'center',
      fontFamily: theme.fonts.regular.fontFamily,
    },
    checkmark: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    animalTypesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
    },
    selectAllButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    selectAllText: {
      fontSize: 16,
      color: theme.colors.mainColors.main,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    animalTypesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    animalTypeItem: {
      flex: 1,
      minWidth: Platform.OS === 'web' ? (screenWidth <= 420 ? '45%' : '30%') : '45%',
    },
    animalTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 56,
      justifyContent: 'flex-start',
      minWidth: 120,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    checkedBox: {
      backgroundColor: theme.colors.mainColors.main,
      borderColor: theme.colors.mainColors.main,
    },
    animalTypeName: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    customInputWrapper: {
      flex: 1,
      minWidth: '100%',
    },
    customInputContainer: {
      flexDirection: 'row',
      gap: 8,
      height: 56,
    },
    customInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    addButton: {
      backgroundColor: theme.colors.mainColors.main,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: 'center',
    },
    addButtonText: {
      color: theme.colors.surface,
      fontSize: 16,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    modalText: {
      fontSize: 20,
      color: theme.colors.text,
      marginBottom: 24,
      fontFamily: theme.fonts.regular.fontFamily,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
    },
    modalButton: {
      width: '48%',
      // height: 150
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.mainColors.main,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      color: theme.colors.surface,
      fontFamily: theme.fonts.regular.fontFamily,
      textAlign: 'center',
      width: '80%',
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Service Category</Text>
      
      <View style={styles.categoriesGrid}>
        {GENERAL_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              isCategorySelected(category.id) && styles.selectedCategoryCard
            ]}
            onPress={() => handleCategorySelect(category)}
          >
            <MaterialCommunityIcons
              name={category.icon}
              size={32}
              color={theme.colors.text}
            />
            <Text style={styles.categoryName}>{category.name}</Text>
            {isCategorySelected(category.id) && (
              <MaterialCommunityIcons
                name="check"
                size={24}
                color={theme.colors.text}
                style={styles.checkmark}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.animalTypesHeader}>
        <Text style={styles.subtitle}>Select Animal Types</Text>
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={handleSelectAll}
        >
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>
      </View>
      {renderAnimalTypes()}

      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Category</Text>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={styles.closeButton}
              >
                {isMobile ? (
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                ) : (
                  <Text style={styles.closeButtonText}>Go Back</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              Would you like to delete just the category or the category and all selected animals?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleDeleteCategory('category')}
              >
                <Text style={styles.buttonText}>Category Only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleDeleteCategory('all')}
              >
                <Text style={styles.buttonText}>Category & Animals</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default CategorySelectionStep; 