import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const GENERAL_CATEGORIES = [
  {
    id: 'farm_animals',
    name: 'Farm Animals',
    icon: 'horse',
  },
  {
    id: 'domestic',
    name: 'Domestic',
    icon: 'dog',
  },
  {
    id: 'exotic',
    name: 'Exotic',
    icon: 'snake',
  },
  {
    id: 'aquatic',
    name: 'Aquatic',
    icon: 'fish',
  },
  {
    id: 'invertebrates',
    name: 'Invertebrates',
    icon: 'bug',
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'paw',
  },
];

const ANIMAL_TYPES = {
  farm_animals: ['Horse', 'Cow', 'Sheep', 'Goat', 'Pig'],
  domestic: ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster'],
  exotic: ['Snake', 'Lizard', 'Parrot', 'Ferret', 'Hedgehog'],
  aquatic: ['Fish', 'Turtle', 'Frog', 'Newt', 'Axolotl'],
  invertebrates: ['Spider', 'Scorpion', 'Crab', 'Snail', 'Millipede'],
  other: ['Guinea Pig', 'Chinchilla', 'Gerbil', 'Mouse', 'Rat'],
};

const CategorySelectionStep = ({ serviceData, setServiceData }) => {
  const [selectedCategories, setSelectedCategories] = useState(
    serviceData.generalCategories || []
  );
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customAnimalInput, setCustomAnimalInput] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomAnimal, setShowCustomAnimal] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const handleCategorySelect = (categoryId) => {
    if (categoryId === 'other') {
      setShowCustomCategory(true);
      return;
    }

    if (activeCategory === categoryId) {
      // If clicking the active category, deselect it
      setActiveCategory(null);
      const updatedCategories = selectedCategories.filter(cat => cat.id !== categoryId);
      setSelectedCategories(updatedCategories);
    } else {
      // Set as active category and add to selected if not already selected
      setActiveCategory(categoryId);
      if (!selectedCategories.find(cat => cat.id === categoryId)) {
        const newCategory = GENERAL_CATEGORIES.find(cat => cat.id === categoryId);
        setSelectedCategories(prev => [...prev, newCategory]);
      }
    }
  };

  useEffect(() => {
    setServiceData(prevData => ({
      ...prevData,
      generalCategories: selectedCategories,
      animalTypes: prevData.animalTypes.filter(type => 
        !type.categoryId || selectedCategories.some(cat => cat.id === type.categoryId)
      )
    }));
  }, [selectedCategories]);

  const handleAddCustomCategory = () => {
    if (!customCategoryInput.trim()) return;

    const newCategory = {
      id: `custom_${customCategoryInput.toLowerCase().replace(/\s+/g, '_')}`,
      name: customCategoryInput,
      icon: 'paw',
      isCustom: true
    };

    setSelectedCategories(prev => {
      const updatedCategories = [...prev, newCategory];
      setServiceData(prevData => ({
        ...prevData,
        generalCategories: updatedCategories
      }));
      return updatedCategories;
    });
    setCustomCategoryInput('');
    setShowCustomCategory(false);
    setActiveCategory(newCategory.id);
  };

  const handleAnimalTypeSelect = (animalType, categoryId) => {
    if (animalType === 'Other') {
      setShowCustomAnimal(true);
      return;
    }

    setServiceData(prev => {
      const existingType = prev.animalTypes.find(type => 
        type.name === animalType && type.categoryId === categoryId
      );

      const updatedTypes = existingType
        ? prev.animalTypes.filter(type => 
            !(type.name === animalType && type.categoryId === categoryId)
          )
        : [...prev.animalTypes, { name: animalType, categoryId }];

      return {
        ...prev,
        animalTypes: updatedTypes
      };
    });
  };

  const handleAddCustomAnimal = () => {
    if (!customAnimalInput.trim() || !activeCategory) return;

    const newAnimalType = {
      name: customAnimalInput,
      categoryId: activeCategory,
      isCustom: true
    };

    setServiceData(prev => ({
      ...prev,
      animalTypes: [...prev.animalTypes, newAnimalType]
    }));
    setCustomAnimalInput('');
    setShowCustomAnimal(false);
  };

  const handleRemoveAnimalType = (animalType, categoryId) => {
    setServiceData(prev => ({
      ...prev,
      animalTypes: prev.animalTypes.filter(type => 
        !(type.name === animalType && type.categoryId === categoryId)
      )
    }));
  };

  const renderCategories = () => {
    return (
      <View style={styles.categoriesSection}>
        <View style={styles.categoriesGrid}>
          {GENERAL_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategories.some(cat => cat.id === category.id) && styles.selectedCategoryCard,
                activeCategory === category.id && styles.activeCategoryCard
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <MaterialCommunityIcons
                name={category.icon}
                size={32}
                color={selectedCategories.some(cat => cat.id === category.id) 
                  ? theme.colors.surface 
                  : theme.colors.text}
              />
              <Text style={[
                styles.categoryName,
                selectedCategories.some(cat => cat.id === category.id) && styles.selectedCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showCustomCategory && (
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="Enter custom category"
              value={customCategoryInput}
              onChangeText={setCustomCategoryInput}
              placeholderTextColor={theme.colors.placeHolderText}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCustomCategory}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedCategories.length > 0 && (
          <View style={styles.selectedItemsContainer}>
            <Text style={styles.selectedItemsTitle}>Selected Categories:</Text>
            <View style={styles.selectedItemsGrid}>
              {selectedCategories.map((category) => (
                <View key={category.id} style={styles.selectedItemTag}>
                  <Text style={styles.selectedItemText}>{category.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleCategorySelect(category.id)}
                    style={styles.removeButton}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={16}
                      color={theme.colors.surface}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAnimalTypes = () => {
    if (!activeCategory || selectedCategories.length === 0) return null;

    const currentCategory = selectedCategories.find(cat => cat.id === activeCategory);
    if (!currentCategory) return null;

    return (
      <View style={styles.animalTypesSection}>
        <Text style={styles.sectionTitle}>Select Animal Types for {currentCategory.name}</Text>
        <View style={styles.animalTypesGrid}>
          {(ANIMAL_TYPES[activeCategory] || []).map((type) => (
            <TouchableOpacity
              key={`${activeCategory}-${type}`}
              style={[
                styles.animalTypeCard,
                serviceData.animalTypes.some(t => 
                  t.name === type && t.categoryId === activeCategory
                ) && styles.selectedAnimalTypeCard
              ]}
              onPress={() => handleAnimalTypeSelect(type, activeCategory)}
            >
              <Text style={[
                styles.animalTypeName,
                serviceData.animalTypes.some(t => 
                  t.name === type && t.categoryId === activeCategory
                ) && styles.selectedAnimalTypeText
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.animalTypeCard}
            onPress={() => setShowCustomAnimal(true)}
          >
            <Text style={styles.animalTypeName}>Other</Text>
          </TouchableOpacity>
        </View>

        {showCustomAnimal && (
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="Enter custom animal type"
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
        )}

        {serviceData.animalTypes.length > 0 && (
          <View style={styles.selectedItemsContainer}>
            <Text style={styles.selectedItemsTitle}>Selected Animal Types:</Text>
            <View style={styles.selectedItemsGrid}>
              {serviceData.animalTypes.map((type, index) => (
                <View key={index} style={styles.selectedItemTag}>
                  <Text style={styles.selectedItemText}>{type.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveAnimalType(type.name, type.categoryId)}
                    style={styles.removeButton}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={16}
                      color={theme.colors.surface}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Select Service Categories</Text>
      {renderCategories()}
      {renderAnimalTypes()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  categoryCard: {
    flex: 1,
    minWidth: 150,
    aspectRatio: 1.5,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedCategoryCard: {
    backgroundColor: theme.colors.mainColors.main,
    borderColor: theme.colors.mainColors.main,
  },
  activeCategoryCard: {
    borderColor: theme.colors.mainColors.main,
    borderWidth: 2,
  },
  categoryName: {
    marginTop: 8,
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: theme.colors.surface,
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: theme.colors.mainColors.main,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedItemsContainer: {
    marginTop: 16,
  },
  selectedItemsTitle: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedItemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.mainColors.main,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 8,
  },
  selectedItemText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalTypesSection: {
    marginTop: 24,
  },
  animalTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  animalTypeCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedAnimalTypeCard: {
    backgroundColor: theme.colors.mainColors.main,
    borderColor: theme.colors.mainColors.main,
  },
  animalTypeName: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedAnimalTypeText: {
    color: theme.colors.surface,
  },
});

export default CategorySelectionStep; 