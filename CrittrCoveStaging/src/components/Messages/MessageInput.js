import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { uploadAndSendImageMessage } from '../../api/API';
import { debugLog } from '../../context/AuthContext';

const MessageInput = ({ 
  onSendMessage, 
  onShowDropdown,
  showDropdown,
  styles,
  screenWidth,
  selectedConversation
}) => {
  const [messageContent, setMessageContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const textInputRef = useRef(null);
  const defaultHeight = 40; // Define constant for default height

  const resetInputHeight = useCallback(() => {
    if (Platform.OS === 'web' && textInputRef.current) {
      textInputRef.current.style.height = 'auto';
      textInputRef.current.style.height = `${defaultHeight}px`; // Reset to default height
    }
  }, []);

  // Set initial height when component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && textInputRef.current) {
      textInputRef.current.style.height = `${defaultHeight}px`;
    }
  }, []);

  // Function to handle image selection
  const pickImage = useCallback(async () => {
    try {
      // Close the dropdown
      onShowDropdown(false);
      
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          debugLog('MBA5678: Permission to access media library was denied');
          return;
        }
      }
      
      // Launch image picker with allowsMultipleSelection enabled
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing to support multiple selection
        aspect: [4, 3],
        quality: 0.8,
        base64: Platform.OS === 'web',
        allowsMultipleSelection: true, // Enable multiple image selection
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        debugLog('MBA5678: Images selected:', {
          count: result.assets.length,
          details: result.assets.map(asset => ({
            uri: asset.uri,
            type: asset.type,
            fileName: asset.fileName,
            fileSize: asset.fileSize
          }))
        });
        
        // Add the selected images to our existing array
        setSelectedImages(prevImages => [...prevImages, ...result.assets]);
      }
    } catch (error) {
      debugLog('MBA5678: Error picking images:', error);
    }
  }, [onShowDropdown]);
  
  // This function is no longer needed as we're using the direct uploadAndSendImageMessage
  // Keeping as a reference
  /*
  const uploadImages = useCallback(async (images, conversationId) => {
    if (!images || !images.length || !conversationId) return [];
    
    try {
      setIsUploading(true);
      
      const uploadPromises = images.map(async (image) => {
        let imageData;
        if (Platform.OS === 'web') {
          // For web, use the base64 data directly
          imageData = image.base64 ? `data:image/jpeg;base64,${image.base64}` : image.uri;
        } else {
          // For native, use the file URI
          imageData = {
            uri: image.uri,
            type: 'image/jpeg',
            name: image.fileName || 'photo.jpg'
          };
        }
        
        // Upload the image to the server
        const response = await uploadMessageImage(conversationId, imageData);
        
        debugLog('MBA5678: Image uploaded successfully:', response);
        
        return response.message_id;
      });
      
      // Wait for all uploads to complete
      const messageIds = await Promise.all(uploadPromises);
      
      debugLog('MBA5678: All images uploaded successfully:', messageIds);
      
      setIsUploading(false);
      return messageIds;
    } catch (error) {
      setIsUploading(false);
      debugLog('MBA5678: Error uploading images:', error);
      return [];
    }
  }, []);
  */
  
  // Function to clear all selected images
  const clearAllImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  // Function to remove a single image
  const removeImage = useCallback((index) => {
    setSelectedImages(prevImages => prevImages.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(async () => {
    try {
      // Only continue if we have images or text to send
      if (selectedImages.length === 0 && !messageContent.trim()) {
        return;
      }
      
      setIsUploading(true);
      debugLog('MBA5511: Message sending started - showing loading indicator');
      
      // Send normal text message if there are no images
      if (selectedImages.length === 0 && messageContent.trim()) {
        await onSendMessage(messageContent.trim(), []);
      } 
      // Send image message with or without caption
      else if (selectedImages.length > 0 && selectedConversation) {
        try {
          // Use the direct uploadAndSend function that handles everything in one call
          // and returns a ready-to-display message object
          const messageObject = await uploadAndSendImageMessage(
            selectedConversation, 
            selectedImages, 
            messageContent.trim()
          );
          
          // Add the message to the message list immediately
          // Pass true as the fourth parameter to indicate this message is already sent
          // and doesn't need another API call
          onSendMessage(messageObject.content, [], messageObject, true);
          
          debugLog('MBA5511: Image message sent and added to UI:', {
            messageId: messageObject.message_id,
            imageCount: selectedImages.length,
            hasCaption: !!messageContent.trim(),
            captionText: messageContent.trim(),
            messageObjectContent: messageObject.content
          });
        } catch (error) {
          debugLog('MBA5511: Failed to send image message', error);
          Alert.alert('Error', 'Failed to upload images. Please try again.');
          setIsUploading(false);
          return;
        }
      }
      
      // Reset all states
      setMessageContent('');
      setSelectedImages([]);
      setIsUploading(false);
      debugLog('MBA5511: Message sending complete - hiding loading indicator');
      
      if (textInputRef.current) {
        textInputRef.current.clear();
        resetInputHeight(); // Reset height after sending
        
        // Keep focus on the input after sending
        setTimeout(() => {
          if (textInputRef.current) {
            debugLog('MBA9876: Refocusing input after send');
            textInputRef.current.focus();
          }
        }, 0);
      }
    } catch (error) {
      setIsUploading(false);
      debugLog('MBA5511: Error in handleSend, loading indicator stopped:', error);
    }
  }, [messageContent, onSendMessage, resetInputHeight, selectedImages, selectedConversation]);

  const adjustHeight = useCallback(() => {
    if (Platform.OS === 'web' && textInputRef.current) {
      // Only adjust height if content requires more space than default
      // Add a 10px buffer to prevent premature expansion
      const scrollHeight = textInputRef.current.scrollHeight;      
      if (scrollHeight > defaultHeight + 10) {
        const newHeight = Math.min(scrollHeight, 120);
        textInputRef.current.style.height = `${newHeight}px`;
      } else {
        textInputRef.current.style.height = `${defaultHeight}px`;
      }
    }
  }, []);

  const handleChange = useCallback((text) => {
    setMessageContent(text);
    if (Platform.OS === 'web') {
      adjustHeight();
    }
  }, [adjustHeight]);

  const handleKeyPress = useCallback((e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <View style={styles.inputSection} className="message-input-container">
      <View style={styles.inputContainerOuter}>
        {/* Selected images preview - ABOVE the input and buttons */}
        {selectedImages.length > 0 && (
          <View style={styles.selectedImagesWrapper}>
            <ScrollView 
              horizontal={true} 
              style={styles.selectedImagesScrollView}
              contentContainerStyle={styles.selectedImagesContainer}
            >
              {selectedImages.map((image, index) => (
                <View key={`${image.uri}-${index}`} style={styles.selectedImageContainer}>
                  <Image 
                    source={{ uri: image.uri }} 
                    style={styles.selectedImagePreview} 
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons 
                      name="close-circle" 
                      size={20} 
                      color={theme.colors.error} 
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <View style={styles.attachButtonContainer}>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={() => onShowDropdown(!showDropdown)}
            >
              <MaterialCommunityIcons 
                name={showDropdown ? "close" : "plus"} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
            {showDropdown && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={pickImage}
                >
                  <MaterialCommunityIcons 
                    name="image" 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
                    Add Images
                  </Text>
                </TouchableOpacity>
              </View>
            )}
                    </View>
          
          <View style={styles.inputInnerContainer}>
            <TextInput
              ref={textInputRef}
              style={[
                styles.textInput,
                Platform.OS === 'web' && { 
                  maxHeight: 120,
                  minHeight: defaultHeight,
                  fontSize: 22 // Increased font size
                }
              ]}
              placeholder={selectedImages.length > 0 ? "Add a caption..." : "Type a Message..."}
              placeholderTextColor={theme.colors.placeholder}
              value={messageContent}
              onChangeText={handleChange}
              multiline={true}
              onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
            />
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                messageContent.trim() || selectedImages.length > 0 ? 
                  {...styles.sendButtonActive, backgroundColor: theme.colors.primary} : 
                  styles.sendButtonInactive
              ]}
              onPress={handleSend}
              disabled={!messageContent.trim() && selectedImages.length === 0 || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator 
                  size="small" 
                  color={theme.colors.surfaceContrast || 'white'} 
                />
              ) : (
                <MaterialCommunityIcons 
                  name="send" 
                  size={20} 
                  color={(messageContent.trim() || selectedImages.length > 0) ? (theme.colors.surfaceContrast || 'white') : theme.colors.surfaceContrast}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MessageInput; 