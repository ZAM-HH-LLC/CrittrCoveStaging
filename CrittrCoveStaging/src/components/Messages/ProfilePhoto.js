import React from 'react';
import { View, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { getMediaUrl } from '../../config/config';

/**
 * ProfilePhoto component for displaying user profile pictures consistently
 * 
 * @param {Object} props - Component props
 * @param {string} props.profilePicture - URL of the profile picture
 * @param {Object} props.style - Style object to override default styles
 * @param {number} props.size - Size of the profile photo (defaults to 40)
 * @param {string} props.fallbackIconName - Name of the MaterialCommunityIcons icon to use as fallback (defaults to "account")
 * @param {number} props.fallbackIconSize - Size of the fallback icon (defaults to 24)
 * @param {string} props.testID - Test ID for testing (optional)
 */
const ProfilePhoto = ({ 
  profilePicture, 
  style = {}, 
  size = 40, 
  fallbackIconName = "account",
  fallbackIconSize = 24,
  testID
}) => {
  // Calculate styles based on size
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style
  };
  
  // If profile picture is provided, render it
  if (profilePicture) {
    return (
      <Image
        source={{ uri: getMediaUrl(profilePicture) }}
        style={containerStyle}
        testID={testID}
      />
    );
  }
  
  // Otherwise render fallback icon
  return (
    <View style={{
      ...containerStyle,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    testID={testID || 'profile-photo-fallback'}
    >
      <MaterialCommunityIcons 
        name={fallbackIconName} 
        size={fallbackIconSize} 
        color={theme.colors.primary} 
      />
    </View>
  );
};

export default ProfilePhoto; 