import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { theme } from '../styles/theme';

const StripePaymentMethods = () => {
  const { createPaymentMethod } = useStripe();
  const [loading, setLoading] = useState(false);

  const handleAddPaymentMethod = async () => {
    setLoading(true);
    try {
      const { paymentMethod, error } = await createPaymentMethod({
        type: 'Card',
      });

      if (error) {
        console.error('Error creating payment method:', error);
      } else {
        console.log('Payment method created:', paymentMethod);
        // Here you would typically send the paymentMethod.id to your backend
        // to associate it with the user's account
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Payment Method</Text>
      {Platform.OS !== 'web' && (
        <CardField
          postalCodeEnabled={true}
          placeholder={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={styles.cardStyle}
          style={styles.cardField}
        />
      )}
      <Button
        mode="contained"
        onPress={handleAddPaymentMethod}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {loading ? 'Adding...' : 'Add Payment Method'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 16,
  },
  cardStyle: {
    backgroundColor: theme.colors.surface,
    textColor: theme.colors.text,
  },
  button: {
    marginTop: 16,
  },
});

export default StripePaymentMethods;
