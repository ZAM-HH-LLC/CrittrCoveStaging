import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import { theme } from '../../theme';
import { AuthContext } from '../../context/AuthContext';

const DefaultSettingsModal = ({ visible, onClose, onSave, defaultSettings }) => {
  const { screenWidth, isCollapsed, is_DEBUG } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);

  const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      padding: screenWidth <= 600 ? 15 : 20,
      width: screenWidth <= 600 ? '90%' : '50%',
      maxWidth: 500,
      maxHeight: screenWidth <= 600 ? '80%' : '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: screenWidth <= 600 ? 15 : 20,
    },
    modalTitle: {
      fontSize: screenWidth <= 600 ? theme.fontSizes.medium : theme.fontSizes.large,
      fontWeight: 'bold',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
    },
    modalScrollContent: {
      flex: 1,
    },
    // ... rest of the styles
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={createStyles(screenWidth, isCollapsed).modalOverlay}>
        <View style={createStyles(screenWidth, isCollapsed).modalContent}>
          <View style={createStyles(screenWidth, isCollapsed).modalHeader}>
            <Text style={createStyles(screenWidth, isCollapsed).modalTitle}>Default Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={createStyles(screenWidth, isCollapsed).modalScrollContent}>
            {/* Modal content */}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default DefaultSettingsModal; 