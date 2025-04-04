import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { theme } from '../styles/theme';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/config';
import OwnerPicker from './OwnerPicker'; // Import the new component

const ContractTemplate = ({ templates }) => {
  const [isTemplateModalVisible, setTemplateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [contractContent, setContractContent] = useState('');
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('');

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/owners/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setOwners(response.data);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setContractContent(template.description);
    setTemplateModalVisible(false);
    setEditModalVisible(true);
  };

  const handleAddSignableField = () => {
    setContractContent((prevContent) => `${prevContent}\n[signable] ___________ [end signable]`);
  };

  const handleSubmitContract = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }
      const response = await axios.post(
        `${API_BASE_URL}/api/contracts/`,
        {
          template: selectedTemplate.id,
          content: contractContent,
          owner: selectedOwner,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('Contract submitted:', response.data);
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error submitting contract:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Create New Contract</Text>
      <TouchableOpacity style={styles.button} onPress={() => setTemplateModalVisible(true)}>
        <Text style={styles.buttonText}>Use Template</Text>
      </TouchableOpacity>

      {/* Template Selection Modal */}
      <Modal
        visible={isTemplateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Template</Text>
            <ScrollView contentContainerStyle={styles.templateGrid}>
              {templates.length === 0 ? (
                <Text style={styles.noTemplatesText}>No templates yet</Text>
              ) : (
                templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateBox}
                    onPress={() => handleTemplateSelect(template)}
                  >
                    <Text style={styles.templateTitle}>{template.title}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setTemplateModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Contract Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Contract</Text>
            <View style={styles.ownerPickerContainer}>
              <Text style={styles.sectionTitle}>Select a Owner</Text>
              <OwnerPicker
                owners={owners}
                selectedOwner={selectedOwner}
                onSelectOwner={setSelectedOwner}
              />
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Contract Content"
              value={contractContent}
              onChangeText={setContractContent}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleAddSignableField}>
              <Text style={styles.buttonText}>Add Signable Field</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleSubmitContract}>
              <Text style={styles.buttonText}>Submit Contract</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  templateBox: {
    width: 100,
    height: 100,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
  },
  templateTitle: {
    color: theme.colors.background,
    textAlign: 'center',
  },
  noTemplatesText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
  },
  closeButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  textArea: {
    width: '100%',
    height: 100,
    padding: 10,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  ownerPickerContainer: {
    width: '100%', // Ensure the owner picker container takes full width
    marginBottom: 10,
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

export default ContractTemplate;
