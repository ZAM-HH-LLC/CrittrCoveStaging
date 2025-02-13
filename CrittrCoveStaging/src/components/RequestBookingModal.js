import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { theme } from '../styles/theme';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import AddOccurrenceModal from './AddOccurrenceModal';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SERVICE_TYPE_SUGGESTIONS, mockPets } from '../data/mockData';
import ConfirmationModal from './ConfirmationModal';
import { validateDateTimeRange } from '../utils/dateTimeValidation';

const RequestBookingModal = ({ visible, onClose, onSubmit, services = SERVICE_TYPE_SUGGESTIONS, pets = mockPets }) => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedPets, setSelectedPets] = useState([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [showAddOccurrenceModal, setShowAddOccurrenceModal] = useState(false);
  const [occurrences, setOccurrences] = useState([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({
    visible: false,
    actionText: '',
    onConfirm: null,
    isLoading: false
  });
  const [occurrenceErrors, setOccurrenceErrors] = useState({});

  const resetForm = () => {
    setSelectedService('');
    setSelectedPets([]);
    setOccurrences([]);
    setSelectedOccurrence(null);
  };

  const validateOccurrences = (occs) => {
    const errors = {};
    let isValid = true;

    occs.forEach((occ, index) => {
      const validation = validateDateTimeRange(
        occ.startDate,
        occ.endDate,
        occ.startTime,
        occ.endTime
      );

      if (!validation.isValid) {
        errors[index] = validation.error;
        isValid = false;
      }
    });

    setOccurrenceErrors(errors);
    return isValid;
  };

  const handleSubmit = () => {
    if (occurrences.length === 0) return;

    // Validate all occurrences before submitting
    if (!validateOccurrences(occurrences)) {
      return;
    }

    const bookingData = {
      serviceType: selectedService,
      pets: selectedPets.map(petId => pets.find(p => p.id === petId)),
      occurrences: occurrences
    };

    // Create a booking request message
    const bookingRequestMessage = {
      type: 'booking_request',
      data: bookingData,
      timestamp: new Date().toISOString()
    };

    onSubmit(bookingRequestMessage);
    resetForm();
    onClose();
  };

  const handleDeleteOccurrence = async (occurrenceToDelete) => {
    setConfirmationModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      setOccurrences(prev => prev.filter(occ => 
        occ.startDate !== occurrenceToDelete.startDate || 
        occ.startTime !== occurrenceToDelete.startTime
      ));
    } finally {
      setConfirmationModal({ 
        visible: false, 
        actionText: '', 
        onConfirm: null, 
        isLoading: false 
      });
    }
  };

  const confirmDeleteOccurrence = (occurrence) => {
    setConfirmationModal({
      visible: true,
      actionText: 'delete this occurrence',
      onConfirm: () => handleDeleteOccurrence(occurrence),
      isLoading: false
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenOccurrenceModal = () => {
    setShowServiceDropdown(false);
    setShowPetDropdown(false);
    setShowAddOccurrenceModal(true);
  };

  const handleOccurrenceUpdate = (newOccurrence) => {
    const { startDate, endDate, startTime, endTime } = newOccurrence;
    
    // Validate the new occurrence
    const validation = validateDateTimeRange(startDate, endDate, startTime, endTime);
    
    if (!validation.isValid) {
      // Show error in the AddOccurrenceModal
      // You'll need to add error handling in the AddOccurrenceModal component
      return false;
    }

    if (selectedOccurrence) {
      setOccurrences(prev => prev.map(occ => 
        occ === selectedOccurrence ? 
        { startDate, endDate, startTime, endTime } : 
        occ
      ));
    } else {
      setOccurrences(prev => [...prev, { startDate, endDate, startTime, endTime }]);
    }
    setSelectedOccurrence(null);
    setShowAddOccurrenceModal(false);
    return true;
  };

  const renderServiceDropdown = () => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownInput}
        onPress={() => setShowServiceDropdown(!showServiceDropdown)}
      >
        <Text>{selectedService || 'Select Service Type'}</Text>
        <MaterialCommunityIcons 
          name={showServiceDropdown ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={theme.colors.text} 
        />
      </TouchableOpacity>

      {showServiceDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView nestedScrollEnabled={true}>
            {services.map((service) => (
              <TouchableOpacity
                key={service}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedService(service);
                  setShowServiceDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownText,
                  selectedService === service && styles.selectedOption
                ]}>
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderPetSelector = () => (
    <View style={{ zIndex: 2 }}>
      {selectedPets.map((petId) => {
        const pet = pets.find(p => p.id === petId);
        return (
          <View key={petId} style={styles.petItem}>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petDetails}>{pet.type} • {pet.breed}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedPets(prev => prev.filter(id => id !== petId))}
            >
              <MaterialCommunityIcons 
                name="close" 
                size={24} 
                color={theme.colors.error} 
              />
            </TouchableOpacity>
          </View>
        );
      })}
      
      <TouchableOpacity
        style={styles.addPetButton}
        onPress={() => setShowPetDropdown(!showPetDropdown)}
      >
        <MaterialCommunityIcons 
          name={showPetDropdown ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.colors.primary} 
        />
        <Text style={styles.addPetText}>
          {selectedPets.length === 0 ? 'Select Pets' : 'Add Pet'}
        </Text>
      </TouchableOpacity>
      
      {showPetDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView nestedScrollEnabled={true} style={styles.petDropdown}>
            {pets
              .filter(pet => !selectedPets.includes(pet.id))
              .map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedPets(prev => [...prev, pet.id]);
                    setShowPetDropdown(false);
                  }}
                >
                  <View>
                    <Text style={styles.dropdownPetName}>{pet.name}</Text>
                    <Text style={styles.dropdownPetDetails}>
                      {pet.type} • {pet.breed}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderOccurrenceCard = (occ, index) => (
    <View key={index}>
      <TouchableOpacity 
        style={[
          styles.occurrenceCard,
          occurrenceErrors[index] && styles.occurrenceCardError
        ]}
      >
        <View style={styles.occurrenceDetails}>
          <Text style={styles.dateText}>
            {occ.endDate && occ.startDate !== occ.endDate ? 
              `${format(new Date(occ.startDate), 'MMM d, yyyy')} - ${format(new Date(occ.endDate), 'MMM d, yyyy')}` :
              format(new Date(occ.startDate), 'MMM d, yyyy')
            }
          </Text>
          <Text style={styles.timeText}>
            {`${occ.startTime} - ${occ.endTime}`}
          </Text>
          {occurrenceErrors[index] && (
            <Text style={styles.errorText}>{occurrenceErrors[index]}</Text>
          )}
        </View>
        <View style={styles.occurrenceActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => confirmDeleteOccurrence(occ)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setSelectedOccurrence(occ);
              handleOpenOccurrenceModal();
            }}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Request Booking</Text>
          
          <ScrollView style={styles.scrollView}>
            {/* Service Selection */}
            <Text style={styles.label}>Select Service</Text>
            {renderServiceDropdown()}

            {/* Pet Selection */}
            <Text style={styles.label}>Select Pets</Text>
            {renderPetSelector()}

            {/* Date & Time Selection */}
            <Text style={styles.label}>Select Date & Time</Text>
            {occurrences.map((occ, index) => renderOccurrenceCard(occ, index))}

            <TouchableOpacity
              style={styles.addOccurrenceButton}
              onPress={() => {
                setSelectedOccurrence(null);
                handleOpenOccurrenceModal();
              }}
            >
              <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
              <Text style={styles.addOccurrenceText}>Add Date & Time</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={handleClose} style={styles.button}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSubmit}
              style={styles.button}
              disabled={!selectedService || selectedPets.length === 0 || occurrences.length === 0}
            >
              Submit
            </Button>
          </View>
        </View>
      </View>

      <AddOccurrenceModal
        visible={showAddOccurrenceModal}
        onClose={() => setShowAddOccurrenceModal(false)}
        onAdd={handleOccurrenceUpdate}
        hideRates={true}
        initialOccurrence={selectedOccurrence}
        modalTitle={selectedOccurrence ? 'Edit Occurrence' : 'Add New Occurrence'}
      />

      <ConfirmationModal
        visible={confirmationModal.visible}
        actionText={confirmationModal.actionText}
        onClose={() => {
          if (!confirmationModal.isLoading) {
            setConfirmationModal({ 
              visible: false, 
              actionText: '', 
              onConfirm: null, 
              isLoading: false 
            });
          }
        }}
        onConfirm={confirmationModal.onConfirm}
        isLoading={confirmationModal.isLoading}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSizes.largeLarge,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: '70%',
  },
  label: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 10,
  },
  serviceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceButton: {
    marginBottom: 10,
  },
  petOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  petButton: {
    marginBottom: 10,
  },
  dateContainer: {
    gap: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
  },
  timePickerWrapper: {
    flex: 1,
  },
  dropdownContainer: {
    position: 'relative',
    marginBottom: 20,
    zIndex: 3,
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownText: {
    color: theme.colors.text,
  },
  selectedOption: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  petItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.placeholder,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addPetText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
  occurrenceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  occurrenceDetails: {
    flex: 1,
  },
  dateText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    marginBottom: 4,
  },
  timeText: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.placeholder,
  },
  addOccurrenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 12,
  },
  addOccurrenceText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
  },
  occurrenceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 4,
  },
  bookingRequestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  bookingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bookingRequestTitle: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  bookingRequestDetails: {
    gap: 8,
  },
  detailLabel: {
    fontSize: theme.fontSizes.smallMedium,
    fontWeight: '500',
    color: theme.colors.placeholder,
  },
  detailText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  acceptButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
  },
  occurrenceCardError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSizes.small,
    marginTop: 4,
  },
});

export default RequestBookingModal; 