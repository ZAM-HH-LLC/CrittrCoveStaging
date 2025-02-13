import React from 'react';
import { View, StyleSheet, ScrollView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Card, Title, Paragraph, List, Button, useTheme } from 'react-native-paper';
import { theme } from '../styles/theme';
import { navigateToFrom } from '../components/Navigation';

const ClientHistory = ({ route, navigation }) => {
  const { clientId } = route.params;
  const { colors } = useTheme();

  // Mock data - replace with actual data from your backend
  const clientData = {
    id: clientId,
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '(123) 456-7890',
    contracts: [
      { id: '1', date: '2023-05-01', status: 'Completed' },
      { id: '2', date: '2023-04-15', status: 'Pending' },
    ],
    invoices: [
      { id: '1', date: '2023-05-02', amount: '$100', status: 'Paid' },
      { id: '2', date: '2023-04-16', amount: '$75', status: 'Unpaid' },
    ],
    upcomingBookings: [
      { id: '1', date: '2023-06-01', service: 'Dog Walking' },
      { id: '2', date: '2023-06-15', service: 'Cat Sitting' },
    ],
  };

  const Content = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{clientData.name}</Title>
          <Paragraph>Email: {clientData.email}</Paragraph>
          <Paragraph>Phone: {clientData.phone}</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Upcoming Bookings</Title>
          {clientData.upcomingBookings.map(booking => (
            <List.Item
              key={booking.id}
              title={`Booking ${booking.id}`}
              description={`Date: ${booking.date} - Service: ${booking.service}`}
              left={props => <List.Icon {...props} icon="calendar" />}
            />
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Contracts</Title>
          {clientData.contracts.map(contract => (
            <List.Item
              key={contract.id}
              title={`Contract ${contract.id}`}
              description={`Date: ${contract.date} - Status: ${contract.status}`}
              left={props => <List.Icon {...props} icon="file-document-outline" />}
            />
          ))}
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigateToFrom(navigation, 'Contracts', 'ClientHistory', { clientId })}>View All Contracts</Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Invoices</Title>
          {clientData.invoices.map(invoice => (
            <List.Item
              key={invoice.id}
              title={`Invoice ${invoice.id}`}
              description={`Date: ${invoice.date} - Amount: ${invoice.amount} - Status: ${invoice.status}`}
              left={props => <List.Icon {...props} icon="file-document-outline" />}
            />
          ))}
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigateToFrom(navigation, 'Invoices', 'ClientHistory', { clientId })}>View All Invoices</Button>
        </Card.Actions>
      </Card>

      <View style={styles.messageButtonContainer}>
        <Button 
          mode="contained" 
          onPress={() => navigateToFrom(navigation, 'Messages', 'ClientHistory', { clientId })}
          style={styles.messageButton}
        >
          View Messages
        </Button>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <Content />
      </SafeAreaView>
    );
  } else if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, styles.androidContainer]}>
        <Content />
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <Content />
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  androidContainer: {
    paddingTop: StatusBar.currentHeight,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 16 : 90, // Extra padding for iOS and Android
  },
  card: {
    marginBottom: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  messageButtonContainer: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    marginTop: 16,
  },
  messageButton: {
    width: '100%',
  },
});

export default ClientHistory;
