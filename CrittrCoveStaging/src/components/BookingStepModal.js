import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import ServiceAndPetsCard from './bookingComponents/ServiceAndPetsCard';
import StepProgressIndicator from './common/StepProgressIndicator';

const STEPS = {
  SERVICES_AND_PETS: {
    id: 0,
    name: 'Services & Pets'
  },
  DATE_SELECTION: {
    id: 1,
    name: 'Date Selection'
  },
  TIME_SELECTION: {
    id: 2,
    name: 'Time Selection'
  },
  REVIEW_AND_RATES: {
    id: 3,
    name: 'Review & Rates'
  }
};

const BookingStepModal = ({ 
  visible, 
  onClose,
  bookingId,
  onComplete,
  initialData = {}
}) => {
  const { is_DEBUG, screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;
  const [currentStep, setCurrentStep] = useState(STEPS.SERVICES_AND_PETS.id);
  const [bookingData, setBookingData] = useState({
    service: initialData.service || null,
    pets: initialData.pets || [],
    dates: initialData.dates || [],
    times: initialData.times || {},
    rates: initialData.rates || {},
  });
  const [error, setError] = useState(null);

  const handleServiceSelect = (service) => {
    if (is_DEBUG) {
      console.log('MBA12345 Selected service:', service);
    }
    setBookingData(prev => ({
      ...prev,
      service
    }));
  };

  const handlePetSelect = (pet) => {
    if (is_DEBUG) {
      console.log('MBA12345 Selected/deselected pet:', pet);
    }
    setBookingData(prev => {
      const existingPetIndex = prev.pets.findIndex(p => p.pet_id === pet.pet_id);
      let updatedPets;

      if (existingPetIndex >= 0) {
        // Remove pet if already selected
        updatedPets = prev.pets.filter(p => p.pet_id !== pet.pet_id);
      } else {
        // Add pet if not selected
        updatedPets = [...prev.pets, pet];
      }

      return {
        ...prev,
        pets: updatedPets
      };
    });
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case STEPS.SERVICES_AND_PETS.id:
        return bookingData.service && bookingData.pets.length > 0;
      // Add validation for other steps as they are implemented
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      setError('Please complete all required fields before proceeding');
      return;
    }

    setError(null);
    if (currentStep < STEPS.REVIEW_AND_RATES.id) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(bookingData);
    }
  };

  const handleBack = () => {
    if (currentStep > STEPS.SERVICES_AND_PETS.id) {
      setCurrentStep(prev => prev - 1);
    } else {
      onClose();
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.SERVICES_AND_PETS.id:
        return (
          <ServiceAndPetsCard
            bookingId={bookingId}
            onServiceSelect={handleServiceSelect}
            onPetSelect={handlePetSelect}
            selectedService={bookingData.service}
            selectedPets={bookingData.pets}
          />
        );
      // Add other step components as they are implemented
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleBack}
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent}>
          <StepProgressIndicator
            steps={Object.values(STEPS).map(step => step.name)}
            currentStep={currentStep}
          />
          <View style={styles.content}>
            {renderCurrentStep()}
          </View>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBack}
            >
              <Text style={styles.cancelButtonText}>
                {currentStep > STEPS.SERVICES_AND_PETS.id ? 'Back' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceedToNextStep() && styles.disabledButton
              ]}
              onPress={handleNext}
              disabled={!canProceedToNextStep()}
            >
              <Text style={[
                styles.nextButtonText,
                !canProceedToNextStep() && styles.disabledButtonText
              ]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    width: '100%',
  },
  modalContent: {
    width: '95%',
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    maxHeight: '90%',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  nextButton: {
    flex: 1,
    backgroundColor: theme.colors.mainColors.main,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.placeHolderText,
  },
  nextButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: theme.colors.surface,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BookingStepModal; 