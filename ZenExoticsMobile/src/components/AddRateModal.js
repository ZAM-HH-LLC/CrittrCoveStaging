import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const AddRateModal = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!name || !amount) return;
    onAdd({
      name,
      amount: parseFloat(amount),
      description
    });
    setName('');
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Rate</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Rate Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter rate name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, (!name || !amount) && styles.disabledButton]}
            onPress={handleAdd}
            disabled={!name || !amount}
          >
            <Text style={styles.addButtonText}>Add Rate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 10,
    backgroundColor: theme.colors.surface,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default AddRateModal;