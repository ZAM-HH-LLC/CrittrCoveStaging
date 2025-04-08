import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { AuthContext } from './AuthContext';
import { debugLog } from './AuthContext';
import { navigateToFrom } from '../components/Navigation';
import TutorialModal from '../components/TutorialModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useNavigation } from '@react-navigation/native';

export const TutorialContext = createContext();

const defaultTutorialStatus = {
  done_client_tutorial: false,
  done_pro_tutorial: false,
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
      title: 'Add Pets & Home Info',
      description: 'Add information about your pets and their care preferences along with your home information. This helps professionals provide the best care possible.',
      position: 'bottomRight',
    },
    {
      screen: 'MyProfile',
      tab: 'settings_payments',
      title: 'Payment & Settings',
      description: 'Set up your settings, payment methods, and subscription preferences to easily book services.',
      position: 'bottomRight',
    },
    {
      screen: 'Dashboard',
      title: 'Your Dashboard',
      description: 'Here you can view your upcoming bookings, track ongoing services, and manage your account.',
      position: 'bottomRight',
      onStepEnter: (navigation) => {
        if (navigation) {
          navigation.navigate('Dashboard');
        }
      }
    },
    {
      screen: 'SearchProfessionalsListing',
      title: 'Find Professionals',
      description: 'Search for qualified professionals in your area. Filter by service type, availability, and more.',
      position: 'bottomRight',
    },
    {
      screen: 'BecomeProfessional',
      title: 'Become a Professional',
      description: 'Want to offer your services? You can apply to become a professional anytime.',
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
        if (navigation) {
          navigation.navigate('Dashboard');
        }
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
  const { isSignedIn, userRole, is_DEBUG } = useContext(AuthContext);
  const navigation = useNavigation();
  const [tutorialStatus, setTutorialStatus] = useState(defaultTutorialStatus);
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [skipConfirmationVisible, setSkipConfirmationVisible] = useState(false);
  const [closeConfirmationVisible, setCloseConfirmationVisible] = useState(false);

  useEffect(() => {
    if (isSignedIn && userRole) {
      debugLog("MBA54321 Both isSignedIn and userRole are available, fetching tutorial status", { isSignedIn, userRole });
      fetchTutorialStatus();
    } else {
      debugLog("MBA54321 Waiting for auth data", { isSignedIn, userRole });
      setIsLoading(false);
    }
  }, [isSignedIn, userRole]);

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
      
      // Show tutorial if it's not completed
      if ((userRole === 'professional' && !response.data.done_pro_tutorial) ||
          (userRole === 'petOwner' && !response.data.done_client_tutorial)) {
        setIsVisible(true);
        
        // Redirect new users to MyProfile screen
        if (is_DEBUG) {
          debugLog('MBA54321 Redirecting new user to MyProfile screen');
        }
        // Use navigateToFrom instead of navigation.navigate to ensure proper tab highlighting
        navigateToFrom(navigation, 'MyProfile', 'Dashboard', { screen: 'profile_info' });
        
        if (is_DEBUG) {
          debugLog('MBA54321 Tutorial should be visible:', {
            userRole,
            done_client_tutorial: response.data.done_client_tutorial,
            done_pro_tutorial: response.data.done_pro_tutorial
          });
        }
      } else {
        if (is_DEBUG) {
          debugLog('MBA54321 Tutorial should NOT be visible');
        }
        setIsVisible(false);
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

  const handleNext = async () => {
    debugLog("MBA54321 handleNext called", { currentStep, userRole });
    
    // Check if we're at the last step
    const roleKey = userRole === 'professional' ? 'professional' : 'client';
    const steps = tutorialSteps[roleKey];
    
    if (currentStep >= steps.length) {
      debugLog("MBA54321 At last step, completing tutorial", { currentStep, totalSteps: steps.length });
      // Don't complete the tutorial here, just move to the next step
      // The tutorial will be completed when the user clicks the "Finish Tutorial" button
      return;
    }
    
    // Get the next step data before incrementing the step counter
    const nextStep = steps[currentStep];
    const currentStepData = steps[currentStep - 1];
    
    debugLog("MBA54321 Current step data", currentStepData);
    debugLog("MBA54321 Next step data", nextStep);
    
    // Increment the step counter first
    setCurrentStep(prevStep => prevStep + 1);
    
    // If we're navigating to a different screen or tab
    if (nextStep.screen !== currentStepData.screen || (nextStep.tab && nextStep.tab !== currentStepData.tab)) {
      debugLog("MBA54321 Navigating to different screen/tab", { 
        from: currentStepData.screen, 
        to: nextStep.screen,
        fromTab: currentStepData.tab,
        toTab: nextStep.tab
      });
      
      // Use navigateToFrom for consistent navigation behavior
      if (nextStep.tab) {
        // If we have a tab parameter, pass it in the params
        navigateToFrom(navigation, nextStep.screen, currentStepData.screen, { screen: nextStep.tab });
      } else {
        // For screens without tabs
        navigateToFrom(navigation, nextStep.screen, currentStepData.screen);
      }
      
      // Keep the tutorial visible after navigation
      setTimeout(() => {
        setIsVisible(true);
      }, 700);
    }
  };

  const handlePrevious = () => {
    debugLog("MBA54321 handlePrevious called", { currentStep, userRole });
    
    if (currentStep > 1) {
      // Get the previous step data before decrementing the step counter
      const roleKey = userRole === 'professional' ? 'professional' : 'client';
      const steps = tutorialSteps[roleKey];
      const previousStep = steps[currentStep - 2]; // -2 because currentStep is 1-indexed
      const currentStepData = steps[currentStep - 1];
      
      debugLog("MBA54321 Previous step data", previousStep);
      debugLog("MBA54321 Current step data", currentStepData);
      
      // Decrement the step counter
      setCurrentStep(prevStep => prevStep - 1);
      
      // If we're navigating to a different screen or tab
      if (previousStep.screen !== currentStepData.screen || (previousStep.tab && previousStep.tab !== currentStepData.tab)) {
        debugLog("MBA54321 Navigating back to different screen/tab", { 
          from: currentStepData.screen, 
          to: previousStep.screen,
          fromTab: currentStepData.tab,
          toTab: previousStep.tab
        });
        
        // Use navigateToFrom for consistent navigation behavior
        if (previousStep.tab) {
          // If we have a tab parameter, pass it in the params
          navigateToFrom(navigation, previousStep.screen, currentStepData.screen, { screen: previousStep.tab });
        } else {
          // For screens without tabs
          navigateToFrom(navigation, previousStep.screen, currentStepData.screen);
        }
        
        // Keep the tutorial visible after navigation
        setTimeout(() => {
          setIsVisible(true);
        }, 700);
      }
    }
  };

  const handleSkip = () => {
    debugLog('MBA54321 handleSkip called through the later');
    // Show confirmation modal before skipping
    setSkipConfirmationVisible(true);
  };

  const handleSkipConfirm = () => {
    debugLog('MBA54321 handleSkipConfirm called');
    setSkipConfirmationVisible(false);
    completeTutorial();
  };

  const handleSkipCancel = () => {
    debugLog('MBA54321 handleSkipCancel called');
    setSkipConfirmationVisible(false);
  };

  const handleClose = () => {
    debugLog('MBA54321 handleClose called');
    setCloseConfirmationVisible(true);
  };

  const handleCloseConfirm = () => {
    debugLog('MBA54321 handleCloseConfirm called');
    setCloseConfirmationVisible(false);
    completeTutorial();
  };

  const handleCloseCancel = () => {
    debugLog('MBA54321 handleCloseCancel called');
    setCloseConfirmationVisible(false);
  };

  const completeTutorial = async () => {
    debugLog("MBA54321 Completing tutorial", { userRole });
    
    try {
      // Update the tutorial status in the backend based on user role
      const updates = {};
      
      // Set the appropriate tutorial completion flag based on user role
      if (userRole === 'professional') {
        updates.done_pro_tutorial = true;
      } else if (userRole === 'petOwner' || userRole === 'client') {
        updates.done_client_tutorial = true;
      }
      
      // Update the tutorial status in the backend
      await axios.patch(`${API_BASE_URL}/api/users/v1/tutorial-status/update_status/`, updates);
      
      debugLog("MBA54321 Tutorial status updated in backend");
      
      // Hide the tutorial modal
      setIsVisible(false);
      
      // Navigate to the Dashboard
      debugLog("MBA54321 Navigating to Dashboard");
      navigateToFrom(navigation, 'Dashboard', getCurrentStepData().screen);
      
    } catch (error) {
      debugLog("MBA54321 Error completing tutorial", { error: error.message });
      console.error('Error completing tutorial:', error);
      
      // Even if there's an error, try to navigate to Dashboard
      navigateToFrom(navigation, 'Dashboard', getCurrentStepData().screen);
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
      {isVisible && getCurrentStepData() && (
        <TutorialModal
          step={currentStep}
          totalSteps={tutorialSteps[userRole === 'professional' ? 'professional' : 
                     (userRole === 'petOwner' || userRole === 'client') ? 'client' : 'default'].length}
          title={getCurrentStepData().title}
          description={getCurrentStepData().description}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onClose={handleClose}
          onFinish={completeTutorial}
          position={getCurrentStepData().position}
          userRole={userRole}
          is_DEBUG={is_DEBUG}
        />
      )}
      <ConfirmationModal
        visible={skipConfirmationVisible}
        onClose={handleSkipCancel}
        onConfirm={handleSkipConfirm}
        actionText="skip the tutorial"
        isLoading={false}
      />
      <ConfirmationModal
        visible={closeConfirmationVisible}
        onClose={handleCloseCancel}
        onConfirm={handleCloseConfirm}
        actionText="close the tutorial"
        isLoading={false}
      />
    </TutorialContext.Provider>
  );
}; 