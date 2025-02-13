import React, { useState, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, Modal, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QuestionInput = ({ value, onChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);

  const [layout, setLayout] = useState(null);

const handleLayout = (event) => {
  const { x, y, width, height } = event.nativeEvent.layout;
    setLayout({ x, y, width, height });
  };

  const presetQuestions = [
    "What is your favorite animal?",
    "How many pets do you have?",
    "What's your experience with exotic pets?",
    "Do you have any allergies to animals?",
    "What type of exotic pet are you interested in?",
    "Have you owned an exotic pet before?",
    "Are you familiar with the care requirements for exotic pets?",
    "Do you have a veterinarian experienced with exotic animals?",
    "What's your living situation? (House, apartment, etc.)",
    "Are there any local regulations about exotic pet ownership in your area?",
  ];

  const handleChange = (text) => {
    onChange(text);
  };

  useLayoutEffect(() => {
    if (showDropdown && inputRef.current) {
      inputRef.current.measure((fx, fy, width, height, px, py) => {
        if (!isNaN(py) && !isNaN(height)) {
          const newTop = py + height;
          const newLeft = px;
          const newWidth = width;
            
          setDropdownPosition({ top: newTop, left: newLeft, width: newWidth });
        }
      });
    }

    // Lock/unlock scrolling
    if (Platform.OS === 'web') {
      document.body.style.overflow = showDropdown ? 'hidden' : 'auto';
    }

    return () => {
      if (Platform.OS === 'web') {
        document.body.style.overflow = 'auto';
      }
    };
  }, [showDropdown, layout]);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <View style={styles.inputContainer} ref={inputRef} onLayout={handleLayout}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleChange}
            placeholder="Enter or select a question"
            multiline
          />
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={toggleDropdown}
          >
            <MaterialCommunityIcons 
              name={showDropdown ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>
        <Modal
          visible={showDropdown}
          transparent={true}
          animationType="none"
          onRequestClose={toggleDropdown}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={toggleDropdown}
          >
            <View style={[styles.dropdownContainer, { top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width }]}>
              <ScrollView style={styles.dropdownList}>
                {presetQuestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleChange(q);
                      toggleDropdown();
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  container: {
    width: SCREEN_WIDTH - 80, // Match the answer input width
    maxWidth: 600,
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
  },
  input: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    padding: 8,
    minHeight: 60,
    ...Platform.select({
      web: {
        border: `1px solid ${theme.colors.border}`,
      },
      default: {
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
    }),
  },
  dropdownButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownContainer: {
    position: 'absolute',
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 200,
    zIndex: 1000, // Ensure it appears on top
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    color: theme.colors.text,
  },
});

export default QuestionInput;
