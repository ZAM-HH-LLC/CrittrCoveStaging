import React, { useState, useRef, useCallback, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView, Switch, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import Slider from '@react-native-community/slider';
import { debounce } from 'lodash';
import { GENERAL_CATEGORIES } from '../data/mockData';
import { AuthContext, debugLog } from '../context/AuthContext';
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

// Helper function to check if a location is supported
const isLocationSupported = (text) => {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase();
  return ALL_SEARCHABLE_LOCATIONS.some(location => 
    location.display.toLowerCase().includes(normalizedText) || 
    location.searchText.toLowerCase().includes(normalizedText)
  );
};

const generalCategoriesData = GENERAL_CATEGORIES.map(category => ({
  label: category,
  value: category.toLowerCase().replace(/\s+/g, '-')
}));

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
  const [filterBackgroundChecked, setFilterBackgroundChecked] = useState(initialFilters?.filter_background_checked || false);
  const [filterInsured, setFilterInsured] = useState(initialFilters?.filter_insured || false);
  const [filterElitePro, setFilterElitePro] = useState(initialFilters?.filter_elite_pro || false);
  const [showOtherAnimalInput, setShowOtherAnimalInput] = useState(false);
  const [otherAnimalSearch, setOtherAnimalSearch] = useState('');
  const [otherAnimalSuggestions, setOtherAnimalSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { screenWidth, isSignedIn } = useContext(AuthContext);

  // Add logging for location state changes
  useEffect(() => {
    debugLog('MBA23o4iuv59', 'Location state changed:', location);
  }, [location]);

  // Add logging for location suggestions changes
  useEffect(() => {
    debugLog('MBA23o4iuv59', 'Location suggestions changed:', {
      count: locationSuggestions.length,
      suggestions: locationSuggestions
    });
  }, [locationSuggestions]);

  // Update state when initialFilters change
  React.useEffect(() => {
    if (initialFilters) {
      debugLog('MBA23o4iuv59', 'Initial filters updated:', initialFilters);
      setLocation(initialFilters.location || '');
      setService(initialFilters.service_query || '');
      setSelectedAnimals(initialFilters.animal_types || []);
      setOvernightService(initialFilters.overnight_service || false);
      setPriceRange(initialFilters.price_max || 200);
      setFilterBackgroundChecked(initialFilters.filter_background_checked || false);
      setFilterInsured(initialFilters.filter_insured || false);
      setFilterElitePro(initialFilters.filter_elite_pro || false);
    }
  }, [initialFilters]);

  // Create styles function that takes context variables as parameters
  const createStyles = (isSignedIn, screenWidth) => StyleSheet.create({
    container: {
      padding: theme.spacing.medium,
      backgroundColor: theme.colors.surface,
      height: '100%',
      width: '100%',
      overflow: 'visible',
      // Add top padding when not signed in or on mobile (screenWidth <= 1200)
      paddingTop: (!isSignedIn || screenWidth <= 1200) ? theme.spacing.medium : theme.spacing.medium,
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
      zIndex: 1101,
    },
    modalBackdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 1099,
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
      zIndex: 1102,
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
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: theme.fontSizes.medium,
      color: theme.colors.text,
    },
    badgeFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.small,
    },
    badgeIcon: {
      marginRight: 4,
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
    animalInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.medium,
      marginBottom: theme.spacing.small,
    },
    animalInput: {
      flex: 1,
      height: 48,
      borderWidth: 0,
      borderRadius: 8,
      paddingHorizontal: theme.spacing.medium,
      backgroundColor: theme.colors.background,
      fontSize: theme.fontSizes.medium,
    },
    addAnimalButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginLeft: theme.spacing.small,
    },
    addAnimalButtonText: {
      color: theme.colors.whiteText,
      fontWeight: '600',
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.regular.fontFamily,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
    },
    modalSuggestionsWrapper: {
      position: 'absolute',
      left: theme.spacing.medium,
      right: theme.spacing.medium,
      maxHeight: 200,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      zIndex: 1200,
    },
  });

  // Create styles using current context values
  const styles = createStyles(isSignedIn, screenWidth);

  // Create a new simple location input component
  const LocationInputSimple = ({ value, onChange }) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const containerRef = useRef(null);
    
    // Update internal value when prop changes
    useEffect(() => {
      debugLog('MBA23o4iuv59', 'Value prop changed:', value);
      setInputValue(value);
    }, [value]);
    
    // Add click outside handler for web
    useEffect(() => {
      if (Platform.OS === 'web') {
        const handleClickOutside = (event) => {
          // Check if the click is outside both the input container and suggestions
          const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target);
          
          debugLog('MBA23o4iuv59', 'Click detected', { 
            isOutsideContainer,
            hasSuggestions: suggestions.length > 0,
            isFocused
          });
          
          if (isOutsideContainer && isFocused) {
            debugLog('MBA23o4iuv59', 'Click outside detected, closing dropdown');
            setIsFocused(false);
            setSuggestions([]);
          }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [isFocused, suggestions.length]);
    
    // Log component state
    useEffect(() => {
      debugLog('MBA23o4iuv59', 'Component state:', { 
        inputValue, 
        suggestionsCount: suggestions.length,
        isFocused
      });
    }, [inputValue, suggestions, isFocused]);
    
    const handleTextChange = (text) => {
      debugLog('MBA23o4iuv59', 'Text input changed:', text);
      setInputValue(text);
      
      // Search for locations
      if (text.length < 1) {
        // Show all supported locations when input is empty
        debugLog('MBA23o4iuv59', 'Empty input, showing all supported locations');
        
        // Get the first few supported locations to show as suggestions
        const defaultSuggestions = ALL_SEARCHABLE_LOCATIONS
          .filter(location => location.type === 'city')  // Only show cities in the default list
          .slice(0, 5);  // Limit to 5 results
        
        setSuggestions(defaultSuggestions);
      } else {
        // Search through supported locations
        const filteredLocations = ALL_SEARCHABLE_LOCATIONS.filter(location =>
          location.searchText.toLowerCase().includes(text.toLowerCase()) ||
          location.display.toLowerCase().includes(text.toLowerCase())
        ).slice(0, 5); // Limit to 5 results
        
        debugLog('MBA23o4iuv59', 'Search results:', { 
          query: text, 
          resultsCount: filteredLocations.length
        });
        
        // If no matches found, show "not supported" message
        if (filteredLocations.length === 0) {
          debugLog('MBA23o4iuv59', 'Location not supported:', text);
          setSuggestions([{
            display: `We're not available in "${text}" yet - coming soon!`,
            searchText: text,
            type: 'not_supported'
          }]);
        } else {
          setSuggestions(filteredLocations);
        }
      }
    };
    
    // Direct selection handler without complex state management
    const selectLocation = (location) => {
      debugLog('MBA23o4iuv59', 'DIRECT SELECTION of location:', location);
      
      if (location.type !== 'not_supported') {
        // Update both local and parent state immediately
        const newValue = location.display;
        setInputValue(newValue);
        onChange(newValue);
        debugLog('MBA23o4iuv59', 'Set location value to:', newValue);
      }
      
      // Always clear suggestions and reset focus
      setSuggestions([]);
      setIsFocused(false);
    };

    return (
      <View 
        style={styles.locationInputWrapper}
        ref={containerRef}
      >
        <TextInput
          ref={inputRef}
          style={styles.locationInput}
          placeholder="Enter city or zip in Colorado"
          value={inputValue}
          onChangeText={handleTextChange}
          onFocus={() => {
            debugLog('MBA23o4iuv59', 'Input focused');
            setIsFocused(true);
            
            if (inputValue.length > 0) {
              handleTextChange(inputValue);
            } else {
              // Show all supported locations when input is empty
              debugLog('MBA23o4iuv59', 'Empty input on focus, showing all supported locations');
              
              // Get the first few supported locations to show as suggestions
              const defaultSuggestions = ALL_SEARCHABLE_LOCATIONS
                .filter(location => location.type === 'city')  // Only show cities in the default list
                .slice(0, 5);  // Limit to 5 results
              
              setSuggestions(defaultSuggestions);
            }
          }}
        />
        
        {suggestions.length > 0 && isFocused && (
          <View 
            style={styles.suggestionsWrapper}
            ref={suggestionsRef}
          >
            <ScrollView 
              style={styles.suggestionsContainer}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionItem,
                    suggestion.type === 'not_supported' && styles.suggestionItemNotSupported
                  ]}
                  onPress={() => selectLocation(suggestion)}
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
    // Add a ref to track whether a suggestion was selected
    const suggestionSelectedRef = useRef(false);
    // Add a ref to track if the close button was clicked
    const closeButtonClickedRef = useRef(false);

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

    // Function to handle adding a custom animal
    const handleAddCustomAnimal = () => {
      if (value.trim() === '') return;
      
      // Add the custom animal
      onAnimalSelect(value.trim());
      
      // Reset input and close
      onChange('');
      onSuggestionSelect([]);
      onClose();
    };

    // Custom close handler that sets the close flag before calling the original onClose
    const handleClose = () => {
      closeButtonClickedRef.current = true;
      onClose();
    };

    if (!isVisible) return null;

    return (
      <View style={styles.otherAnimalInputWrapper}>
        <View style={styles.otherAnimalHeader}>
          <Text style={styles.otherAnimalTitle}>Search for animal type</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.animalInputContainer}>
          <TextInput
            ref={animalInputRef}
            style={styles.animalInput}
            placeholder="Type animal name (e.g., Snake, Turtle, Horse)"
            value={value}
            onChangeText={(text) => {
              onChange(text);
              debouncedSearch(text);
              // Reset flags when text changes
              suggestionSelectedRef.current = false;
              closeButtonClickedRef.current = false;
            }}
            onBlur={() => {
              // Don't add empty values
              if (value.trim() === '') return;
              
              // Delay to allow for suggestion selection before adding custom value
              setTimeout(() => {
                // Only add if a suggestion wasn't selected AND close button wasn't clicked
                if (value.trim() !== '' && !suggestionSelectedRef.current && !closeButtonClickedRef.current) {
                  handleAddCustomAnimal();
                }
                // Reset the flags after processing
                suggestionSelectedRef.current = false;
                closeButtonClickedRef.current = false;
              }, 200);
            }}
            autoFocus={true}
          />
          {value.trim() !== '' && (
            <TouchableOpacity 
              style={styles.addAnimalButton} 
              onPress={handleAddCustomAnimal}
            >
              <Text style={styles.addAnimalButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
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
                    // Mark that a suggestion was selected
                    suggestionSelectedRef.current = true;
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
        priceRange,
        filterBackgroundChecked,
        filterInsured,
        filterElitePro
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
        page_size: 20,
        filter_background_checked: filterBackgroundChecked,
        filter_insured: filterInsured,
        filter_elite_pro: filterElitePro
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
        <LocationInputSimple
          value={location}
          onChange={setLocation}
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

      {/* Badge Filters */}
      <Text style={styles.label}>Professional Credentials</Text>
      <View style={styles.checkboxContainer}>
        <View style={styles.checkboxRow}>
          <TouchableOpacity 
            style={[styles.checkbox, filterBackgroundChecked && styles.checkboxChecked]} 
            onPress={() => setFilterBackgroundChecked(!filterBackgroundChecked)}
          >
            {filterBackgroundChecked && <MaterialCommunityIcons name="check" size={16} color={theme.colors.whiteText} />}
          </TouchableOpacity>
          <View style={styles.checkboxLabelContainer}>
            <View style={styles.badgeFilterRow}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#9C27B0" style={styles.badgeIcon} />
              <Text style={styles.checkboxLabel}>Background Checked Only</Text>
            </View>
          </View>
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity 
            style={[styles.checkbox, filterInsured && styles.checkboxChecked]} 
            onPress={() => setFilterInsured(!filterInsured)}
          >
            {filterInsured && <MaterialCommunityIcons name="check" size={16} color={theme.colors.whiteText} />}
          </TouchableOpacity>
          <View style={styles.checkboxLabelContainer}>
            <View style={styles.badgeFilterRow}>
              <MaterialCommunityIcons name="security" size={16} color="#0784C6" style={styles.badgeIcon} />
              <Text style={styles.checkboxLabel}>Insured Only</Text>
            </View>
          </View>
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity 
            style={[styles.checkbox, filterElitePro && styles.checkboxChecked]} 
            onPress={() => setFilterElitePro(!filterElitePro)}
          >
            {filterElitePro && <MaterialCommunityIcons name="check" size={16} color={theme.colors.whiteText} />}
          </TouchableOpacity>
          <View style={styles.checkboxLabelContainer}>
            <View style={styles.badgeFilterRow}>
              <MaterialCommunityIcons name="medal" size={16} color="#4CAF50" style={styles.badgeIcon} />
              <Text style={styles.checkboxLabel}>Elite Pro Only</Text>
            </View>
          </View>
        </View>
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

export default SearchRefiner; 