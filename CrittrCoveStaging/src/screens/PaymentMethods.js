import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Card, Button, IconButton, TextInput, SegmentedButtons, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import { useNavigation } from '@react-navigation/native'; 
import CrossPlatformView from '../components/CrossPlatformView';
import STRIPE_PUBLISHABLE_KEY from '../../.env';
import axios from 'axios';
import { createPaymentMethod } from '../utils/StripeService';
import { StripeCardElement } from '../components/StripeCardElement';
import { CardElement } from '@stripe/react-stripe-js';
import { StripePaymentElement } from '../components/StripeCardElement';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_WIDTH = 500; // Maximum width for web view

const PaymentMethods = () => {
  const navigation = useNavigation();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmPrimaryDialogVisible, setConfirmPrimaryDialogVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [primaryAction, setPrimaryAction] = useState(null); // 'payment' or 'receive'
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    accountNumber: '',
    routingNumber: '',
  });
  const { isApprovedProfessional, is_DEBUG } = useContext(AuthContext);
  const [isConfirming, setIsConfirming] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const stripe = Platform.OS !== 'web' ? stripeModule()?.useStripe() : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardElement, setCardElement] = useState(null);
  const [stripeElement, setStripeElement] = useState(null);
  const [bankAccountComplete, setBankAccountComplete] = useState({
    accountNumber: false,
    routingNumber: false
  });
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationAmounts, setVerificationAmounts] = useState({
    first: '',
    second: ''
  });
  const [verifyingMethod, setVerifyingMethod] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    // Fetch payment methods from backend
    // This is a placeholder. Replace with actual API calls.
    setPaymentMethods([
      { 
        id: '1', 
        type: 'bank', 
        accountNumber: '****1234', 
        routingNumber: '123456789', 
        isPrimaryPayment: true,
        isPrimaryReceive: true,
        is_verified: true 
      },
      { 
        id: '2', 
        type: 'card', 
        last4: '4242', 
        brand: 'Visa', 
        isPrimaryPayment: false,
        isPrimaryReceive: false,
        is_verified: true 
      },
      { 
        id: '3', 
        type: 'bank', 
        accountNumber: '****5678', 
        routingNumber: '987654321', 
        isPrimaryPayment: false,
        isPrimaryReceive: false,
        is_verified: true 
      }
    ]);
  }, []);

  // Check if Stripe is ready
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('Stripe loading started');
      setLoading(true);
      const checkStripeReady = async () => {
        try {
          const stripe = await import('@stripe/stripe-js');
          const stripeReact = await import('@stripe/react-stripe-js');
          if (stripe && stripeReact) {
            console.log('Stripe modules loaded');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error loading Stripe modules:', error);
          setLoading(false);
        }
      };
      checkStripeReady();
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    if (is_DEBUG) {
      console.log('Loading indicator should be visible');
    }
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderPaymentMethod = (method) => (
    <Card key={method.id} style={styles.card}>
      <Card.Content>
        <View style={styles.cardContent}>
          <View style={styles.methodInfo}>
            <Text style={styles.methodType}>
              {method.type === 'card' 
                ? `${method.brand} •••• ${method.last4}` 
                : `Bank Account ${method.accountNumber || '•••• undefined'}`}
            </Text>
            {method.bankName && <Text style={styles.bankName}>{method.bankName}</Text>}
            {!method.is_verified && (
              <Text style={styles.verificationNeeded}>
                {method.type === 'card' 
                  ? 'Card Verification In Progress'
                  : 'Bank Account Verification Required'}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            {!method.is_verified && method.type === 'bank' && (
              <Button
                onPress={() => handleVerifyBankAccount(method)}
                mode="contained"
              >
                Verify
              </Button>
            )}
            {method.is_verified && (
              <>
                <IconButton
                  icon={() => <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />}
                  onPress={() => handleEditMethod(method)}
                />
                <IconButton
                  icon={() => <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />}
                  onPress={() => handleDeleteMethod(method)}
                />
              </>
            )}
          </View>
        </View>
        {method.is_verified && (
          <View style={styles.primaryOptionsContainer}>
            <View style={styles.checkboxRow}>
              <IconButton
                icon={() => (
                  <MaterialCommunityIcons 
                    name={method.isPrimaryPayment ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={theme.colors.primary}
                  />
                )}
                onPress={() => handleSetPrimary(method.id, 'payment')}
                style={styles.checkbox}
              />
              <Text style={styles.checkboxLabel}>
                {method.isPrimaryPayment ? "Primary Payment Method" : "Make Primary Payment Method"}
              </Text>
            </View>
            {(method.type === 'bank' && isApprovedProfessional) && (
              <View style={styles.checkboxRow}>
                <IconButton
                  icon={() => (
                    <MaterialCommunityIcons 
                      name={method.isPrimaryReceive ? "checkbox-marked" : "checkbox-blank-outline"} 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  )}
                  onPress={() => handleSetPrimary(method.id, 'receive')}
                  style={styles.checkbox}
                />
                <Text style={styles.checkboxLabel}>
                  {method.isPrimaryReceive ? "Primary Receive Method" : "Make Primary Receive Method"}
                </Text>
              </View>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const handleAddMethod = async () => {
    setError(null);
    setSelectedMethod(null);
    setNewPaymentMethod({
      type: 'card',
      cardNumber: '',
      expiryDate: '',
      cvc: '',
      accountNumber: '',
      routingNumber: '',
    });
    setModalVisible(true);
    if (is_DEBUG) {
      console.log('MBA: Setting modalLoading to true');
    }
    setModalLoading(true);

    if (Platform.OS === 'web') {
      if (is_DEBUG) {
        console.log('MBA: Initializing Stripe elements for web');
      }
      if (!cardElement || !cardElement.stripe || !cardElement.elements) {
        if (is_DEBUG) {
          console.log('MBA: Stripe elements not initialized, setting up now');
        }
        try {
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
          if (stripe) {
            if (is_DEBUG) {
              console.log('MBA: Stripe loaded successfully');
            }
            const elements = stripe.elements();
            setCardElement({
              stripe,
              elements,
              complete: false,
              paymentType: 'card',
              value: {}
            });
          }
        } catch (error) {
          if (is_DEBUG) {
            console.error('MBA: Error initializing Stripe elements:', error);
          }
        }
      } else {
        if (is_DEBUG) {
          console.log('MBA: Stripe elements already initialized');
        }
      }
    }
    // Add a short delay before setting modalLoading to false
    setTimeout(() => {
      if (is_DEBUG) {
        console.log('MBA: Setting modalLoading to false');
      }
      setModalLoading(false);
    }, 500); // 500ms delay
  };

  const handleEditMethod = (method) => {
    setError('');
    setSelectedMethod({ ...method });
    setNewPaymentMethod({
      type: method.type,
      cardNumber: '',
      expiryDate: '',
      cvc: '',
      accountNumber: method.accountNumber || '',
      routingNumber: method.routingNumber || '',
    });
    setModalVisible(true);
  };

  const handleDeleteMethod = (method) => {
    setMethodToDelete({ ...method });
    setDeleteError(null);
    setDeleteDialogVisible(true);
  };

  const handleSetPrimary = (id, type) => {
    setSelectedMethod({ id });
    setPrimaryAction(type);
    setConfirmPrimaryDialogVisible(true);
  };

  const confirmSetPrimary = async () => {
    setIsConfirming(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the state to reflect the change
      setPaymentMethods(prevMethods =>
        prevMethods.map(method => ({
          ...method,
          ...(primaryAction === 'payment' && {
            isPrimaryPayment: method.id === selectedMethod.id
          }),
          ...(primaryAction === 'receive' && {
            isPrimaryReceive: method.id === selectedMethod.id
          })
        }))
      );
      
      console.log('Primary method updated:', selectedMethod);
    } catch (error) {
      console.error('Failed to update primary method:', error);
    } finally {
      setIsConfirming(false);
      setConfirmPrimaryDialogVisible(false);
      setPrimaryAction(null);
    }
  };

  const confirmDeleteMethod = async () => {
    if (methodToDelete.isPrimaryPayment && methodToDelete.isPrimaryReceive) {
      setDeleteError("This payment method is set as both your primary payment and receive method. Please select another payment method for both before deleting this one.");
      return;
    }
    
    if (methodToDelete.isPrimaryPayment) {
      setDeleteError("This is your primary payment method. Please select another payment method before deleting this one.");
      return;
    }

    if (methodToDelete.isPrimaryReceive) {
      setDeleteError("This is your primary receive method. Please select another receive method before deleting this one.");
      return;
    }

    setIsConfirming(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the state to reflect the deletion
      setPaymentMethods(prevMethods => prevMethods.filter(method => method.id !== methodToDelete.id));
      
      console.log('Payment method deleted:', methodToDelete);
      setDeleteDialogVisible(false);
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      setDeleteError('An error occurred while deleting the payment method. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const renderAddMethodModal = () => {
    if (is_DEBUG) {
      console.log('MBA: Rendering Add Payment Method Modal');
      console.log('MBA: modalLoading state:', modalLoading);
    }
    return (
      <Portal>
        <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)} style={styles.dialog}>
          <Dialog.Title>Add Payment Method</Dialog.Title>
          <IconButton
            icon={() => <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />}
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          />
          <Dialog.Content>
            {modalLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                <SegmentedButtons
                  value={newPaymentMethod.type}
                  onValueChange={(value) => setNewPaymentMethod({ ...newPaymentMethod, type: value })}
                  buttons={[
                    { value: 'card', label: 'Credit Card' },
                    { value: 'bank', label: 'Bank Account' },
                  ]}
                  style={styles.segmentedButtons}
                />
                <StripePaymentElement 
                  key={newPaymentMethod.type}
                  onChange={handlePaymentChange}
                  paymentType={newPaymentMethod.type}
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(false)} disabled={loading}>Cancel</Button>
            <Button 
              onPress={handleSavePaymentMethod} 
              disabled={loading || (
                (newPaymentMethod.type === 'card' && !cardComplete) ||
                (newPaymentMethod.type === 'bank' && (!bankAccountComplete.accountNumber || !bankAccountComplete.routingNumber))
              )}
              loading={loading}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const renderConfirmPrimaryDialog = () => (
    <Portal>
      <Dialog visible={confirmPrimaryDialogVisible} onDismiss={() => setConfirmPrimaryDialogVisible(false)} style={styles.dialog}>
        <Dialog.Title>
          {primaryAction === 'receive' ? 'Confirm Primary Receive Method' : 'Confirm Primary Payment Method'}
        </Dialog.Title>
        <IconButton
          icon={() => <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />}
          onPress={() => setConfirmPrimaryDialogVisible(false)}
          style={styles.closeButton}
        />
        <Dialog.Content>
          <Text>
            {primaryAction === 'receive' 
              ? "Are you sure you want to make this your primary receive method?"
              : "Are you sure you want to make this your primary payment method?"
            }
          </Text>
          {isConfirming && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {primaryAction === 'receive' 
                  ? "Updating primary receive method..."
                  : "Updating primary payment method..."
                }
              </Text>
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setConfirmPrimaryDialogVisible(false)} disabled={isConfirming}>Cancel</Button>
          <Button onPress={confirmSetPrimary} disabled={isConfirming}>Confirm</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderDeleteConfirmDialog = () => (
    <Portal>
      <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={styles.dialog}>
        <Dialog.Title>Confirm Delete Payment Method</Dialog.Title>
        <IconButton
          icon={() => <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />}
          onPress={() => setDeleteDialogVisible(false)}
          style={styles.closeButton}
        />
        <Dialog.Content>
          {deleteError ? (
            <Text style={styles.errorText}>{deleteError}</Text>
          ) : (
            <Text>Are you sure you want to delete this payment method?</Text>
          )}
          {isConfirming && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} color={theme.colors.primary} />
              <Text style={styles.loadingText}>Deleting payment method...</Text>
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteDialogVisible(false)} disabled={isConfirming}>Cancel</Button>
          <Button onPress={confirmDeleteMethod} disabled={isConfirming || deleteError}>Confirm</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const handleVerifyBankAccount = (method) => {
    setVerifyingMethod(method);
    setVerificationAmounts({ first: '', second: '' });
    setVerificationModalVisible(true);
    setError(null);
  };

  const renderVerificationModal = () => (
    <Portal>
      <Dialog visible={verificationModalVisible} onDismiss={() => setVerificationModalVisible(false)} style={styles.dialog}>
        <Dialog.Title>Verify Bank Account</Dialog.Title>
        <IconButton
          icon={() => <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />}
          onPress={() => setVerificationModalVisible(false)}
          style={styles.closeButton}
        />
        <Dialog.Content>
          <Text style={styles.verificationText}>
            A deposit will be made to your bank account in 1-2 business days of adding your bank account. Please enter the two small deposit amounts that were made to your account:
          </Text>
          <View style={styles.amountsContainer}>
            <TextInput
              label="First Amount (cents)"
              value={verificationAmounts.first}
              onChangeText={(text) => setVerificationAmounts(prev => ({ ...prev, first: text }))}
              keyboardType="numeric"
              style={styles.amountInput}
              mode="outlined"
              placeholder="32"
            />
            <TextInput
              label="Second Amount (cents)"
              value={verificationAmounts.second}
              onChangeText={(text) => setVerificationAmounts(prev => ({ ...prev, second: text }))}
              keyboardType="numeric"
              style={styles.amountInput}
              mode="outlined"
              placeholder="45"
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVerificationModalVisible(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onPress={handleVerificationSubmit}
            loading={loading}
            disabled={loading || !verificationAmounts.first || !verificationAmounts.second}
          >
            Verify
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const handleVerificationSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!verifyingMethod) {
        throw new Error('Missing required verification data');
      }

      const firstAmount = parseInt(verificationAmounts.first);
      const secondAmount = parseInt(verificationAmounts.second);

      if ([firstAmount, secondAmount].some(amount => isNaN(amount) || amount < 1 || amount > 99)) {
        throw new Error('Please enter valid amounts between 1 and 99 cents');
      }

      // Simulate backend API call
      const simulateBackendVerification = () => new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate success for amounts 32 and 45, fail for others
          if (firstAmount === 12 && secondAmount === 12) {
            resolve({ success: true });
          } else {
            reject(new Error('The amounts entered do not match our records. Please verify the amounts and try again.'));
          }
        }, 1000);
      });

      const result = await simulateBackendVerification();

      // Update the UI if verification succeeds
      const updateMethod = (methods) =>
        methods.map(m =>
          m.id === verifyingMethod.id
            ? { ...m, is_verified: true }
            : m
        );

      setPaymentMethods(prev => updateMethod(prev));

      setVerificationModalVisible(false);
      setVerifyingMethod(null);
      setVerificationAmounts({ first: '', second: '' });
      setError('Bank account successfully verified!');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify bank account. Please check the amounts and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add card verification handler
  const handleVerifyCard = async (method) => {
    setLoading(true);
    setError(null);

    try {
      // Create a SetupIntent on your backend
      const setupIntent = await axios.post('/api/create-setup-intent', {
        payment_method_id: method.id
      });

      // Confirm the SetupIntent with Stripe
      const result = await cardElement.stripe.confirmCardSetup(
        setupIntent.owner_secret,
        {
          payment_method: method.id
        }
      );

      console.log('Card verification result:', result);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Update the payment method status in your lists
      const updateMethod = (methods) =>
        methods.map(m =>
          m.id === method.id
            ? { ...m, status: 'verified', verificationNeeded: false }
            : m
        );

      setPaymentMethods(prev => updateMethod(prev));

      setError('Card successfully verified!');
    } catch (err) {
      console.error('Card verification error:', err);
      setError(err.message || 'Failed to verify card');
    } finally {
      setLoading(false);
    }
  };

  // Add these functions back after handleAddMethod
  const handlePaymentChange = (event) => {
    console.log('Payment change event:', event);
    if (Platform.OS === 'web') {
      if (newPaymentMethod.type === 'card') {
        setCardComplete(event.complete);
      } else {
        // For bank accounts, track both fields
        if (event.value) {
          setBankAccountComplete(prev => ({
            ...prev,
            accountNumber: event.value.accountNumber?.length >= 9 || prev.accountNumber,
            routingNumber: event.value.routingNumber?.length === 9 || prev.routingNumber
          }));
        }
        setCardComplete(bankAccountComplete.accountNumber && bankAccountComplete.routingNumber);
      }

      setCardElement({
        stripe: event.stripe,
        elements: event.elements,
        complete: event.complete,
        paymentType: newPaymentMethod.type,
        value: event.value
      });

      // Update newPaymentMethod state if it's a bank account
      if (newPaymentMethod.type === 'bank' && event.value) {
        setNewPaymentMethod(prev => ({
          ...prev,
          accountNumber: event.value.accountNumber || prev.accountNumber,
          routingNumber: event.value.routingNumber || prev.routingNumber,
        }));
      }
    } else {
      setCardComplete(event.complete);
      setCardElement(event);
    }
  };

  const handleSavePaymentMethod = async () => {
    if (newPaymentMethod.type === 'card') {
      if (!cardComplete) {
        setError('Please complete card details');
        return;
      }
    } else if (newPaymentMethod.type === 'bank') {
      if (!bankAccountComplete.accountNumber || !bankAccountComplete.routingNumber) {
        setError('Please complete both account number and routing number');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (Platform.OS === 'web') {
        if (!cardElement.stripe || !cardElement.elements) {
          throw new Error('Stripe not initialized');
        }

        let result;
        if (newPaymentMethod.type === 'card') {
          // Handle credit card
          result = await cardElement.stripe.createPaymentMethod({
            type: 'card',
            card: cardElement.elements.getElement(CardElement),
          });

          console.log('Card payment method result:', result);

          if (result.error) {
            throw new Error(result.error.message);
          }

          const paymentMethodData = {
            id: result.paymentMethod.id,
            type: 'card',
            last4: result.paymentMethod.card.last4,
            brand: result.paymentMethod.card.brand,
            is_verified: false
          };

          // Only add to payForServicesMethods since cards can't be used for receiving
          setPaymentMethods(prev => [...prev, paymentMethodData]);
        } else {
          // Handle bank account
          result = await cardElement.stripe.createToken('bank_account', {
            country: 'US',
            currency: 'usd',
            routing_number: cardElement.value.routingNumber,
            account_number: cardElement.value.accountNumber,
            account_holder_type: 'individual',
          });
          
          console.log('Bank token creation result:', result);

          if (result.error || !result.token) {
            throw new Error(result.error?.message || 'Invalid routing number. Please check and try again.');
          }

          const paymentMethodData = {
            id: result.token.id,
            type: 'bank',
            accountNumber: `****${result.token.bank_account.last4}`,
            routingNumber: cardElement.value.routingNumber,
            bankName: result.token.bank_account.bank_name,
            is_verified: false
          };

          // Update the appropriate list based on where it was added
          setPaymentMethods(prev => [...prev, paymentMethodData]);

          setError(
            'Bank account added but requires verification. Two small deposits will be made to your account in 1-2 business days. ' +
            'Please check your account and return to verify the amounts.'
          );
        }

        setModalVisible(false);
      } else {
        // Native platform handling
        const { paymentMethod, error } = await createPaymentMethod({
          type: newPaymentMethod.type,
          card: cardElement,
          is_receive_payment: selectedMethod?.isPrimaryReceive || false,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Update the appropriate list
        setPaymentMethods(prev => [...prev, paymentMethod]);
      }

      setModalVisible(false);
    } catch (err) {
      console.error('Payment method error:', err);
      setError(err.message || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Payment Methods" 
        onBackPress={() => navigation.navigate('More')} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.sectionContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <IconButton
              icon={() => <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />}
              onPress={() => handleAddMethod()}
              style={styles.addIconButton}
            />
          </View>
          {paymentMethods.map(method => renderPaymentMethod(method))}
        </View>

        {renderAddMethodModal()}
        {renderConfirmPrimaryDialog()}
        {renderDeleteConfirmDialog()}
        {renderVerificationModal()}
      </ScrollView>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  sectionContainer: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  card: {
    marginBottom: 16,
    width: '100%',
    alignSelf: 'center',
  },
  addButton: {
    marginTop: 16,
    width: '100%',
  },
  segmentedButtons: {
    marginBottom: 16,
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    minHeight: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryOptionsContainer: {
    marginTop: 8,
    gap: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    margin: 0,
    padding: 0,
  },
  checkboxLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: -8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialog: {
    width: Platform.OS === 'web' ? '90%' : '100%',
    alignSelf: 'center',
    maxWidth: 500,
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 16,
  },
  input: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    right: 5,
    top: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankName: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 4,
  },
  verificationNeeded: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  amountsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  amountInput: {
    width: '48%',
  },
  verificationText: {
    marginBottom: 8,
    fontSize: 14,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  addIconButton: {
    margin: 0,
  },
  webContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '85vh',
    width: '100%',
    maxWidth: '100%',
    overflowX: 'hidden',
  },
});

export default PaymentMethods;
