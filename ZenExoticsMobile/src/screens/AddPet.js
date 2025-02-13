import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, TextInput as RNTextInput, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { Text, Appbar, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../styles/theme';
import FloatingSaveButton from '../components/FloatingSaveButton';
import DatePicker from '../components/DatePicker';
const { width: screenWidth } = Dimensions.get('window');

const WebInput = ({ label, value, onChangeText, type = 'text', style }) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <textarea
        value={value}
        onChange={(e) => {
          if (type === 'number' && isNaN(e.target.value)) return;
          onChangeText(e.target.value);
        }}
        style={{ ...styles.webInput, ...style }} // Merge default and custom styles
        rows={1}
        maxLength={type === 'text' ? 1000 : undefined}
      />
    </View>
  );
};

const MobileInput = ({ label, value, onChangeText, keyboardType = 'default', maxLength, style }) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        style={[style, styles.input]} // Ensure custom style is applied first
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={true}
      />
    </View>
  );
};

const TextInput = Platform.OS === 'web' ? WebInput : MobileInput;

const AddPet = ({ route }) => {
  const navigation = useNavigation();
  
  // Get initial pet data
  const [petData] = useState(() => {
    if (Platform.OS === 'web') {
      const stored = sessionStorage.getItem('editPetData');
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return route.params?.pet || {};
  });

  // Clean URL on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (window.location.search) {
        window.history.replaceState({}, '', '/AddPet');
      }
      // Store pet data if it exists in route params
      if (route.params?.pet) {
        sessionStorage.setItem('editPetData', JSON.stringify(route.params.pet));
      }
    }
    // Cleanup on unmount
    return () => {
      if (Platform.OS === 'web' && !window.location.pathname.includes('AddPet')) {
        sessionStorage.removeItem('editPetData');
      }
    };
  }, []);

  // Use petData instead of route.params.pet throughout the component
  const pet = petData;

  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState(pet && pet.animal_type ? pet.animal_type : ''); // For actual pet type
  const [animalType, setAnimalType] = useState(pet && pet.animal_type ? pet.animal_type : ''); // For toggle buttons
  const [weight, setWeight] = useState('');
  const [breed, setBreed] = useState('');
  const [ageYears, setAgeYears] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [sex, setSex] = useState(null);
  const [friendlyWithChildren, setFriendlyWithChildren] = useState(null);
  const [friendlyWithCats, setFriendlyWithCats] = useState(null);
  const [friendlyWithDogs, setFriendlyWithDogs] = useState(null);
  const [spayedNeutered, setSpayedNeutered] = useState(null);
  const [houseTrained, setHouseTrained] = useState(null);
  const [microchipped, setMicrochipped] = useState(null);
  const [adoptionDate, setAdoptionDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // New state variables for Care Information
  const [pottyBreakSchedule, setPottyBreakSchedule] = useState(null);
  const [customPottyBreak, setCustomPottyBreak] = useState('');
  const [energyLevel, setEnergyLevel] = useState(null);
  const [feedingSchedule, setFeedingSchedule] = useState(null);
  const [customFeedingSchedule, setCustomFeedingSchedule] = useState('');
  const [leftAlone, setLeftAlone] = useState(null);
  const [customLeftAlone, setCustomLeftAlone] = useState('');
  const [medication, setMedication] = useState(null);
  const [medicationDetails, setMedicationDetails] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Add these new state variables at the top of the AddPet component
  const [vetName, setVetName] = useState('');
  const [vetAddress, setVetAddress] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [vetDocuments, setVetDocuments] = useState([]);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [estimatedBirthday, setEstimatedBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(false);

    if (pet) {
      // Populate fields with existing pet data or set to empty string if not available
      setPetName(pet.name ? pet.name : '');
      setPetType(pet.animal_type ? pet.animal_type : '');
      setAnimalType(pet.animal_type === 'Cat' || pet.animal_type === 'Dog' ? pet.animal_type : 'Exotic');
      setBreed(pet.breed ? pet.breed : '');
      setWeight(pet.weight ? pet.weight : '');
      setAgeYears(pet.age && pet.age.years ? pet.age.years : '');
      setAgeMonths(pet.age && pet.age.months ? pet.age.months : '');
      setSex(pet.sex ? pet.sex : '');
      setFriendlyWithChildren(pet.friendlyWithChildren !== undefined ? pet.friendlyWithChildren : null);
      setFriendlyWithCats(pet.friendlyWithCats !== undefined ? pet.friendlyWithCats : null);
      setFriendlyWithDogs(pet.friendlyWithDogs !== undefined ? pet.friendlyWithDogs : null);
      setSpayedNeutered(pet.spayedNeutered !== undefined ? pet.spayedNeutered : null);
      setHouseTrained(pet.houseTrained !== undefined ? pet.houseTrained : null);
      setMicrochipped(pet.microchipped !== undefined ? pet.microchipped : null);
      setAdoptionDate(pet.adoptionDate ? new Date(pet.adoptionDate) : new Date()); // Default to current date if not available
      setDescription(pet.description ? pet.description : '');
      setEnergyLevel(pet.energyLevel ? pet.energyLevel : '');

      // Check if feedingSchedule is an array
      if (Array.isArray(pet.feedingSchedule)) {
        setFeedingSchedule(pet.feedingSchedule[0]); // Set to 'Custom'
        setCustomFeedingSchedule(pet.feedingSchedule[1]); // Set custom instructions
      } else {
        setFeedingSchedule(pet.feedingSchedule ? pet.feedingSchedule : ''); // Populate feeding schedule
        setCustomFeedingSchedule(''); // Reset custom feeding schedule
      }

      setLeftAlone(pet.leftAlone ? pet.leftAlone : '');
      setMedication(pet.medication ? pet.medication : '');
      setAdditionalInstructions(pet.additionalInstructions ? pet.additionalInstructions : '');
      setVetName(pet.vetName ? pet.vetName : '');
      setVetAddress(pet.vetAddress ? pet.vetAddress : '');
      setVetPhone(pet.vetPhone ? pet.vetPhone : '');
      setInsuranceProvider(pet.insuranceProvider ? pet.insuranceProvider : '');
      setVetDocuments(pet.veterinarian && pet.veterinarian.documents ? pet.veterinarian.documents : []);
      setGalleryImages(pet.galleryImages ? pet.galleryImages : []);
      
      // Set estimated birthday if available
      if (pet.age) {
        const today = new Date();
        const estimatedDate = new Date(today.getFullYear() - pet.age.years, today.getMonth() - pet.age.months);
        setEstimatedBirthday(estimatedDate);
      }
    } else {
      // If pet is not defined, initialize fields to empty strings
      setPetName('');
      setPetType('');
      setAnimalType('');
      setWeight('');
      setAgeYears('');
      setAgeMonths('');
      setSex('');
      setFriendlyWithChildren(null);
      setFriendlyWithCats(null);
      setFriendlyWithDogs(null);
      setSpayedNeutered(null);
      setHouseTrained(null);
      setMicrochipped(null);
      setAdoptionDate(new Date());
      setDescription('');
      setEnergyLevel('');
      setFeedingSchedule(''); // Initialize feeding schedule
      setCustomFeedingSchedule(''); // Initialize custom feeding schedule
      setLeftAlone('');
      setMedication('');
      setAdditionalInstructions('');
      setVetName('');
      setVetAddress('');
      setVetPhone('');
      setInsuranceProvider('');
      setVetDocuments([]);
      setGalleryImages([]);
    }
  }, [pet]);

  useEffect(() => {
    if (ageYears && ageMonths) {
      const today = new Date();
      const estimatedDate = new Date(today.getFullYear() - parseInt(ageYears), today.getMonth() - parseInt(ageMonths));
      setEstimatedBirthday(estimatedDate);
    }
  }, [ageYears, ageMonths]);

  const calculateAge = (birthday) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let ageYears = today.getFullYear() - birthDate.getFullYear();
    let ageMonths = today.getMonth() - birthDate.getMonth();

    if (ageMonths < 0) {
      ageYears--;
      ageMonths += 12;
    }

    setAgeYears(ageYears.toString());
    setAgeMonths(ageMonths.toString());
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const renderEstimatedBirthday = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Estimated Birthday:</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateText}>
          {format(estimatedBirthday, 'yyyy-MM-dd')}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DatePicker
          value={estimatedBirthday}
          onChange={(date) => {
            if (date) {
              setEstimatedBirthday(date);
              calculateAge(date); // Calculate age when date is selected
              setHasUnsavedChanges(true); // Set hasUnsavedChanges to true when date is selected
            }
            setShowDatePicker(false);
          }}
        />
      )}
    </View>
  );

  const renderTab = (type) => (
    <TouchableOpacity
      style={[
        styles.tab,
        animalType === type && styles.activeTab,
        type === 'Dog' && styles.leftTab,
        type === 'Exotic' && styles.rightTab,
      ]}
      onPress={() => {
        setAnimalType(type); // Set the pet type
        setHasUnsavedChanges(true); // Set hasUnsavedChanges to true
      }}
    >
      <Text style={styles.tabText}>{type}</Text>
    </TouchableOpacity>
  );

  const renderToggleButtons = (options, value, setValue, customInput = false, customValue = '', setCustomValue = () => {}) => (
    <View style={styles.toggleContainer}>
      <View style={styles.buttonRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.yesNoButton, value === option && styles.activeYesNoButton]}
            onPress={() => setValue(option)}
          >
            <Text style={styles.yesNoText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {((customInput && value === 'Custom') || (options.includes('Pill') && value)) && (
        Platform.OS === 'web' ? (
          <View style={styles.inputContainer}>
            <textarea
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              style={styles.webInput}
              placeholder={options.includes('Pill') ? "Enter medication details" : "Enter custom time"}
            />
          </View>
        ) : (
          <TextInput
            value={customValue}
            onChangeText={setCustomValue}
            style={[styles.customInput, { width: '100%' }]}
            placeholder={options.includes('Pill') ? "Enter medication details" : "Enter custom time"}
          />
        )
      )}
    </View>
  );

  const renderYesNoButtons = (value, setValue) => (
    <View style={styles.yesNoContainer}>
      <TouchableOpacity
        style={[styles.yesNoButton, value === true && styles.activeYesNoButton]}
        onPress={() => setValue(true)}
      >
        <Text style={styles.yesNoText}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.yesNoButton, value === false && styles.activeYesNoButton]}
        onPress={() => setValue(false)}
      >
        <Text style={styles.yesNoText}>No</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSexButtons = (value, setValue) => (
    <View style={styles.yesNoContainer}>
      <TouchableOpacity
        style={[styles.yesNoButton, value === 'Male' && styles.activeYesNoButton]}
        onPress={() => {
          setSex('Male'); // Update the sex state
          setHasUnsavedChanges(true); // Set unsaved changes to true
        }}
      >
        <Text style={styles.yesNoText}>Male</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.yesNoButton, value === 'Female' && styles.activeYesNoButton]}
        onPress={() => {
          setSex('Female'); // Update the sex state
          setHasUnsavedChanges(true); // Set unsaved changes to true
        }}
      >
        <Text style={styles.yesNoText}>Female</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSaveProfile = () => {
    setIsSubmitting(true);
    setHasUnsavedChanges(false);

    const petData = {
      // Basic Info
      petName,
      petType: (animalType !== 'Exotic') ? animalType : petType,
      weight,
      breed,
      estimatedBirthday,
      age: {
        years: ageYears,
        months: ageMonths
      },
      sex,
      profileImage,
      description,
      adoptionDate: format(adoptionDate, 'yyyy-MM-dd'),

      // Temperament & Training
      friendlyWithChildren,
      friendlyWithCats,
      friendlyWithDogs,
      spayedNeutered,
      houseTrained,
      microchipped,

      // Care Information
      pottyBreakSchedule: pottyBreakSchedule === 'Custom' ? customPottyBreak : pottyBreakSchedule,
      energyLevel,
      feedingSchedule: feedingSchedule === 'Custom' ? customFeedingSchedule : feedingSchedule,
      leftAlone: leftAlone === 'Custom' ? customLeftAlone : leftAlone,
      medication: medication ? {
        type: medication,
        details: medicationDetails
      } : null,
      additionalInstructions,

      // Health Information
      veterinarian: {
        name: vetName,
        address: vetAddress,
        phone: vetPhone,
        documents: vetDocuments.map(doc => ({
          uri: doc.uri,
          type: doc.type,
          name: doc.fileName || 'document'
        }))
      },
      insuranceProvider,

      // Photo Gallery
      galleryImages: galleryImages.map(img => ({
        uri: img.uri,
        type: img.type,
        name: img.fileName || 'image'
      }))
    };

    console.log('Pet Profile Data:', JSON.stringify(petData, null, 2));

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // alert('Pet profile saved successfully!');
      // Navigate back or clear form
      // setHasUnsavedChanges(false);
    }, 1000);
  };

  const pickVetDocuments = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setVetDocuments([...vetDocuments, ...result.assets]);
    }
  };

  const pickGalleryImages = async () => {
    try {
      // Request permissions first (for iOS)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
        aspect: [1, 1],
      });

      if (!result.canceled) {
        setGalleryImages(prevImages => [...prevImages, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      alert('Error selecting images. Please try again.');
    }
  };

  // Function to handle input changes and set unsaved changes
  const handleInputChange = (setter) => (value) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MyPets')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {pet && Object.keys(pet).length > 0 ? 'Edit Pet' : 'Add a New Pet'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          {/* Pet Details Section */}
          <Text style={styles.sectionHeader}>
            <MaterialCommunityIcons name="paw" size={20} /> Pet Details
          </Text>
          {/* Profile Photo */}
          <Text style={styles.label}>Profile Photo</Text>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialCommunityIcons name="camera" size={40} color="#ccc" />
              </View>
            )}
          </TouchableOpacity>
          {/* Pet Type Selection */}
          <View style={styles.tabContainer}>
            {renderTab('Dog')}
            {renderTab('Cat')}
            {renderTab('Exotic')}
          </View>
          <TextInput 
            label="Pet Name" 
            value={petName} 
            onChangeText={handleInputChange(setPetName)} 
            placeholder={pet ? pet.name : "Enter pet name"} 
          />
          {animalType === 'Exotic' && (
            <TextInput 
              label="Pet Type" 
              value={pet.animal_type ? pet.animal_type : ''} 
              onChangeText={handleInputChange(setPetType)} 
              placeholder={pet ? pet.animal_type : "Enter pet type"} 
            />
          )}
          <TextInput 
            label="Weight (lbs)" 
            value={weight.toString()} 
            onChangeText={handleInputChange(setWeight)} 
            keyboardType="numeric" 
          />
          {renderEstimatedBirthday()}
          <TextInput
            label="Age in Years"
            value={ageYears.toString() ? ageYears.toString() : ''}
            onChangeText={handleInputChange(setAgeYears)}
            keyboardType="numeric"
            maxLength={2}
          />
          <TextInput
            label="Age in Months"
            value={ageMonths === '' ? '' : ageMonths === '0' ? '0' : ageMonths.toString()}
            onChangeText={handleInputChange(setAgeMonths)}
            keyboardType="numeric"
            maxLength={2}
          />
          <TextInput 
            label="Breed" 
            value={breed} 
            onChangeText={handleInputChange(setBreed)} 
          />
          <Text style={styles.boldLabel}>Sex:</Text>
          {renderSexButtons(sex, setSex)}
          {(animalType === 'Dog' || animalType === 'Cat') && (
            <>
                <Text style={styles.boldLabel}>Friendly with Children:</Text>
                {renderYesNoButtons(friendlyWithChildren, setFriendlyWithChildren)}
                <Text style={styles.boldLabel}>Friendly with Cats:</Text>
                {renderYesNoButtons(friendlyWithCats, setFriendlyWithCats)}
                <Text style={styles.boldLabel}>Friendly with Dogs:</Text>
                {renderYesNoButtons(friendlyWithDogs, setFriendlyWithDogs)}
                <Text style={styles.boldLabel}>Spayed/Neutered:</Text>
                {renderYesNoButtons(spayedNeutered, setSpayedNeutered)}
                <Text style={styles.boldLabel}>House Trained:</Text>
                {renderYesNoButtons(houseTrained, setHouseTrained)}
                <Text style={styles.boldLabel}>Microchipped:</Text>
                {renderYesNoButtons(microchipped, setMicrochipped)}
            </>
            )}
          <Text style={styles.boldLabel}>Adoption Date:</Text>
          {/* TODO: change this to the DatePicker.js file i have */}
          {Platform.OS === 'web' ? (
            <View style={styles.timePickerContainer}>
              <input
                type="date"
                value={format(adoptionDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setAdoptionDate(date);
                }}
                style={styles.webTimePicker}
              />
            </View>
          ) : (
            <DateTimePicker
              value={adoptionDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setAdoptionDate(selectedDate);
                }
              }}
            />
          )}
          <View style={{ height: 16 }} />
          <View style={styles.inputContainer}>
            <TextInput
              label="Pet Description"
              value={description}
              onChangeText={handleInputChange(setDescription)}
              maxLength={1000}
              multiline
              style={styles.descriptionInput}
            />
          </View>

          {/* Care Information Section */}
          <Text style={styles.sectionHeader}>
            <MaterialCommunityIcons name="heart" size={20} /> Care Information
          </Text>
          {(petType === 'Dog') && (
            <>
              <Text style={styles.boldLabel}>Potty Break Schedule:</Text>
              {renderToggleButtons(['2 hours', '4 hours', '8 hours', 'Custom'], pottyBreakSchedule, setPottyBreakSchedule, true, customPottyBreak, setCustomPottyBreak)}
            </>
          )}
          <Text style={styles.boldLabel}>Energy Level:</Text>
          {renderToggleButtons(['High', 'Moderate', 'Low'], energyLevel, setEnergyLevel)}
          <Text style={styles.boldLabel}>Feeding Schedule:</Text>
          {renderToggleButtons(['Morning', 'Twice a day', 'Custom'], feedingSchedule, setFeedingSchedule, true, customFeedingSchedule, setCustomFeedingSchedule)}
          <Text style={styles.boldLabel}>Can Be Left Alone:</Text>
          {renderToggleButtons(['<1 hour', '1-4 hours', '4-8 hours', 'Custom'], leftAlone, setLeftAlone, true, customLeftAlone, setCustomLeftAlone)}
          <Text style={styles.boldLabel}>Medication:</Text>
          {renderToggleButtons(['Pill', 'Topical', 'Injection'], medication, setMedication, true, medicationDetails, setMedicationDetails)}
          {/* <View style={{ height: 16 }} /> */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Anything Else The Professional Should Know"
              value={additionalInstructions}
              onChangeText={handleInputChange(setAdditionalInstructions)}
              maxLength={1000}
              multiline
              style={styles.descriptionInput}
              placeholder="Add custom instructions"
            />
          </View>

          {/* Health Information Section */}
          <Text style={styles.sectionHeader}>
            <MaterialCommunityIcons name="medical-bag" size={20} /> Health Information
          </Text>

          <TextInput 
            label="Veterinarian Name"
            value={vetName}
            onChangeText={handleInputChange(setVetName)}
          />

          <TextInput 
            label="Veterinarian Address"
            value={vetAddress}
            onChangeText={handleInputChange(setVetAddress)}
            multiline
          />

          <TextInput 
            label="Veterinarian Phone"
            value={vetPhone}
            onChangeText={handleInputChange(setVetPhone)}
            keyboardType="phone-pad"
          />

          <TextInput 
            label="Pet Insurance Provider"
            value={insuranceProvider}
            onChangeText={handleInputChange(setInsuranceProvider)}
            style={styles.input}
          />

          <Text style={styles.boldLabel}>Veterinary Documents:</Text>
          <View style={styles.documentsContainer}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickVetDocuments}>
              <MaterialCommunityIcons name="file-upload" size={24} color="#666" />
              <Text style={styles.uploadText}>Upload Documents</Text>
            </TouchableOpacity>
            {vetDocuments.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.documentsList}>
                {vetDocuments.map((doc, index) => (
                  <Image 
                    key={index}
                    source={{ uri: doc.uri }}
                    style={styles.documentThumbnail}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Photo Gallery Section */}
          <View style={styles.gallerySection && styles.scrollViewContent}>
            <Text style={styles.sectionHeader}>
              <MaterialCommunityIcons name="image-multiple" size={20} /> Photo Gallery
            </Text>

            <TouchableOpacity style={styles.uploadButton} onPress={pickGalleryImages}>
              <MaterialCommunityIcons name="image-plus" size={24} color="#666" />
              <Text style={styles.uploadText}>Add Photos</Text>
            </TouchableOpacity>

            {galleryImages.length > 0 && (
              <View style={styles.galleryContainer}>
                {galleryImages.map((image, index) => (
                  <Image 
                    key={index}
                    source={{ uri: image.uri }}
                    style={styles.galleryThumbnail}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <FloatingSaveButton 
        visible={hasUnsavedChanges}
        onSave={handleSaveProfile}
        btnText={'Save Profile'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'web' ? 16 : 80,
  },
  formContainer: {
    width: Platform.OS === 'web' && screenWidth > 600 ? '40%' : '90%',
    alignItems: 'center', // Center horizontally
    paddingBottom: 16,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    // marginBottom: 8,
    width: '100%', // Ensure the container takes full width
    alignItems: 'center', // Center the input within the container
    paddingBottom: Platform.OS === 'web' ? 0 : 40,
    flex: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center', // Center the label text
  },
  boldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 25,
    fontWeight: 'bold',
    marginVertical: 16,
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
  webInput: {
    width: '100%', // Full width for web input
    minHeight: 24, // Set a minimum height
    padding: 8,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    resize: 'none', // Prevent textarea from being resizable
  },
  input: {
    width: '100%', // Full width for mobile input
    height: 40, // Set a consistent height for mobile inputs
    padding: 8,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
  },
  descriptionInput: {
    width: '100%',
    minHeight: 90, // Increased height for better visibility
    padding: 8,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    textAlignVertical: 'center',
    // marginTop: 32, // Added margin to separate from the adoption date
  },
  customInput: {
    width: '100%',
    padding: 8,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 8, // Add a smaller margin bottom
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  activeTab: {
    backgroundColor: '#ddd',
  },
  leftTab: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  rightTab: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  tabText: {
    fontSize: 16,
  },
  toggleContainer: {
    width: '100%',
    marginBottom: 8, // Reduce this from 16 to 8
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  yesNoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  yesNoButton: {
    marginHorizontal: 10,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80, // Ensure the button is wide enough to prevent text wrapping
  },
  activeYesNoButton: {
    backgroundColor: '#ddd',
  },
  yesNoText: {
    fontSize: 16,
  },
  datePicker: {
    marginBottom: 16,
    padding: 10,
    // borderWidth: 1,
    // borderColor: '#ccc',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 16,
    width: '100%',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  webTimePicker: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    fontSize: 16,
  },
  documentsContainer: {
    marginVertical: 10,
    width: '100%',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  uploadText: {
    marginLeft: 8,
    color: '#666',
  },
  documentsList: {
    minHeight: 100 + 20, // Add fixed height to prevent collapse
  },
  documentThumbnail: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 4,
  },
  gallerySection: {
    width: '100%',
    marginTop: 16,
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  galleryThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    paddingBottom: 100, // Add padding to prevent content from being hidden behind the button
  },
});

export default AddPet;
