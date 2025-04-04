import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const OwnerPicker = ({ owners, selectedOwner, onSelectOwner }) => {
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <Picker
        selectedValue={selectedOwner}
        onValueChange={(itemValue) => onSelectOwner(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Select a owner..." value="" />
        {owners.map(owner => (
          <Picker.Item key={owner.id} label={owner.name} value={owner.name} />
        ))}
      </Picker>
    );
  } else {
    return (
      <View>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowOwnerPicker(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedOwner || "Select a owner..."}
          </Text>
          <MaterialCommunityIcons 
            name="chevron-down" 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
        <Modal
          visible={showOwnerPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowOwnerPicker(false)}
        >
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedOwner}
                onValueChange={(itemValue) => {
                  onSelectOwner(itemValue);
                  setShowOwnerPicker(false);
                }}
                style={styles.modalPicker}
              >
                <Picker.Item label="Select a owner..." value="" />
                {owners.map(owner => (
                  <Picker.Item key={owner.id} label={owner.name} value={owner.name} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setShowOwnerPicker(false)}
            >
              <Text style={styles.pickerCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  picker: {
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderRadius: 4,
    padding: Platform.OS === 'ios' ? 12 : 0,
    width: '90%',
  },
  modalPicker: {
    width: '90%',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownButtonText: {
    color: theme.colors.text,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  pickerCloseButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    alignItems: 'center',
  },
  pickerCloseButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});

export default OwnerPicker;
