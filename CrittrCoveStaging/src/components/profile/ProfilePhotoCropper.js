import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { debugLog } from '../../context/AuthContext';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_SIZE = Math.min(SCREEN_WIDTH * 0.9, 400);
const CIRCLE_SIZE = CONTAINER_SIZE * 0.8;

const ProfilePhotoCropper = ({ 
  visible, 
  imageUri, 
  onClose, 
  onSave,
  isUploading = false
}) => {
  // State for image manipulation
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Reference to track the initial scale
  const initialScaleRef = useRef(1);
  
  // Animation values
  const pan = useRef(new Animated.ValueXY()).current;
  
  // Reset values when the modal becomes visible or the image changes
  useEffect(() => {
    if (visible && imageUri) {
      // Reset loading state
      setImageLoaded(false);
      
      // Get image dimensions
      Image.getSize(imageUri, (width, height) => {
        debugLog('MBA23o9h8v45', 'Image dimensions:', { width, height });
        setImageSize({ width, height });
        
        // Calculate the initial scale to fit the image within the crop circle
        const initialScale = calculateInitialScale(width, height);
        setScale(initialScale);
        initialScaleRef.current = initialScale; // Store initial scale for reference
        
        // Center the image initially
        pan.setValue({ x: 0, y: 0 });
        setImagePosition({ x: 0, y: 0 });
        
        // Mark image as loaded
        setImageLoaded(true);
      }, error => {
        debugLog('MBA23o9h8v45', 'Error getting image dimensions:', error);
      });
    }
  }, [visible, imageUri]);
  
  // Calculate initial scale to fit image in crop circle
  const calculateInitialScale = (width, height) => {
    if (width === 0 || height === 0) return 1;
    
    const imageRatio = width / height;
    const circleRatio = 1; // Circle is 1:1 aspect ratio
    
    // Calculate scale based on which dimension needs to fit
    if (imageRatio > circleRatio) {
      // Image is wider than tall, scale based on height
      return CIRCLE_SIZE / height * 1.1; // Scale up slightly to fill circle
    } else {
      // Image is taller than wide, scale based on width
      return CIRCLE_SIZE / width * 1.1; // Scale up slightly to fill circle
    }
  };
  
  // Create pan responder for dragging the image
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        debugLog('MBA23o9h8v45', 'Pan responder activated');
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        )(evt, gestureState);
      },
      onPanResponderRelease: () => {
        debugLog('MBA23o9h8v45', 'Pan responder released');
        pan.flattenOffset();
        
        // Update the image position state after pan ends
        setImagePosition({
          x: pan.x._value,
          y: pan.y._value
        });
      }
    })
  ).current;
  
  // Simple direct scale change function - keeps position stable
  const handleScaleChange = (newScale) => {
    // If returning to initial scale, reset position
    if (Math.abs(newScale - initialScaleRef.current) < 0.01) {
      // Reset position to center
      pan.setValue({ x: 0, y: 0 });
      setImagePosition({ x: 0, y: 0 });
    }
    
    // Update scale
    setScale(newScale);
  };
  
  // Handle save button press
  const handleSave = () => {
    // Calculate crop parameters to pass to the parent component
    const cropParams = {
      scale,
      x: -pan.x._value,
      y: -pan.y._value,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      cropWidth: CIRCLE_SIZE,
      cropHeight: CIRCLE_SIZE
    };
    
    debugLog('MBA23o9h8v45', 'Saving cropped image with params:', cropParams);
    onSave(imageUri, cropParams);
  };
  
  // Calculate transform styles for the image
  const imageTransform = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale: scale }
    ]
  };
  
  // Calculate the min and max zoom values
  const minZoom = initialScaleRef.current || 1;
  const maxZoom = (initialScaleRef.current || 1) * 3;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Adjust Profile Photo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Main crop area container - this defines the visible area */}
          <View style={styles.cropAreaOuterContainer}>
            <View style={styles.cropAreaContainer}>
              {/* This is where we clip/mask the image to only show within this container */}
              <View style={styles.imageViewport}>
                {/* This is the actual photo that will be cropped */}
                <Animated.View
                  style={[styles.imageContainer, imageTransform]}
                >
                  {imageUri && imageLoaded ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={[
                        styles.image,
                        {
                          width: imageSize.width,
                          height: imageSize.height,
                        }
                      ]}
                      resizeMode="contain"
                      onLoad={() => {
                        debugLog('MBA23o9h8v45', 'Image loaded in cropper component');
                      }}
                    />
                  ) : (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  )}
                </Animated.View>
                
                {/* Semi-transparent overlay with hole for the crop circle */}
                <View style={styles.overlay}>
                  {/* This creates the transparent circle in the overlay */}
                  <View style={styles.cropCircleHole} />
                </View>
                
                {/* Circle guide border */}
                <View style={styles.circleGuide} />
                
                {/* Transparent touchable area for dragging, on top of everything */}
                <View 
                  style={styles.touchableArea}
                  {...panResponder.panHandlers}
                />
              </View>
            </View>
          </View>
          
          {/* Zoom slider */}
          <View style={styles.sliderContainer}>
            <TouchableOpacity 
              onPress={() => {
                const newScale = Math.max(minZoom, scale - 0.1);
                handleScaleChange(newScale);
              }}
              style={styles.zoomButton}
            >
              <MaterialCommunityIcons name="magnify-minus" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Slider
              style={styles.slider}
              minimumValue={minZoom}
              maximumValue={maxZoom}
              value={scale}
              onValueChange={handleScaleChange}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
            />
            <TouchableOpacity 
              onPress={() => {
                const newScale = Math.min(maxZoom, scale + 0.1);
                handleScaleChange(newScale);
              }}
              style={styles.zoomButton}
            >
              <MaterialCommunityIcons name="magnify-plus" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Use slider to zoom • Drag to position • Return slider to left to reset zoom
            </Text>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, isUploading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={isUploading || !imageLoaded}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: CONTAINER_SIZE,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  cropAreaOuterContainer: {
    alignItems: 'center',
    paddingVertical: 16, // Reduced padding to ensure image is contained
  },
  cropAreaContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    position: 'relative',
    overflow: 'hidden', // This is crucial - confines the image to this container
  },
  imageViewport: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    overflow: 'hidden', // Important - this clips the image to this container
    position: 'relative',
  },
  imageContainer: {
    position: 'absolute',
    width: CIRCLE_SIZE * 3, // Make it larger to ensure the image is always visible
    height: CIRCLE_SIZE * 3,
    left: -CIRCLE_SIZE,
    top: -CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  image: {
    // Width and height will be set dynamically
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2,
  },
  cropCircleHole: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    top: 0,
    left: 0,
    // This creates a circular hole by masking out the center
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        boxShadow: `0 0 0 ${CIRCLE_SIZE}px rgba(0, 0, 0, 0.5)`,
      },
      default: {
        backgroundColor: 'transparent',
        borderWidth: CIRCLE_SIZE / 2,
        borderColor: 'rgba(0, 0, 0, 0.5)',
        width: 0,
        height: 0,
        borderRadius: CIRCLE_SIZE,
        top: CIRCLE_SIZE / 4,
        left: CIRCLE_SIZE / 4,
      },
    }),
  },
  circleGuide: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    zIndex: 3,
  },
  touchableArea: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: 4, // This needs to be on top to capture touches
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginTop: 8,
    alignSelf: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  zoomButton: {
    padding: 8,
  },
  instructionsContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  instructionsText: {
    color: theme.colors.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  cancelButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ProfilePhotoCropper; 