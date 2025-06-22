import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTimeSettings, updateTimeSettings } from '../../api/API';
import { debugLog } from '../../context/AuthContext';
import { USER_TIMEZONE_OPTIONS, getTimezoneDisplayName, searchTimezones, getGroupedTimezones } from '../../data/Timezones';

const TimezoneSettings = () => {
  const [timezone, setTimezone] = useState('UTC');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTimeSettings();
  }, []);

  const fetchTimeSettings = async () => {
    try {
      setLoading(true);
      debugLog('MBA12345 Fetching time settings');
      const response = await getTimeSettings();
      debugLog('MBA12345 Time settings fetched', response);
      setTimezone(response.timezone);
    } catch (error) {
      debugLog('MBA12345 Error fetching time settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneChange = async (newTimezone) => {
    try {
      setLoading(true);
      debugLog('MBA12345 Updating timezone', { newTimezone });
      
      // Ensure we're sending an object with the timezone property
      const settingsData = { timezone: newTimezone };
      
      await updateTimeSettings(settingsData);
      setTimezone(newTimezone);
      setModalVisible(false);
      debugLog('MBA12345 Timezone updated successfully');
    } catch (error) {
      debugLog('MBA12345 Error updating timezone', error);
    } finally {
      setLoading(false);
    }
  };

  const openTimezoneModal = () => {
    setModalVisible(true);
  };

  const filteredTimezones = searchTimezones(searchQuery);
  
  // Group timezones by zone for better organization
  const groupedTimezones = getGroupedTimezones(filteredTimezones);

  const renderTimezoneGroup = (zoneName, timezones) => (
    <View key={zoneName} style={styles.timezoneGroup}>
      <Text style={styles.timezoneGroupHeader}>{zoneName} Time Zone</Text>
      {timezones.map((tz) => (
        <TouchableOpacity
          key={tz.id}
          style={[
            styles.timezoneItem,
            tz.id === timezone && styles.selectedTimezone
          ]}
          onPress={() => handleTimezoneChange(tz.id)}
        >
          <View style={styles.timezoneItemContent}>
            <Text style={[
              styles.timezoneItemText,
              tz.id === timezone && styles.selectedTimezoneText
            ]}>
              {tz.displayName}
            </Text>
          </View>
          {tz.id === timezone && (
            <MaterialCommunityIcons name="check" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // Get the display label for the current timezone
  const getCurrentTimezoneLabel = () => {
    return getTimezoneDisplayName(timezone);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.timezoneButton} 
        onPress={openTimezoneModal}
        disabled={loading}
      >
        <MaterialCommunityIcons name="clock-outline" size={24} color="#333" />
        <View style={styles.timezoneTextContainer}>
          <Text style={styles.timezoneText}>{getCurrentTimezoneLabel()}</Text>
          <Text style={styles.timezoneSubtext}>{timezone}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={24} color="#333" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search timezones..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={Object.keys(groupedTimezones)}
              keyExtractor={(zoneName) => zoneName}
              renderItem={({ item: zoneName }) => 
                renderTimezoneGroup(zoneName, groupedTimezones[zoneName])
              }
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
  },
  timezoneTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  timezoneText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timezoneSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  timezoneGroup: {
    marginBottom: 20,
  },
  timezoneGroupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  timezoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedTimezone: {
    backgroundColor: '#e8f5e9',
  },
  timezoneItemContent: {
    flex: 1,
  },
  timezoneItemText: {
    fontSize: 16,
  },
  selectedTimezoneText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  timezoneId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default TimezoneSettings; 