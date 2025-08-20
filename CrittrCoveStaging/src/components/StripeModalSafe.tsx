import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { CardSetupForm, modalStyles } from './PaymentMethodsManager';

interface StripeModalProps {
  visible: boolean;
  clientSecret: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Component that only renders on web after Stripe is loaded
const StripeContent: React.FC<{
  stripePromise: any;
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onClose: () => void;
}> = ({ stripePromise, clientSecret, onSuccess, onError, onClose }) => {
  // Only import on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  let Elements: any = null;
  try {
    const stripeReact = require('@stripe/react-stripe-js');
    Elements = stripeReact.Elements;
  } catch (error) {
    console.error('Failed to load Stripe React components:', error);
    return (
      <View style={modalStyles.modalContent}>
        <Text style={modalStyles.modalTitle}>Payment system unavailable</Text>
        <TouchableOpacity onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!Elements) {
    return (
      <View style={modalStyles.modalContent}>
        <Text style={modalStyles.modalTitle}>Loading payment system...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={modalStyles.modalContent}
      activeOpacity={1}
      onPress={(e) => e.stopPropagation()}
    >
      <View style={modalStyles.modalHeader}>
        <Text style={modalStyles.modalTitle}>Add Payment Method</Text>
        <TouchableOpacity 
          onPress={onClose}
          style={modalStyles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.secondary} />
        </TouchableOpacity>
      </View>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CardSetupForm
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </TouchableOpacity>
  );
};

const StripeModalSafe: React.FC<StripeModalProps> = ({
  visible,
  clientSecret,
  onClose,
  onSuccess,
  onError
}) => {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && Platform.OS === 'web' && clientSecret) {
      initializeStripe();
    }
  }, [visible, clientSecret]);

  const initializeStripe = async () => {
    if (stripePromise) {
      setIsLoading(false);
      return; // Already initialized
    }

    try {
      setIsLoading(true);
      
      const stripe = require('@stripe/stripe-js');
      const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key not found');
      }

      const promise = stripe.loadStripe(publishableKey);
      setStripePromise(promise);
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      onError('Failed to initialize payment system');
      setIsLoading(false);
    }
  };

  if (!visible || !clientSecret || Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={modalStyles.fullScreenOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {isLoading ? (
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Loading...</Text>
          </View>
        ) : stripePromise ? (
          <StripeContent
            stripePromise={stripePromise}
            clientSecret={clientSecret}
            onSuccess={onSuccess}
            onError={onError}
            onClose={onClose}
          />
        ) : (
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Failed to load payment system</Text>
            <TouchableOpacity onPress={onClose}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
};

export default StripeModalSafe;