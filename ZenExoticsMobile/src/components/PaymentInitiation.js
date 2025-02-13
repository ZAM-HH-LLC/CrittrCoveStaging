import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from 'react-native-paper';

const PaymentInitiation = ({ amount, onPaymentComplete }) => {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create PaymentIntent (mock API call)
      const response = await fetch('YOUR_BACKEND_URL/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      const { clientSecret } = await response.json();

      // 2. Confirm the payment (mock confirmation)
      // In a real implementation, you'd use a payment library here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulating payment confirmation

      // 3. Payment successful
      onPaymentComplete();
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle payment failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>Amount to pay: ${amount}</Text>
      <Button
        mode="contained"
        onPress={handlePayment}
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  amount: {
    fontSize: theme.fontSizes.mediumLarge,
    marginBottom: 16,
  },
});

export default PaymentInitiation;

