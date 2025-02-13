import React, { useState, useRef, useEffect, forwardRef, memo } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const SearchBar = forwardRef(({ placeholder, onChangeText, initialValue = '', style }, ref) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialValue !== value) {
      setValue(initialValue);
    }
  }, [initialValue]);

  const handleChangeText = (text) => {
    if (text !== value) {
      setValue(text);
      onChangeText(text);
    }
  };

  return (
    <View style={[styles.container, style, { backgroundColor: colors.surface }]}>
      <IconButton
        icon={() => <MaterialIcons name="search" size={24} color={colors.primary} />}
        onPress={() => inputRef.current?.focus()}
      />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={handleChangeText}
        autoFocus={true}
        keyboardType="default"
        returnKeyType="search"
        blurOnSubmit={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25, // Make it circular
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingRight: 8,
  },
});

export default memo(SearchBar);
