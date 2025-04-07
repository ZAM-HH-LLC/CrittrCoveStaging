import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { AuthContext } from './AuthContext';
import { debugLog } from './AuthContext';
import { navigateToFrom } from '../components/Navigation';
import TutorialModal from '../components/TutorialModal';

export const TutorialContext = createContext();

const defaultTutorialStatus = {
  first_time_logging_in: true,
  first_time_logging_in_after_signup: true,
  done_pro_profile_tutorial: false,
  done_client_profile_tutorial: false,
  done_client_dashboard_tutorial: false,
  done_pets_preferences_tutorial: false,
  done_settings_payments_tutorial: false,
  done_search_pros_tutorial: false,
  done_become_pro_tutorial: false,
};

const tutorialSteps = {
  client: [
    {
      screen: 'MyProfile',
      tab: 'profile_info',
      title: 'Welcome to Your Profile',
      description: 'This is where you can manage your personal information. Start by completing your profile to help professionals understand your needs better.',
      position: 'bottomRight',
    },
    {
      screen: 'MyProfile',
      tab: 'pets_preferences',
      title: 'Add Your Pets',
      description: 'Add/Edit information about your pets and their care preferences. This helps professionals provide the best care possible.',
      position: 'bottomRight',
    },
    {
      screen: 'MyProfile',
      tab: 'settings_payments',
      title: 'Payment Settings',
      description: 'Set up your payment methods and subscription preferences to easily book services.',
      position: 'bottomRight',
    },
    {
      screen: 'Dashboard',
      title: 'Your Dashboard',
      description: 'Here you can view your upcoming bookings, track ongoing services, and manage your account.',
      position: 'bottomRight',
      onStepEnter: (navigation) => {
        navigateToFrom(navigation, 'Dashboard', 'MyProfile');
      }
    },
    {
      screen: 'SearchProfessionals',
      title: 'Find Professionals',
      description: 'Search for qualified professionals in your area. Filter by service type, availability, and more.',
      position: 'bottomRight',
    },
    {
      screen: 'BecomeProfessional',
      title: 'Become a Professional',
      description: 'Want to offer your services? You can switch to a professional account anytime.',
      position: 'bottomRight',
    },
  ],
  professional: [
    {
      screen: 'MyProfile',
      tab: 'profile_info',
      title: 'Welcome to Your Professional Profile',
      description: 'This is where you can manage your professional information. Start by completing your profile to help clients find you.',
      position: 'bottomRight',
    },
    {
      screen: 'MyProfile',
      tab: 'services',
      title: 'Your Services',
      description: 'Add and manage the services you offer. Set your rates, availability, and service areas.',
      position: 'bottomRight',
    },
    {
      screen: 'MyProfile',
      tab: 'settings_payments',
      title: 'Payment Settings',
      description: 'Set up your payment methods and subscription preferences to receive payments from clients.',
      position: 'bottomRight',
    },
    {
      screen: 'Dashboard',
      title: 'Your Dashboard',
      description: 'Here you can view your upcoming bookings, track ongoing services, and manage your account.',
      position: 'bottomRight',
      onStepEnter: (navigation) => {
        navigateToFrom(navigation, 'Dashboard', 'MyProfile');
      }
    },
    {
      screen: 'SearchClients',
      title: 'Find Clients',
      description: 'Search for potential clients in your area. Filter by service type, pet type, and more.',
      position: 'bottomRight',
    },
  ],
  // Default steps for when userRole is not set
  default: [
    {
      screen: 'Home',
      title: 'Welcome',
      description: 'Welcome to CrittrCove! Let\'s get started with a quick tour.',
      position: 'bottomRight',
    }
  ]
};

export const TutorialProvider = ({ children }) => {
  const { isSignedIn, userRole, is_DEBUG, navigation } = useContext(AuthContext);
  const [tutorialStatus, setTutorialStatus] = useState(defaultTutorialStatus);
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      fetchTutorialStatus();
    } else {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  const fetchTutorialStatus = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/users/v1/tutorial-status/current/`);
      if (is_DEBUG) {
        debugLog('MBA54321 Tutorial status:', response.data);
      }
      setTutorialStatus(response.data);
      setHasError(false);
      setErrorMessage('');
      
      // Show tutorial if it's first time or not completed
      if (response.data.first_time_logging_in || 
          response.data.first_time_logging_in_after_signup || 
          (userRole === 'professional' && !response.data.done_pro_profile_tutorial) ||
          (userRole !== 'professional' && !response.data.done_client_profile_tutorial)) {
        setIsVisible(true);
        
        // Redirect new users to MyProfile screen
        if (response.data.first_time_logging_in || 
            response.data.first_time_logging_in_after_signup) {
          if (is_DEBUG) {
            debugLog('MBA54321 Redirecting new user to MyProfile screen');
          }
          // Use setTimeout to ensure navigation happens after render
          setTimeout(() => {
            if (navigation) {
              navigation.navigate('MyProfile', { screen: 'profile_info' });
            }
          }, 100);
        }
        
        if (is_DEBUG) {
          debugLog('MBA54321 Tutorial should be visible:', {
            first_time_logging_in: response.data.first_time_logging_in,
            first_time_logging_in_after_signup: response.data.first_time_logging_in_after_signup,
            userRole,
            done_client_profile_tutorial: response.data.done_client_profile_tutorial,
            done_pro_profile_tutorial: response.data.done_pro_profile_tutorial
          });
        }
      } else {
        if (is_DEBUG) {
          debugLog('MBA54321 Tutorial should NOT be visible');
        }
      }
    } catch (error) {
      console.error('Error fetching tutorial status:', error);
      setHasError(true);
      setErrorMessage('We had trouble loading your tutorial settings, but you can still proceed with the tutorial.');
      // Show tutorial with default settings if there's an error
      setTutorialStatus(defaultTutorialStatus);
      setIsVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTutorialStatus = async (updates) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/users/v1/tutorial-status/update_status/`,
        updates
      );
      if (is_DEBUG) {
        debugLog('MBA54321 Tutorial status updated:', response.data);
      }
      setTutorialStatus(response.data);
      setHasError(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Error updating tutorial status:', error);
      setHasError(true);
      setErrorMessage('We had trouble saving your tutorial progress, but you can continue using the app.');
      // Continue with local state even if server update fails
      setTutorialStatus(prev => ({ ...prev, ...updates }));
    }
  };

  const getCurrentStepData = () => {
    // Determine which steps to use based on userRole
    let roleKey = 'default';
    if (userRole === 'professional') {
      roleKey = 'professional';
    } else if (userRole === 'petOwner' || userRole === 'client') {
      roleKey = 'client';
    }
    
    const steps = tutorialSteps[roleKey] || tutorialSteps.default;
    
    // Make sure currentStep is within bounds
    const safeCurrentStep = Math.min(Math.max(1, currentStep), steps.length);
    
    // Get the step data
    const stepData = steps[safeCurrentStep - 1];
    
    // If there's an error, add it to the first step's description
    if (hasError && safeCurrentStep === 1) {
      return {
        ...stepData,
        description: `${errorMessage}\n\n${stepData.description}`
      };
    }
    
    return stepData;
  };

  const handleNext = () => {
    const roleKey = userRole === 'professional' ? 'professional' : 
                   (userRole === 'petOwner' || userRole === 'client') ? 'client' : 'default';
    const steps = tutorialSteps[roleKey] || tutorialSteps.default;
    const currentStepData = steps[currentStep - 1];
    
    if (is_DEBUG) {
      debugLog('MBA54321 Handling next step:', {
        currentStep,
        totalSteps: steps.length,
        nextScreen: currentStep < steps.length ? steps[currentStep].screen : 'none',
        currentScreen: currentStepData.screen
      });
    }
    
    // Execute onStepEnter if it exists
    if (currentStepData && currentStepData.onStepEnter) {
      if (is_DEBUG) {
        debugLog('MBA54321 Executing onStepEnter for screen:', currentStepData.screen);
      }
      currentStepData.onStepEnter(navigation);
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      
      // If the next step is on a different screen, we need to navigate
      const nextStepData = steps[currentStep];
      if (nextStepData && nextStepData.screen !== currentStepData.screen) {
        if (is_DEBUG) {
          debugLog('MBA54321 Next step is on a different screen:', {
            currentScreen: currentStepData.screen,
            nextScreen: nextStepData.screen
          });
        }
        
        // Navigate to the next screen
        if (navigation) {
          if (nextStepData.tab) {
            navigateToFrom(navigation, nextStepData.screen, currentStepData.screen);
          } else {
            navigateToFrom(navigation, nextStepData.screen, currentStepData.screen);
          }
          
          // Ensure tutorial stays visible when changing screens
          setTimeout(() => {
            setIsVisible(true);
          }, 100);
        }
      }
    } else {
      completeTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = async () => {
    try {
      // Update the tutorial status in the backend
      const updates = {};
      
      // Determine which tutorial to mark as completed based on user role
      if (userRole === 'professional') {
        updates.done_pro_profile_tutorial = true;
      } else {
        updates.done_client_profile_tutorial = true;
      }
      
      // Also update first_time_logging_in flags
      updates.first_time_logging_in = false;
      updates.first_time_logging_in_after_signup = false;
      
      if (is_DEBUG) {
        debugLog('MBA54321 Completing tutorial with updates:', updates);
      }
      
      // Update the tutorial status in the backend
      await axios.patch(`${API_BASE_URL}/api/users/v1/tutorial-status/update_status/`, updates);
      
      // Update local state
      setTutorialStatus(prev => ({
        ...prev,
        ...updates
      }));
      
      // Hide the tutorial
      setIsVisible(false);
      
      // Navigate to the dashboard
      if (navigation) {
        navigateToFrom(navigation, 'Dashboard', 'Tutorial');
      }
    } catch (error) {
      console.error('Error completing tutorial:', error);
      if (is_DEBUG) {
        debugLog('MBA54321 Error completing tutorial:', error);
      }
      
      // Still hide the tutorial even if there's an error
      setIsVisible(false);
      
      // Navigate to the dashboard
      if (navigation) {
        navigateToFrom(navigation, 'Dashboard', 'Tutorial');
      }
    }
  };

  // If still loading, return a loading state
  if (isLoading) {
    return (
      <TutorialContext.Provider
        value={{
          isVisible: false,
          currentStep: 1,
          totalSteps: 1,
          stepData: tutorialSteps.default[0],
          tutorialStatus: defaultTutorialStatus,
          hasError: false,
          errorMessage: '',
          handleNext: () => {},
          handlePrevious: () => {},
          handleSkip: () => {},
          completeTutorial: () => {},
          setIsVisible: () => {},
          isLoading: true
        }}
      >
        {children}
      </TutorialContext.Provider>
    );
  }

  const currentStepData = getCurrentStepData();
  const steps = tutorialSteps[userRole === 'professional' ? 'professional' : 
               (userRole === 'petOwner' || userRole === 'client') ? 'client' : 'default'] || 
               tutorialSteps.default;

  return (
    <TutorialContext.Provider
      value={{
        isVisible,
        setIsVisible,
        currentStep,
        setCurrentStep,
        handleNext,
        handlePrevious,
        handleSkip,
        completeTutorial,
        isLoading,
      }}
    >
      {children}
      {isVisible && currentStepData && (
        <TutorialModal
          step={currentStep}
          totalSteps={steps.length}
          title={currentStepData.title}
          description={currentStepData.description}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onClose={() => setIsVisible(false)}
          position={currentStepData.position}
          userRole={userRole}
          is_DEBUG={is_DEBUG}
        />
      )}
    </TutorialContext.Provider>
  );
}; 