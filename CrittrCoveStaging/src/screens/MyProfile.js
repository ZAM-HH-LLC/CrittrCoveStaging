import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Image, Platform, StatusBar, Alert, useWindowDimensions, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Button, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import FloatingSaveButton from '../components/FloatingSaveButton';
import ServiceManager from '../components/ServiceManager';
import ProfessionalTab from '../components/ProfessionalTab';
import RecordedPets from '../components/RecordedPets';
import EditableSection from '../components/EditableSection';
import DatePicker from '../components/DatePicker';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { DEFAULT_SERVICES } from '../data/mockData';
import ProfileInfoTab from '../components/profile/ProfileInfoTab';
import ServicesAvailabilityTab from '../components/profile/ServicesAvailabilityTab';
import PetsPreferencesTab from '../components/profile/PetsPreferencesTab';
import SettingsPaymentsTab from '../components/profile/SettingsPaymentsTab';
import TabBar from '../components/TabBar';

const MyProfile = () => {
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, is_DEBUG, userRole, isApprovedProfessional } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const [isWideScreen, setIsWideScreen] = useState(screenWidth >= 1200);
  const styles = createStyles(screenWidth, isCollapsed);
  const [activeTab, setActiveTab] = useState('profile_info');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    profilePhoto: null,
    name: '',
    email: '',
    phone: '',
    age: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    bio: '',
    emergencyContact: { name: '', phone: '' },
    authorizedHouseholdMembers: [''],
    pets: [],
    services: [],
    preferences: {
      homeEnvironment: [],
      petCare: [],
      specialRequirements: []
    },
    settings: [],
    paymentMethods: []
  });

  const [editMode, setEditMode] = useState({});

  const [currentPlan, setCurrentPlan] = useState({
    id: 'waitlist',
    title: 'Waitlist Signup',
    nextBilling: 'N/A',
    connections: { used: 0, total: 'Unlimited' }
  });

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
      setIsWideScreen(screenWidth >= 1200);
    };
    updateLayout();
  }, [screenWidth]);

  useEffect(() => {
    const fetchProfileData = async () => {
      // TODO: Replace with actual API call
      const mockData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '(555) 123-4567',
        age: '32',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94122',
        country: 'USA',
        bio: "I'm a proud pet parent of two dogs and a cat. I love animals and am always looking for the best care for my furry friends!",
        emergencyContact: {
          name: 'John Smith',
          phone: '(555) 987-6543'
        },
        authorizedHouseholdMembers: ['Sarah Johnson', 'Mike Johnson'],
        pets: [
          { id: '1', name: 'Max', type: 'Dog', breed: 'Golden Retriever', age: 5 },
          { id: '2', name: 'Luna', type: 'Cat', breed: 'Siamese', age: 3 }
        ],
        services: [
          { id: '1', name: 'Dog Walking', price: 25, unit: 'walk', isActive: true },
          { id: '2', name: 'Pet Sitting', price: 35, unit: 'visit', isActive: true },
          { id: '3', name: 'Overnight Care', price: 85, unit: 'night', isActive: true, isOvernight: true }
        ],
        preferences: {
          homeEnvironment: [
            'yard',           // Fenced yard
            'ac',            // Air conditioned
            'roam',          // Free roam of house
            'furniture',     // Allowed on furniture
            'bed',          // Allowed on bed
            'pool',         // Pool
            'crate',        // Crate available
            'pet_door',     // Pet door
            'toys',         // Pet toy collection
            'first_aid',    // Pet first aid kit
          ],
          petCare: [
            { id: 'walks', label: 'Regular Walks', icon: 'walk', selected: true },
            { id: 'training', label: 'Basic Training', icon: 'school', selected: false }
          ],
          specialRequirements: [
            { id: 'meds', label: 'Medication Administration', icon: 'pill', selected: false },
            { id: 'special_diet', label: 'Special Diet', icon: 'food', selected: true }
          ]
        },
        settings: [
          { id: 'notifications', title: 'Push Notifications', type: 'toggle', value: true, icon: 'bell' },
          { id: 'email_updates', title: 'Email Updates', type: 'toggle', value: false, icon: 'email' },
          { id: 'privacy', title: 'Privacy Settings', type: 'link', icon: 'shield-account' }
        ],
        paymentMethods: [
          { id: '1', type: 'card', last4: '4242', expiry: '12/24', isDefault: true },
          { id: '2', type: 'bank', bankName: 'Chase', last4: '9876', isDefault: false }
        ]
      };

      setProfileData(mockData);
    };

    fetchProfileData();
  }, []);

  const tabs = [
    { id: 'profile_info', label: userRole === 'professional' ? 'Professional Profile Info' : 'Client Profile Info' },
    ...(userRole === 'professional' ? [{ id: 'services_availability', label: 'Services & Availability' }] : []),
    { id: 'pets_preferences', label: 'Pets & Preferences' },
    { id: 'settings_payments', label: 'Settings & Payments' }
  ];

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileData(prev => ({ ...prev, profilePhoto: result.assets[0].uri }));
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateField = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const toggleEditMode = (section) => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSaveChanges = async () => {
    // TODO: Implement API call to save changes
    setHasUnsavedChanges(false);
    setEditMode({});
  };

  const handleSwitchPlan = (planId) => {
    // TODO: Implement API call to switch plans
    debugLog('Switching to plan:', planId);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile_info':
        return (
          <ProfileInfoTab
            profilePhoto={profileData.profilePhoto}
            name={profileData.name}
            email={profileData.email}
            phone={profileData.phone}
            age={profileData.age}
            address={profileData.address}
            city={profileData.city}
            state={profileData.state}
            zip={profileData.zip}
            country={profileData.country}
            bio={profileData.bio}
            emergencyContact={profileData.emergencyContact}
            authorizedHouseholdMembers={profileData.authorizedHouseholdMembers}
            editMode={editMode}
            toggleEditMode={toggleEditMode}
            onChangeText={handleUpdateField}
            pickImage={handlePickImage}
            setHasUnsavedChanges={setHasUnsavedChanges}
            isMobile={isMobile}
            rating={profileData.rating}
            reviews={profileData.reviews}
            role={userRole}
            isProfessional={userRole === 'professional'}
            insurance={profileData.insurance}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'services_availability':
        return (
          <ServicesAvailabilityTab
            services={profileData.services}
            onToggleService={(id) => {
              const updatedServices = profileData.services.map(s => 
                s.id === id ? { ...s, isActive: !s.isActive } : s
              );
              handleUpdateField('services', updatedServices);
            }}
            onEditHours={() => {}}
            onBlockService={() => {}}
            onPartialDayBlock={() => {}}
            isMobile={isMobile}
          />
        );
      case 'pets_preferences':
        return (
          <PetsPreferencesTab
            pets={profileData.pets}
            onAddPet={() => navigation.navigate('AddPet')}
            onEditPet={(id) => navigation.navigate('EditPet', { petId: id })}
            onDeletePet={() => {}}
            preferences={profileData.preferences}
            onUpdatePreferences={(section, id) => {
              const updatedPreferences = { ...profileData.preferences };
              if (section === 'homeEnvironment') {
                if (updatedPreferences[section].includes(id)) {
                  updatedPreferences[section] = updatedPreferences[section].filter(item => item !== id);
                } else {
                  updatedPreferences[section] = [...updatedPreferences[section], id];
                }
              } else {
                updatedPreferences[section] = updatedPreferences[section].map(p =>
                  p.id === id ? { ...p, selected: !p.selected } : p
                );
              }
              handleUpdateField('preferences', updatedPreferences);
            }}
            userRole={userRole}
            isMobile={isMobile}
          />
        );
      case 'settings_payments':
        return (
          <SettingsPaymentsTab
            settings={[
              {
                id: 'push_notifications',
                title: 'Push Notifications',
                description: 'Receive notifications for new bookings and messages',
                icon: 'bell',
                type: 'toggle',
                value: true,
                category: 'notifications'
              },
              {
                id: 'email_updates',
                title: 'Email Updates',
                description: 'Receive booking confirmations and important updates',
                icon: 'email',
                type: 'toggle',
                value: false,
                category: 'notifications'
              },
              {
                id: 'marketing',
                title: 'Marketing Communications',
                description: 'Receive news about promotions and updates',
                icon: 'bullhorn',
                type: 'toggle',
                value: false,
                category: 'notifications'
              },
              {
                id: 'profile_visibility',
                title: 'Profile Visibility',
                description: 'Make your profile visible to potential clients',
                icon: 'eye',
                type: 'toggle',
                value: true,
                category: 'privacy'
              },
              {
                id: 'show_location',
                title: 'Show Location',
                description: 'Display your approximate location on the map',
                icon: 'map-marker',
                type: 'toggle',
                value: true,
                category: 'privacy'
              },
              {
                id: 'change_password',
                title: 'Change Password',
                description: 'Last changed 3 months ago',
                icon: 'lock',
                type: 'action',
                actionText: 'Update',
                category: 'security'
              },
              {
                id: 'two_factor',
                title: 'Two-Factor Authentication',
                description: 'Add an extra layer of security',
                icon: 'shield-check',
                type: 'action',
                actionText: 'Enable',
                category: 'security'
              }
            ]}
            onUpdateSetting={(id, value) => {
              debugLog('Updating setting:', { id, value });
              // TODO: Implement API call to update settings
            }}
            paymentMethods={profileData.paymentMethods}
            onAddPaymentMethod={() => navigation.navigate('AddPaymentMethod')}
            onRemovePaymentMethod={(id) => {
              debugLog('Removing payment method:', id);
              // TODO: Implement API call to remove payment method
            }}
            onSetDefaultPayment={(id) => {
              debugLog('Setting default payment method:', id);
              // TODO: Implement API call to set default payment method
            }}
            currentPlan={currentPlan}
            onSwitchPlan={handleSwitchPlan}
            isMobile={isMobile}
            userRole={userRole}
            isApprovedProfessional={isApprovedProfessional}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        {isMobile && (
          <BackHeader 
            title="Profile Settings" 
            onBackPress={() => navigation.goBack()} 
          />
        )}
        
        <View style={styles.content}>
          <View style={styles.mainContent}>
            <View style={styles.headerSection}>
              <Text style={styles.title}>Profile Settings</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScrollContainer}
              >
                <View style={styles.tabContainer}>
                  {tabs.map((tab) => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                      onPress={() => setActiveTab(tab.id)}
                    >
                      <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.tabContent}>
              {renderActiveTab()}
            </View>
          </View>
        </View>

        <FloatingSaveButton 
          visible={hasUnsavedChanges}
          onSave={handleSaveChanges}
          btnText="Save Changes"
        />
      </SafeAreaView>
    </View>
  );
};

const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    height: '100vh',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
    transition: 'margin-left 0.3s ease',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    height: '100%',
    overflow: 'auto',
  },
  mainContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: theme.colors.background,
  },
  headerSection: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 24,
    fontFamily: theme.fonts.header.fontFamily,
  },
  tabScrollContainer: {
    flexGrow: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 32,
    paddingRight: screenWidth <= 900 ? 16 : 0,
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: screenWidth <= 900 ? 10 : 24,
    backgroundColor: theme.colors.surface,
  },
});

export default MyProfile;
