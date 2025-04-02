import React, { useState, useRef, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Dropdown from 'react-native-element-dropdown/src/components/Dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import Slider from '@react-native-community/slider';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DatePicker from '../components/DatePicker';
import { debounce } from 'lodash';
import MultiSelect from 'react-native-element-dropdown/src/components/MultiSelect';
import CustomMultiSelect from '../components/CustomMultiSelect';
import { SERVICE_TYPES, GENERAL_CATEGORIES } from '../data/mockData';
import { AuthContext } from '../context/AuthContext';
import Tooltip from './Tooltip';
import ServiceTypeSelect from './ServiceTypeSelect';

const generalCategoriesData = GENERAL_CATEGORIES.map(category => ({
  label: category,
  value: category.toLowerCase().replace(/\s+/g, '-')
}));

const LocationInput = ({ value, onChange, suggestions, onSuggestionSelect }) => {
  const locationInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedFetch = useCallback(
    debounce(async (text) => {
      if (text.length < 1) return;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${text}&countrycodes=us&limit=5`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'ZenExotics Mobile App'
            }
          }
        );
        const data = await response.json();
        const suggestions = data.map(item => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon
        }));
        onSuggestionSelect(suggestions);
      } catch (error) {
        console.error('Error fetching locations:', error);
        onSuggestionSelect([]);
      }
    }, 300),
    [onSuggestionSelect]
  );

  return (
    <View style={[styles.locationInputWrapper, { zIndex: 2 }]}>
      <TextInput
        ref={locationInputRef}
        style={styles.locationInput}
        placeholder="Enter city, state, or zip"
        value={value}
        onChangeText={(text) => {
          onChange(text);
          if (text.length < 1) {
            onSuggestionSelect([]);
          } else {
            debouncedFetch(text);
          }
        }}
      />
      {suggestions.length > 0 && (
        <View style={styles.suggestionsWrapper}>
          <ScrollView 
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  onChange(suggestion.display_name);
                  onSuggestionSelect([]);
                }}
              >
                <Text>{suggestion.display_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const AnimalTypeButton = ({ icon, label, selected, onPress }) => (
  <TouchableOpacity 
    style={[styles.animalTypeButton, selected && styles.animalTypeButtonSelected]} 
    onPress={onPress}
  >
    <MaterialCommunityIcons 
      name={icon} 
      size={24} 
      color={selected ? theme.colors.whiteText : theme.colors.text} 
    />
    <Text style={[styles.animalTypeLabel, selected && styles.animalTypeLabelSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SearchRefiner = ({ onFiltersChange, onShowProfessionals, isMobile }) => {
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [service, setService] = useState('');
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [overnightService, setOvernightService] = useState(false);
  const [priceRange, setPriceRange] = useState(200);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [insuredOnly, setInsuredOnly] = useState(false);
  const { screenWidth } = useContext(AuthContext);

  const handleAnimalSelect = (animal) => {
    if (selectedAnimals.includes(animal)) {
      setSelectedAnimals(selectedAnimals.filter(a => a !== animal));
    } else {
      setSelectedAnimals([...selectedAnimals, animal]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Refine Search</Text>
        <TouchableOpacity style={styles.personButton} onPress={onShowProfessionals}>
          <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        {isMobile && (
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialCommunityIcons name="map" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.label}>I'm looking for services for my:</Text>
      <View style={styles.animalTypesContainer}>
        <AnimalTypeButton
          icon="dog"
          label="Dogs"
          selected={selectedAnimals.includes('dogs')}
          onPress={() => handleAnimalSelect('dogs')}
        />
        <AnimalTypeButton
          icon="cat"
          label="Cats"
          selected={selectedAnimals.includes('cats')}
          onPress={() => handleAnimalSelect('cats')}
        />
        <AnimalTypeButton
          icon="fish"
          label="Fish"
          selected={selectedAnimals.includes('fish')}
          onPress={() => handleAnimalSelect('fish')}
        />
        <AnimalTypeButton
          icon="bird"
          label="Birds"
          selected={selectedAnimals.includes('birds')}
          onPress={() => handleAnimalSelect('birds')}
        />
      </View>

      {/* Service Input */}
      <Text style={styles.label}>What service do you need? (e.g., Dog Walking, Pet Sitting)</Text>
      <ServiceTypeSelect
        value={service}
        onChange={setService}
      />
      
      {/* Location Input */}
      <Text style={styles.label}>Location</Text>
      <View style={styles.locationContainer}>
      <LocationInput
        value={location}
        onChange={setLocation}
        suggestions={locationSuggestions}
        onSuggestionSelect={setLocationSuggestions}
      />
        <TouchableOpacity style={[styles.useLocationButton, { marginBottom: 16 }]}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.colors.text} />
          <Text style={styles.useLocationText}>Use My Location</Text>
        </TouchableOpacity>
      </View>

      {/* Overnight Service */}
      <View style={styles.switchContainer}>
        <Text style={styles.label}>Overnight Service</Text>
        <Switch
          value={overnightService}
          onValueChange={setOvernightService}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>

      {/* Price Range */}
      <Text style={styles.label}>Price Range</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>$0</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={250}
          value={priceRange}
          onValueChange={setPriceRange}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
        />
        <Text style={styles.priceLabel}>${priceRange}</Text>
      </View>

      {/* Date Selection */}
      <Text style={styles.label}>Date Range</Text>
      <View style={styles.datePickersContainer}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={setEndDate}
        />
      </View>

      {/* Verification Options */}
      <View style={styles.checkboxContainer}>
        <View style={styles.checkboxRow}>
          <TouchableOpacity 
            style={styles.checkbox} 
            onPress={() => setVerifiedOnly(!verifiedOnly)}
          >
            {verifiedOnly && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          <View style={styles.checkboxLabelContainer}>
            <Text style={styles.checkboxLabel}>Verified Professionals Only</Text>
            <Tooltip 
              content="Verified professionals have completed our background check and identity verification process."
              position="right"
            >
              <MaterialCommunityIcons name="help-circle-outline" size={20} color={theme.colors.text} />
            </Tooltip>
          </View>
      </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity 
            style={styles.checkbox} 
            onPress={() => setInsuredOnly(!insuredOnly)}
          >
            {insuredOnly && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          <View style={styles.checkboxLabelContainer}>
            <Text style={styles.checkboxLabel}>Insured Service Providers</Text>
            <Tooltip 
              content="Insured providers maintain current liability insurance coverage for their services."
              position="right"
            >
              <MaterialCommunityIcons name="help-circle-outline" size={20} color={theme.colors.text} />
            </Tooltip>
          </View>
        </View>
      </View>

      {/* Search Button - Always show */}
      <TouchableOpacity 
        style={styles.searchButton}
        onPress={onShowProfessionals}
      >
        <Text style={styles.searchButtonText}>Search</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.surface,
    height: '100%',
    width: '100%',
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xlarge,
    gap: theme.spacing.small,
  },
  title: {
    fontSize: theme.fontSizes.xlarge,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  section: {
    marginBottom: theme.spacing.xlarge,
    position: 'relative',
  },
  label: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    color: theme.colors.text,
    marginVertical: theme.spacing.small,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdown: {
    height: 48,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: theme.spacing.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationInputWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.small,
    zIndex: 900,
  },
  locationInput: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    fontSize: theme.fontSizes.medium,
  },
  suggestionsWrapper: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    zIndex: 900,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  suggestionsContainer: {
    flex: 1,
  },
  suggestionItem: {
    padding: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickersContainer: {
    flexDirection: 'column',
    gap: theme.spacing.medium,
    zIndex: 500,
  },
  datePickerWrapper: {
    width: '100%',
  },
  dateLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  dateInput: {
    height: 48,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: theme.spacing.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSizes.medium,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.medium,
    marginTop: theme.spacing.small,
  },
  slider: {
    flex: 1,
    height: 48,
    marginHorizontal: theme.spacing.medium,
  },
  priceText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    minWidth: 50,
  },
  selectedText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  placeholderText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.placeholderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: theme.spacing.medium,
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    margin: 4,
  },
  dropdownItemText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  personButton: {
    padding: theme.spacing.small,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  showProfessionalsButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.medium,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: theme.spacing.large,
  },
  showProfessionalsText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  locationContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: theme.spacing.small,
    zIndex: 900,
    position: 'relative',
  },
  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.small,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    alignSelf: 'flex-start',
  },
  useLocationText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.small,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.medium,
    backgroundColor: theme.colors.surface,
  },
  animalTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
    marginTop: theme.spacing.small,
    marginBottom: theme.spacing.medium,
    zIndex: 800,
  },
  animalTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.small,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  animalTypeButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  animalTypeLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.small,
  },
  animalTypeLabelSelected: {
    color: theme.colors.whiteText,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'space-between' : 'flex-start',
    marginVertical: theme.spacing.small,
    gap: theme.spacing.medium,
    zIndex: 700,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
    zIndex: 600,
  },
  priceLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    minWidth: 50,
  },
  checkboxContainer: {
    marginTop: theme.spacing.medium,
    gap: theme.spacing.small,
    zIndex: 400,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.small,
  },
  iconButton: {
    padding: theme.spacing.small,
    borderRadius: 8,
  },
  checkboxLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing.small,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.medium,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: theme.spacing.large,
  },
  searchButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
  },
});

export default SearchRefiner;