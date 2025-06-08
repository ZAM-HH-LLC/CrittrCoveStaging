import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const MessageInput = ({ 
  onSendMessage, 
  onShowDropdown,
  showDropdown,
  styles,
  screenWidth 
}) => {
  const [messageContent, setMessageContent] = useState('');
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

  const handleSend = useCallback(async () => {
    if (messageContent.trim()) {
      try {
        await onSendMessage(messageContent.trim());
        setMessageContent('');
        if (textInputRef.current) {
          textInputRef.current.clear();
          resetInputHeight(); // Reset height after sending
          
          // Keep focus on the input after sending
          setTimeout(() => {
            if (textInputRef.current) {
              console.log('MBA5001: Refocusing input after send');
              textInputRef.current.focus();
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }, [messageContent, onSendMessage, resetInputHeight]);

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
                onPress={() => onShowDropdown(false)}
              >
                <MaterialCommunityIcons 
                  name="image" 
                  size={20} 
                  color={theme.colors.placeholder} 
                />
                <Text style={[styles.dropdownText, { color: theme.colors.placeholder }]}>
                  Coming Soon - Images
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
            placeholder="Type a Message..."
            placeholderTextColor={theme.colors.placeholder}
            value={messageContent}
            onChangeText={handleChange}
            multiline={true}
            onKeyPress={Platform.OS === 'web' ? handleKeyPress : undefined}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.sendButton,
            messageContent.trim() ? 
              {...styles.sendButtonActive, backgroundColor: theme.colors.primary} : 
              styles.sendButtonInactive
          ]}
          onPress={handleSend}
          disabled={!messageContent.trim()}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={20} 
            color={messageContent.trim() ? (theme.colors.surfaceContrast || 'white') : theme.colors.surfaceContrast}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageInput; 