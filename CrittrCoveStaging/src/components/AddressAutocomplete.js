import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { debugLog } from '../context/AuthContext';

// Colorado bounds for validation
const COLORADO_BOUNDS = {
  north: 41.0,
  south: 37.0,
  east: -102.0,
  west: -109.0
};

class AddressSearchQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastRequest = 0;
    this.minInterval = 1100; // 1.1 seconds for Nominatim rate limit
  }

  async search(query) {
    return new Promise((resolve, reject) => {
      this.queue.push({ query, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { query, resolve, reject } = this.queue.shift();
      
      try {
        // Ensure we don't exceed rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        
        if (timeSinceLastRequest < this.minInterval) {
          const waitTime = this.minInterval - timeSinceLastRequest;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequest = Date.now();
        const result = await this.performSearch(query);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  async performSearch(query) {
    debugLog('MBA8901', 'Searching addresses for:', query);

    const url = 'https://nominatim.openstreetmap.org/search';
    const params = new URLSearchParams({
      q: `${query}, Colorado, USA`,
      format: 'json',
      limit: '5',
      countrycodes: 'us',
      addressdetails: '1',
      bounded: '1',
      viewbox: `${COLORADO_BOUNDS.west},${COLORADO_BOUNDS.south},${COLORADO_BOUNDS.east},${COLORADO_BOUNDS.north}`
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'User-Agent': 'CrittrCove/1.0 (contact@crittrcove.com)'
      }
    });

    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return [];
    }

    // Filter and format results
    return data
      .filter(result => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        return this.isInColorado(lat, lng);
      })
      .map(result => ({
        id: result.place_id,
        formatted_address: result.display_name,
        components: {
          street: result.address?.house_number && result.address?.road 
            ? `${result.address.house_number} ${result.address.road}`
            : result.address?.road || '',
          apartment: '',
          city: result.address?.city || result.address?.town || result.address?.village || '',
          state: result.address?.state || 'Colorado',
          zip: result.address?.postcode || ''
        },
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formatted_address: result.display_name
        }
      }));
  }

  isInColorado(lat, lng) {
    return lat >= COLORADO_BOUNDS.south && 
           lat <= COLORADO_BOUNDS.north && 
           lng >= COLORADO_BOUNDS.west && 
           lng <= COLORADO_BOUNDS.east;
  }
}

// Create singleton instance
const searchQueue = new AddressSearchQueue();

const AddressAutocomplete = ({ 
  value = '', 
  onAddressSelect, 
  placeholder = "Enter your address...",
  style = {},
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced search function
  const searchAddresses = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const results = await searchQueue.search(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      debugLog('MBA8901', `Found ${results.length} address suggestions`);
    } catch (error) {
      debugLog('MBA8901', 'Address search failed:', error.message);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (text) => {
    setInputValue(text);
    setSelectedAddress(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(text);
    }, 500); // 500ms debounce
  };

  // Handle address selection
  const handleAddressSelect = (address) => {
    setInputValue(address.formatted_address);
    setSelectedAddress(address);
    setShowSuggestions(false);
    setSuggestions([]);

    // Notify parent component
    if (onAddressSelect) {
      onAddressSelect(address);
    }

    debugLog('MBA8901', 'Address selected:', address);
  };

  // Clear suggestions when input loses focus
  const handleBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Render suggestion item
  const renderSuggestion = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === suggestions.length - 1 && styles.lastSuggestionItem
      ]}
      onPress={() => handleAddressSelect(item)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons 
        name="map-marker" 
        size={20} 
        color={theme.colors.primary} 
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionText} numberOfLines={2}>
          {item.formatted_address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            selectedAddress && styles.inputValid,
            disabled && styles.inputDisabled
          ]}
          value={inputValue}
          onChangeText={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          editable={!disabled}
        />
        
        {isLoading && (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.primary} 
            style={styles.loadingIndicator}
          />
        )}
        
        {selectedAddress && (
          <MaterialCommunityIcons 
            name="check-circle" 
            size={20} 
            color={theme.colors.success} 
            style={styles.validIcon}
          />
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id.toString()}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {inputValue.length >= 3 && !isLoading && suggestions.length === 0 && showSuggestions && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            No addresses found. Please check your spelling or try a different address.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000, // High enough to appear above modal buttons (which are at -1)
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  inputValid: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '10',
  },
  inputDisabled: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.placeholder,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
  },
  validIcon: {
    position: 'absolute',
    right: 12,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    zIndex: 1001, // Higher than container, much higher than modal buttons (-1)
    elevation: 10, // Reasonable elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 56,
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  noResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    zIndex: 1001, // Same z-index as suggestions
  },
  noResultsText: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AddressAutocomplete; 