import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const LogoHeader = ({ 
  title = "CrittrCove", 
  onProfilePress = null,
  customStyles = {} 
}) => {
  const navigation = useNavigation();
  const { userProfileImage } = useContext(AuthContext);

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      // Default navigation to profile screen
      navigation.navigate('Profile');
    }
  };

  const handleNavigation = (route) => {
    navigation.navigate(route);
  };

  return (
    <View style={[styles.header, customStyles]}>
      {/* Logo/Title on the left */}
      <TouchableOpacity onPress={() => handleNavigation('Home')}>
            <Image
                source={require('../../assets/logo.png')}
                style={[styles.mobileLogo, { tintColor: theme.colors.primary }]}
            />
        </TouchableOpacity>
      
      {/* Profile icon on the right */}
      <TouchableOpacity 
        onPress={handleProfilePress} 
        style={styles.profileButton}
      >
        {userProfileImage ? (
          <Image 
            source={{ uri: userProfileImage }} 
            style={styles.profileImage}
          />
        ) : (
          <MaterialCommunityIcons 
            name="account-circle" 
            size={32} 
            color={theme.colors.primary} 
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    zIndex: 100,
    elevation: 100,
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
  },
  profileButton: {
    padding: 4,
  },
  mobileLogo: {
    height: 40,
    width: 120,
    resizeMode: 'contain',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
});

export default LogoHeader; 