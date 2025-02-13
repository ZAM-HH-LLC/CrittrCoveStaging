import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const EditableSection = ({ 
  title, 
  value, 
  onChangeText, 
  editMode, 
  toggleEditMode, 
  setHasUnsavedChanges,
  getContentWidth,
  multiline = true 
}) => {
  const renderEditableField = () => {
    return editMode ? (
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setHasUnsavedChanges(true);
        }}
        style={[
          styles.input,
          { width: getContentWidth() },
          multiline && { height: 100, textAlignVertical: 'top' }
        ]}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    ) : (
      <Text style={[styles.fieldText, { width: getContentWidth() }]}>
        {value || `No ${title.toLowerCase()} provided`}
      </Text>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={toggleEditMode}>
          <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {renderEditableField()}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: 600,
    // marginBottom: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.large,
    marginBottom: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  input: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fieldText: {
    width: '100%',
    maxWidth: 600,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 10,
  },
});

export default EditableSection;