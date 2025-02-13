import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
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
import { SCREEN_WIDTH } from '../context/AuthContext';

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

const SearchRefiner = ({ onFiltersChange }) => {
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    animalType: '',
    service: '',
    startDate: new Date(),
    endDate: new Date(),
    selectedPets: [],
    minRate: 0,
    maxRate: 250
  });
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedGeneralCategories, setSelectedGeneralCategories] = useState([]);
  const [selectedAnimalTypes, setSelectedAnimalTypes] = useState([]);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [isAnimalDropdownOpen, setIsAnimalDropdownOpen] = useState(false);
  const [isGeneralDropdownOpen, setIsGeneralDropdownOpen] = useState(false);

  const categories = SERVICE_TYPES.map(service => ({
    label: service,
    value: service.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')
  }));

  const animalTypes = [
    { label: 'Dogs', value: 'dog' },
    { label: 'Cats', value: 'cat' },
    { label: 'Birds', value: 'bird' },
    { label: 'Small Animals', value: 'small-animal' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const renderPriceRange = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Rate Range</Text>
      <View style={styles.priceRangeContainer}>
        <Text>${filters.minRate}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={250}
          step={5}
          value={filters.maxRate}
          onValueChange={(value) => handleFilterChange('maxRate', value)}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
        />
        <Text>${filters.maxRate}</Text>
      </View>
    </View>
  );

  const renderLocationInput = () => (
    <View style={[styles.section, { zIndex: 4000 }]}>
      <Text style={styles.label}>Location</Text>
      <LocationInput
        value={location}
        onChange={setLocation}
        suggestions={locationSuggestions}
        onSuggestionSelect={setLocationSuggestions}
      />
    </View>
  );

  const renderDatePickers = () => (
    <View style={styles.section}>
      <View style={styles.datePickersContainer}>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.dateLabel}>Start Date</Text>
          <DatePicker
            value={filters.startDate}
            onChange={(date) => handleFilterChange('startDate', date)}
          />
        </View>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.dateLabel}>End Date</Text>
          <DatePicker
            value={filters.endDate}
            onChange={(date) => handleFilterChange('endDate', date)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Refine Search</Text>
      
      {renderLocationInput()}

      <View style={[styles.section, { zIndex: 3001 }]}>
        <CustomMultiSelect
          label="General Categories"
          data={generalCategoriesData}
          value={selectedGeneralCategories}
          onChange={(newValue) => {
            setSelectedGeneralCategories(newValue);
            handleFilterChange('general', newValue);
          }}
          placeholder="Select general categories"
          isOpen={isGeneralDropdownOpen}
          setIsOpen={setIsGeneralDropdownOpen}
          zIndex={3000}
        />
      </View>

      <View style={[styles.section, { zIndex: 3000 }]}>
        <CustomMultiSelect
          label="Animal Types"
          data={animalTypes}
          value={selectedAnimalTypes}
          onChange={(newValue) => {
            setSelectedAnimalTypes(newValue);
            handleFilterChange('animalTypes', newValue);
          }}
          placeholder="Select animal types"
          isOpen={isAnimalDropdownOpen}
          setIsOpen={setIsAnimalDropdownOpen}
          zIndex={2000}
        />
      </View>

      <View style={[styles.section, { zIndex: 2000 }]}>
        <CustomMultiSelect
          label="Service Categories"
          data={categories}
          value={selectedServices}
          onChange={(newValue) => {
            setSelectedServices(newValue);
            handleFilterChange('services', newValue);
          }}
          placeholder="Select services"
          isOpen={isServiceDropdownOpen}
          setIsOpen={setIsServiceDropdownOpen}
          zIndex={3000}
        />
      </View>

      <View style={[styles.section, { zIndex: 1 }]}>
        {renderDatePickers()}
      </View>

      <View style={[styles.section, { zIndex: 1 }]}>
        {renderPriceRange()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    height: '100%',
  },
  title: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.large,
    fontFamily: theme.fonts.header.fontFamily,
  },
  section: {
    marginBottom: theme.spacing.large,
    position: 'relative',
  },
  label: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdown: {
    height: 50,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: theme.spacing.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  datePickerContainer: {
    flexDirection: 'column',
    gap: theme.spacing.small,
  },
  datePickerWrapper: {
    maxWidth: 200,
  },
  dateLabel: {
    fontSize: theme.fontSizes.small + 2,
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dateInput: {
    flex: 1,
    height: 50,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: theme.spacing.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  rateInput: {
    flex: 1,
    height: 50,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: theme.spacing.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  locationInputWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.small,
  },
  locationInput: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.small,
    backgroundColor: theme.colors.background,
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
    zIndex: 1000,
  },
  suggestionsContainer: {
    flex: 1,
  },
  suggestionItem: {
    padding: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickersContainer: {
    flexDirection: 'column',
    gap: theme.spacing.small,
  },
  selectedText: {
    fontSize: theme.fontSizes.large + 2,
    color: '#000000',
    fontWeight: '1200',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  placeholderText: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.placeholderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedItem: {
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 8,
    borderColor: theme.colors.primary,
  },
  dropdownIcon: {
    width: 20,
    height: 20,
  },
  itemContainer: {
    padding: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemText: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    padding: theme.spacing.small,
    marginRight: theme.spacing.small,
    marginBottom: theme.spacing.small,
  },
  selectedChipText: {
    fontSize: theme.fontSizes.medium + 2,
    color: '#000000',
    marginRight: theme.spacing.small,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownItem: {
    padding: theme.spacing.small,
  },
  dropdownItemSelected: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    margin: 2,
  },
  dropdownItemText: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownItemTextSelected: {
    color: theme.colors.text,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

export default SearchRefiner;