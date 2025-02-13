import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, StyleSheet, Platform, SafeAreaView, Dimensions, StatusBar, TouchableOpacity, Text } from 'react-native';
import { Card, Title, Paragraph, List, Button, useTheme, Appbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import CrossPlatformView from '../components/CrossPlatformView';
import { theme } from '../styles/theme';
import { navigateToFrom } from '../components/Navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Dashboard = ({ navigation }) => {
  const { colors } = useTheme();
  const { firstName, screenWidth } = useContext(AuthContext);
  const { signOut } = useContext(AuthContext);

  const isLargeScreen = screenWidth > 600;

  // Dynamic styles based on screen size
  const dynamicStyles = {
    headerTitle: {
      fontSize: isLargeScreen ? theme.fontSizes.extraLarge : theme.fontSizes.large,
      fontWeight: '500',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
    },
    cardTitle: {
      fontSize: isLargeScreen ? theme.fontSizes.largeLarge : theme.fontSizes.large,
      fontFamily: theme.fonts.header.fontFamily,
    },
    cardParagraph: {
      fontSize: isLargeScreen ? theme.fontSizes.large : theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    listItemTitle: {
      fontSize: isLargeScreen ? theme.fontSizes.large : theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    listItemDescription: {
      fontSize: isLargeScreen ? theme.fontSizes.mediumLarge : theme.fontSizes.smallMedium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    buttonText: {
      fontSize: isLargeScreen ? theme.fontSizes.mediumLarge : theme.fontSizes.smallMedium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
  };

  // Mock data - replace with actual API calls
  const upcomingBookings = [
    { id: '56782', profepsronalsional: 'Jane Doe', pet: 'Max (Dog)', date: '2023-05-15', time: '14:00' },
    { id: '5678', profepsronalsional: 'John Smith', pet: 'Whiskers (Cat)', date: '2023-05-17', time: '10:00' },
  ];

  const IconComponent = Platform.OS === 'web'
    ? ({ name, ...props }) => <MaterialCommunityIcons name={name} {...props} />
    : List.Icon;

  const Content = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <View style={styles.cardContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={dynamicStyles.cardTitle}>Welcome back, {firstName}!</Title>
            <Paragraph style={dynamicStyles.cardParagraph}>Here's an overview of your upcoming pet care services.</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={dynamicStyles.cardTitle}>Upcoming Bookings</Title>
            {upcomingBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                onPress={() => navigateToFrom(navigation, 'BookingDetails', 'Dashboard', { bookingId: booking.id })}
                style={styles.bookingItem}
              >
                <List.Item
                  titleStyle={dynamicStyles.listItemTitle}
                  descriptionStyle={dynamicStyles.listItemDescription}
                  title={`${booking.pet} with ${booking.profepsronalsional}`}
                  description={`${booking.date} at ${booking.time}`}
                  left={(props) => <IconComponent {...props} icon="calendar" name="calendar" />}
                  right={(props) => <IconComponent {...props} icon="chevron-right" name="chevron-right" />}
                />
              </TouchableOpacity>
            ))}
          </Card.Content>
          <Card.Actions>
            <Button 
              labelStyle={dynamicStyles.buttonText} 
              onPress={() => navigateToFrom(navigation, 'MyBookings', 'Dashboard')}
            >
              View All Bookings
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={dynamicStyles.cardTitle}>Quick Actions</Title>
            <View style={styles.quickActions}>
              <Button 
                icon={Platform.OS === 'web' ? ({ size, color }) => <MaterialCommunityIcons name="magnify" size={size} color={color} /> : "magnify"}
                mode="outlined" 
                onPress={() => navigateToFrom(navigation, 'SearchProfessionalsListing', 'Dashboard')}
                style={styles.quickActionButton}
                labelStyle={dynamicStyles.buttonText}
              >
                Find a Professional
              </Button>
              <Button 
                icon={Platform.OS === 'web' ? ({ size, color }) => <MaterialCommunityIcons name="paw" size={size} color={color} /> : "paw"}
                mode="outlined" 
                onPress={() => navigateToFrom(navigation, 'MyPets', 'Dashboard')}
                style={styles.quickActionButton}
                labelStyle={dynamicStyles.buttonText}
              >
                My Pets
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <View style={styles.header}>
        <Text style={dynamicStyles.headerTitle}>Dashboard</Text>
      </View>
      <Content />
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  safeArea: {
    flex: 0,
    backgroundColor: '#f0f0f0',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 80,
    paddingTop: 16,
  },
  cardContainer: {
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickActionButton: {
    marginVertical: Platform.OS === 'web' ? 0 : 8,
    marginHorizontal: Platform.OS === 'web' ? 4 : 0,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: Platform.OS === 'web' ? undefined : 'center',
  },
  bookingItem: {
    padding: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginVertical: 4,
    borderRadius: 4,
  },
});

export default Dashboard;
