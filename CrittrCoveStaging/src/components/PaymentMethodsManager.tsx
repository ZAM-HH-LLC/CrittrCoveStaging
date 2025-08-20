import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { debugLog } from '../context/AuthContext';
import { useToast } from './ToastProvider';

// Stripe imports - conditional for web platform
let PaymentElement: any = null;
let useStripe: any = null;
let useElements: any = null;

// Initialize Stripe conditionally for web
const initializeStripe = async () => {
  console.log('PaymentMethodsManager: Initializing Stripe...', {
    platform: Platform.OS,
    hasPublishableKey: !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
  });

  if (Platform.OS === 'web') {
    try {
      // Use require for better compatibility with Expo web
      const stripeReact = require('@stripe/react-stripe-js');
      
      // Get publishable key from environment
      const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        console.warn('PaymentMethodsManager: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not found - Stripe functionality disabled');
        return false;
      }
      
      console.log('PaymentMethodsManager: Loading Stripe with publishable key:', publishableKey.substring(0, 12) + '...');
      // Stripe promise and Elements are now handled by parent
      PaymentElement = stripeReact.PaymentElement;
      useStripe = stripeReact.useStripe;
      useElements = stripeReact.useElements;
      
      console.log('PaymentMethodsManager: Stripe initialized successfully');
      return true;
    } catch (error) {
      console.error('PaymentMethodsManager: Error initializing Stripe:', error);
      return false;
    }
  }
  
  console.log('PaymentMethodsManager: Not web platform, Stripe not initialized');
  return false;
};

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  expiry?: string;
  bankName?: string;
  isDefault: boolean;
  isVerified: boolean;
}

interface ConnectStatus {
  has_account: boolean;
  payouts_enabled: boolean;
  external_accounts: Array<{
    id: string;
    bank_name: string;
    last4: string;
    status: string;
  }>;
  is_verified: boolean;
  requirements?: string[];
}

interface PaymentMethodsManagerProps {
  userRole: 'client' | 'professional';
  onRefresh?: () => void;
  onShowModal?: (clientSecret: string) => void;
}

// Card setup component for web - exported for use in parent
export const CardSetupForm: React.FC<{
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}> = ({ onSuccess, onError }) => {
  const stripe = useStripe?.();
  const elements = useElements?.();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onError('Stripe not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {},
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || 'Setup failed');
      } else {
        onSuccess();
      }
    } catch (error) {
      onError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!PaymentElement) {
    return <Text>Loading payment form...</Text>;
  }

  return (
    <View style={styles.cardSetupContainer}>
      <PaymentElement />
      <TouchableOpacity
        style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isProcessing}
      >
        <Text style={styles.submitButtonText}>
          {isProcessing ? 'Processing...' : 'Save Payment Method'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({
  userRole,
  onShowModal
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [isStripeReady, setIsStripeReady] = useState(false);
  // Removed local modal state - now using parent modal
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    const initStripe = async () => {
      console.log('PaymentMethodsManager: Starting Stripe initialization...');
      const ready = await initializeStripe();
      console.log('PaymentMethodsManager: Stripe initialization result:', ready);
      setIsStripeReady(ready);
    };
    
    initStripe();
    fetchPaymentMethods();
    
    if (userRole === 'professional') {
      fetchConnectStatus();
    }
  }, [userRole]);

  const fetchPaymentMethods = async () => {
    try {
      // This would call your existing payment methods API
      // const response = await API.get('/payment-methods/');
      // setPaymentMethods(response.data);
      setPaymentMethods([]); // Placeholder
    } catch (error) {
      debugLog('MBA2knlv843', 'Error fetching payment methods:', error);
    }
  };

  const fetchConnectStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/payments/v1/connect-status/`);
      setConnectStatus(response.data);
      debugLog('MBA2knlv843', 'Connect status:', response.data);
    } catch (error) {
      debugLog('MBA2knlv843', 'Error fetching connect status:', error);
    }
  };

  const handleAddCard = async () => {
    console.log('PaymentMethodsManager: Add Card/Bank button clicked!', {
      platform: Platform.OS,
      isStripeReady,
      loading,
      userRole
    });

    // Check platform first
    if (Platform.OS !== 'web') {
      const message = 'Card/bank setup currently only available on web. Please visit the website to add payment methods.';
      console.log('PaymentMethodsManager: Showing mobile platform message');
      
      // Try toast first, fallback to alert
      try {
        showToast({
          message,
          type: 'info',
          duration: 5000
        });
      } catch (error) {
        console.warn('Toast failed, using alert:', error);
        Alert.alert('Payment Setup', message);
      }
      return;
    }

    // Check if Stripe is ready
    if (!isStripeReady) {
      console.error('Stripe not ready. Environment check:', {
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET',
        platform: Platform.OS,
        isStripeReady
      });
      const message = 'Payment system not initialized. Please check configuration.';
      console.log('PaymentMethodsManager: Showing Stripe not ready message');
      
      // Try toast first, fallback to alert
      try {
        showToast({
          message,
          type: 'error',
          duration: 4000
        });
      } catch (error) {
        console.warn('Toast failed, using alert:', error);
        Alert.alert('Payment System', message);
      }
      return;
    }

    try {
      setLoading(true);
      debugLog('MBA2knlv843', 'Creating setup intent...');
      const response = await axios.post(`${API_BASE_URL}/api/payments/v1/create-setup-intent/`);
      debugLog('MBA2knlv843', 'Setup intent created successfully');
      
      if (onShowModal) {
        onShowModal(response.data.client_secret);
      } else {
        // No fallback - require parent to handle modal
        debugLog('MBA2knlv843', 'No modal handler provided by parent');
        showToast({
          message: 'Modal handler not configured',
          type: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      debugLog('MBA2knlv843', 'Error creating setup intent:', error);
      const errorMessage = error.response?.data?.error || 'Failed to start card setup';
      showToast({
        message: errorMessage,
        type: 'error',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  // Removed local modal handlers - now handled by parent

  const handleSetupPayouts = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/payments/v1/onboard-professional/`, {
        refresh_url: `${window.location.origin}/payments/onboarding/refresh`,
        return_url: `${window.location.origin}/payments/onboarding/return`
      });
      
      // Redirect to Stripe onboarding
      window.location.href = response.data.onboarding_url;
    } catch (error) {
      debugLog('MBA2knlv843', 'Error starting onboarding:', error);
      showToast({
        message: 'Failed to start payout setup',
        type: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethods = () => {
    if (paymentMethods.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons 
            name="credit-card-outline" 
            size={48} 
            color={theme.colors.secondary} 
          />
          <Text style={styles.emptyStateText}>
            No payment methods added yet
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Add a card to start making payments
          </Text>
        </View>
      );
    }

    return paymentMethods.map((method) => (
      <View key={method.id} style={styles.paymentMethodItem}>
        <View style={styles.paymentMethodContent}>
          <MaterialCommunityIcons 
            name={method.type === 'card' ? 'credit-card' : 'bank'} 
            size={24} 
            color={theme.colors.primary} 
          />
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodTitle}>
              {method.type === 'card' ? `•••• ${method.last4}` : method.bankName}
            </Text>
            <Text style={styles.paymentMethodSubtitle}>
              {method.type === 'card' ? `${method.brand} • Expires ${method.expiry}` : `Account ending in ${method.last4}`}
            </Text>
            {method.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    ));
  };

  const renderPayoutStatus = () => {
    if (!connectStatus) return null;

    const { has_account, payouts_enabled, external_accounts } = connectStatus;

    if (!has_account || external_accounts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons 
            name="bank-outline" 
            size={48} 
            color={theme.colors.secondary} 
          />
          <Text style={styles.emptyStateText}>
            No payout method set up
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Set up your bank account to receive payments
          </Text>
        </View>
      );
    }

    return external_accounts.map((account) => (
      <View key={account.id} style={styles.paymentMethodItem}>
        <View style={styles.paymentMethodContent}>
          <MaterialCommunityIcons 
            name="bank" 
            size={24} 
            color={payouts_enabled ? theme.colors.primary : theme.colors.secondary} 
          />
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodTitle}>
              {account.bank_name}
            </Text>
            <Text style={styles.paymentMethodSubtitle}>
              Account ending in {account.last4}
            </Text>
            <Text style={[
              styles.statusBadge,
              payouts_enabled ? styles.verifiedBadge : styles.pendingBadge
            ]}>
              {payouts_enabled ? 'Verified' : 'Pending Verification'}
            </Text>
          </View>
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {userRole === 'professional' ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payout Methods</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={handleSetupPayouts}
              disabled={loading}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>
                {connectStatus?.has_account ? 'Manage' : 'Set Up Payouts'}
              </Text>
            </TouchableOpacity>
          </View>
          {renderPayoutStatus()}
        </View>
      ) : (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={handleAddCard}
              disabled={loading}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>Add Card/Bank</Text>
            </TouchableOpacity>
          </View>
          {renderPaymentMethods()}
        </View>
      )}

      {/* Modal now handled by parent component */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: theme.colors.background,
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  defaultBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  verifiedBadge: {
    color: '#10B981',
  },
  pendingBadge: {
    color: '#F59E0B',
  },
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSetupContainer: {
    gap: 24,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

// Export helper functions and components for parent usage
export { initializeStripe };

export const handleCardSetupSuccess = (onRefresh?: () => void, showToast?: any) => {
  if (showToast) {
    showToast({
      message: 'Payment method saved successfully',
      type: 'success',
      duration: 3000
    });
  }
  if (onRefresh) {
    onRefresh();
  }
};

export const handleCardSetupError = (error: string, showToast?: any) => {
  if (showToast) {
    showToast({
      message: error,
      type: 'error',
      duration: 4000
    });
  }
};

// Export modal styles for parent component
export const modalStyles = StyleSheet.create({
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PaymentMethodsManager;