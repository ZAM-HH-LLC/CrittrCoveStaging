import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTimeSettings, updateTimeSettings } from '../../api/API';
import { debugLog } from '../../context/AuthContext';

// Common timezones list
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Adak',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Boise',
  'America/Detroit',
  'America/Indiana/Indianapolis',
  'America/Indiana/Knox',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Tell_City',
  'America/Indiana/Vevay',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Menominee',
  'America/North_Dakota/Beulah',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/Sitka',
  'America/Yakutat',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC'
];

const TimezoneSettings = () => {
  const [timezone, setTimezone] = useState('UTC');
  const [modalVisible, setModalVisible] = useState(false);
  const [timezones, setTimezones] = useState(COMMON_TIMEZONES);
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

  const filteredTimezones = timezones.filter(tz => 
    tz.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.timezoneButton} 
        onPress={openTimezoneModal}
        disabled={loading}
      >
        <MaterialCommunityIcons name="clock-outline" size={24} color="#333" />
        <Text style={styles.timezoneText}>{timezone}</Text>
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
              data={filteredTimezones}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.timezoneItem,
                    item === timezone && styles.selectedTimezone
                  ]}
                  onPress={() => handleTimezoneChange(item)}
                >
                  <Text style={[
                    styles.timezoneItemText,
                    item === timezone && styles.selectedTimezoneText
                  ]}>
                    {item}
                  </Text>
                  {item === timezone && (
                    <MaterialCommunityIcons name="check" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
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
  timezoneText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
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
  timezoneItemText: {
    flex: 1,
    fontSize: 16,
  },
  selectedTimezoneText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default TimezoneSettings; 