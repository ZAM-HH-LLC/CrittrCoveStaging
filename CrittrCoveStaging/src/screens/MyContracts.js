import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import ContractList from '../components/ContractList';
import ContractTemplate from '../components/ContractTemplate'; // Import ContractTemplate
import ChronicleSummary from '../components/ChronicleSummary';
import ChronicleForm from '../components/ChronicleForm';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/config';

const MyContracts = () => {
  const [activeTab, setActiveTab] = useState('contracts');
  const [chronicles, setChronicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (activeTab === 'chronicles') {
      fetchChronicles();
    }
  }, [activeTab]);

  const fetchChronicles = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockChronicles = [
      {
        id: 1,
        title: 'Fluffy\'s Adventure',
        owner: 'John Doe',
        pets: ['Fluffy'],
        summary: 'Fluffy had a great time at the park today!',
      },
      {
        id: 2,
        title: 'Max\'s Playdate',
        owner: 'Jane Smith',
        pets: ['Max'],
        summary: 'Max enjoyed playing with other dogs at the beach.',
      },
    ];

    setChronicles(mockChronicles);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/contracts/templates/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    fetchTemplates(); // Fetch templates when component mounts
  }, []);

  const handleCreateChronicle = (newChronicle) => {
    setChronicles((prevChronicles) => [...prevChronicles, newChronicle]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          <Text style={styles.title}>My Contracts & Chronicles</Text>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'contracts' && styles.activeTab]}
              onPress={() => setActiveTab('contracts')}
            >
              <Text style={[styles.tabText, activeTab === 'contracts' && styles.activeTabText]}>Contracts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'chronicles' && styles.activeTab]}
              onPress={() => setActiveTab('chronicles')}
            >
              <Text style={[styles.tabText, activeTab === 'chronicles' && styles.activeTabText]}>Critter Chronicles</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'contracts' && (
            <View style={styles.contentContainer}>
              <ContractTemplate templates={templates} />
              <ContractList />
            </View>
          )}

          {activeTab === 'chronicles' && (
            <View style={styles.contentContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              ) : (
                <>
                  <ChronicleForm onCreateChronicle={handleCreateChronicle} />
                  <ChronicleSummary chronicles={chronicles} />
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
    maxWidth: 500,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: theme.colors.background,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 500,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  useTemplateButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
    alignItems: 'center',
  },
  useTemplateButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  templateBox: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.primary,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  templateTitle: {
    color: theme.colors.background,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
  },
  closeButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});

export default MyContracts;
