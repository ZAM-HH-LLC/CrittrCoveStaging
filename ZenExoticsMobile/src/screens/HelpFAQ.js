import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';

const HelpFAQ = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Help / FAQ</Text>
      <Text>Frequently asked questions and help topics go here...</Text>
    </ScrollView>
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

export default HelpFAQ;