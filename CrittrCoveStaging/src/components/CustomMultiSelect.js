import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const CustomMultiSelect = ({
  label,
  data,
  value,
  onChange,
  placeholder,
  isOpen,
  setIsOpen,
  containerStyle,
  zIndex = 1,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [setIsOpen]);

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    
    const selectedItems = value.map(v => data.find(item => item.value === v)?.label || '');
    const displayText = selectedItems[0];
    
    if (selectedItems.length > 1) {
      return displayText.length > 30 
        ? displayText.substring(0, 30) + '...'
        : displayText + ', ...';
    } else {
      return displayText.length > 30 
        ? displayText.substring(0, 30) + '...'
        : displayText;
    }
  };

  const handleRemoveItem = (itemValue, event) => {
    event.preventDefault();
    event.stopPropagation();
    const newValue = value.filter(v => v !== itemValue);
    onChange(newValue);
  };

  const handleItemSelect = (itemValue, event) => {
    event.preventDefault();
    event.stopPropagation();
    const newValue = value.includes(itemValue)
      ? value.filter(v => v !== itemValue)
      : [...value, itemValue];
    onChange(newValue);
  };

  return (
    <View style={[styles.container, { zIndex }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View ref={dropdownRef} style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text style={value.length ? styles.selectedText : styles.placeholderText}>
            {getDisplayText()}
          </Text>
          <MaterialCommunityIcons 
            name={isOpen ? "chevron-up" : "chevron-down"} 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={[styles.dropdown, { zIndex: zIndex + 1 }]}>
            <ScrollView 
              nestedScrollEnabled={true}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
            >
              {data.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.item}
                  onPress={(e) => handleItemSelect(item.value, e)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.itemText}>{item.label}</Text>
                  {value.includes(item.value) && (
                    <MaterialCommunityIcons 
                      name="check" 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!isOpen && value.length > 0 && (
          <View style={styles.chipsContainer}>
            {value.map((v) => {
              const item = data.find(item => item.value === v);
              if (!item) return null;
              return (
                <View key={v} style={styles.chip}>
                  <Text style={styles.chipText}>{item.label}</Text>
                  <TouchableOpacity 
                    onPress={(e) => handleRemoveItem(v, e)}
                    style={styles.chipRemove}
                  >
                    <MaterialCommunityIcons 
                      name="close" 
                      size={18} 
                      color={theme.colors.text} 
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdownContainer: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // height: 50,
    padding: 6,
    // paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginTop: 4,
    elevation: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
  },
  scrollView: {
    maxHeight: 200,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemText: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  placeholderText: {
    color: theme.colors.placeholderText,
    fontSize: theme.fontSizes.medium + 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.medium + 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // padding: 8,
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipText: {
    fontSize: theme.fontSizes.small + 2,
    color: theme.colors.text,
    marginRight: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  chipRemove: {
    padding: 2,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    fontFamily: theme.fonts.header.fontFamily,
  },
});

export default CustomMultiSelect;