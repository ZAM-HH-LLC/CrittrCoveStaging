import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

const ChronicleSummary = ({ chronicles }) => {
  if (!chronicles || chronicles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No chronicles yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Your Chronicles</Text>
      {chronicles.map((chronicle) => (
        <View key={chronicle.id} style={styles.card}>
          <Text style={styles.chronicleTitle}>{chronicle.title}</Text>
          <Text style={styles.clientName}>Client: {chronicle.client}</Text>
          <Text style={styles.petName}>Pet: {chronicle.pets.join(', ')}</Text>
          <Text style={styles.summary}>{chronicle.summary}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Send to Client</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  chronicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  clientName: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 4,
  },
  petName: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 2,
  },
  summary: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});

export default ChronicleSummary;
