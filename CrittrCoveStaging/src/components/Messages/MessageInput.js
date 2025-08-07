import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { uploadAndSendImageMessage } from '../../api/API';
import { debugLog } from '../../context/AuthContext';
import { validateMessage, sanitizeInput } from '../../validation/validation';
import { useToast } from '../ToastProvider';

const MessageInput = React.forwardRef(({ 
  onSendMessage, 
  onShowDropdown,
  showDropdown,
  styles,
  screenWidth,
  selectedConversation,
  onScrollStart // New prop to handle scroll start events
}, ref) => {
  const [messageContent, setMessageContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const textInputRef = useRef(null);
  const defaultHeight = 40; // Define constant for default height
  const showToast = useToast();

  // Function to dismiss keyboard - can be called from parent
  const dismissKeyboard = useCallback(() => {
    if (Platform.OS === 'web') {
      // On web, blur the active element if it's an input
      if (document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA')) {
        debugLog('MBA8765: Dismissing keyboard by blurring active element');
        document.activeElement.blur();
      }
      
      // Also blur our specific input ref if it exists
      if (textInputRef.current) {
        textInputRef.current.blur();
      }
    } else {
      // On native platforms, blur the ref
      if (textInputRef.current) {
        textInputRef.current.blur();
      }
    }
  }, []);

  // Handle scroll start event to dismiss keyboard on mobile browsers with delay
  useEffect(() => {
    if (onScrollStart && Platform.OS === 'web') {
      let scrollTimeout = null;
      
      // Set up the scroll start handler with delay
      const handleScrollStart = () => {
        // Only dismiss keyboard on mobile browsers (viewport width <= 900)
        if (screenWidth <= 900) {
          // Clear any existing timeout
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }
          
          // Add a small delay before dismissing keyboard
          scrollTimeout = setTimeout(() => {
            debugLog('MBA8765: Scroll started on mobile browser, dismissing keyboard after delay');
            dismissKeyboard();
          }, 100);
        }
      };

      // Call the onScrollStart prop with our handler
      onScrollStart(handleScrollStart);
      
      // Cleanup timeout on unmount
      return () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
      };
    }
  }, [onScrollStart, screenWidth, dismissKeyboard]);

  // Expose dismissKeyboard function to parent component
  React.useImperativeHandle(ref, () => ({
    dismissKeyboard
  }), [dismissKeyboard]);

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
      // Prevent multiple simultaneous send operations
      if (isUploading) {
        debugLog('MBA5511: Send operation already in progress, ignoring duplicate click');
        return;
      }
      
      // Only continue if we have images or text to send
      if (selectedImages.length === 0 && !messageContent.trim()) {
        return;
      }
      
      // Use the already sanitized message content
      let validatedMessage = '';
      if (messageContent.trim()) {
        // Since we're already sanitizing in real-time, just use the content
        validatedMessage = messageContent.trim();
        debugLog('MBA5511: Using sanitized message content', {
          message: validatedMessage,
          length: validatedMessage.length
        });
      }
      
      setIsUploading(true);
      debugLog('MBA5511: Message sending started - showing loading indicator');
      
      // Send normal text message if there are no images
      if (selectedImages.length === 0 && validatedMessage) {
        await onSendMessage(validatedMessage, []);
      } 
      // Send image message with or without caption
      else if (selectedImages.length > 0 && selectedConversation) {
        try {
          // Check image sizes before attempting to upload
          const totalSize = selectedImages.reduce((sum, img) => {
            // For base64 images, estimate size
            if (img.base64) {
              // base64 size is roughly 4/3 of the raw data
              return sum + (img.base64.length * 0.75);
            }
            // For files with size property
            else if (img.size) {
              return sum + img.size;
            }
            // Default estimation
            return sum + 1000000; // Assume 1MB if unknown
          }, 0);
          
          debugLog('MBA5511: Total estimated image size before compression:', {
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2) + 'MB',
            imageCount: selectedImages.length
          });
          
          // Warn if total size is large
          if (totalSize > 4 * 1024 * 1024) { // 4MB warning threshold
            debugLog('MBA5511: Large image upload detected, compression will be applied');
          }
          
          // Use the direct uploadAndSend function that handles everything in one call
          // and returns a ready-to-display message object
          const messageObject = await uploadAndSendImageMessage(
            selectedConversation, 
            selectedImages, 
            validatedMessage // Use the validated and sanitized message
          );
          
          // Add the message to the message list immediately
          // Pass true as the fourth parameter to indicate this message is already sent
          // and doesn't need another API call
          onSendMessage(messageObject.content, [], messageObject, true);
          
          debugLog('MBA5511: Image message sent and added to UI:', {
            messageId: messageObject.message_id,
            imageCount: selectedImages.length,
            hasCaption: !!validatedMessage,
            captionText: validatedMessage,
            messageObjectContent: messageObject.content
          });
        } catch (error) {
          debugLog('MBA5511: Failed to send image message', error);
          
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
          } else if (error.message && error.message.includes('Network Error')) {
            showToast({
              message: 'Network error occurred. Please check your connection and try again.',
              type: 'error',
              duration: 3000
            });
          } else {
            // Default error message
            showToast({
              message: 'Failed to upload images. Please try again.',
              type: 'error',
              duration: 3000
            });
          }
          
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
  }, [messageContent, onSendMessage, resetInputHeight, selectedImages, selectedConversation, isUploading]);

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
    debugLog('MBA7777: Message input change:', text);
    
    // Apply real-time sanitization for messages using the full sanitizeInput function
    const sanitizedText = sanitizeInput(text, 'message');
    
    // Check if sanitization removed too much content (potential attack)
    const removalPercentage = text.length > 0 ? ((text.length - sanitizedText.length) / text.length) * 100 : 0;
    
    if (removalPercentage > 50 && text.length > 10) {
      debugLog('MBA7777: Potentially malicious message input detected:', {
        original: text,
        sanitized: sanitizedText,
        removalPercentage
      });
      // Still update with sanitized version, don't block completely
    }
    
    // Always update with sanitized version to ensure UI reflects sanitization
    setMessageContent(sanitizedText);
    if (Platform.OS === 'web') {
      adjustHeight();
    }
  }, [adjustHeight]);

  const handleKeyPress = useCallback((e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      // Only send if not currently uploading
      if (!isUploading) {
        handleSend();
      }
    }
  }, [handleSend, isUploading]);

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
});

export default MessageInput; 