import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

const ProfessionalSettings = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Professional Settings</Text>
      <Text>Manage your professional profile and preferences here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.colors.primary,
  },
});

export default ProfessionalSettings;