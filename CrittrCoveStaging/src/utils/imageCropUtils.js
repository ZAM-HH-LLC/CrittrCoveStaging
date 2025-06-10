import { Platform } from 'react-native';
import { debugLog } from '../context/AuthContext';

/**
 * Processes an image URI with crop parameters to generate a cropped image.
 * On web, it returns a base64 data URL of the cropped image.
 * On native platforms, it's not possible to directly manipulate the image,
 * so we return the crop parameters for server-side processing.
 * 
 * @param {string} imageUri - URI of the original image
 * @param {Object} cropParams - Parameters for cropping
 * @param {number} cropParams.scale - Scale factor of the image
 * @param {number} cropParams.x - X translation of the image
 * @param {number} cropParams.y - Y translation of the image
 * @param {number} cropParams.imageWidth - Original width of the image
 * @param {number} cropParams.imageHeight - Original height of the image
 * @param {number} cropParams.cropWidth - Width of the crop area
 * @param {number} cropParams.cropHeight - Height of the crop area
 * @returns {Promise<Object>} Object containing the processed image data
 */
export const processImageWithCrop = async (imageUri, cropParams) => {
  try {
    debugLog('MBA8080', 'Processing image with crop params:', cropParams);
    
    // For web platform, we can create a canvas and crop the image
    if (Platform.OS === 'web') {
      return await cropImageOnWeb(imageUri, cropParams);
    } 
    
    // For native platforms, we'll send the original image with crop parameters
    // to be processed on the server
    return {
      uri: imageUri,
      cropParams,
      oldProfilePhotoUrl: cropParams.oldProfilePhotoUrl // Pass through for deletion
    };
  } catch (error) {
    debugLog('MBA8080', 'Error processing image with crop:', error);
    throw error;
  }
};

/**
 * Crops an image on web using canvas
 * @param {string} imageUri - URI of the original image
 * @param {Object} cropParams - Parameters for cropping
 * @returns {Promise<Object>} Object containing the cropped image as base64
 */
const cropImageOnWeb = async (imageUri, cropParams) => {
  return new Promise((resolve, reject) => {
    // Create an image element to load the original image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create a canvas to draw the cropped image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to the crop dimensions (which is the circle diameter)
        const cropSize = Math.min(cropParams.cropWidth, cropParams.cropHeight);
        canvas.width = cropSize;
        canvas.height = cropSize;
        
        // Calculate the center of the crop area
        const centerX = cropSize / 2;
        const centerY = cropSize / 2;
        
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(centerX, centerY, cropSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        // Calculate the source position and dimensions in the original image
        const scaledWidth = cropParams.imageWidth * cropParams.scale;
        const scaledHeight = cropParams.imageHeight * cropParams.scale;
        
        // Calculate the center of the image in the coordinate system
        // of the crop window, accounting for the translation
        const cropCenterX = cropSize / 2;
        const cropCenterY = cropSize / 2;
        
        // Calculate the image center coordinates in the crop window
        const imageCenterX = cropCenterX - cropParams.x;
        const imageCenterY = cropCenterY - cropParams.y;
        
        // Calculate the top-left position to draw the image
        const drawX = imageCenterX - (scaledWidth / 2);
        const drawY = imageCenterY - (scaledHeight / 2);
        
        debugLog('MBA8080', 'Crop calculations:', {
          cropSize,
          scaledWidth,
          scaledHeight,
          drawX,
          drawY,
          imageCenterX,
          imageCenterY
        });
        
        // Draw the image with the appropriate transformations
        ctx.drawImage(
          img,
          drawX,
          drawY,
          scaledWidth,
          scaledHeight
        );
        
        // Convert the canvas to a base64 data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        debugLog('MBA8080', 'Image cropped successfully on web');
        
        // Return the cropped image data
        resolve({
          base64Data: dataUrl,
          type: 'image/jpeg',
          oldProfilePhotoUrl: cropParams.oldProfilePhotoUrl // Pass through for deletion
        });
      } catch (error) {
        debugLog('MBA8080', 'Error cropping image on web:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      debugLog('MBA8080', 'Error loading image for cropping:', error);
      reject(new Error('Failed to load image for cropping'));
    };
    
    // Start loading the image
    img.src = imageUri;
  });
};

/**
 * Prepares image data for upload based on platform
 * @param {Object} processedImage - Processed image data from processImageWithCrop
 * @returns {Object} Data ready for upload (FormData or base64)
 */
export const prepareImageForUpload = (processedImage) => {
  // If we have base64 data (from web), return it directly
  if (processedImage.base64Data) {
    return {
      isBase64: true,
      data: processedImage.base64Data,
      oldProfilePhotoUrl: processedImage.oldProfilePhotoUrl
    };
  }
  
  // For native platforms, create a FormData object with the URI and crop parameters
  if (processedImage.uri) {
    const formData = new FormData();
    
    // Add the image file
    const photoFile = {
      uri: Platform.OS === 'android' ? processedImage.uri : processedImage.uri.replace('file://', ''),
      type: 'image/jpeg',
      name: 'profile_photo.jpg'
    };
    formData.append('profile_picture', photoFile);
    
    // Add crop parameters if provided
    if (processedImage.cropParams) {
      formData.append('crop_params', JSON.stringify(processedImage.cropParams));
    }
    
    // Add the old profile photo URL if provided for deletion
    if (processedImage.oldProfilePhotoUrl) {
      formData.append('old_profile_photo_url', processedImage.oldProfilePhotoUrl);
    }
    
    return {
      isBase64: false,
      data: formData,
      oldProfilePhotoUrl: processedImage.oldProfilePhotoUrl
    };
  }
  
  throw new Error('Invalid processed image data');
}; 