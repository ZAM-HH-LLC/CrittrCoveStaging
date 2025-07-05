import React from 'react';
import { View, Modal, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../../context/AuthContext';
import { getMediaUrl } from '../../config/config';
import { downloadImage, isValidImageUrl } from '../../utils/imageDownloadUtils';
import { useToast } from '../ToastProvider';

const ImageViewer = ({ visible, imageUrl, onClose }) => {
  const showToast = useToast();
  
  // Process the image URL - add MEDIA_URL prefix if needed
  const processedImageUrl = getMediaUrl(imageUrl);
  
  // Check if we should show the save button
  const shouldShowSaveButton = () => {
    if (Platform.OS === 'web') {
      // Only show on desktop browsers, not mobile browsers
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
      return !isMobile;
    }
    // Show on iOS and Android
    return Platform.OS === 'ios' || Platform.OS === 'android';
  };
    
  debugLog('MBA7654: Showing image viewer', {
    visible,
    originalUrl: imageUrl,
    processedUrl: processedImageUrl,
    platform: Platform.OS,
    showSaveButton: shouldShowSaveButton()
  });

  // Handle save button press
  const handleSaveImage = async () => {
    try {
      debugLog('MBA8765: Save button pressed', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        processedImageUrl: processedImageUrl.substring(0, 50) + '...',
        platform: Platform.OS
      });

      // Validate the processed image URL (the one with getMediaUrl applied)
      if (!isValidImageUrl(processedImageUrl)) {
        console.log('MBA8765: Invalid processed image URL detected');
        showToast({
          message: 'Invalid image URL. Cannot download this image.',
          type: 'error',
          duration: 4000
        });
        return;
      }

      console.log('MBA8765: About to call downloadImage with processed URL');
      const result = await downloadImage(processedImageUrl);
      
      debugLog('MBA8765: Image download result:', result);
      console.log('MBA8765: Download result:', result);
      
      // Show success toast based on platform
      if (Platform.OS === 'web') {
        showToast({
          message: 'Image download started!',
          type: 'success',
          duration: 3000
        });
      } else {
        showToast({
          message: 'Image opened in browser. You can save it from there.',
          type: 'info',
          duration: 4000
        });
      }
      
    } catch (error) {
      debugLog('MBA8765: Error saving image:', error);
      console.log('MBA8765: Error in handleSaveImage:', error);
      
      showToast({
        message: 'Failed to save image. Please try again.',
        type: 'error',
        duration: 4000
      });
    }
  };

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
          testID="image-viewer-close-button"
        >
          <MaterialCommunityIcons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        
        {/* Save button - only show on supported platforms */}
        {shouldShowSaveButton() && (
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveImage}
            activeOpacity={0.7}
            testID="image-viewer-save-button"
          >
            <MaterialCommunityIcons name="download" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        
        {/* Image container - clickable to close */}
        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={1}
          onPress={onClose}
          testID="image-viewer-container"
        >
          <Image
            source={{ uri: processedImageUrl }}
            style={styles.image}
            resizeMode="contain"
            testID="image-viewer-image"
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
    zIndex: 1, // Lower z-index so buttons are on top
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
    zIndex: 20, // Higher z-index to be on top
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20, // Higher z-index to be on top
  },
});

export default ImageViewer; 