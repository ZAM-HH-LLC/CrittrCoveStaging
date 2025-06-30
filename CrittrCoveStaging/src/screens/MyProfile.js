import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Image, Platform, StatusBar, Alert, useWindowDimensions, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Button, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext, debugLog, getStorage, setStorage } from '../context/AuthContext';
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
import { userProfile, updateProfileInfo } from '../api/API';

const MyProfile = () => {
  debugLog('MBA3ou4bg54ug: MyProfile component rendering/mounting');
  
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, is_DEBUG, userRole, isApprovedProfessional, user, logout } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const [isWideScreen, setIsWideScreen] = useState(screenWidth >= 1200);
  const styles = createStyles(screenWidth, isCollapsed);
  const [activeTab, setActiveTab] = useState('profile_info');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track when profile was last loaded
  const lastProfileLoadRef = useRef(0);
  // Flag to prevent multiple concurrent API calls
  const isLoadingProfileRef = useRef(false);
  // Track component mounted state
  const isMountedRef = useRef(true);
  
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

  // Set mounted flag to false when component unmounts
  useEffect(() => {
    return () => {
      debugLog('MBA3ou4bg54ug: MyProfile component unmounting');
      isMountedRef.current = false;
    };
  }, []);

  const loadActiveTab = useCallback(async () => {
    try {
      // First, check URL parameters directly when on web
      if (Platform.OS === 'web') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromUrl = urlParams.get('initialTab') || urlParams.get('screen');
        
        if (tabFromUrl && ['profile_info', 'pets_preferences', 'settings_payments', 'services_availability'].includes(tabFromUrl)) {
          debugLog('MBA3ou4bg54ug: Retrieved tab from URL params', { tabFromUrl });
          setActiveTab(tabFromUrl);
          // Store this tab in storage for persistence
          await setStorage('MyProfileActiveTab', tabFromUrl);
          return;
        }
      }
      
      // Then check navigation params
      const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
      debugLog('MBA3ou4bg54ug: Navigation params', params);
      
      if (params?.initialTab) {
        debugLog('MBA3ou4bg54ug: Received initialTab param', { initialTab: params.initialTab });
        setActiveTab(params.initialTab);
        await setStorage('MyProfileActiveTab', params.initialTab);
        return;
      } else if (params?.screen) {
        debugLog('MBA3ou4bg54ug: Received screen param', { screen: params.screen });
        setActiveTab(params.screen);
        await setStorage('MyProfileActiveTab', params.screen);
        return;
      } else if (stepData?.tab) {
        debugLog('MBA3ou4bg54ug: Received tab from stepData', { tab: stepData.tab });
        setActiveTab(stepData.tab);
        await setStorage('MyProfileActiveTab', stepData.tab);
        return;
      }
      
      // If we reach here, attempt to load from storage
      const storedTab = await getStorage('MyProfileActiveTab');
      if (storedTab) {
        debugLog('MBA3ou4bg54ug: Loaded tab from storage', { storedTab });
        setActiveTab(storedTab);
      }
    } catch (error) {
      debugLog('MBA3ou4bg54ug: Error loading active tab', error);
    }
  }, [navigation, stepData]);

  // Safely fix pet owners without triggering a profile reload
  const checkAndFixPetOwners = useCallback(async (pets) => {
    if (!pets || pets.length === 0) return;
    
    try {
      const petsWithMissingOwners = pets.filter(pet => 
        pet.lastUpdateFailed || pet.ownerMissing
      );
      
      if (petsWithMissingOwners.length > 0) {
        debugLog('MBA3ou4bg54ug: Found pets with potential missing owners:', petsWithMissingOwners.length);
        
        // Try to fix each pet
        for (const pet of petsWithMissingOwners) {
          try {
            const { fixPetOwner } = require('../api/API');
            await fixPetOwner(pet.id);
            debugLog('MBA3ou4bg54ug: Fixed pet owner successfully:', pet.id);
          } catch (err) {
            debugLog('MBA3ou4bg54ug: Failed to fix pet owner:', err);
          }
        }
      }
    } catch (error) {
      debugLog('MBA3ou4bg54ug: Error checking/fixing pet owners:', error);
    }
  }, []);

  const loadProfileData = useCallback(async () => {
    // Prevent concurrent API calls
    if (isLoadingProfileRef.current) {
      debugLog('MBA3ou4bg54ug: Profile data load already in progress, skipping');
      return;
    }

    // Check if we should reload based on time
    const now = Date.now();
    const timeSinceLastLoad = now - lastProfileLoadRef.current;
    if (profileData && timeSinceLastLoad < 5000) {
      debugLog('MBA3ou4bg54ug: Profile data loaded recently, skipping reload', { 
        timeSinceLastLoad: Math.round(timeSinceLastLoad / 1000) + 's' 
      });
      return;
    }

    try {
      isLoadingProfileRef.current = true;
      
      if (isMountedRef.current) setLoading(true);
      if (isMountedRef.current) setError(null);
      
      debugLog('MBA3ou4bg54ug: Starting profile data load');
      const response = await userProfile();
      
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from API');
      }
      
      debugLog('MBA3ou4bg54ug: Profile data loaded successfully');
      
      // Process the response
      const processedResponse = {
        ...response,
        profilePhoto: response.profile_photo || null
      };
      
      // Update the profile data state if the component is still mounted
      if (isMountedRef.current) {
        setProfileData(processedResponse);
        setLoading(false);
      }
      
      // Record successful load time
      lastProfileLoadRef.current = Date.now();
      
      // Process pets if needed (without triggering another profile load)
      await checkAndFixPetOwners(response.pets);
      
      // Load active tab after data is ready
      if (isMountedRef.current) {
        setTimeout(() => {
          loadActiveTab();
        }, 100);
      }
    } catch (error) {
      debugLog('MBA3ou4bg54ug: Failed to load profile data:', error);
      
      if (isMountedRef.current) {
        // Only show error if we don't have existing data
        if (!profileData) {
          setError('Failed to load profile data');
        }
        setLoading(false);
      }
    } finally {
      isLoadingProfileRef.current = false;
    }
  }, [checkAndFixPetOwners, loadActiveTab]);

  // Initial data load on mount
  useEffect(() => {
    debugLog('MBA3ou4bg54ug: Initial profile data load');
    loadProfileData();
    
    // Load active tab independently
    loadActiveTab();
  }, []); // Empty dependency array to run only once on mount

  // Handle focus events (when returning to this screen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Only reload data if sufficient time has passed since the last load
      const now = Date.now();
      const timeSinceLastLoad = now - lastProfileLoadRef.current;
      const shouldReload = !profileData || timeSinceLastLoad > 60000;
      
      if (shouldReload) {
        debugLog('MBA3ou4bg54ug: Focus event - reloading profile data', {
          timeSinceLastLoad: Math.round(timeSinceLastLoad / 1000) + 's'
        });
        loadProfileData();
      } else {
        debugLog('MBA3ou4bg54ug: Focus event - using existing profile data', {
          timeSinceLastLoad: Math.round(timeSinceLastLoad / 1000) + 's'
        });
      }
    });

    return unsubscribe;
  }, [navigation, loadProfileData]);

  // Store the active tab whenever it changes
  useEffect(() => {
    const storeActiveTab = async () => {
      try {
        await setStorage('MyProfileActiveTab', activeTab);
        
        // Update URL params without reloading the page
        if (Platform.OS === 'web') {
          const url = new URL(window.location.href);
          url.searchParams.set('initialTab', activeTab);
          window.history.replaceState({}, '', url.toString());
        }
        
        debugLog('MBA3ou4bg54ug: Stored active tab', { activeTab });
      } catch (error) {
        debugLog('MBA3ou4bg54ug: Error storing active tab', error);
      }
    };
    
    if (activeTab) {
      storeActiveTab();
    }
  }, [activeTab]);

  // Handle navigation state changes (tab selection from params)
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      try {
        const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
        
        if (params?.screen) {
          debugLog('MBA3ou4bg54ug: State change - setting active tab', { screen: params.screen });
          setActiveTab(params.screen);
        } else if (params?.initialTab) {
          debugLog('MBA3ou4bg54ug: State change - setting active tab', { initialTab: params.initialTab });
          setActiveTab(params.initialTab);
        }
      } catch (error) {
        debugLog('MBA3ou4bg54ug: Error handling navigation state change', error);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Handle screen dimension changes
  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
      setIsWideScreen(screenWidth >= 1200);
    };
    updateLayout();
  }, [screenWidth]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      debugLog('MBA3ou4bg54ug: Error during logout:', err);
    }
  };

  const tabs = [
    { id: 'profile_info', label: userRole === 'professional' ? 'Professional Profile Info' : 'Owner Profile Info' },
    // ...(userRole === 'professional' ? [{ id: 'services_availability', label: 'Services & Availability' }] : []), TODO: Add back in after MVP
    { id: 'pets_preferences', label: 'My Pets' },
    // { id: 'pets_preferences', label: 'Pets & Preferences' }, // TODO: Add back in after MVP
    { id: 'settings_payments', label: 'Settings' }
    // { id: 'settings_payments', label: userRole === 'professional' ? 'Settings & Payout Methods' : 'Settings & Payment Methods' } // TODO: Add back in after MVP
  ];

  const handlePickImage = async () => {
    // This function is now just a stub that returns a promise
    // The actual image picking and uploading is handled in ProfileInfoTab
    return null;
  };

  // Handle save completion from child components
  const handleSaveComplete = (updatedProfile) => {
    debugLog('MBA3ou4bg54ug: Save completed with updated profile');
    
    // Update the profileData with the saved data
    setProfileData(prev => {
      const newProfileData = {
        ...prev,
        ...updatedProfile
      };
      
      // Ensure profilePhoto is set from either property name
      if (updatedProfile.profile_photo) {
        newProfileData.profilePhoto = updatedProfile.profile_photo;
        newProfileData.profile_photo = updatedProfile.profile_photo;
      } else if (updatedProfile.profilePhoto) {
        newProfileData.profile_photo = updatedProfile.profilePhoto;
        newProfileData.profilePhoto = updatedProfile.profilePhoto;
      }
      
      return newProfileData;
    });
    
    // Reset state flags
    setHasUnsavedChanges(false);
    setEditMode({});
    
    // Update last profile load timestamp to prevent unnecessary reloads
    lastProfileLoadRef.current = Date.now();
  };

  // Handle field updates before saving
  const handleUpdateField = (field, value) => {
    debugLog('MBA3ou4bg54ug: Updating field locally:', field);
    
    // Only update local state, actual save will happen in the child component
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Mark that we have unsaved changes
    setHasUnsavedChanges(true);
  };

  const toggleEditMode = (section) => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSwitchPlan = (planId) => {
    // TODO: Implement API call to switch plans
    debugLog('MBA3ou4bg54ug: Switching to plan:', planId);
  };

  const renderActiveTab = () => {
    debugLog('MBA3ou4bg54ug: Rendering active tab', { activeTab });
    
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
            coordinates={profileData?.coordinates}
            bio={profileData?.bio}
            about_me={profileData?.about_me}
            name={profileData?.name}
            emergencyContact={profileData?.emergency_contact}
            authorizedHouseholdMembers={profileData?.authorized_household_members}
            editMode={editMode}
            toggleEditMode={toggleEditMode}
            onChangeText={handleUpdateField}
            pickImage={handlePickImage}
            setHasUnsavedChanges={(hasChanges) => {
              debugLog('MBA9876', 'ProfileInfoTab setting hasUnsavedChanges:', hasChanges);
              setHasUnsavedChanges(hasChanges);
            }}
            onSaveComplete={handleSaveComplete}
            isMobile={isMobile}
            rating={profileData?.rating}
            reviews={profileData?.reviews}
            role={userRole}
            isProfessional={userRole === 'professional'}
            insurance={profileData?.insurance}
            onNavigateToTab={setActiveTab}
            navigation={navigation}
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
            onAddPet={(newPet) => {
              // Check if the pet should be added to the top of the list
              const shouldAddToTop = newPet._addToTop;
              
              // Remove the _addToTop flag before adding to state
              const { _addToTop, ...petToAdd } = newPet;
              
              // Add the new pet to the local state (at the top or bottom)
              const updatedPets = shouldAddToTop 
                ? [petToAdd, ...(profileData?.pets || [])] 
                : [...(profileData?.pets || []), petToAdd];
                
              handleUpdateField('pets', updatedPets);
              
              // This will mark that there are unsaved changes
              debugLog('MBA5432', 'Added new pet locally:', petToAdd, shouldAddToTop ? '(at top of list)' : '(at bottom of list)');
            }}
            onEditPet={(petId, updatedPetData) => {
              // Update the existing pet in local state
              const updatedPets = (profileData?.pets || []).map(pet => 
                pet.id === petId ? { ...pet, ...updatedPetData } : pet
              );
              handleUpdateField('pets', updatedPets);
              debugLog('MBA5432', 'Updated pet locally:', { petId, updatedPetData });
            }}
            onDeletePet={(petId) => {
              // Remove the pet from local state
              const updatedPets = (profileData?.pets || []).filter(pet => pet.id !== petId);
              handleUpdateField('pets', updatedPets);
              debugLog('MBA5432', 'Deleted pet locally:', petId);
            }}
            onReplacePet={(newPetsArray) => {
              // Replace the entire pets array with the new one
              // This prevents the issue with double updates causing blank pets
              handleUpdateField('pets', newPetsArray);
              debugLog('MBA5432', 'Replaced entire pets array:', newPetsArray);
            }}
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
        debugLog('MBA54321 Rendering settings_payments tab with payment methods:', {
          paymentMethods: profileData?.payment_methods
        });
        return (
          <SettingsPaymentsTab
            {...profileData}
            navigation={navigation}
            onUpdateSetting={(id, value) => {
              debugLog('Updating setting:', { id, value });
              // Create an update object with just the changed setting
              const updateData = { [id]: value };
              
              // Return the promise for proper chaining in the component
              return updateProfileInfo(updateData)
                .then(updatedProfile => {
                  // Update the profile data with the response
                  setProfileData(prev => ({
                    ...prev,
                    ...updatedProfile
                  }));
                  debugLog('MBA54321 Setting updated successfully:', updateData);
                  // Return the updated profile for the promise chain
                  return updatedProfile;
                });
            }}
            paymentMethods={profileData?.payment_methods || []}
            onAddPaymentMethod={() => navigation.navigate('AddPaymentMethod')}
            onRemovePaymentMethod={(id) => {
              debugLog('Removing payment method:', id);
              // TODO: Implement API call to remove payment method
            }}
            onSetDefaultPayment={(id) => {
              debugLog('Setting default payment method:', id);
              // TODO: Implement API call to set default payment method
            }}
            currentPlan={profileData?.currentPlan || currentPlan}
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

  // Show loading indicator if we're loading AND don't have existing data
  if (loading && !profileData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Only show error if we have an error AND don't have existing data to display
  if (error && !profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  // If loading with existing data, we'll render the UI with the existing data

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>        
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
                      onPress={() => {
                        if (activeTab !== tab.id) {
                          debugLog('MBA3ou4bg54ug: Tab clicked - changing to', { tab: tab.id });
                          setActiveTab(tab.id);
                          // Update URL params without navigation
                          if (Platform.OS === 'web') {
                            const url = new URL(window.location.href);
                            url.searchParams.set('initialTab', tab.id);
                            window.history.replaceState({}, '', url.toString());
                          }
                        }
                      }}
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    height: '100%',
    overflow: 'auto',
    backgroundColor: theme.colors.surface,
  },
  mainContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
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
    gap: screenWidth <= 900 ? 22 : 32,
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
