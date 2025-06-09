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
  debugLog('MBA5678: MyProfile component rendering/mounting');
  
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

  const loadActiveTab = useCallback(async () => {
    try {
      // First, check URL parameters directly when on web
      if (Platform.OS === 'web') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromUrl = urlParams.get('initialTab') || urlParams.get('screen');
        
        if (tabFromUrl && ['profile_info', 'pets_preferences', 'settings_payments', 'services_availability'].includes(tabFromUrl)) {
          debugLog('MBAuieo2o34nf MyProfile retrieved tab from URL params', { tabFromUrl });
          setActiveTab(tabFromUrl);
          // Store this tab in storage for persistence
          await setStorage('MyProfileActiveTab', tabFromUrl);
          return;
        }
      }
      
      // Then check navigation params
      const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
      debugLog('MBAuieo2o34nf MyProfile navigation params', params);
      
      if (params?.initialTab) {
        debugLog('MBAuieo2o34nf MyProfile received initialTab param', { initialTab: params.initialTab });
        setActiveTab(params.initialTab);
        await setStorage('MyProfileActiveTab', params.initialTab);
        return;
      } else if (params?.screen) {
        debugLog('MBAuieo2o34nf MyProfile received screen param', { screen: params.screen });
        setActiveTab(params.screen);
        await setStorage('MyProfileActiveTab', params.screen);
        return;
      } else if (stepData?.tab) {
        debugLog('MBAuieo2o34nf MyProfile received tab from stepData', { tab: stepData.tab });
        setActiveTab(stepData.tab);
        await setStorage('MyProfileActiveTab', stepData.tab);
        return;
      }
      
      // If we reach here, attempt to load from storage
      const storedTab = await getStorage('MyProfileActiveTab');
      if (storedTab) {
        debugLog('MBAuieo2o34nf MyProfile loaded tab from storage', { storedTab });
        setActiveTab(storedTab);
      }
    } catch (error) {
      debugLog('MBAuieo2o34nf Error loading active tab', error);
    }
  }, [navigation, stepData]);

  const checkAndFixPetOwners = useCallback(async () => {
    try {
      // Check if we have any pets that need fixing
      if (profileData?.pets && profileData.pets.length > 0) {
        const petsWithMissingOwners = profileData.pets.filter(pet => {
          // Try to determine if a pet might have a missing owner
          // Unfortunately we can't directly check the owner field from frontend
          // So we look for potential symptoms like 404 errors on editing
          if (pet.lastUpdateFailed || pet.ownerMissing) {
            return true;
          }
          return false;
        });
        
        if (petsWithMissingOwners.length > 0) {
          debugLog('MBA5432', 'Found pets with potential missing owners:', petsWithMissingOwners);
          
          // Try to fix each pet
          for (const pet of petsWithMissingOwners) {
            try {
              const { fixPetOwner } = require('../api/API');
              const result = await fixPetOwner(pet.id);
              debugLog('MBA5432', 'Fixed pet owner successfully:', result);
            } catch (err) {
              debugLog('MBA5432', 'Failed to fix pet owner:', err);
            }
          }
          
          // Reload profile data to get updated pets
          const response = await userProfile();
          setProfileData(response);
        }
      }
    } catch (error) {
      debugLog('MBA5432', 'Error checking/fixing pet owners:', error);
    }
  }, [profileData]);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      // Log the userToken before making the API call
      const token = await getStorage('userToken');
      debugLog('MBA5678: userToken before userProfile call:', token);
      const response = await userProfile();
      setProfileData(response);
      
      // Check for pets with missing owners and fix them if needed
      await checkAndFixPetOwners();
      
      setLoading(false);
      
      // Wait for the tab to be loaded before trying to update active tab from URL
      setTimeout(() => {
        loadActiveTab();
      }, 100);
    } catch (error) {
      setError('Failed to load profile data');
      setLoading(false);
      debugLog('Failed to load profile data:', error);
    }
  }, [checkAndFixPetOwners, loadActiveTab]);

  // Get initialTab from navigation params
  useEffect(() => {
    loadActiveTab();
  }, [loadActiveTab]);

  // Add a new useEffect to handle tab changes from the tutorial
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reload profile data when screen comes into focus
      debugLog('MBA54321 MyProfile focus event - reloading profile data');
      loadProfileData();
      
      // Existing tab handling code
      const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
      if (params?.screen) {
        debugLog('MBA54321 MyProfile focus event - setting active tab', { screen: params.screen });
        setActiveTab(params.screen);
      } else if (params?.initialTab) {
        debugLog('MBA54321 MyProfile focus event - setting active tab', { initialTab: params.initialTab });
        setActiveTab(params.initialTab);
      }
    });

    return unsubscribe;
  }, [navigation, loadProfileData, setActiveTab]);

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
        
        debugLog('MBAuieo2o34nf Stored active tab', { activeTab });
      } catch (error) {
        debugLog('MBAuieo2o34nf Error storing active tab', error);
      }
    };
    
    if (activeTab) {
      storeActiveTab();
    }
  }, [activeTab]);

  // Add a new useEffect to handle tab changes from the tutorial
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
      if (params?.screen) {
        debugLog('MBA54321 MyProfile state change - setting active tab', { screen: params.screen });
        setActiveTab(params.screen);
      } else if (params?.initialTab) {
        debugLog('MBA54321 MyProfile state change - setting active tab', { initialTab: params.initialTab });
        setActiveTab(params.initialTab);
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      debugLog('MBA1234', 'Error during logout:', err);
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

  // Handle save completion from child components
  const handleSaveComplete = (updatedProfile) => {
    debugLog('MBA9876', 'Save completed with updated profile:', updatedProfile);
    
    // Update the profileData with the saved data
    setProfileData(prev => {
      const newProfileData = {
        ...prev,
        ...updatedProfile
      };
      
      // Log the updated profile data for debugging
      debugLog('MBA9876', 'Updated profile data after save:', {
        name: newProfileData.name,
        email: newProfileData.email,
        address: newProfileData.address,
        city: newProfileData.city,
        state: newProfileData.state,
        zip: newProfileData.zip,
        country: newProfileData.country
      });
      
      return newProfileData;
    });
    
    // Reset state flags
    setHasUnsavedChanges(false);
    setEditMode({});
    
    // Show success indicator if needed
    debugLog('MBA5678', 'Changes saved successfully');
  };

  // Handle field updates before saving
  const handleUpdateField = (field, value) => {
    debugLog('MBA9876', `Updating field ${field} locally, will be saved later:`, value);
    
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
    debugLog('Switching to plan:', planId);
  };

  const renderActiveTab = () => {
    debugLog('MBA54321', 'Rendering active tab with profile data:', {
      activeTab,
      profileName: profileData?.name,
      paymentMethods: profileData?.payment_methods
    });
    
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
                      onPress={async () => {
                        setActiveTab(tab.id);
                        // Update URL params without navigation
                        if (Platform.OS === 'web') {
                          const url = new URL(window.location.href);
                          url.searchParams.set('initialTab', tab.id);
                          window.history.replaceState({}, '', url.toString());
                        }
                        // Store in storage
                        await setStorage('MyProfileActiveTab', tab.id);
                        debugLog('MBAuieo2o34nf Tab clicked - updated storage', { tabId: tab.id });
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
