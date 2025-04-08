import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, SafeAreaView, Platform, StatusBar, TouchableOpacity, ActivityIndicator, Alert, Image, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { navigateToFrom, handleBack } from '../components/Navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';


// TODO: mention to user initially we are doing a manual verification process, will implement automation later.
const BecomeProfessional = ({ navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, is_DEBUG } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const [selectedPets, setSelectedPets] = useState({
    dog: false,
    cat: false,
    exotics: false,
  });
  const [about, setAbout] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [insuranceProof, setInsuranceProof] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
    };
    updateLayout();
  }, [screenWidth]);

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

  const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      height: '100vh',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
      transition: 'margin-left 0.3s ease',
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    scrollContent: {
      flexGrow: 1,
      padding: screenWidth <= 900 ? 16 : 20,
      width: screenWidth > 900 ? '60%' : '90%',
      maxWidth: 800,
      alignSelf: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      display: screenWidth <= 900 ? 'flex' : 'none',
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
      fontSize: screenWidth <= 900 ? 24 : 32,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: screenWidth <= 900 ? 16 : 24,
      fontFamily: theme.fonts.header.fontFamily,
    },
    label: {
      fontSize: theme.fontSizes.medium,
      color: theme.colors.text,
      marginBottom: screenWidth <= 900 ? 8 : 12,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    checkboxContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: screenWidth <= 900 ? 'space-between' : 'flex-start',
      gap: screenWidth <= 900 ? 8 : 16,
      marginBottom: screenWidth <= 900 ? 16 : 24,
    },
    petButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: screenWidth <= 900 ? 8 : 12,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      minWidth: screenWidth <= 900 ? '45%' : 150,
    },
    selectedPetButton: {
      backgroundColor: theme.colors.primary,
    },
    petButtonText: {
      marginLeft: 8,
      color: theme.colors.primary,
      fontSize: theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    selectedPetButtonText: {
      color: theme.colors.surface,
    },
    textInput: {
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: screenWidth <= 900 ? 12 : 16,
      marginBottom: screenWidth <= 900 ? 16 : 24,
      backgroundColor: theme.colors.inputBackground,
      minHeight: 120,
      fontSize: theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: screenWidth <= 900 ? 12 : 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderStyle: 'dashed',
      marginBottom: screenWidth <= 900 ? 12 : 16,
    },
    uploadText: {
      marginLeft: 8,
      color: theme.colors.text,
      fontSize: theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    uploadedFileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      padding: screenWidth <= 900 ? 8 : 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    uploadedFilePreview: {
      width: 40,
      height: 40,
      borderRadius: 4,
      marginRight: 8,
    },
    certificationText: {
      flex: 1,
      fontSize: theme.fontSizes.small,
      color: theme.colors.text,
      marginRight: 8,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    removeFileButton: {
      padding: 4,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      padding: screenWidth <= 900 ? 12 : 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: screenWidth <= 900 ? 20 : 32,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: theme.colors.surface,
      fontSize: theme.fontSizes.medium,
      fontWeight: 'bold',
      fontFamily: theme.fonts.regular.fontFamily,
    },
    loadingIndicator: {
      marginTop: 16,
    },
    formContainer: {
      width: '100%',
    },
  });

  return (
    <View style={createStyles(screenWidth, isCollapsed).mainContainer}>
      <SafeAreaView style={createStyles(screenWidth, isCollapsed).container}>
        {isMobile && (
          <View style={createStyles(screenWidth, isCollapsed).header}>
            <TouchableOpacity onPress={handleBackPress} style={createStyles(screenWidth, isCollapsed).backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={createStyles(screenWidth, isCollapsed).headerText}>Become a Professional</Text>
          </View>
        )}
        
        <ScrollView contentContainerStyle={createStyles(screenWidth, isCollapsed).scrollContent}>
          <View style={createStyles(screenWidth, isCollapsed).formContainer}>
            <Text style={createStyles(screenWidth, isCollapsed).title}>Become a Professional</Text>
            
            <Text style={createStyles(screenWidth, isCollapsed).label}>Select Pets You Can Sit:</Text>
            <View style={createStyles(screenWidth, isCollapsed).checkboxContainer}>
              {['dog', 'cat', 'exotics'].map((pet) => (
                <TouchableOpacity
                  key={pet}
                  style={[
                    createStyles(screenWidth, isCollapsed).petButton,
                    selectedPets[pet] && createStyles(screenWidth, isCollapsed).selectedPetButton,
                  ]}
                  onPress={() => togglePetSelection(pet)}
                >
                  <MaterialCommunityIcons
                    name={pet === 'exotics' ? 'turtle' : pet}
                    size={24}
                    color={selectedPets[pet] ? theme.colors.surface : theme.colors.primary}
                  />
                  <Text style={[
                    createStyles(screenWidth, isCollapsed).petButtonText,
                    selectedPets[pet] && createStyles(screenWidth, isCollapsed).selectedPetButtonText
                  ]}>
                    {pet.charAt(0).toUpperCase() + pet.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={createStyles(screenWidth, isCollapsed).label}>About You:</Text>
            <TextInput
              style={createStyles(screenWidth, isCollapsed).textInput}
              multiline
              numberOfLines={4}
              placeholder="Write a little about yourself..."
              value={about}
              onChangeText={setAbout}
            />

            <Text style={createStyles(screenWidth, isCollapsed).label}>Upload Certifications/Resume:</Text>
            <TouchableOpacity style={createStyles(screenWidth, isCollapsed).uploadButton} onPress={pickCertification}>
              <MaterialCommunityIcons name="file-upload" size={24} color={theme.colors.text} />
              <Text style={createStyles(screenWidth, isCollapsed).uploadText}>Upload Documents</Text>
            </TouchableOpacity>
            {certifications.map((cert, index) => (
              <View key={index} style={createStyles(screenWidth, isCollapsed).uploadedFileContainer}>
                <Image source={{ uri: cert.uri }} style={createStyles(screenWidth, isCollapsed).uploadedFilePreview} />
                <Text style={createStyles(screenWidth, isCollapsed).certificationText} numberOfLines={1}>
                  {cert.name}
                </Text>
                <TouchableOpacity 
                  style={createStyles(screenWidth, isCollapsed).removeFileButton}
                  onPress={() => removeCertification(index)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={createStyles(screenWidth, isCollapsed).label}>Upload Insurance Proof:</Text>
            <TouchableOpacity style={createStyles(screenWidth, isCollapsed).uploadButton} onPress={pickInsuranceProof}>
              <MaterialCommunityIcons name="file-upload" size={24} color={theme.colors.text} />
              <Text style={createStyles(screenWidth, isCollapsed).uploadText}>Upload Insurance</Text>
            </TouchableOpacity>
            {insuranceProof.map((proof, index) => (
              <View key={index} style={createStyles(screenWidth, isCollapsed).uploadedFileContainer}>
                <Image source={{ uri: proof.uri }} style={createStyles(screenWidth, isCollapsed).uploadedFilePreview} />
                <Text style={createStyles(screenWidth, isCollapsed).certificationText} numberOfLines={1}>
                  {proof.name}
                </Text>
                <TouchableOpacity 
                  style={createStyles(screenWidth, isCollapsed).removeFileButton}
                  onPress={() => removeInsuranceProof(index)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity 
              style={[
                createStyles(screenWidth, isCollapsed).submitButton,
                isSubmitting && createStyles(screenWidth, isCollapsed).submitButtonDisabled
              ]} 
              onPress={handleSubmit} 
              disabled={isSubmitting}
            >
              <Text style={createStyles(screenWidth, isCollapsed).submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Text>
            </TouchableOpacity>
            
            {isSubmitting && (
              <ActivityIndicator 
                style={createStyles(screenWidth, isCollapsed).loadingIndicator} 
                size="small" 
                color={theme.colors.primary} 
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default BecomeProfessional;
