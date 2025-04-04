import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/config';

const ContractList = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/contracts/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Contracts</Text>
      {contracts.length === 0 ? (
        <Text style={styles.noContractsText}>No contracts yet</Text>
      ) : (
        contracts.map((contract) => (
          <View key={contract.id} style={styles.card}>
            <Text style={styles.contractTitle}>{contract.title}</Text>
            <Text style={styles.ownerName}>Owner: {contract.owner_name}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  noContractsText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  contractTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  ownerName: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginTop: 4,
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

export default ContractList;
