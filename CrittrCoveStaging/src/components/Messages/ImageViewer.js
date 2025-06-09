import React from 'react';
import { View, Modal, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/config';

const ImageViewer = ({ visible, imageUrl, onClose }) => {
  // Process the image URL - add API_BASE_URL prefix if needed
  const processedImageUrl = imageUrl && !imageUrl.startsWith('http') 
    ? `${API_BASE_URL}${imageUrl}` 
    : imageUrl;
    
  debugLog('MBA7654: Showing image viewer', {
    visible,
    originalUrl: imageUrl,
    processedUrl: processedImageUrl
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        
        {/* Image container - clickable to close */}
        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={1}
          onPress={onClose}
        >
          <Image
            source={{ uri: processedImageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    maxWidth: Platform.OS === 'web' ? '90vw' : undefined,
    maxHeight: Platform.OS === 'web' ? '90vh' : undefined,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default ImageViewer; 