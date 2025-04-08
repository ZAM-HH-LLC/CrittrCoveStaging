import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Image, Platform, StatusBar, Alert, useWindowDimensions, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Button, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext, debugLog } from '../context/AuthContext';
import { TutorialContext } from '../context/TutorialContext';
import FloatingSaveButton from '../components/FloatingSaveButton';
import ServiceManager from '../components/ServiceManager';
import ProfessionalTab from '../components/ProfessionalTab';
import RecordedPets from '../components/RecordedPets';
import EditableSection from '../components/EditableSection';
import DatePicker from '../components/DatePicker';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import TutorialModal from '../components/TutorialModal';
import { DEFAULT_SERVICES } from '../data/mockData';
import ProfileInfoTab from '../components/profile/ProfileInfoTab';
import ServicesAvailabilityTab from '../components/profile/ServicesAvailabilityTab';
import PetsPreferencesTab from '../components/profile/PetsPreferencesTab';
import SettingsPaymentsTab from '../components/profile/SettingsPaymentsTab';
import TabBar from '../components/TabBar';
import { userProfile } from '../api/API';

const MyProfile = () => {
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, is_DEBUG, userRole, isApprovedProfessional, user, logout } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const [isWideScreen, setIsWideScreen] = useState(screenWidth >= 1200);
  const styles = createStyles(screenWidth, isCollapsed);
  const [activeTab, setActiveTab] = useState('profile_info');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editMode, setEditMode] = useState({});

  const [currentPlan, setCurrentPlan] = useState({
    id: 'waitlist',
    title: 'Waitlist Signup',
    nextBilling: 'N/A',
    connections: { used: 0, total: 'Unlimited' }
  });

  const { 
    isVisible: isTutorialVisible,
    currentStep,
    totalSteps,
    stepData,
    handleNext,
    handlePrevious,
    handleSkip,
    completeTutorial,
  } = useContext(TutorialContext);

  // Get initialTab from navigation params
  useEffect(() => {
    const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
    debugLog('MBA54321 MyProfile navigation params', params);
    
    if (params?.initialTab) {
      debugLog('MBA54321 MyProfile received initialTab param', { initialTab: params.initialTab });
      setActiveTab(params.initialTab);
    } else if (params?.screen) {
      debugLog('MBA54321 MyProfile received screen param', { screen: params.screen });
      setActiveTab(params.screen);
    } else if (stepData?.tab) {
      debugLog('MBA54321 MyProfile received tab from stepData', { tab: stepData.tab });
      setActiveTab(stepData.tab);
    }
  }, [navigation, stepData]);

  // Add a new useEffect to handle tab changes from the tutorial
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
      if (params?.screen) {
        debugLog('MBA54321 MyProfile focus event - setting active tab', { screen: params.screen });
        setActiveTab(params.screen);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Add a new useEffect to handle tab changes from the tutorial
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
      if (params?.screen) {
        debugLog('MBA54321 MyProfile state change - setting active tab', { screen: params.screen });
        setActiveTab(params.screen);
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
      setIsWideScreen(screenWidth >= 1200);
    };
    updateLayout();
  }, [screenWidth]);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const data = await userProfile();
      setProfileData(data);
      debugLog('MBA1234', 'Profile data loaded:', data);
    } catch (err) {
      setError('Failed to load profile data');
      debugLog('MBA1234', 'Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      debugLog('MBA1234', 'Error during logout:', err);
    }
  };

  const tabs = [
    { id: 'profile_info', label: userRole === 'professional' ? 'Professional Profile Info' : 'Owner Profile Info' },
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
    debugLog('MBA1234sx2xfdg', 'Rendering active tab:', activeTab);
    debugLog('MBA1234sx2xfdg', 'Profile data:', profileData);
    debugLog('MBA1234sx2xfdg', 'User role:', userRole);
    debugLog('MBA1234sx2xfdg', 'Edit mode:', editMode);
    debugLog('MBA1234sx2xfdg', 'Has unsaved changes:', hasUnsavedChanges);
    
    switch (activeTab) {
      case 'profile_info':
        return (
          <ProfileInfoTab
            profilePhoto={profileData?.profilePhoto}
            email={profileData?.email}
            phone={profileData?.phone}
            age={profileData?.age}
            address={profileData?.address}
            city={profileData?.city}
            state={profileData?.state}
            zip={profileData?.zip}
            country={profileData?.country}
            bio={profileData?.bio}
            about_me={profileData?.about_me}
            emergencyContact={profileData?.emergency_contact}
            authorizedHouseholdMembers={profileData?.authorized_household_members}
            editMode={editMode}
            toggleEditMode={toggleEditMode}
            onChangeText={handleUpdateField}
            pickImage={handlePickImage}
            setHasUnsavedChanges={setHasUnsavedChanges}
            isMobile={isMobile}
            rating={profileData?.rating}
            reviews={profileData?.reviews}
            role={userRole}
            isProfessional={userRole === 'professional'}
            insurance={profileData?.insurance}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'services_availability':
        return (
          <ServicesAvailabilityTab
            services={profileData?.services}
            onToggleService={(id) => {
              const updatedServices = profileData?.services.map(s => 
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
            pets={profileData?.pets}
            onAddPet={() => navigation.navigate('AddPet')}
            onEditPet={(id) => navigation.navigate('EditPet', { petId: id })}
            onDeletePet={() => {}}
            preferences={profileData?.preferences}
            onUpdatePreferences={(section, id) => {
              const updatedPreferences = { ...profileData?.preferences };
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
                description: 'Make your profile visible to potential owners',
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
            paymentMethods={profileData?.paymentMethods || []}
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

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

        {isTutorialVisible && stepData?.screen === 'MyProfile' && (
          <TutorialModal
            step={currentStep}
            totalSteps={totalSteps}
            title={stepData.title}
            description={stepData.description}
            position={stepData.position}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            onClose={completeTutorial}
          />
        )}
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MyProfile;
