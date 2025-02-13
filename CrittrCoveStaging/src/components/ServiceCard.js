import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { CostCalculationModal } from './CostCalculationModal';
import { mockConversations, mockMessages, createNewConversation } from '../data/mockData';

export const ServiceCard = ({ 
  service, 
  onHeartPress, 
  isFavorite, 
  professionalName,
  professionalId,
  navigation
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleContactPress = () => {
    // Check if conversation already exists
    const existingConversation = mockConversations.find(
      conv => conv.professionalId === professionalId
    );

    if (existingConversation) {
      navigation.replace('MessageHistory', {
        selectedConversation: existingConversation.id,
        professionalName: professionalName,
        professionalId: professionalId
      });
    } else {
      // Create new conversation using the helper function
      const newConversation = createNewConversation(
        professionalId,
        professionalName,
        'current_user_id', // Replace with actual current user ID
        'Me' // Current user name
      );

      // Add new conversation to mockConversations
      mockConversations.unshift(newConversation);

      // Initialize empty messages array for this conversation
      mockMessages[newConversation.id] = [];

      // Navigate directly to MessageHistory
      navigation.replace('MessageHistory', {
        selectedConversation: newConversation.id,
        professionalName: professionalName,
        professionalId: professionalId
      });
    }
    setIsModalVisible(false);
  };

  return (
    <View style={styles.serviceCard}>
      {/* <TouchableOpacity 
        style={styles.heartButton}
        onPress={() => onHeartPress(service.id)}
      >
        <MaterialIcons 
          name={isFavorite ? "favorite" : "favorite-border"} 
          size={24} 
          color={theme.colors.primary} 
        />
      </TouchableOpacity> */}
      
      <View style={styles.contentContainer}>
        <MaterialCommunityIcons name={service.icon} size={30} color={theme.colors.primary} />
        <Text numberOfLines={2} style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.startingPrice}>Starting at ${service.startingPrice}</Text>
        <View style={styles.animalTypeContainer}>
          {service.animalTypes.map((type, index) => (
            <Text key={index} style={styles.animalType}>{type}</Text>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.calculateButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.calculateButtonText}>Calculate Cost</Text>
      </TouchableOpacity>

      <CostCalculationModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        serviceName={service.name}
        additionalRates={service.additionalRates || []}
        professionalName={professionalName}
        professionalId={professionalId}
        onContactPress={handleContactPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 280,
    height: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    justifyContent: 'space-between',
  },
  heartButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 1,
  },
  serviceName: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
    fontFamily: theme.fonts.header.fontFamily,
    flexShrink: 1,
  },
  startingPrice: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.secondary,
    marginBottom: 6,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  animalTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  animalType: {
    fontSize: theme.fontSizes.small + 2,
    color: theme.colors.secondary,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  calculateButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  calculateButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  contentContainer: {
    flex: 1,
  },
});

export default ServiceCard;