// Mobile Message Header - Fixed header with dropdown actions
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import { debugLog } from '../../../context/AuthContext';
import ClientPetsModal from '../../ClientPetsModal';
import BookingStepModal from '../../BookingStepModal';

const MobileMessageHeader = ({
  conversation,
  userRole,
  onBack,
  isConnected,
  navigation
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingMode, setBookingMode] = useState('create'); // 'create' or 'edit'

  const handleDropdownAction = (action) => {
    setShowDropdown(false);
    
    switch (action) {
      case 'view_profile':
        debugLog('MobileMessageHeader: View profile action');
        setShowClientModal(true);
        break;
      case 'create_booking':
        debugLog('MobileMessageHeader: Create booking action');
        setBookingMode('create');
        setShowBookingModal(true);
        break;
      case 'edit_booking':
        debugLog('MobileMessageHeader: Edit booking action');
        setBookingMode('edit');
        setShowBookingModal(true);
        break;
      case 'call':
        debugLog('MobileMessageHeader: Call action (stubbed)');
        Alert.alert('Call Feature', 'Calling functionality will be available soon!');
        break;
      case 'video_call':
        debugLog('MobileMessageHeader: Video call action (stubbed)');
        Alert.alert('Video Call Feature', 'Video calling functionality will be available soon!');
        break;
      default:
        debugLog('MobileMessageHeader: Unknown action:', action);
    }
  };

  const dropdownActions = [
    {
      id: 'view_profile',
      title: 'View Profile & Pets',
      icon: 'account-circle',
      color: theme.colors.primary
    },
    {
      id: 'create_booking',
      title: 'Create Booking',
      icon: 'calendar-plus',
      color: theme.colors.success
    },
    ...(conversation.has_active_booking ? [{
      id: 'edit_booking',
      title: 'Edit Booking',
      icon: 'calendar-edit',
      color: theme.colors.warning
    }] : []),
    {
      id: 'call',
      title: 'Voice Call',
      icon: 'phone',
      color: theme.colors.primary
    },
    {
      id: 'video_call',
      title: 'Video Call',
      icon: 'video',
      color: theme.colors.primary
    }
  ];

  const renderDropdownModal = () => (
    <Modal
      visible={showDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Actions</Text>
            <TouchableOpacity 
              onPress={() => setShowDropdown(false)}
              style={styles.dropdownCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {dropdownActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.dropdownAction}
              onPress={() => handleDropdownAction(action.id)}
            >
              <MaterialCommunityIcons 
                name={action.icon} 
                size={24} 
                color={action.color} 
              />
              <Text style={styles.dropdownActionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <>
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Conversation Info */}
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {conversation.other_user_name}
          </Text>
          <Text style={styles.connectionStatus}>
            {isConnected ? 'Online' : 'Connecting...'}
            {conversation.has_active_booking && ' • Active Booking'}
          </Text>
        </View>

        {/* Actions Dropdown */}
        <TouchableOpacity 
          onPress={() => setShowDropdown(true)}
          style={styles.actionsButton}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      {renderDropdownModal()}

      {/* Client Profile Modal */}
      {showClientModal && (
        <ClientPetsModal
          visible={showClientModal}
          onClose={() => setShowClientModal(false)}
          conversation={{ id: conversation.conversation_id }}
          otherUserName={conversation.other_user_name}
          userRole={userRole}
        />
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingStepModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          conversationId={conversation.conversation_id}
          recipientId={conversation.other_user_id}
          userRole={userRole}
          mode={bookingMode}
          existingBookingId={conversation.active_booking_id}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    // Shadow for iOS
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // Elevation for Android
    elevation: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12,
  },
  conversationName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  connectionStatus: {
    fontSize: 12,
    color: theme.colors.placeHolderText,
    marginTop: 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  actionsButton: {
    padding: 8,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  dropdownCloseButton: {
    padding: 4,
  },
  dropdownAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  dropdownActionText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flex: 1,
  },
});

export default MobileMessageHeader;