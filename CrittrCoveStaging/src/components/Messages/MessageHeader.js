import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const MessageHeader = ({
  selectedConversationData,
  hasDraft,
  draftData,
  onEditDraft,
  onBackPress,
  styles,
  isMobile = false
}) => {
  if (isMobile) {
    return (
      <View style={[
        styles.mobileHeader,
        { backgroundColor: theme.colors.surfaceContrast }
      ]}>
        <View style={styles.mobileHeaderContent}>
          <TouchableOpacity 
            style={styles.backArrow}
            onPress={onBackPress}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
          
          <View style={styles.mobileHeaderNameContainer}>
            <Text style={styles.mobileHeaderName}>
              {selectedConversationData?.name || selectedConversationData?.other_user_name}
            </Text>
          </View>
          
          {hasDraft && draftData?.draft_id && selectedConversationData?.is_professional && (
            <TouchableOpacity 
              style={[styles.editDraftButton, styles.mobileEditDraftButton, { 
                position: 'absolute', 
                right: 10,
                top: '50%',
                transform: [{ translateY: -20 }]
              }]}
              onPress={() => onEditDraft(draftData.draft_id)}
            >
              <MaterialCommunityIcons 
                name="pencil" 
                size={16} 
                color={theme.colors.primary} 
              />
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.editDraftText, { fontSize: 12, lineHeight: 14 }]}>Edit</Text>
                <Text style={[styles.editDraftText, { fontSize: 12, lineHeight: 14 }]}>Draft</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.messageHeader}>
      <View style={styles.messageHeaderContent}>
        <Image
          source={selectedConversationData?.profile_photo || require('../../assets/default-profile.png')}
          style={styles.profilePhoto}
        />
        <Text style={styles.messageHeaderName}>
          {selectedConversationData?.other_user_name}
        </Text>
        
        {hasDraft && draftData?.draft_id && selectedConversationData?.is_professional && (
          <TouchableOpacity 
            style={styles.editDraftButton}
            onPress={() => onEditDraft(draftData.draft_id)}
          >
            <MaterialCommunityIcons 
              name="pencil" 
              size={20} 
              color={theme.colors.primary} 
            />
            <Text style={styles.editDraftText}>Edit Draft</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default MessageHeader; 