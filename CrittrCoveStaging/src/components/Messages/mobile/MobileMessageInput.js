// Mobile Message Input - Fixed input at bottom with image support
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../../styles/theme';
import { debugLog } from '../../../context/AuthContext';
import { useToast } from '../../ToastProvider';

const MobileMessageInput = ({
  onSendMessage,
  conversation,
  userRole
}) => {
  const [messageText, setMessageText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [sending, setSending] = useState(false);
  
  const textInputRef = useRef(null);
  const showToast = useToast();

  const handleSend = async () => {
    if ((!messageText.trim() && selectedImages.length === 0) || sending) {
      return;
    }

    try {
      setSending(true);
      debugLog('MobileMessageInput: Sending message', {
        text: messageText,
        images: selectedImages.length,
        conversationId: conversation.conversation_id
      });

      await onSendMessage(messageText.trim(), selectedImages);
      
      // Clear input after successful send
      setMessageText('');
      setSelectedImages([]);
      textInputRef.current?.blur();
    } catch (error) {
      debugLog('MobileMessageInput: Error sending message:', error);
      
      // Handle specific error cases with toast messages
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        
        // Check for deleted user error
        if (errorData.error === 'Cannot send messages to a deleted user account.') {
          showToast({
            message: errorData.detail || 'This user has deleted their account and is no longer receiving messages.',
            type: 'error',
            duration: 4000
          });
        } else if (errorData.error) {
          // Show other API errors
          showToast({
            message: errorData.error,
            type: 'error',
            duration: 3000
          });
        } else if (errorData.detail) {
          // Show error details
          showToast({
            message: errorData.detail,
            type: 'error',
            duration: 3000
          });
        }
      } else {
        // Show generic error
        showToast({
          message: 'Failed to send message. Please check your connection and try again.',
          type: 'error',
          duration: 3000
        });
      }
    } finally {
      setSending(false);
    }
  };

  const handleImagePicker = () => {
    if (Platform.OS === 'ios' && Platform.OS !== 'web') {
      // Use ActionSheetIOS only on native iOS
      const { ActionSheetIOS } = require('react-native');
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          }
        }
      );
    } else {
      // Android and Web - show alert
      Alert.alert(
        'Select Image',
        'Choose how you want to add an image',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: openCamera },
          { text: 'Choose from Library', onPress: openImageLibrary }
        ]
      );
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        addImage(result.assets[0].uri);
      }
    } catch (error) {
      debugLog('MobileMessageInput: Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false, // For simplicity, one image at a time
      });

      if (!result.canceled && result.assets?.[0]) {
        addImage(result.assets[0].uri);
      }
    } catch (error) {
      debugLog('MobileMessageInput: Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const addImage = (imageUri) => {
    if (selectedImages.length >= 3) {
      Alert.alert('Limit reached', 'You can only send up to 3 images at once');
      return;
    }
    setSelectedImages(prev => [...prev, imageUri]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (messageText.trim().length > 0 || selectedImages.length > 0) && !sending;

  return (
    <View style={styles.container}>
      {/* Image Preview */}
      {selectedImages.length > 0 && (
        <View style={styles.imagePreviewContainer}>
          {selectedImages.map((imageUri, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removeImage(index)}
                style={styles.removeImageButton}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.whiteText} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Image Button */}
        <TouchableOpacity
          onPress={handleImagePicker}
          style={styles.imageButton}
          disabled={sending}
        >
          <MaterialCommunityIcons 
            name="camera" 
            size={24} 
            color={sending ? theme.colors.placeHolderText : theme.colors.primary} 
          />
        </TouchableOpacity>

        {/* Text Input */}
        <View style={styles.textInputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.placeHolderText}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={2000}
            editable={!sending}
            blurOnSubmit={false}
            returnKeyType="default"
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          disabled={!canSend}
        >
          <MaterialCommunityIcons 
            name={sending ? "loading" : "send"} 
            size={20} 
            color={canSend ? theme.colors.whiteText : theme.colors.placeHolderText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceContrast,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 8,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  imagePreview: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  imageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundContrast,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundContrast,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlignVertical: 'top',
    minHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: theme.colors.backgroundContrast,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

export default MobileMessageInput;