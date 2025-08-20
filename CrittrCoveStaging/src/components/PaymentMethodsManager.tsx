import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { debugLog, AuthContext } from '../context/AuthContext';
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
  payment_method_id: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT';
  last4: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  bank_name?: string;
  is_primary_payment: boolean;
  is_primary_payout: boolean;
  is_verified: boolean;
  display_name: string;
  created_at: string;
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
  onPaymentMethodsUpdate?: (refreshFn: () => void) => void;
  onDropdownStateChange?: (isOpen: boolean, isSwitching?: boolean) => void;
  closeDropdown?: boolean;
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
  const { isApprovedProfessional } = useContext(AuthContext);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onError('Stripe not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {},
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || 'Setup failed');
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Save payment method to backend first
        debugLog('MBA2knlv843', 'Saving payment method to backend...');
        await savePaymentMethodToBackend(setupIntent.payment_method, isApprovedProfessional);
        debugLog('MBA2knlv843', 'Payment method saved to backend successfully');
        
        // Only call onSuccess - this will handle the refresh via the parent
        debugLog('MBA2knlv843', 'Calling onSuccess callback only');
        onSuccess();
      } else {
        onError('Payment method setup was not completed');
      }
    } catch (error) {
      console.error('Error in card setup:', error);
      onError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const savePaymentMethodToBackend = async (paymentMethodId: string, isApprovedProfessional: boolean) => {
    try {
      debugLog('MBA2knlv843', 'Saving payment method to backend:', { paymentMethodId, isApprovedProfessional });
      const response = await axios.post(`${API_BASE_URL}/api/payment-methods/v1/`, {
        stripe_payment_method_id: paymentMethodId,
        is_approved_professional: isApprovedProfessional
      });
      
      debugLog('MBA2knlv843', 'Payment method saved to backend successfully:', response.data);
      return response.data;
    } catch (error) {
      debugLog('MBA2knlv843', 'Error saving payment method to backend:', error);
      throw new Error(error.response?.data?.error || 'Failed to save payment method');
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
  onShowModal,
  onPaymentMethodsUpdate,
  onDropdownStateChange,
  closeDropdown
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [isStripeReady, setIsStripeReady] = useState(false);
  // Removed local modal state - now using parent modal
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDropdownForMethod, setShowDropdownForMethod] = useState<string | null>(null);
  const showToast = useToast();
  const switchingDropdownRef = useRef(false);

  useEffect(() => {
    const initStripe = async () => {
      console.log('PaymentMethodsManager: Starting Stripe initialization...');
      const ready = await initializeStripe();
      console.log('PaymentMethodsManager: Stripe initialization result:', ready);
      setIsStripeReady(ready);
    };
    
    initStripe();
    // Only fetch payment methods once on mount - don't depend on userRole changes
    fetchPaymentMethods();
    
    if (userRole === 'professional') {
      fetchConnectStatus();
    }
  }, []); // Remove userRole dependency to prevent duplicate calls

  // Add refresh function that can be called after successful payment method addition
  const refreshPaymentMethods = () => {
    debugLog('MBA2knlv843', 'refreshPaymentMethods called - fetching payment methods');
    fetchPaymentMethods();
  };
  
  // Expose refresh function to parent - only call once
  useEffect(() => {
    if (onPaymentMethodsUpdate) {
      onPaymentMethodsUpdate(refreshPaymentMethods);
    }
  }, []); // Remove dependency to prevent multiple calls
  
  // Close dropdown when parent requests it
  useEffect(() => {
    debugLog('MBA2knlv843', 'closeDropdown effect triggered:', { closeDropdown, showDropdownForMethod });
    if (closeDropdown && showDropdownForMethod) {
      debugLog('MBA2knlv843', 'Closing dropdown from parent request');
      setShowDropdownForMethod(null);
      onDropdownStateChange?.(false);
    }
  }, [closeDropdown, showDropdownForMethod, onDropdownStateChange]);
  

  const fetchPaymentMethods = async () => {
    try {
      debugLog('MBA2knlv843', 'Fetching payment methods...');
      const response = await axios.get(`${API_BASE_URL}/api/payment-methods/v1/?method_type=both`);
      debugLog('MBA2knlv843', 'Raw payment methods response:', response.data);
      
      // Combine payment and payout methods into single list for display
      const allMethods = [
        ...(response.data.payment_methods || []),
        ...(response.data.payout_methods || [])
      ];
      
      // Remove duplicates (bank accounts might appear in both lists)
      const uniqueMethods = allMethods.filter((method, index, self) => 
        index === self.findIndex(m => m.payment_method_id === method.payment_method_id)
      );
      
      debugLog('MBA2knlv843', 'Setting payment methods state:', uniqueMethods);
      setPaymentMethods(uniqueMethods);
      debugLog('MBA2knlv843', 'Payment methods state updated successfully');
    } catch (error) {
      debugLog('MBA2knlv843', 'Error fetching payment methods:', error);
      // Don't show error to user for failed fetch, just log it
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

  const handleDeletePaymentMethod = async () => {
    if (!paymentMethodToDelete) return;
    
    try {
      setDeleteLoading(true);
      await axios.delete(`${API_BASE_URL}/api/payment-methods/v1/${paymentMethodToDelete.payment_method_id}/`);
      
      // Refresh the list
      await fetchPaymentMethods();
      
      // Close modal
      setShowDeleteModal(false);
      setPaymentMethodToDelete(null);
      
      showToast({
        message: 'Payment method deleted successfully',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      debugLog('MBA2knlv843', 'Error deleting payment method:', error);
      showToast({
        message: error.response?.data?.error || 'Failed to delete payment method',
        type: 'error',
        duration: 4000
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMenuPress = (method: PaymentMethod) => {
    debugLog('MBA2knlv843', 'Menu pressed for method:', method.payment_method_id, 'currently open:', showDropdownForMethod);
    
    // Set flag to indicate we're switching dropdowns
    switchingDropdownRef.current = true;
    
    // If the same dropdown is already open, close it
    if (showDropdownForMethod === method.payment_method_id) {
      debugLog('MBA2knlv843', 'Same dropdown clicked, closing it');
      setShowDropdownForMethod(null);
      onDropdownStateChange?.(false);
      switchingDropdownRef.current = false;
      return;
    }
    
    // If a different dropdown is open, close it first then open the new one
    if (showDropdownForMethod) {
      debugLog('MBA2knlv843', 'Different dropdown open, switching to new one');
    } else {
      debugLog('MBA2knlv843', 'No dropdown open, opening new one');
    }
    
    setShowDropdownForMethod(method.payment_method_id);
    onDropdownStateChange?.(true, switchingDropdownRef.current);
    
    // Clear switching flag after a brief delay and notify parent
    setTimeout(() => {
      switchingDropdownRef.current = false;
      debugLog('MBA2knlv843', 'Clearing switching flag and notifying parent');
      onDropdownStateChange?.(true, false); // Update parent that we're no longer switching
    }, 100);
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setShowDropdownForMethod(null); // Close dropdown
    onDropdownStateChange?.(false);
    setPaymentMethodToDelete(method);
    setShowDeleteModal(true);
  };

  const handleMakePrimaryClick = async (method: PaymentMethod) => {
    setShowDropdownForMethod(null); // Close dropdown
    onDropdownStateChange?.(false);
    
    try {
      // Call backend to set as primary
      await axios.patch(`${API_BASE_URL}/api/payment-methods/v1/${method.payment_method_id}/`, {
        is_primary_payment: true
      });
      
      // Refresh the list
      await fetchPaymentMethods();
      
      showToast({
        message: 'Primary payment method updated successfully',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      debugLog('MBA2knlv843', 'Error setting primary payment method:', error);
      showToast({
        message: error.response?.data?.error || 'Failed to update primary payment method',
        type: 'error',
        duration: 4000
      });
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

    return paymentMethods.map((method, index) => {
      const isCard = method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD';
      const iconName = isCard ? 'credit-card' : 'bank';
      
      return (
        <View 
          key={method.payment_method_id} 
          style={[
            styles.paymentMethodItem,
            // Ensure dropdown items have lower z-index than their parent
            { zIndex: showDropdownForMethod === method.payment_method_id ? 1000 + (paymentMethods.length - index) : 1 }
          ]}
        >
          <View style={styles.paymentMethodContent}>
            <MaterialCommunityIcons 
              name={iconName} 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>
                {method.display_name}
              </Text>
              <Text style={styles.paymentMethodSubtitle}>
                {isCard && method.exp_month && method.exp_year 
                  ? `${method.brand} • Expires ${method.exp_month}/${method.exp_year}`
                  : isCard 
                    ? method.brand
                    : `Account ending in ${method.last4}`
                }
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {method.is_primary_payment && (
                  <Text style={styles.defaultBadge}>Primary Payment</Text>
                )}
                {method.is_primary_payout && (
                  <Text style={styles.defaultBadge}>Primary Payout</Text>
                )}
              </View>
            </View>
          </View>
          <View style={[styles.menuContainer, { zIndex: 1000 + (paymentMethods.length - index) }]}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => handleMenuPress(method)}
              data-menu-button="true"
            >
              <MaterialCommunityIcons name="dots-vertical" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            
            {showDropdownForMethod === method.payment_method_id && (
              <View
                style={[
                  styles.dropdown,
                  // If this is the last item, position dropdown above the button
                  index === paymentMethods.length - 1 && styles.dropdownLast
                ]}
                data-dropdown="true"
              >
                {!method.is_primary_payment && (
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={() => handleMakePrimaryClick(method)}
                  >
                    <MaterialCommunityIcons name="star" size={16} color={theme.colors.primary} />
                    <Text style={[styles.dropdownItemText, { color: theme.colors.primary }]}>Make Primary</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.dropdownItem, { borderBottomWidth: 0 }]} // Remove border from last item
                  onPress={() => handleDeleteClick(method)}
                >
                  <MaterialCommunityIcons name="delete" size={16} color={theme.colors.error} />
                  <Text style={styles.dropdownItemText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    });
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

      {/* Delete confirmation modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => {
          setShowDeleteModal(false);
          setPaymentMethodToDelete(null);
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={theme.colors.error} />
              <Text style={styles.deleteModalTitle}>Delete Payment Method</Text>
            </View>
            
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete {paymentMethodToDelete?.display_name}? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPaymentMethodToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeletePaymentMethod}
                disabled={deleteLoading}
              >
                <Text style={styles.deleteButtonText}>
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
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
    position: 'relative', // Ensure proper stacking context
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  menuContainer: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: 28,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 20, // Higher elevation for Android
    minWidth: 140,
    overflow: 'hidden',
    zIndex: 9999, // Very high z-index for iOS
  },
  dropdownLast: {
    top: 'auto', // Override top positioning
    bottom: 28, // Position above the button instead
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '500',
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