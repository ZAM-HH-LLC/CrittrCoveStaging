import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import CrossPlatformView from '../components/CrossPlatformView';
import BackHeader from '../components/BackHeader';
import { mockProfessionals } from '../data/mockData';

const SearchProfessionals = ({ navigation }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [location, setLocation] = useState({ country: 'USA', state: '', city: 'Colorado Springs' });
  const [animalType, setAnimalType] = useState('');
  const [exoticType, setExoticType] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [petCount, setPetCount] = useState({ dogs: 0, cats: 0, exotics: 0 });
  const [repeatService, setRepeatService] = useState('');
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showAnimalTypePicker, setShowAnimalTypePicker] = useState(false);
  const [showRepeatServicePicker, setShowRepeatServicePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  const styles = StyleSheet.create({
    contentContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
    },
    filtersContainer: {
      padding: 16,
    },
    picker: {
      marginBottom: 10,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 5,
      backgroundColor: theme.colors.inputBackground,
    },
    filterInput: {
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
      backgroundColor: theme.colors.inputBackground,
    },
    filterButton: {
      marginBottom: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 5,
      backgroundColor: theme.colors.inputBackground,
    },
    filterText: {
      color: theme.colors.text,
    },
    petCountContainer: {
      marginBottom: 20,
    },
    petCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    petType: {
      fontSize: theme.fontSizes.medium,
      color: theme.colors.text,
    },
    counterControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    petCount: {
      marginHorizontal: 10,
      fontSize: theme.fontSizes.medium,
      color: theme.colors.text,
    },
    searchButton: {
      backgroundColor: theme.colors.primary,
      padding: 12,
      borderRadius: 5,
      alignItems: 'center',
      marginTop: 20,
    },
    searchButtonText: {
      color: '#fff',
      fontSize: theme.fontSizes.medium,
    },
    datePickerContainer: {
      marginBottom: 10,
    },
    webDatePicker: {
      padding: 5,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 5,
      width: '100%',
    },
    webHeader: {
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const updateDimensions = () => {
        setWindowWidth(Dimensions.get('window').width);
      };

      window.addEventListener('resize', updateDimensions);
      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userLocation;
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        userLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
      } else {
        userLocation = {
          latitude: 38.8339,
          longitude: -104.8214,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
      }

      const searchParams = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: userLocation,
        animalType,
        exoticType,
        serviceType,
        petCount,
        repeatService,
        initialProfessionals: mockProfessionals.filter(professional => 
          (!serviceType || professional.serviceTypes.includes(serviceType)) &&
          (!animalType || professional.animalTypes.includes(animalType))
        )
      };

      // Store data based on platform
      if (Platform.OS === 'web') {
        sessionStorage.setItem('searchParams', JSON.stringify(searchParams));
      } else {
        await AsyncStorage.setItem('searchParams', JSON.stringify(searchParams));
      }

      navigation.navigate('SearchProfessionalsListing');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (setter) => (event, date) => {
    if (Platform.OS !== 'web') {
      setter(date || new Date());
    }
  };

  const renderDatePicker = (date, setDate, showPicker, setShowPicker, label) => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.datePickerContainer}>
          <Text>{label}:</Text>
          {React.createElement('input', {
            type: 'date',
            value: date.toISOString().split('T')[0],
            onChange: (e) => setDate(new Date(e.target.value)),
            style: styles.webDatePicker
          })}
        </View>
      );
    } else {
      return (
        <View>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.filterButton}>
            <Text style={styles.filterText}>{label}: {date.toDateString()}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
              style={styles.datePicker}
            />
          )}
        </View>
      );
    }
  };

  const renderPicker = (selectedValue, setSelectedValue, showPicker, setShowPicker, label, options) => (
    <View>
      <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.filterButton}>
        <Text style={styles.filterText}>{label}: {selectedValue || 'Select'}</Text>
      </TouchableOpacity>
      {showPicker && (
        <Picker
          selectedValue={selectedValue}
          onValueChange={(itemValue) => {
            setSelectedValue(itemValue);
            setShowPicker(false);
          }}
          style={styles.picker}
        >
          {options.map((option, index) => (
            <Picker.Item key={index} label={option.label} value={option.value} />
          ))}
        </Picker>
      )}
    </View>
  );

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Search Professionals" 
        onBackPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.contentContainer}
      >        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.filtersContainer}>
            {renderPicker(serviceType, setServiceType, showServicePicker, setShowServicePicker, 'Service Type', [
              { label: 'Select Service Type', value: '' },
              { label: 'House Sitting', value: 'House Sitting' },
              { label: 'Dog Walking', value: 'Dog Walking' },
              { label: 'Drop-ins', value: 'Drop-ins' },
              { label: 'Boarding', value: 'Boarding' },
              { label: 'Day Care', value: 'Day Care' },
              { label: 'Training', value: 'Training' },
            ])}

            <View style={styles.petCountContainer}>
              <Text style={styles.label}>Number of Pets:</Text>
              {['dogs', 'cats', 'exotics'].map((type) => (
                <View key={type} style={styles.petCounter}>
                  <Text style={styles.petType}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity onPress={() => setPetCount({ ...petCount, [type]: Math.max(0, petCount[type] - 1) })}>
                      <MaterialCommunityIcons name="minus-circle" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.petCount}>{petCount[type]}</Text>
                    <TouchableOpacity onPress={() => setPetCount({ ...petCount, [type]: petCount[type] + 1 })}>
                      <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {animalType === 'exotic' && (
              <TextInput
                style={styles.filterInput}
                placeholder="Type of Exotic Pet"
                value={exoticType}
                onChangeText={setExoticType}
              />
            )}

            {renderDatePicker(startDate, setStartDate, showStartDatePicker, setShowStartDatePicker, 'Start Date')}
            {renderDatePicker(endDate, setEndDate, showEndDatePicker, setShowEndDatePicker, 'End Date')}

            {renderPicker(repeatService, setRepeatService, showRepeatServicePicker, setShowRepeatServicePicker, 'One-time or Repeat?', [
              { label: 'One-time or Repeat?', value: '' },
              { label: 'One-time', value: 'One-time' },
              { label: 'Repeat Weekly', value: 'Repeat Weekly' },
            ])}

            <TouchableOpacity 
              style={[styles.searchButton, isLoading && styles.searchButtonDisabled]} 
              onPress={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CrossPlatformView>
  );
};

export default SearchProfessionals;
