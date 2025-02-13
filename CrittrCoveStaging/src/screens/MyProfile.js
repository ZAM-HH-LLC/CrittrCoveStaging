import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Image, Platform, StatusBar, Alert, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Button, Portal, Dialog, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import FloatingSaveButton from '../components/FloatingSaveButton';
import ServiceManager from '../components/ServiceManager';
import ProfessionalTab from '../components/ProfessionalTab';
import RecordedPets from '../components/RecordedPets';
import EditableSection from '../components/EditableSection';
import DatePicker from '../components/DatePicker';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { DEFAULT_SERVICES } from '../data/mockData';

const MyProfile = () => {
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [pets, setPets] = useState([]);
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '' });
  const [authorizedHouseholdMembers, setAuthorizedHouseholdMembers] = useState(['']);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState({
    professional: false,
    services: false,
    bio: false,
    professionalBio: false,
    portfolio: false,
    facilities: false,
    skills: false,
  });

  const [services, setServices] = useState(DEFAULT_SERVICES);
  
  const [activeTab, setActiveTab] = useState('client');
  const [rates, setRates] = useState({
    inHouse: '',
    overnight: '',
    dropBys: '',
    boarding: '',
    dayCare: '',
  });
  const { isApprovedProfessional } = useContext(AuthContext);
  const [localIsApprovedProfessional, setLocalIsApprovedProfessional] = useState(false);
  const [showAuthorizedMembersInfo, setShowAuthorizedMembersInfo] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const questionMarkRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [photoNeedsSaving, setPhotoNeedsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [calculatedAge, setCalculatedAge] = useState(null);

  useEffect(() => {
    const fetchMyProfileData = async () => {
      // Simulate fetching profile data
      const data = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            name: 'Alice Johnson',
            email: 'alice@example.com',
            phone: '(555) 123-4567',
            age: '32',
            address: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94122',
            country: 'USA',
            bio: "I'm a proud pet parent of two dogs and a cat. I love animals and am always looking for the best care for my furry friends!",
            pets: [
              { id: '1', name: 'Max', type: 'Dog', breed: 'Golden Retriever', age: 5, photo: 'https://www.google.com/imgres?q=dog%20photo%20with%20https%20url&imgurl=https%3A%2F%2Fdog.ceo%2Fimg%2Fdog-api-fb.jpg&imgrefurl=https%3A%2F%2Fdog.ceo%2Fdog-api%2F&docid=BfjWdSj7jNl2rM&tbnid=gvZ-PT7ESUiKRM&vet=12ahUKEwjytNDT5siJAxXFGjQIHe5WPdwQM3oECBUQAA..i&w=1200&h=630&hcb=2&ved=2ahUKEwjytNDT5siJAxXFGjQIHe5WPdwQM3oECBUQAA' },
              { id: '2', name: 'Luna', type: 'Cat', breed: 'Siamese', age: 3, photo: 'https://example.com/luna.jpg' },
              { id: '3', name: 'Rocky', type: 'Exotic', breed: 'Lizard Gecko', age: 2, photo: 'https://example.com/rocky.jpg' },
            ],
            emergencyContact: {
              name: 'John Smith',
              phone: '(555) 987-6543',
            },
            authorizedHouseholdMembers: ['Sarah Johnson', 'Mike Johnson'],
          });
        }, 1000);
      });

      setName(data.name);
      setEmail(data.email);
      setPhone(data.phone);
      setAge(data.age);
      setAddress(data.address);
      setCity(data.city);
      setState(data.state);
      setZip(data.zip);
      setCountry(data.country);
      setBio(data.bio);
      setPets(data.pets);
      setEmergencyContact(data.emergencyContact);
      setAuthorizedHouseholdMembers(data.authorizedHouseholdMembers);
      setIsLoading(false);
    };

    fetchMyProfileData();
  }, []);

  useEffect(() => {
    const fetchProfessionalStatus = async () => {
      const storedIsApprovedProfessional = await AsyncStorage.getItem('isApprovedProfessional');
      setLocalIsApprovedProfessional(JSON.parse(storedIsApprovedProfessional));
    };
    fetchProfessionalStatus();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
      setHasUnsavedChanges(true);
    }
  };

  const saveProfilePhoto = () => {
    setPhotoNeedsSaving(false);
    Alert.alert('Success', 'Profile photo updated successfully');
  };

  const showAuthorizedMembersPopup = () => {
    if (Platform.OS === 'web') {
      if (questionMarkRef.current && scrollViewRef.current) {
        questionMarkRef.current.measure((fx, fy, width, height, px, py) => {
          scrollViewRef.current.measure((_, __, ___, ____, scrollViewX, scrollViewY) => {
            const popupWidth = 300;
            const popupHeight = 200;
            
            // Calculate position relative to window width to prevent overflow
            const maxLeftPosition = windowWidth - popupWidth - 20; // 20px safety margin
            const calculatedLeft = px - (popupWidth / 2);
            const safeLeft = Math.min(maxLeftPosition, Math.max(20, calculatedLeft));
            
            setPopupPosition({
              top: py - scrollViewY - popupHeight - 10, // 10px gap above the icon
              left: safeLeft,
            });
            setShowAuthorizedMembersInfo(true);
          });
        });
      }
    } else {
      setShowAuthorizedMembersInfo(true);
    }
  };

  const toggleEditMode = (section) => {
    setEditMode((prevState) => ({ ...prevState, [section]: !prevState[section] }));
  };

  const getContentWidth = () => {
    // For web, cap at 600px, for mobile use window width minus padding
    if (Platform.OS === 'web') {
      return '100%';
    }
    // For mobile, account for safe areas and padding
    return windowWidth - 32; // 16px padding on each side
  };

  const renderEditableField = (label, value, onChangeText, section, type = 'text') => {
    const isBio = label.toLowerCase() === 'bio';
    
    if (type === 'birthday') {
      return editMode[section] ? (
        <View style={[styles.input, { width: getContentWidth() }]}>
          <DatePicker
            value={birthday}
            onChange={updateBirthday} // TODO: need to implement the backend call here
            placeholder="Select Birthday"
          />
        </View>
      ) : (
        <Text style={[styles.fieldText, { width: getContentWidth() }]}>
          {`Age: ${calculatedAge || age || 'Not specified'}`}
        </Text>
      );
    }

    return editMode[section] ? (
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setHasUnsavedChanges(true);
        }}
        style={[
          styles.input,
          { width: getContentWidth() },
          isBio && { height: 100, textAlignVertical: 'top' }
        ]}
        multiline={isBio}
        numberOfLines={isBio ? 4 : 1}
      />
    ) : (
      <Text style={[styles.fieldText, { width: getContentWidth() }]}>
        {isBio ? value : `${label}: ${value || 'Not specified'}`}
      </Text>
    );
  };

  const saveChanges = () => {
    setHasUnsavedChanges(false);
    setEditMode({}); // Reset all edit modes to false
    Alert.alert('Success', 'Changes saved successfully');
  };

  const updateBirthday = async (date) => {
    setBirthday(date);
    setHasUnsavedChanges(true);
    
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/calculate-age', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ birthday: date }),
      });
      
      const data = await response.json();
      setCalculatedAge(data.age);
    } catch (error) {
      console.error('Error calculating age:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="My Profile" 
        onBackPress={() => navigation.navigate('More')} 
      />
      <ScrollView 
        ref={scrollViewRef} 
        contentContainerStyle={styles.scrollViewContent}
        style={styles.scrollView}
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'client' && styles.activeTab]}
            onPress={() => setActiveTab('client')}
          >
            <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>Account Info</Text>
          </TouchableOpacity>
          {isApprovedProfessional && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'professional' && styles.activeTab]}
              onPress={() => setActiveTab('professional')}
            >
              <Text style={[styles.tabText, activeTab === 'professional' && styles.activeTabText]}>Professional</Text>
            </TouchableOpacity>
          )}
        </View>
        {activeTab === 'client' && (
          <View style={styles.centeredContent}>
            <View style={styles.profileHeader}>
              <Text style={styles.name}>Profile Photo</Text>
              <TouchableOpacity onPress={pickImage}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                    <Ionicons name="person" size={60} color={theme.colors.placeholder} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <TouchableOpacity onPress={() => toggleEditMode('personal')}>
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              {renderEditableField('Name', name, setName, 'personal')}
              {renderEditableField('Email', email, setEmail, 'personal')}
              {renderEditableField('Phone', phone, setPhone, 'personal')}
              {renderEditableField('Birthday', birthday, setBirthday, 'personal', 'birthday')}
            </View>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Address</Text>
                <TouchableOpacity onPress={() => toggleEditMode('address')}>
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              {renderEditableField('Address', address, setAddress, 'address')}
              {renderEditableField('City', city, setCity, 'address')}
              {renderEditableField('State', state, setState, 'address')}
              {renderEditableField('ZIP', zip, setZip, 'address')}
              {renderEditableField('Country', country, setCountry, 'address')}
              {/* {editMode.address && <Button mode="contained" onPress={() => toggleEditMode('address')} style={styles.saveButton}>Save</Button>} */}
            </View>
            <EditableSection
              title="About Me"
              value={bio}
              onChangeText={setBio}
              editMode={editMode.bio}
              toggleEditMode={() => toggleEditMode('bio')}
              setHasUnsavedChanges={setHasUnsavedChanges}
              getContentWidth={getContentWidth}
            />
            <RecordedPets pets={pets} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                <TouchableOpacity onPress={() => toggleEditMode('emergency')}>
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              {renderEditableField('Name', emergencyContact.name, (text) => setEmergencyContact({ ...emergencyContact, name: text }), 'emergency')}
              {renderEditableField('Phone', emergencyContact.phone, (text) => setEmergencyContact({ ...emergencyContact, phone: text }), 'emergency')}
              {/* {editMode.emergency && <Button mode="contained" onPress={() => toggleEditMode('emergency')} style={styles.saveButton}>Save</Button>} */}
            </View>
            <View style={[
              styles.section, 
              Platform.OS !== 'web' && styles.lastSection
            ]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Authorized Household Members</Text>
                <View style={styles.iconContainer}>
                  <TouchableOpacity onPress={showAuthorizedMembersPopup} ref={questionMarkRef}>
                    <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleEditMode('household')}>
                    <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              {authorizedHouseholdMembers.map((member, index) => (
                editMode.household ? (
                  <TextInput
                    key={index}
                    value={member}
                    onChangeText={(text) => {
                      const updatedMembers = [...authorizedHouseholdMembers];
                      updatedMembers[index] = text;
                      setHasUnsavedChanges(true);
                      setAuthorizedHouseholdMembers(updatedMembers);
                    }}
                    style={[styles.input, { width: getContentWidth() }]}
                  />
                ) : (
                  <Text key={index} style={[styles.fieldText, { width: getContentWidth() }]}>{member}</Text>
                )
              ))}
              {editMode.household && (
                <View style={{ width: getContentWidth() }}>
                  <Button 
                    mode="outlined" 
                    onPress={() => setAuthorizedHouseholdMembers([...authorizedHouseholdMembers, ''])} 
                    style={styles.addButton}
                  >
                    Add Household Member
                  </Button>
                </View>
              )}
            </View>
          </View>
        )}
        {activeTab === 'professional' && (
          <ProfessionalTab
            services={services}
            setServices={setServices}
            setHasUnsavedChanges={setHasUnsavedChanges}
            getContentWidth={getContentWidth}
            pets={pets}
            editMode={editMode}
            toggleEditMode={toggleEditMode}
          />
        )}
      </ScrollView>
      <FloatingSaveButton 
        visible={hasUnsavedChanges}
        onSave={saveChanges}
        btnText={'Save Changes'}
      />
      <Portal>
        {Platform.OS === 'web' ? (
          showAuthorizedMembersInfo && (
            <View
              style={[
                styles.webPopup,
                { top: popupPosition.top, left: popupPosition.left },
              ]}
            >
              <Text style={styles.webPopupTitle}>Authorized Household Members</Text>
              <Text style={styles.webPopupText}>
                Authorized household members are individuals who are allowed to make decisions about your pets in your absence. 
                This may include family members, roommates, or trusted friends who have access to your home and can care for your pets if needed.
              </Text>
              <Button onPress={() => setShowAuthorizedMembersInfo(false)}>Got it</Button>
            </View>
          )
        ) : (
          <Dialog visible={showAuthorizedMembersInfo} onDismiss={() => setShowAuthorizedMembersInfo(false)}>
            <Dialog.Title>Authorized Household Members</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                Authorized household members are individuals who are allowed to make decisions about your pets in your absence. 
                This may include family members, roommates, or trusted friends who have access to your home and can care for your pets if needed.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowAuthorizedMembersInfo(false)}>Got it</Button>
            </Dialog.Actions>
          </Dialog>
        )}
      </Portal>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  scrollViewContent: {
    padding: 16,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    // borderWidth: 1,
    // borderColor: theme.colors.border,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text,
  },
  activeTabText: {
    color: theme.colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoPlaceholder: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.placeholder,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  location: {
    fontSize: 16,
    color: theme.colors.secondary,
  },
  section: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lastSection: {
    marginBottom: 100, // Extra padding for last section on mobile
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  input: {
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },
  bioInput: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    maxWidth: 600,
  },
  petItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    width: '100%',
    maxWidth: 600,
  },
  petItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  petInfo: {
    flex: 1,
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.placeholder,
    flexWrap: 'wrap',
  },
  addButton: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    marginTop: 10,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webPopup: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
    maxWidth: '90vw', // Ensure popup doesn't exceed viewport width
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  webPopupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // marginBottom: 10,
  },
  webPopupText: {
    marginBottom: 20,
  },
  fieldText: {
    marginBottom: 10,
  },
  centeredContent: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    alignSelf: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    marginBottom: 4,
  },
  birthdayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ageText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
});

export default MyProfile;
