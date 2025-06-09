import { useState } from 'react';
import { debugLog } from '../../context/AuthContext';

/**
 * Custom hook to manage image viewer state and handlers
 */
export const useImageViewer = () => {
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  /**
   * Handle image click to open the fullscreen viewer
   * @param {string} imageUrl - URL of the image to display
   */
  const handleImagePress = (imageUrl) => {
    debugLog('MBA7654: Image pressed', { imageUrl });
    
    if (!imageUrl) {
      debugLog('MBA7654: No image URL provided, cannot open viewer');
      return;
    }
    
    setSelectedImageUrl(imageUrl);
    setIsImageViewerVisible(true);
  };

  /**
   * Close the image viewer
   */
  const closeImageViewer = () => {
    debugLog('MBA7654: Closing image viewer');
    setIsImageViewerVisible(false);
  };

  return {
    isImageViewerVisible,
    selectedImageUrl,
    handleImagePress,
    closeImageViewer
  };
}; 