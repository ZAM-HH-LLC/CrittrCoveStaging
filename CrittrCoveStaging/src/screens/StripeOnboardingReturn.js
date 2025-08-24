import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import { debugLog } from '../context/AuthContext';

const StripeOnboardingReturn = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const handleReturn = async () => {
      try {
        debugLog('MBA2i3j4fi4', 'Stripe onboarding return - redirecting to profile payments tab');
        
        // Small delay to show loading, then redirect to profile with payments tab
        setTimeout(() => {
          navigation.navigate('MyProfile', { 
            initialTab: 'settings_payments'
          });
        }, 1000);
        
      } catch (error) {
        debugLog('MBA2i3j4fi4', 'Error handling onboarding return:', error);
        // Fallback to dashboard
        navigation.navigate('Dashboard');
      }
    };

    handleReturn();
  }, [navigation]);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: 20
    }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{
        marginTop: 16,
        color: theme.colors.text,
        fontSize: 16,
        textAlign: 'center'
      }}>
        Payout setup complete! Returning to your profile...
      </Text>
    </View>
  );
};

export default StripeOnboardingReturn;