import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { navigateToFrom, handleBack } from '../components/Navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';


// TODO: mention to user initially we are doing a manual verification process, will implement automation later.
const BecomeProfessional = ({ navigation }) => {
  const [selectedPets, setSelectedPets] = useState({
    dog: false,
    cat: false,
    exotics: false,
  });
  const [about, setAbout] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [insuranceProof, setInsuranceProof] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { is_DEBUG } = useContext(AuthContext);

  useEffect(() => {
    const initializeNavigation = async () => {
      const currentRoute = Platform.OS === 'web' ? sessionStorage.getItem('currentRoute') : await AsyncStorage.getItem('currentRoute');
      if (currentRoute !== 'BecomeProfessional') {
        await navigateToFrom(navigation, 'BecomeProfessional', currentRoute);
      } else {
        if (is_DEBUG) {
          console.log('Error, currentRoute is BecomeProfessional');
        }
      }
    };
    initializeNavigation();
  }, []);

  const handleBackPress = () => {
    handleBack(navigation);
  };

  const togglePetSelection = (pet) => {
    setSelectedPets({ ...selectedPets, [pet]: !selectedPets[pet] });
  };

  const pickCertification = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const newCertification = {
        uri: result.assets[0].uri,
        base64: result.assets[0].base64,
        name: result.assets[0].uri.split('/').pop()
      };
      setCertifications([...certifications, newCertification]);
    }
  };

  const pickInsuranceProof = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const newProof = {
        uri: result.assets[0].uri,
        base64: result.assets[0].base64,
        name: result.assets[0].uri.split('/').pop()
      };
      setInsuranceProof([...insuranceProof, newProof]);
    }
  };

  const removeCertification = (index) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const removeInsuranceProof = (index) => {
    setInsuranceProof(insuranceProof.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    
      // Original submission logic for non-prototype mode
      setTimeout(() => {
        setIsSubmitting(false);
        setSelectedPets({
          dog: false,
          cat: false,
          exotics: false,
        });
        setAbout('');
        setCertifications([]);
        setInsuranceProof([]);
        if (Platform.OS === 'web') {
          window.confirm('Success: Your application has been submitted successfully!') && navigation.navigate('More');
        } else {
          Alert.alert('Success', 'Your application has been submitted successfully!', [
            { text: 'OK', onPress: () => navigation.navigate('More', { screen: 'More', transition: 'slide' }) },
          ]);
        }
      }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Become a Professional</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Become a Professional</Text>
        
        <Text style={styles.label}>Select Pets You Can Sit:</Text>
        <View style={styles.checkboxContainer}>
          {['dog', 'cat', 'exotics'].map((pet) => (
            <TouchableOpacity
              key={pet}
              style={[
                styles.petButton,
                selectedPets[pet] && styles.selectedPetButton,
              ]}
              onPress={() => togglePetSelection(pet)}
            >
              <MaterialCommunityIcons
                name={pet === 'exotics' ? 'turtle' : pet}
                size={24}
                color={selectedPets[pet] ? '#fff' : theme.colors.primary}
              />
              <Text style={[styles.petButtonText, selectedPets[pet] && styles.selectedPetButtonText]}>
                {pet.charAt(0).toUpperCase() + pet.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>About You:</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="Write a little about yourself..."
          value={about}
          onChangeText={setAbout}
        />

        <Text style={styles.label}>Upload Certifications/Resume:</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickCertification}>
          <MaterialCommunityIcons name="file-upload" size={24} color="#666" />
          <Text style={styles.uploadText}>Upload Documents</Text>
        </TouchableOpacity>
        {certifications.map((cert, index) => (
          <View key={index} style={styles.uploadedFileContainer}>
            <Image source={{ uri: cert.uri }} style={styles.uploadedFilePreview} />
            <Text style={styles.certificationText} numberOfLines={1}>
              {cert.name}
            </Text>
            <TouchableOpacity 
              style={styles.removeFileButton}
              onPress={() => removeCertification(index)}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.label}>Upload Insurance Proof:</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickInsuranceProof}>
          <MaterialCommunityIcons name="file-upload" size={24} color="#666" />
          <Text style={styles.uploadText}>Upload Insurance</Text>
        </TouchableOpacity>
        {insuranceProof.map((proof, index) => (
          <View key={index} style={styles.uploadedFileContainer}>
            <Image source={{ uri: proof.uri }} style={styles.uploadedFilePreview} />
            <Text style={styles.certificationText} numberOfLines={1}>
              {proof.name}
            </Text>
            <TouchableOpacity 
              style={styles.removeFileButton}
              onPress={() => removeInsuranceProof(index)}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.submitButtonText}>Submit Application</Text>
        </TouchableOpacity>
        {isSubmitting && <ActivityIndicator style={styles.loadingIndicator} size="small" color={theme.colors.primary} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    width: Platform.OS === 'web' && Dimensions.get('window').width > 600 ? '40%' : '90%',
    alignSelf: 'center',
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
  title: {
    fontSize: theme.fontSizes.large,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  petButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  selectedPetButton: {
    backgroundColor: theme.colors.primary,
  },
  petButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
  },
  selectedPetButtonText: {
    color: '#fff',
  },
  textInput: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    backgroundColor: theme.colors.inputBackground,
  },
  certificationText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    marginTop: 5,
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
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: theme.fontSizes.medium,
  },
  loadingIndicator: {
    marginTop: 10, // Add margin to separate the loading indicator from the submit button
  },
  subtitle: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  uploadedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  uploadedFilePreview: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  removeFileButton: {
    padding: 4,
    marginLeft: 'auto',
  },
});

export default BecomeProfessional;
