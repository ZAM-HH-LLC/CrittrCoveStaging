import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import ProfilePhoto from './ProfilePhoto';

const MessageHeader = ({
  selectedConversationData,
  hasDraft,
  draftData,
  onEditDraft,
  onBackPress,
  styles,
  isMobile = false,
  onCreateBooking,
  onViewPets
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Only show dropdown button for professionals
  const showDropdownButton = selectedConversationData?.is_professional;
  
  // Handle outside clicks to close dropdown
  useEffect(() => {
    if (Platform.OS === 'web' && showDropdown) {
      const handleClickOutside = (event) => {
        // Check if click is outside both the dropdown and the button that opens it
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)
        ) {
          setShowDropdown(false);
        }
      };
      
      // Add event listener
      document.addEventListener('mousedown', handleClickOutside);
      
      // Clean up
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);
  
  if (isMobile) {
    return (
      <View style={[
        styles.mobileHeader,
        { backgroundColor: theme.colors.surfaceContrast }
      ]}>
        <View style={styles.mobileHeaderContent}>
          <TouchableOpacity 
            style={styles.backArrow}
            onPress={onBackPress}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
          
          <View style={styles.mobileHeaderNameContainer}>
            {/* Profile picture circle centered above the name */}
            <View style={[styles.mobileProfilePhotoContainer, { alignSelf: 'center' }]}>
              <ProfilePhoto 
                profilePicture={selectedConversationData?.profile_picture}
                size={60}
                fallbackIconSize={30}
                style={styles.mobileProfilePhoto}
              />
            </View>
            <Text style={[styles.mobileHeaderName, { textAlign: 'center', fontSize: 16 }]}>
              {selectedConversationData?.name || selectedConversationData?.other_user_name}
            </Text>
          </View>
          
          {/* Add dropdown button for mobile */}
          {showDropdownButton && (
            <TouchableOpacity 
              ref={buttonRef}
              style={[styles.backArrow, { right: 16, left: 'auto' }]}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <MaterialCommunityIcons 
                name={showDropdown ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
          )}
          
          {/* Add dropdown menu for mobile */}
          {showDropdown && showDropdownButton && (
            <View 
              ref={dropdownRef}
              style={[styles.headerDropdownMenu, { top: '100%', width: '90%', alignSelf: 'center', right: 16 }]}
            >
              <TouchableOpacity 
                style={styles.headerDropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onCreateBooking && onCreateBooking();
                }}
              >
                <MaterialCommunityIcons 
                  name="calendar-plus" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.headerDropdownText}>
                  Create Booking
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerDropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onViewPets && onViewPets();
                }}
              >
                <MaterialCommunityIcons 
                  name="paw" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.headerDropdownText}>
                  View Profile
                </Text>
              </TouchableOpacity>
              
              {/* Add Edit Draft to dropdown */}
              {hasDraft && draftData?.draft_id && (
                <TouchableOpacity 
                  style={styles.headerDropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    onEditDraft && onEditDraft(draftData.draft_id);
                  }}
                >
                  <MaterialCommunityIcons 
                    name="pencil" 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.headerDropdownText}>
                    Edit Draft
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.messageHeader}>
      <View style={styles.messageHeaderContent}>
        <ProfilePhoto 
          profilePicture={selectedConversationData?.profile_picture} 
          style={styles.profilePhoto}
        />
        <Text style={styles.messageHeaderName}>
          {selectedConversationData?.other_user_name}
        </Text>
        
        {/* Add dropdown button for desktop */}
        {showDropdownButton && (
          <TouchableOpacity 
            ref={buttonRef}
            style={{ marginLeft: 'auto' }}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            {/* <Text style={styles.headerDropdownButtonText}>Options</Text> */}
            <MaterialCommunityIcons 
              name={showDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        )}
        
        {/* Add dropdown menu for desktop */}
        {showDropdown && showDropdownButton && (
          <View 
            ref={dropdownRef}
            style={styles.headerDropdownMenu}
          >
            <TouchableOpacity 
              style={styles.headerDropdownItem}
              onPress={() => {
                setShowDropdown(false);
                onCreateBooking && onCreateBooking();
              }}
            >
              <MaterialCommunityIcons 
                name="calendar-plus" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text style={styles.headerDropdownText}>
                Create Booking
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerDropdownItem}
              onPress={() => {
                setShowDropdown(false);
                onViewPets && onViewPets();
              }}
            >
              <MaterialCommunityIcons 
                name="paw" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text style={styles.headerDropdownText}>
                View Profile
              </Text>
            </TouchableOpacity>
            
            {/* Add Edit Draft to dropdown */}
            {hasDraft && draftData?.draft_id && (
              <TouchableOpacity 
                style={styles.headerDropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  onEditDraft && onEditDraft(draftData.draft_id);
                }}
              >
                <MaterialCommunityIcons 
                  name="pencil" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.headerDropdownText}>
                  Edit Draft
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default MessageHeader; 