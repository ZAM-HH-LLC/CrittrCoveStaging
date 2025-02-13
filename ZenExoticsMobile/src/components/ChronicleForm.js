import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Platform, Dimensions, Image, ActivityIndicator, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import QuestionInput from './QuestionInput';
import ClientPicker from './ClientPicker';

const { width: screenWidth } = Dimensions.get('window');

const ChronicleForm = ({ onCreateChronicle }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPets, setSelectedPets] = useState([]);
  const [questions, setQuestions] = useState([{ question: '', answer: '', isPreset: true }]);
  const [summary, setSummary] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const mockClients = [
    { id: '1', name: 'John Doe', pets: [{ id: '1', name: 'Max' }, { id: '2', name: 'Bella' }] },
    { id: '2', name: 'Jane Smith', pets: [{ id: '3', name: 'Luna' }, { id: '4', name: 'Charlie' }] }
  ];

  const pickImages = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        setPhotos([...photos, ...result.assets]);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleCreateChronicle = () => {
    setIsCreating(true);
    const newChronicle = {
      id: Date.now(),
      client: selectedClient,
      pets: selectedPets,
      summary,
      questions,
      photos,
      title: `Chronicle for ${selectedClient}`,
    };

    setTimeout(() => {
      console.log('Sending data to backend:', newChronicle);
      onCreateChronicle(newChronicle);
      setIsCreating(false);
      setModalVisible(false);
      resetForm();
    }, 2000);
  };

  const resetForm = () => {
    setSelectedClient('');
    setSelectedPets([]);
    setSummary('');
    setQuestions([{ question: '', answer: '' }]);
    setPhotos([]);
  };

  const addNewQuestion = () => {
    setQuestions([...questions, { question: '', answer: '', isPreset: false }]);
  };

  const renderClientSelection = () => {
    if (Platform.OS === 'web') {
      return (
        <Picker
          selectedValue={selectedClient}
          onValueChange={(itemValue) => setSelectedClient(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select a client..." value="" />
          {mockClients.map(client => (
            <Picker.Item key={client.id} label={client.name} value={client.name} />
          ))}
        </Picker>
      );
    } else {
      return (
        <View>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowClientPicker(true)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedClient || "Select a client..."}
            </Text>
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
          <Modal
            visible={showClientPicker}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedClient}
                  onValueChange={(itemValue) => {
                    setSelectedClient(itemValue);
                    setShowClientPicker(false);
                  }}
                >
                  <Picker.Item label="Select a client..." value="" />
                  {mockClients.map(client => (
                    <Picker.Item key={client.id} label={client.name} value={client.name} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowClientPicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      );
    }
  };

  const PhotoPreview = ({ photo }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: photo.uri }} style={styles.photo} />
    </View>
  );

  return (
    <View>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.createButtonText}>Create New Chronicle</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, Platform.OS === 'web' && styles.webModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Chronicle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Select Client</Text>
              <ClientPicker
                clients={mockClients}
                selectedClient={selectedClient}
                onSelectClient={setSelectedClient}
              />

              <Text style={styles.label}>Select Pets</Text>
              {selectedClient && mockClients.find(c => c.name === selectedClient)?.pets.map(pet => (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.petOption,
                    selectedPets.includes(pet.name) && styles.selectedPet
                  ]}
                  onPress={() => {
                    if (selectedPets.includes(pet.name)) {
                      setSelectedPets(selectedPets.filter(p => p !== pet.name));
                    } else {
                      setSelectedPets([...selectedPets, pet.name]);
                    }
                  }}
                >
                  <Text style={styles.petOptionText}>{pet.name}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Summary</Text>
              <TextInput
                style={styles.summaryInput}
                multiline
                value={summary}
                onChangeText={setSummary}
                placeholder="Write a summary of the chronicle"
                textAlignVertical="top"
              />

              {questions.map((item, index) => (
                <View key={index} style={styles.questionContainer}>
                  <Text style={styles.label}>Question {index + 1}</Text>
                  <QuestionInput
                    value={item.question}
                    onChange={(text) => updateQuestion(index, 'question', text)}
                  />
                  <View style={styles.answerInputContainer}>
                    <TextInput
                      style={[styles.input, styles.answerInput]}
                      value={item.answer}
                      onChangeText={(text) => updateQuestion(index, 'answer', text)}
                      placeholder="Enter answer"
                      multiline
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addQuestionButton} onPress={addNewQuestion}>
                <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                <Text style={styles.addQuestionButtonText}>Add Another Question</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={pickImages}
                disabled={isUploading}
              >
                <MaterialCommunityIcons 
                  name="camera" 
                  size={24} 
                  color={isUploading ? theme.colors.disabled : theme.colors.primary} 
                />
                <Text style={[
                  styles.uploadButtonText,
                  isUploading && styles.uploadingText
                ]}>
                  {isUploading ? 'Uploading...' : 'Upload Photos'}
                </Text>
                {isUploading && (
                  <ActivityIndicator 
                    size="small" 
                    color={theme.colors.primary} 
                    style={styles.uploadingSpinner} 
                  />
                )}
              </TouchableOpacity>

              <ScrollView horizontal style={styles.photoPreview}>
                {photos.map((photo, index) => (
                  <PhotoPreview key={index} photo={photo} />
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleCreateChronicle}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Creating Chronicle...' : 'Create Chronicle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
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
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  webModalContent: {
    width: screenWidth > 600 ? '40%' : '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginBottom: 8,
    minHeight: 20,
  },
  picker: {
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderRadius: 4,
    padding: Platform.OS === 'ios' ? 12 : 0,
  },
  petOption: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderRadius: 4,
  },
  selectedPet: {
    backgroundColor: theme.colors.primary,
  },
  petOptionText: {
    color: theme.colors.text,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginTop: 16,
  },
  uploadButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  photoPreview: {
    flexDirection: 'row',
    marginTop: 16,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 4,
  },
  questionContainer: {
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 16,
    zIndex: 1, // Lower than dropdown
  },
  addQuestionButtonText: {
    marginLeft: 8,
    zIndex: 1, // Lower than dropdown
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  answerInputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  answerInput: {
    width: screenWidth - 80,
    maxWidth: 600,
    minHeight: 60,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
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
  summaryInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginBottom: 8,
    padding: 8,
    height: 100, // Set a fixed height
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        minHeight: 100,
      },
      ios: {
        paddingTop: 8, // Add some padding to the top for iOS
      },
      android: {
        paddingTop: 8, // Add some padding to the top for Android
      },
    }),
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
  photoContainer: {
    marginRight: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});

export default ChronicleForm;
