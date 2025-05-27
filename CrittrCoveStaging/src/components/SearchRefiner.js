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
import { AuthContext, debugLog } from '../context/AuthContext';
import Tooltip from './Tooltip';
import ServiceTypeSelect from './ServiceTypeSelect';
import { searchProfessionals } from '../api/API';

// All available animal types from CategorySelectionStep
const ALL_ANIMAL_TYPES = [
  // Farm animals
  'Horse', 'Cow', 'Sheep', 'Goat', 'Pig',
  // Domestic
  'Dogs', 'Cats', 'Bird', 'Rabbit', 'Hamster',
  // Reptiles
  'Snake', 'Lizard', 'Turtle', 'Gecko', 'Chameleon',
  // Aquatic
  'Fish', 'Frog', 'Newt', 'Axolotl',
  // Invertebrates
  'Spider', 'Scorpion', 'Crab', 'Snail', 'Millipede'
];

// Supported locations for MVP launch
const SUPPORTED_LOCATIONS = [
  // Denver Metro Area
//   { display: "Denver, Colorado", city: "Denver", state: "Colorado", zips: ["80201", "80202", "80203", "80204", "80205", "80206", "80207", "80208", "80209", "80210", "80211", "80212", "80213", "80214", "80215", "80216", "80217", "80218", "80219", "80220", "80221", "80222", "80223", "80224", "80225", "80226", "80227", "80228", "80229", "80230", "80231", "80232", "80233", "80234", "80235", "80236", "80237", "80238", "80239", "80246", "80247", "80248", "80249", "80250", "80251", "80252", "80256", "80257", "80258", "80259", "80260", "80261", "80262", "80263", "80264", "80265", "80266", "80271", "80273", "80274", "80279", "80280", "80281", "80290", "80291", "80293", "80294", "80295", "80299"] },
//   { display: "Aurora, Colorado", city: "Aurora", state: "Colorado", zips: ["80010", "80011", "80012", "80013", "80014", "80015", "80016", "80017", "80018", "80019", "80040", "80041", "80042", "80044", "80045", "80046", "80047"] },
//   { display: "Lakewood, Colorado", city: "Lakewood", state: "Colorado", zips: ["80214", "80215", "80226", "80227", "80228", "80232", "80401"] },
//   { display: "Thornton, Colorado", city: "Thornton", state: "Colorado", zips: ["80023", "80229", "80233", "80241"] },
//   { display: "Arvada, Colorado", city: "Arvada", state: "Colorado", zips: ["80001", "80002", "80003", "80004", "80005", "80006", "80007", "80403"] },
//   { display: "Westminster, Colorado", city: "Westminster", state: "Colorado", zips: ["80003", "80020", "80021", "80030", "80031", "80234"] },
//   { display: "Centennial, Colorado", city: "Centennial", state: "Colorado", zips: ["80112", "80121", "80122", "80016"] },
  
  // Colorado Springs Area
  { display: "Colorado Springs, Colorado", city: "Colorado Springs", state: "Colorado", zips: ["80901", "80902", "80903", "80904", "80905", "80906", "80907", "80908", "80909", "80910", "80911", "80912", "80913", "80914", "80915", "80916", "80917", "80918", "80919", "80920", "80921", "80922", "80923", "80924", "80925", "80926", "80927", "80928", "80929", "80930", "80931", "80932", "80933", "80934", "80935", "80936", "80937", "80938", "80939", "80941", "80942", "80946", "80947", "80949", "80950", "80951", "80960", "80962", "80970", "80977", "80995", "80997"] },
  
  // Boulder Area
//   { display: "Boulder, Colorado", city: "Boulder", state: "Colorado", zips: ["80301", "80302", "80303", "80304", "80305", "80309", "80310", "80314"] },
  
  // Fort Collins Area
//   { display: "Fort Collins, Colorado", city: "Fort Collins", state: "Colorado", zips: ["80521", "80522", "80523", "80524", "80525", "80526", "80527", "80528"] },
  
  // Pueblo Area
//   { display: "Pueblo, Colorado", city: "Pueblo", state: "Colorado", zips: ["81001", "81002", "81003", "81004", "81005", "81006", "81007", "81008", "81009", "81010", "81011", "81012"] }
];

// Create a flat list of all searchable items (cities and zip codes)
const getAllSearchableLocations = () => {
  const searchableItems = [];
  
  SUPPORTED_LOCATIONS.forEach(location => {
    // Add the city
    searchableItems.push({
      display: location.display,
      searchText: `${location.city}, ${location.state}`,
      type: 'city'
    });
    
    // Add all zip codes for this city
    location.zips.forEach(zip => {
      searchableItems.push({
        display: `${zip}, ${location.city}, ${location.state}`,
        searchText: zip,
        type: 'zip'
      });
    });
  });
  
  return searchableItems;
};

const ALL_SEARCHABLE_LOCATIONS = getAllSearchableLocations();

const generalCategoriesData = GENERAL_CATEGORIES.map(category => ({
  label: category,
  value: category.toLowerCase().replace(/\s+/g, '-')
}));

const LocationInput = ({ value, onChange, suggestions, onSuggestionSelect }) => {
  const locationInputRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce((text) => {
      if (text.length < 1) {
        onSuggestionSelect([]);
        return;
      }
      
      // Search through supported locations
      const filteredLocations = ALL_SEARCHABLE_LOCATIONS.filter(location =>
        location.searchText.toLowerCase().includes(text.toLowerCase()) ||
        location.display.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5); // Limit to 5 results
      
      // If no matches found, show "not supported" message
      if (filteredLocations.length === 0) {
        onSuggestionSelect([{
          display: `We're not available in "${text}" yet - coming soon!`,
          searchText: text,
          type: 'not_supported'
        }]);
      } else {
        onSuggestionSelect(filteredLocations);
      }
    }, 100), // Reduced from 300ms to 100ms for faster response
    [onSuggestionSelect]
  );

  return (
    <View style={[styles.locationInputWrapper, { zIndex: 2 }]}>
      <TextInput
        ref={locationInputRef}
        style={styles.locationInput}
        placeholder="Enter city or zip in Colorado"
        value={value}
        onChangeText={(text) => {
          onChange(text);
          if (text.length < 1) {
            onSuggestionSelect([]);
          } else {
            debouncedSearch(text);
          }
        }}
        onFocus={() => {
          // Re-show suggestions if there's text and we have suggestions
          if (value.length > 0) {
            debouncedSearch(value);
          }
        }}
        onBlur={() => {
          // Delay hiding suggestions to allow for suggestion selection
          setTimeout(() => {
            onSuggestionSelect([]);
          }, 150);
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
                style={[
                  styles.suggestionItem,
                  suggestion.type === 'not_supported' && styles.suggestionItemNotSupported
                ]}
                onPress={() => {
                  if (suggestion.type !== 'not_supported') {
                    onChange(suggestion.display);
                    onSuggestionSelect([]);
                  }
                }}
                disabled={suggestion.type === 'not_supported'}
              >
                <Text style={[
                  styles.suggestionText,
                  suggestion.type === 'not_supported' && styles.suggestionTextNotSupported
                ]}>
                  {suggestion.display}
                </Text>
                {suggestion.type === 'zip' && (
                  <Text style={styles.suggestionType}>ZIP Code</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const OtherAnimalInput = ({ value, onChange, suggestions, onSuggestionSelect, isVisible, onClose, onAnimalSelect }) => {
  const animalInputRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce((text) => {
      if (text.length < 1) {
        onSuggestionSelect([]);
        return;
      }
      
      const filteredAnimals = ALL_ANIMAL_TYPES.filter(animal =>
        animal.toLowerCase().includes(text.toLowerCase())
      );
      onSuggestionSelect(filteredAnimals);
    }, 300),
    [onSuggestionSelect]
  );

  if (!isVisible) return null;

  return (
    <View style={styles.otherAnimalInputWrapper}>
      <View style={styles.otherAnimalHeader}>
        <Text style={styles.otherAnimalTitle}>Search for animal type</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <TextInput
        ref={animalInputRef}
        style={styles.animalInput}
        placeholder="Type animal name (e.g., Snake, Turtle, Horse)"
        value={value}
        onChangeText={(text) => {
          onChange(text);
          debouncedSearch(text);
        }}
        autoFocus={true}
      />
      {suggestions.length > 0 && (
        <View style={styles.animalSuggestionsWrapper}>
          <ScrollView 
            style={styles.animalSuggestionsContainer}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {suggestions.map((animal, index) => (
              <TouchableOpacity
                key={index}
                style={styles.animalSuggestionItem}
                onPress={() => {
                  onAnimalSelect(animal);
                  onChange('');
                  onSuggestionSelect([]);
                  onClose();
                }}
              >
                <Text style={styles.animalSuggestionText}>{animal}</Text>
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

const SearchRefiner = ({ onFiltersChange, onShowProfessionals, isMobile, onSearchResults, initialFilters }) => {
  const [location, setLocation] = useState(initialFilters?.location || '');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [service, setService] = useState(initialFilters?.service_query || '');
  const [selectedAnimals, setSelectedAnimals] = useState(initialFilters?.animal_types || []);
  const [overnightService, setOvernightService] = useState(initialFilters?.overnight_service || false);
  const [priceRange, setPriceRange] = useState(initialFilters?.price_max || 200);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [insuredOnly, setInsuredOnly] = useState(false);
  const [showOtherAnimalInput, setShowOtherAnimalInput] = useState(false);
  const [otherAnimalSearch, setOtherAnimalSearch] = useState('');
  const [otherAnimalSuggestions, setOtherAnimalSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { screenWidth } = useContext(AuthContext);

  // Update state when initialFilters change
  React.useEffect(() => {
    if (initialFilters) {
      setLocation(initialFilters.location || '');
      setService(initialFilters.service_query || '');
      setSelectedAnimals(initialFilters.animal_types || []);
      setOvernightService(initialFilters.overnight_service || false);
      setPriceRange(initialFilters.price_max || 200);
    }
  }, [initialFilters]);

  const handleAnimalSelect = (animal) => {
    if (selectedAnimals.includes(animal)) {
      setSelectedAnimals(selectedAnimals.filter(a => a !== animal));
    } else {
      setSelectedAnimals([...selectedAnimals, animal]);
    }
  };

  const handleOtherAnimalClose = () => {
    setShowOtherAnimalInput(false);
    setOtherAnimalSearch('');
    setOtherAnimalSuggestions([]);
  };

  const handleSearch = async () => {
    setIsSearching(true);
    
    try {
      debugLog('MBA9999', 'Starting professional search with filters:', {
        selectedAnimals,
        location,
        service,
        overnightService,
        priceRange
      });

      // Prepare search parameters
      const searchParams = {
        animal_types: selectedAnimals,
        location: location.trim(),
        service_query: service.trim(),
        overnight_service: overnightService,
        price_min: 0,
        price_max: priceRange,
        radius_miles: 30,
        page: 1,
        page_size: 20
      };

      // Call the search API
      const results = await searchProfessionals(searchParams);
      
      debugLog('MBA9999', 'Search completed successfully:', results);

      // Pass results and search parameters to parent component
      if (onSearchResults) {
        onSearchResults(results, searchParams);
      }

      // Show professionals list
      if (onShowProfessionals) {
        onShowProfessionals();
      }

    } catch (error) {
      debugLog('MBA9999', 'Search failed:', error);
      // TODO: Show error toast to user
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
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
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => {
                if (onShowProfessionals) {
                  // Pass a special parameter to indicate we want to switch to map view
                  onShowProfessionals('map');
                }
              }}
            >
              <MaterialCommunityIcons name="map" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.label}>I'm looking for services for my:</Text>
      <View style={styles.animalSelectionWrapper}>
        <View style={styles.animalTypesContainer}>
          <AnimalTypeButton
            icon="dog"
            label="Dogs"
            selected={selectedAnimals.includes('Dogs')}
            onPress={() => handleAnimalSelect('Dogs')}
          />
          <AnimalTypeButton
            icon="cat"
            label="Cats"
            selected={selectedAnimals.includes('Cats')}
            onPress={() => handleAnimalSelect('Cats')}
          />
          <TouchableOpacity 
            style={[styles.animalTypeButton, showOtherAnimalInput && styles.animalTypeButtonSelected]} 
            onPress={() => setShowOtherAnimalInput(!showOtherAnimalInput)}
          >
            <MaterialCommunityIcons 
              name="dots-horizontal" 
              size={24} 
              color={showOtherAnimalInput ? theme.colors.whiteText : theme.colors.text} 
            />
            <Text style={[styles.animalTypeLabel, showOtherAnimalInput && styles.animalTypeLabelSelected]}>
              Other
            </Text>
          </TouchableOpacity>
        </View>
        
        {showOtherAnimalInput && (
          <OtherAnimalInput
            value={otherAnimalSearch}
            onChange={setOtherAnimalSearch}
            suggestions={otherAnimalSuggestions}
            onSuggestionSelect={setOtherAnimalSuggestions}
            isVisible={showOtherAnimalInput}
            onClose={handleOtherAnimalClose}
            onAnimalSelect={handleAnimalSelect}
          />
        )}
      </View>

      {/* Display selected animals */}
      {selectedAnimals.length > 0 && (
        <View style={styles.selectedAnimalsContainer}>
          <Text style={styles.selectedAnimalsLabel}>Selected animals:</Text>
          <View style={styles.selectedAnimalsList}>
            {selectedAnimals.map((animal, index) => (
              <TouchableOpacity
                key={index}
                style={styles.selectedAnimalTag}
                onPress={() => handleAnimalSelect(animal)}
              >
                <Text style={styles.selectedAnimalText}>{animal}</Text>
                <MaterialCommunityIcons name="close" size={16} color={theme.colors.whiteText} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Location Input */}
      <Text style={styles.label}>Location</Text>
      <View style={styles.locationContainer}>
      <LocationInput
        value={location}
        onChange={setLocation}
        suggestions={locationSuggestions}
        onSuggestionSelect={setLocationSuggestions}
      />
        {/* <TouchableOpacity style={[styles.useLocationButton, { marginBottom: 16 }]}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.colors.text} />
          <Text style={styles.useLocationText}>Use My Location</Text>
        </TouchableOpacity> */}
      </View>

      {/* Service Input */}
      <Text style={styles.label}>What service do you need? (e.g., Dog Walking, Pet Sitting)</Text>
      <ServiceTypeSelect
        value={service}
        onChange={setService}
      />

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
          step={1}
        />
        <Text style={styles.priceLabel}>${Math.round(priceRange)}</Text>
      </View>

      {/* TODO: Add back after MVP launch 
      Date Selection
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
      </View> */}

      {/* TODO: Add back after MVP launch 
      Verification Options
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
      </View> */}

      {/* Search Button - Always show */}
      <TouchableOpacity 
        style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
        onPress={handleSearch}
        disabled={isSearching}
      >
        <Text style={styles.searchButtonText}>
          {isSearching ? 'Searching...' : 'Search'}
        </Text>
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
    zIndex: 1100,
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
    zIndex: 1100,
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
  suggestionItemNotSupported: {
    backgroundColor: theme.colors.background,
  },
  suggestionText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  suggestionTextNotSupported: {
    color: theme.colors.placeholderText,
    fontStyle: 'italic',
  },
  suggestionType: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.placeholderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  datePickersContainer: {
    flexDirection: 'column',
    gap: theme.spacing.medium,
    marginRight: 16,
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
    zIndex: 1100,
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
    marginBottom: theme.spacing.large,
  },
  searchButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
  },
  searchButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  otherAnimalInputWrapper: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginTop: theme.spacing.small,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  otherAnimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.medium,
  },
  otherAnimalTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  closeButton: {
    padding: theme.spacing.small,
    borderRadius: 8,
  },
  animalInput: {
    height: 48,
    borderWidth: 0,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    fontSize: theme.fontSizes.medium,
    marginHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.small,
  },
  animalSuggestionsWrapper: {
    flex: 1,
  },
  animalSuggestionsContainer: {
    flex: 1,
  },
  animalSuggestionItem: {
    padding: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  animalSuggestionText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  animalSelectionWrapper: {
    flexDirection: 'column',
    gap: theme.spacing.small,
  },
  selectedAnimalsContainer: {
    marginTop: theme.spacing.medium,
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  selectedAnimalsLabel: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedAnimalsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
  },
  selectedAnimalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.small,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    gap: theme.spacing.small,
  },
  selectedAnimalText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default SearchRefiner; 