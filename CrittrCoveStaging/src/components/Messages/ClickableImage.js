import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../../config/config';
import { debugLog } from '../../context/AuthContext';

/**
 * A clickable image component that handles properly formatting image URLs
 * and provides a consistent interface for image display in messages
 */
const ClickableImage = ({ 
  imageUrl, 
  onPress, 
  style = {},
  resizeMode = 'cover',
  testID
}) => {
  // Process the image URL to ensure it has the API base URL if needed
  const processedImageUrl = imageUrl && !imageUrl.startsWith('http') 
    ? `${API_BASE_URL}${imageUrl}` 
    : imageUrl;
  
  // Log the processed URL for debugging
  debugLog('MBA7654: Rendering clickable image', {
    originalUrl: imageUrl,
    processedUrl: processedImageUrl
  });

  // Handle press with the unprocessed URL so the parent component can process it
  const handlePress = () => {
    onPress && onPress(imageUrl);
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      activeOpacity={0.9}
      style={[styles.container, style.container]}
      testID={testID}
    >
      <Image
        source={{ uri: processedImageUrl }}
        style={[styles.image, style.image]}
        resizeMode={resizeMode}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    marginVertical: 4,
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 8,
  }
});

export default ClickableImage; 