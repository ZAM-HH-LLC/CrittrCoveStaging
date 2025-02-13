import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, useWindowDimensions, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Text, TextInput, Button, Portal, Dialog, Paragraph } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

const fetchClientProfileData = () => {
  return new Promise((resolve) => {
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
          { id: '1', name: 'Max', type: 'Dog', breed: 'Golden Retriever', age: 5, photo: 'https://example.com/max.jpg' },
          { id: '2', name: 'Luna', type: 'Cat', breed: 'Siamese', age: 3, photo: 'https://example.com/luna.jpg' },
          { id: '3', name: 'Rocky', type: 'Dog', breed: 'Beagle', age: 2, photo: 'https://example.com/rocky.jpg' },
        ],
        emergencyContact: {
          name: 'John Smith',
          phone: '(555) 987-6543',
        },
        authorizedHouseholdMembers: ['Sarah Johnson', 'Mike Johnson'],
      });
    }, 1000);
  });
};

const ClientProfile = () => {
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
  const [editMode, setEditMode] = useState({});
  const [showAuthorizedMembersInfo, setShowAuthorizedMembersInfo] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const questionMarkRef = useRef(null);
  const scrollViewRef = useRef(null);
  const { isApprovedProfessional, switchRole } = useContext(AuthContext);
  const [localIsApprovedProfessional, setLocalIsApprovedProfessional] = useState(false);

  useEffect(() => {
    fetchClientProfileData().then((data) => {
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
    });
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
    }
  };

  const saveProfile = async () => {
    const profileData = {
      profilePhoto,
      name,
      email,
      phone,
      age,
      address,
      city,
      state,
      zip,
      country,
      bio,
      pets,
      emergencyContact,
      authorizedHouseholdMembers,
    };

    setIsLoading(true);

    // Simulate API call to save profile data
    setTimeout(() => {
      console.log("Profile data saved:", profileData);
      setIsLoading(false);
      Alert.alert("Success", "Profile saved successfully!");
    }, 1000);
  };

  const toggleEditMode = (section) => {
    setEditMode(prevState => ({...prevState, [section]: !prevState[section]}));
  };

  const renderEditableField = (label, value, onChangeText, section) => {
    return editMode[section] ? (
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
    ) : (
      <Text style={styles.fieldText}>{label}: {value}</Text>
    );
  };

  const addHouseholdMember = () => {
    if (editMode.household) {
      setAuthorizedHouseholdMembers([...authorizedHouseholdMembers, '']);
    }
  };

  const updateHouseholdMember = (index, value) => {
    if (editMode.household) {
      const updatedMembers = [...authorizedHouseholdMembers];
      updatedMembers[index] = value;
      setAuthorizedHouseholdMembers(updatedMembers);
    }
  };

  const showAuthorizedMembersPopup = () => {
    if (Platform.OS === 'web') {
      if (questionMarkRef.current && scrollViewRef.current) {
        questionMarkRef.current.measure((fx, fy, width, height, px, py) => {
          scrollViewRef.current.measure((_, __, ___, ____, scrollViewX, scrollViewY) => {
            const popupWidth = 300; // Adjust this value based on your popup width
            const popupHeight = 200; // Adjust this value based on your popup height
            
            setPopupPosition({
              top: py - scrollViewY - popupHeight,
              left: px - scrollViewX - (popupWidth - width) / 2,
            });
            setShowAuthorizedMembersInfo(true);
          });
        });
      }
    } else {
      setShowAuthorizedMembersInfo(true);
    }
  };

  const renderIcon = (name, size, color, onPress) => {
    return (
      <TouchableOpacity onPress={onPress}>
        <Ionicons name={name} size={size} color={color} />
      </TouchableOpacity>
    );
  };

  const ContentWrapper = Platform.OS === 'ios' ? SafeAreaView : View;

  const saveSection = (section) => {
    // Implement the save logic for each section
    console.log(`Saving ${section} section`);
    Alert.alert("Success", `${section} information saved successfully!`);
    toggleEditMode(section);
  };

  const handleSwitchToProfessional = () => {
    switchRole();
    navigation.navigate('ProfessionalProfile');
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const renderSaveButton = (section) => {
    if (editMode[section]) {
      return (
        <Button 
          mode="contained" 
          onPress={() => saveSection(section)}
          style={styles.sectionSaveButton}
        >
          Save {section}
        </Button>
      );
    }
    return null;
  };

  const renderProfilePhoto = () => {
    if (profilePhoto) {
      return <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />;
    } else {
      return (
        <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
          <MaterialCommunityIcons name="account" size={80} color={theme.colors.primary} />
        </View>
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const getContentWidth = () => {
    if (Platform.OS === 'web') {
      return windowWidth < 600 ? '90%' : '60%';
    }
    return '90%';
  };

  // Use isApprovedProfessional from context or localIsApprovedProfessional from AsyncStorage
  const showSwitchToProfessionalButton = isApprovedProfessional || localIsApprovedProfessional;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('More')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Client Profile</Text>
        </View>
        {showSwitchToProfessionalButton && (
          <Button 
            mode="contained" 
            onPress={handleSwitchToProfessional}
            style={styles.switchProfileButton}
          >
            Switch to Professional
          </Button>
        )}
      </View>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={[styles.content, { width: getContentWidth() }]}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage}>
              {renderProfilePhoto()}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.location}>{city}, {state}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              {renderIcon('pencil', 20, theme.colors.primary, () => toggleEditMode('personal'))}
            </View>
            {renderEditableField('Name', name, setName, 'personal')}
            {renderEditableField('Email', email, setEmail, 'personal')}
            {renderEditableField('Phone', phone, setPhone, 'personal')}
            {renderEditableField('Age', age, setAge, 'personal')}
            {renderSaveButton('personal')}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Address</Text>
              {renderIcon('pencil', 20, theme.colors.primary, () => toggleEditMode('address'))}
            </View>
            {renderEditableField('Address', address, setAddress, 'address')}
            {renderEditableField('City', city, setCity, 'address')}
            {renderEditableField('State', state, setState, 'address')}
            {renderEditableField('ZIP', zip, setZip, 'address')}
            {renderEditableField('Country', country, setCountry, 'address')}
            {renderSaveButton('address')}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About Me</Text>
              {renderIcon('pencil', 20, theme.colors.primary, () => toggleEditMode('bio'))}
            </View>
            {editMode.bio ? (
              <TextInput
                multiline
                numberOfLines={4}
                value={bio}
                onChangeText={setBio}
                style={styles.bioInput}
              />
            ) : (
              <Text style={styles.fieldText}>{bio}</Text>
            )}
            {renderSaveButton('bio')}
          </View>

          <View style={styles.section}>
            <TouchableOpacity onPress={() => navigation.navigate('MyPets')}>
              <Text style={styles.sectionTitle}>My Pets</Text>
            </TouchableOpacity>
            {pets.map((pet) => (
              <TouchableOpacity 
                key={pet.id} 
                style={styles.petItem}
                onPress={() => navigation.navigate('PetProfile', { petId: pet.id })}
              >
                <View style={styles.petItemContent}>
                  <Image source={{ uri: pet.photo }} style={styles.petPhoto} />
                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petDetails}>{pet.type} • {pet.breed} • {pet.age} years old</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              {renderIcon('pencil', 20, theme.colors.primary, () => toggleEditMode('emergency'))}
            </View>
            {renderEditableField('Name', emergencyContact.name, (text) => setEmergencyContact({...emergencyContact, name: text}), 'emergency')}
            {renderEditableField('Phone', emergencyContact.phone, (text) => setEmergencyContact({...emergencyContact, phone: text}), 'emergency')}
            {renderSaveButton('emergency')}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Authorized Household Members</Text>
              <View style={styles.iconContainer}>
                <TouchableOpacity onPress={showAuthorizedMembersPopup} ref={questionMarkRef}>
                  <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                {renderIcon('pencil', 20, theme.colors.primary, () => toggleEditMode('household'))}
              </View>
            </View>
            {authorizedHouseholdMembers.map((member, index) => (
              editMode.household ? (
                <TextInput
                  key={index}
                  label={`Member ${index + 1}`}
                  value={member}
                  onChangeText={(text) => updateHouseholdMember(index, text)}
                  style={styles.input}
                />
              ) : (
                <Text key={index} style={styles.fieldText}>{member}</Text>
              )
            ))}
            {editMode.household && (
              <Button mode="outlined" onPress={addHouseholdMember} style={styles.addButton}>
                Add Household Member
              </Button>
            )}
            {renderSaveButton('household')}
          </View>
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 16 : 80,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 800,
    paddingTop: 16, // Add some padding at the top
  },
  switchProfileButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionSaveButton: {
    marginTop: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: theme.colors.primary,
  },
  location: {
    fontSize: 16,
    color: theme.colors.secondary,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
  },
  input: {
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
  },
  bioInput: {
    backgroundColor: theme.colors.surface,
  },
  petItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
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
  saveButton: {
    margin: 20,
  },
  addButton: {
    marginTop: 10,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePhotoPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldText: {
    fontSize: 16,
    marginBottom: 5,
    color: theme.colors.text,
  },
  iconContainer: {
    flexDirection: 'row',
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
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
  },
  webPopup: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
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
    marginBottom: 10,
  },
  webPopupText: {
    marginBottom: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: theme.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  switchProfileButton: {
    backgroundColor: theme.colors.primary,
  },
});

export default ClientProfile;
