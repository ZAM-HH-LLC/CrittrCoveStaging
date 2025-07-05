import { Platform, Alert } from 'react-native';
import { debugLog } from '../context/AuthContext';

/**
 * Download and save an image to the device
 * Works across web, iOS, and Android platforms
 * 
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} filename - Optional filename for the downloaded image
 * @returns {Promise<Object>} - Result object with success status and file path
 */
export const downloadImage = async (imageUrl, filename = null) => {
  try {
    // Validate input
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL provided');
    }

    debugLog('MBA8765: Starting image download', {
      imageUrl: imageUrl.substring(0, 50) + '...',
      platform: Platform.OS,
      filename
    });

    if (Platform.OS === 'web') {
      return await downloadImageWeb(imageUrl, filename);
    } else {
      return await downloadImageNative(imageUrl, filename);
    }
  } catch (error) {
    debugLog('MBA8765: Error downloading image:', error);
    throw error;
  }
};

/**
 * Check if the current browser is mobile
 * @returns {boolean} - Whether the browser is mobile
 */
const isMobileBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

/**
 * Download image on web platform
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} filename - Optional filename for the downloaded image
 * @returns {Promise<Object>} - Result object
 */
const downloadImageWeb = async (imageUrl, filename) => {
  try {
    // Generate filename if not provided
    const downloadFilename = filename || generateFilename(imageUrl);
    
    debugLog('MBA8765: Attempting web download', {
      imageUrl: imageUrl.substring(0, 50) + '...',
      downloadFilename,
      isMobile: isMobileBrowser()
    });

    // For mobile browsers, use direct download approach
    if (isMobileBrowser()) {
      debugLog('MBA8765: Using mobile browser download approach');
      
      // Create a temporary anchor element for direct download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = downloadFilename;
      link.target = '_blank';
      
      // Set crossOrigin to handle CORS issues
      link.crossOrigin = 'anonymous';
      
      // Append to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      debugLog('MBA8765: Mobile browser download initiated', {
        filename: downloadFilename,
        url: imageUrl.substring(0, 50) + '...'
      });
      
      return {
        success: true,
        platform: 'web',
        filename: downloadFilename,
        message: 'Download started (mobile)'
      };
    }

    // For desktop browsers, use the fetch + blob approach
    debugLog('MBA8765: Using desktop browser download approach');
    
    // First, try to fetch the image to handle CORS issues
    const response = await fetch(imageUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Convert the response to a blob
    const blob = await response.blob();
    
    // Create a blob URL
    const blobUrl = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = downloadFilename;
    link.target = '_blank';
    
    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
    
    debugLog('MBA8765: Desktop browser download initiated', {
      filename: downloadFilename,
      url: imageUrl.substring(0, 50) + '...',
      blobSize: blob.size
    });
    
    return {
      success: true,
      platform: 'web',
      filename: downloadFilename,
      message: 'Download started (desktop)'
    };
  } catch (error) {
    debugLog('MBA8765: Error downloading image on web:', error);
    
    // Fallback to direct download if fetch fails
    try {
      debugLog('MBA8765: Trying fallback direct download');
      
      const downloadFilename = filename || generateFilename(imageUrl);
      
      // Create a temporary anchor element for direct download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = downloadFilename;
      link.target = '_blank';
      
      // Set crossOrigin to handle CORS issues
      link.crossOrigin = 'anonymous';
      
      // Append to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      debugLog('MBA8765: Fallback download initiated on web', {
        filename: downloadFilename,
        url: imageUrl.substring(0, 50) + '...'
      });
      
      return {
        success: true,
        platform: 'web',
        filename: downloadFilename,
        message: 'Download started (fallback)'
      };
    } catch (fallbackError) {
      debugLog('MBA8765: Fallback download also failed:', fallbackError);
      throw new Error('Failed to download image on web platform');
    }
  }
};

/**
 * Download image on native platforms (iOS/Android)
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} filename - Optional filename for the downloaded image
 * @returns {Promise<Object>} - Result object
 */
const downloadImageNative = async (imageUrl, filename) => {
  try {
    // Generate filename if not provided
    const downloadFilename = filename || generateFilename(imageUrl);
    
    // On native platforms, we can't directly download to file system
    // without additional permissions and setup. Instead, we'll show
    // the user how to save the image
    
    Alert.alert(
      'Save Image',
      'To save this image:\n\n1. Tap and hold the image\n2. Select "Save Image" or "Download"\n\nOr open the image in your browser to save it.',
      [
        {
          text: 'Open in Browser',
          onPress: () => {
            // Open the image URL in the device's default browser
            const { Linking } = require('react-native');
            Linking.openURL(imageUrl).catch(error => {
              debugLog('MBA8765: Error opening URL in browser:', error);
            });
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
    
    debugLog('MBA8765: Image download dialog shown on native platform', {
      platform: Platform.OS,
      filename: downloadFilename,
      url: imageUrl.substring(0, 50) + '...'
    });
    
    return {
      success: true,
      platform: Platform.OS,
      filename: downloadFilename,
      message: 'Download dialog shown'
    };
  } catch (error) {
    debugLog('MBA8765: Error downloading image on native platform:', error);
    throw new Error(`Failed to download image on ${Platform.OS} platform`);
  }
};

/**
 * Generate a filename from an image URL
 * @param {string} imageUrl - The image URL
 * @returns {string} - Generated filename
 */
const generateFilename = (imageUrl) => {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    
    // Remove query parameters
    const filename = lastPart.split('?')[0];
    
    // If filename has extension, use it
    if (filename.includes('.')) {
      return filename;
    }
    
    // Otherwise, generate a filename with timestamp
    const timestamp = new Date().getTime();
    return `image_${timestamp}.jpg`;
  } catch (error) {
    // Fallback to timestamp-based filename
    const timestamp = new Date().getTime();
    return `image_${timestamp}.jpg`;
  }
};

/**
 * Check if the platform supports direct file downloads
 * @returns {boolean} - Whether direct downloads are supported
 */
export const supportsDirectDownload = () => {
  return Platform.OS === 'web';
};

/**
 * Get platform-specific download instructions
 * @returns {string} - Instructions for the current platform
 */
export const getDownloadInstructions = () => {
  if (Platform.OS === 'web') {
    return 'The image will be downloaded to your default downloads folder.';
  } else if (Platform.OS === 'ios') {
    return 'Tap and hold the image, then select "Save Image" to save it to your Photos.';
  } else {
    return 'Tap and hold the image, then select "Save Image" or "Download" to save it to your device.';
  }
};

/**
 * Validate if a URL is a valid image URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is a valid image URL
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Check if it's a valid URL
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  // Check if it has an image extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const hasImageExtension = imageExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  );
  
  // If it has an image extension, it's valid
  if (hasImageExtension) {
    return true;
  }
  
  // For URLs without extensions (like API endpoints), we'll be more lenient
  // and assume they're valid if they're HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }
  
  return false;
}; 