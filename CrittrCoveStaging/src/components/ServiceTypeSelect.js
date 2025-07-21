import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { theme } from '../styles/theme';

const InputSelect = ({ value, onChange, suggestions, placeholder, zIndex = 1000, showNotAvailable = false, placeHolderTextColor }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  const handleTextChange = (text) => {
    onChange(text);
    if (text.length > 0) {
      const filtered = suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(text.toLowerCase())
      );
      
      if (filtered.length === 0 && showNotAvailable) {
        // Show "not available" message for locations
        setFilteredSuggestions([`We're not available in "${text}" yet - coming soon!`]);
      } else {
        setFilteredSuggestions(filtered);
      }
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    // Don't select "not available" messages
    if (!suggestion.startsWith("We're not available in")) {
      onChange(suggestion);
    }
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    // Always show suggestions immediately on focus
    if (suggestions.length > 0) {
      if (value.length > 0) {
        // Filter based on current value
        const filtered = suggestions.filter(suggestion => 
          suggestion.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredSuggestions(filtered);
      } else {
        // Show all suggestions when empty
        setFilteredSuggestions(suggestions);
      }
      setShowSuggestions(true);
    }
  };

  // Create dynamic styles with custom zIndex
  const dynamicStyles = {
    container: {
      ...styles.container,
      zIndex: zIndex,
    },
    suggestionsWrapper: {
      ...styles.suggestionsWrapper,
      zIndex: zIndex,
    }
  };

  return (
    <View style={dynamicStyles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeHolderTextColor}
        value={value}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={() => {
          // Delay hiding suggestions to allow for suggestion selection
          setTimeout(() => {
            setShowSuggestions(false);
          }, 150);
        }}
      />
      {showSuggestions && (
        <View style={dynamicStyles.suggestionsWrapper}>
          <ScrollView 
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {filteredSuggestions.map((suggestion, index) => {
              const isNotAvailable = suggestion.startsWith("We're not available in");
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(suggestion)}
                >
                  <Text style={[
                    styles.suggestionText,
                    isNotAvailable && styles.notAvailableText
                  ]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginRight: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    zIndex: 1000,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.medium,
    backgroundColor: theme.colors.surface,
    width: '100%',
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
  suggestionText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  notAvailableText: {
    color: theme.colors.placeholderText,
    fontStyle: 'italic',
  },
});

export default InputSelect; 