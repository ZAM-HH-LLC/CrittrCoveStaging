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

const StripeModal: React.FC<StripeModalProps> = ({
  visible,
  clientSecret,
  onClose,
  onSuccess,
  onError
}) => {
  const [stripeReady, setStripeReady] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    if (visible && Platform.OS === 'web' && clientSecret) {
      initializeStripeForModal();
    }
  }, [visible, clientSecret]);

  const initializeStripeForModal = async () => {
    try {
      // Dynamic import for web only
      const stripe = require('@stripe/stripe-js');
      
      const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (publishableKey) {
        const stripePromiseInstance = stripe.loadStripe(publishableKey);
        setStripePromise(stripePromiseInstance);
        setStripeReady(true);
      }
    } catch (error) {
      console.error('Error initializing Stripe for modal:', error);
      onError('Failed to initialize payment system');
    }
  };

  if (!visible || !clientSecret || Platform.OS !== 'web') {
    return null;
  }

  if (!stripeReady || !stripePromise) {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={modalStyles.fullScreenOverlay}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Loading...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Safely import Elements at render time
  try {
    const { Elements } = require('@stripe/react-stripe-js');

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
        </TouchableOpacity>
      </Modal>
    );
  } catch (error) {
    console.error('Error rendering Stripe Elements:', error);
    onError('Failed to load payment form');
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={modalStyles.fullScreenOverlay}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Error loading payment form</Text>
            <TouchableOpacity onPress={onClose}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
};

export default StripeModal;