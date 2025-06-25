import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const TosRequiredModal = ({ visible, onClose, actionType = 'booking' }) => {
  const getModalContent = () => {
    switch (actionType) {
      case 'booking':
        return {
          title: 'Terms of Service Required',
          message: 'You must agree to the terms of service before requesting a booking. Please scroll down and check the agreement box to continue.'
        };
      case 'approval':
        return {
          title: 'Terms of Service Required',
          message: 'You must agree to the terms of service before approving this booking. Please scroll down and check the agreement box to continue.'
        };
      default:
        return {
          title: 'Terms of Service Required',
          message: 'You must agree to the terms of service before continuing. Please scroll down and check the agreement box to continue.'
        };
    }
  };

  const content = getModalContent();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.termsModalOverlay}>
        <View style={styles.termsModalContent}>
          <View style={styles.termsModalHeader}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={theme.colors.error} />
            <Text style={styles.termsModalTitle}>{content.title}</Text>
          </View>
          <Text style={styles.termsModalText}>
            {content.message}
          </Text>
          <TouchableOpacity
            style={styles.termsModalButton}
            onPress={onClose}
          >
            <Text style={styles.termsModalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  termsModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  termsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  termsModalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
    marginLeft: 8,
    flex: 1,
  },
  termsModalText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 24,
  },
  termsModalButton: {
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  termsModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
});

export default TosRequiredModal; 