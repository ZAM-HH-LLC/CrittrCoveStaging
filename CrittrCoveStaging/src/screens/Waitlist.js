import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView, Clipboard, Modal, FlatList } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useForm, ValidationError } from '@formspree/react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CrossPlatformContent = ({ children }) => {
  // For web, we need to add a div with margin auto to center content
  if (Platform.OS === 'web') {
    return (
      <View style={{ 
        width: '100%', 
        maxWidth: 550, 
        marginLeft: 'auto', 
        marginRight: 'auto',
        paddingHorizontal: 15
      }}>
        {children}
      </View>
    );
  }
  // For native, just return children
  return <>{children}</>;
};

const ValidationModal = ({ visible, message, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>{message}</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const CityDropdown = ({ selectedCity, onSelectCity }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const cities = [
    { id: '1', name: 'Colorado Springs' },
    { id: '2', name: 'Denver' },
    { id: '3', name: 'Boulder' },
    { id: '4', name: 'Fort Collins' },
    { id: '5', name: 'Pueblo' },
    { id: '6', name: 'Aurora' },
    { id: '7', name: 'Littleton' },
    { id: '8', name: 'Castle Rock' },
    { id: '9', name: 'Parker' },
    { id: '10', name: 'Centennial' },
    { id: '11', name: 'Other' }
  ];

  const filteredCities = cities.filter(city => 
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Always include "Other" in the results if it's not already there
  const displayCities = filteredCities.some(city => city.name === 'Other')
    ? filteredCities
    : [...filteredCities, { id: '11', name: 'Other' }];

  const renderCityItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.cityItem,
        item.name === 'Other' && styles.otherCityItem
      ]}
      onPress={() => {
        onSelectCity(item.name);
        setIsOpen(false);
      }}
    >
      <Text style={[
        styles.cityItemText,
        item.name === 'Other' && styles.otherCityText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, !selectedCity && styles.requiredField]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedCity || 'Select your city'}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={24}
          color={theme.colors.primary}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search cities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={displayCities}
            renderItem={renderCityItem}
            keyExtractor={item => item.id}
            style={styles.cityList}
          />
        </View>
      )}
    </View>
  );
};

const Waitlist = () => {
  const navigation = useNavigation();
  const { is_prototype, screenWidth } = useContext(AuthContext);
  const [state, handleFormspreeSubmit] = useForm("mkgobpro");
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [petInfo, setPetInfo] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [userType, setUserType] = useState('');
  const [hesitations, setHesitations] = useState('');
  const [desiredFeatures, setDesiredFeatures] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otherService, setOtherService] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [streetAddress, setStreetAddress] = useState('');
  const [aptUnit, setAptUnit] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [otherReferralSource, setOtherReferralSource] = useState('');
  const [validationModal, setValidationModal] = useState({
    visible: false,
    message: ''
  });
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [otherCity, setOtherCity] = useState('');
  const [cityError, setCityError] = useState('');

  // Calculate responsive widths
  const isMobile = screenWidth < 768;
  const maxContentWidth = '100%';

  // Navigation handler for back button
  const handleBackToSignup = () => {
    navigation.navigate('SignUp');
  };

  const services = [
    'Pet Sitting',
    'Grooming',
    'Training',
    'Veterinary Services',
    'Farm/Homestead Care',
    'Care Consulting',
    'Other'
  ];

  const userTypes = [
    'Pet owner in need of services',
    'Care specialist (sitter, groomer, ferrier, fish tank cleaner, etc)',
    'Both'
  ];

  const referralSources = [
    'Nextdoor',
    'Reddit',
    'Google',
    'Other - Enter name of Person who referred you or other referral source for a free sticker'
  ];

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatPhoneNumber = (text) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const [, area, prefix, line] = match;
      let formatted = '';
      if (area) formatted += `(${area}`;
      if (prefix) formatted += `) ${prefix}`;
      if (line) formatted += `-${line}`;
      return formatted;
    }
    return cleaned;
  };

  const handlePhoneChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
    setPhoneError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset validation errors
    setEmailError('');
    setPhoneError('');
    setCityError('');

    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      setValidationModal({
        visible: true,
        message: 'Please enter a valid email address'
      });
      return;
    }

    // Validate phone
    if (!phone) {
      setPhoneError('Please enter a valid phone number');
      setValidationModal({
        visible: true,
        message: 'Please enter a valid phone number'
      });
      return;
    }

    // Validate city
    if (!selectedCity) {
      setCityError('Please select your city');
      setValidationModal({
        visible: true,
        message: 'Please select your city'
      });
      return;
    }

    // Validate other city input if "Other" is selected
    if (selectedCity === 'Other' && !otherCity.trim()) {
      setCityError('Please specify your city');
      setValidationModal({
        visible: true,
        message: 'Please specify your city'
      });
      return;
    }

    if (!email || !firstName || !lastName || !phone || !petInfo || selectedServices.length === 0 || !userType || !agreeToTerms || !referralSource) {
      setValidationModal({
        visible: true,
        message: 'Please fill in all required fields'
      });
      return;
    }

    // Check if Other is selected but no input provided for services
    if (selectedServices.includes('Other') && !otherService.trim()) {
      setValidationModal({
        visible: true,
        message: 'Please specify the other service you are interested in'
      });
      return;
    }

    // Check if Other is selected but no input provided for referral source
    if (referralSource === 'Other - Enter name of Person who referred you or other referral source for a free sticker' && !otherReferralSource.trim()) {
      setValidationModal({
        visible: true,
        message: 'Please specify where you heard about us'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        firstName,
        lastName,
        email,
        phone,
        petInfo,
        services: selectedServices.includes('Other') 
          ? [...selectedServices.filter(s => s !== 'Other'), `Other - ${otherService.trim()}`].join(', ')
          : selectedServices.join(', '),
        userType,
        hesitations,
        desiredFeatures,
        newsletter: newsletter ? 'Yes' : 'No',
        agreeToTerms: agreeToTerms ? 'Yes' : 'No',
        referralSource: referralSource === 'Other - Enter name of Person who referred you or other referral source for a free sticker' 
          ? `Other - ${otherReferralSource.trim()}`
          : referralSource,
        // Flatten address fields
        streetAddress: streetAddress || '',
        aptUnit: aptUnit || '',
        city: selectedCity === 'Other' ? `Other - ${otherCity.trim()}` : selectedCity,
        stateRegion: stateRegion || '',
        zipCode: zipCode || '',
      };

      console.log('MBA9876: Submitting form data:', formData);
      const response = await handleFormspreeSubmit(formData);
      console.log('MBA9876: Formspree response:', response);

      if (state.succeeded) {
        // Reset form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setPetInfo('');
        setSelectedServices([]);
        setOtherService('');
        setShowOtherInput(false);
        setUserType('');
        setHesitations('');
        setDesiredFeatures('');
        setNewsletter(false);
        setAgreeToTerms(false);
        setStreetAddress('');
        setAptUnit('');
        setCity('');
        setStateRegion('');
        setZipCode('');
        setReferralSource('');
        setOtherReferralSource('');
      }
    } catch (error) {
      console.error('MBA9876: Error submitting form:', error);
      console.error('MBA9876: Error response:', error.response?.data);
      setValidationModal({
        visible: true,
        message: error.response?.data?.error || 'An error occurred while submitting the form. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleService = (service) => {
    setSelectedServices(prev => {
      if (service === 'Other') {
        setShowOtherInput(!prev.includes('Other'));
      }
      return prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service];
    });
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setString('https://crittrcove.com/waitlist');
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  if (state.succeeded) {
    return (
      <CrossPlatformView fullWidthHeader={true} contentWidth={maxContentWidth}>
        <BackHeader 
          title="Join Waitlist" 
          onBackPress={handleBackToSignup} 
        />
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
        >
          <CrossPlatformContent>
            <View style={styles.container}>
              <View style={styles.contentWrapper}>
                <Text style={[styles.title, { color: theme.colors.primary }]}>
                  Thank you for joining the CrittrCove waitlist!
                </Text>
                <Text style={styles.successMessage}>
                  As a waitlist member, you'll enjoy exclusive early access to the app, priority placement, 
                  special gifts, and a unique profile badge to highlight your role as a founding member of CrittrCove.
                </Text>
                <View style={styles.referralSection}>
                  <Text style={[styles.title, { fontSize: theme.fontSizes.large, marginTop: 20 }]}>
                    Want Another Custom Pet Sticker? 🎁
                  </Text>
                  <Text style={styles.successMessage}>
                    Share CrittrCove with your pet-loving friends! When they join the waitlist using this link:
                  </Text>
                  <View style={styles.linkContainer}>
                    <Text style={styles.link}>https://crittrcove.com/waitlist</Text>
                    <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
                      <MaterialCommunityIcons name="content-copy" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.successMessage}>
                    and mention your name, we'll send you another custom sticker featuring your pet. It's our way of saying thank you for helping
                    grow our community!
                  </Text>
                  <Text style={[styles.successMessage, { fontStyle: 'italic' }]}>
                    Simply tell your friends to mention your name when they sign up, and we'll take care of the rest.
                  </Text>
                </View>
                <Text style={styles.successMessage}>
                  Stay tuned for exciting updates!
                </Text>
              </View>
            </View>
          </CrossPlatformContent>
        </ScrollView>
      </CrossPlatformView>
    );
  }

  return (
    <CrossPlatformView fullWidthHeader={true} contentWidth={maxContentWidth}>
      <BackHeader 
        title="Join Waitlist" 
        onBackPress={handleBackToSignup} 
      />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
      >
        <CrossPlatformContent>
          <View style={styles.container}>
            <View style={styles.contentWrapper}>
              <Text style={styles.title}>Join the CrittrCove Waitlist!</Text>
              <Text style={styles.description}>
                Welcome to Critter Cove's early sign-up, the ultimate pet care marketplace for all pets—whether furry, feathery, or scaly! 
                Our app connects local pet care specialists with pet owners, offering reliable and loving care for your beloved companions.
              </Text>
              <Text style={styles.description}>
                By joining our waitlist, you'll gain early access to exclusive features, special gifts, education, discounts, a custom sticker featuring your pet (if you so wish), and a profile badge as a founding member of the Critter Cove community.
              </Text>

              <Text style={styles.requiredFieldNote}>
                <Text style={styles.requiredAsterisk}>*</Text> indicates required field
              </Text>

              <View style={styles.formSection}>
                <View style={styles.nameContainer}>
                  <View style={styles.nameField}>
                    <Text style={styles.label}>First Name <Text style={styles.requiredAsterisk}>*</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First Name"
                    />
                  </View>
                  <View style={styles.nameField}>
                    <Text style={styles.label}>Last Name <Text style={styles.requiredAsterisk}>*</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last Name"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Email <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                <Text style={styles.label}>Phone Number <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={[styles.input, phoneError ? styles.inputError : null]}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="(XXX) XXX-XXXX"
                  keyboardType="numeric"
                  maxLength={14}
                />
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

                <Text style={styles.label}>Do you currently own pets? If yes, tell us all about them! <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={petInfo}
                  onChangeText={setPetInfo}
                  placeholder="Tell us about your pets"
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>What kind of pet care services are you most interested in? <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.checkboxGroup}>
                  {services.map((service) => (
                    <View key={service}>
                      <TouchableOpacity 
                        style={styles.checkboxContainer}
                        onPress={() => toggleService(service)}
                      >
                        <MaterialCommunityIcons
                          name={selectedServices.includes(service) ? "checkbox-marked" : "checkbox-blank-outline"}
                          size={24}
                          color={theme.colors.primary}
                          style={styles.checkboxIcon}
                        />
                        <Text style={styles.checkboxLabel}>{service}</Text>
                      </TouchableOpacity>
                      {service === 'Other' && selectedServices.includes('Other') && (
                        <View style={styles.otherInputContainer}>
                          <Text style={styles.label}>Please specify other service <Text style={styles.requiredAsterisk}>*</Text></Text>
                          <TextInput
                            style={[styles.input, styles.otherInput]}
                            value={otherService}
                            onChangeText={setOtherService}
                            placeholder="Enter other service"
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                <Text style={styles.label}>Are you signing up as a: <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.radioGroup}>
                  {userTypes.map((type) => (
                    <TouchableOpacity 
                      key={type}
                      style={styles.radioContainer}
                      onPress={() => setUserType(type)}
                    >
                      <View style={[styles.radio, userType === type && styles.radioSelected]} />
                      <Text style={styles.radioLabel}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Where did you hear about us? <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.radioGroup}>
                  {referralSources.map((source) => (
                    <TouchableOpacity 
                      key={source}
                      style={styles.radioContainer}
                      onPress={() => setReferralSource(source)}
                    >
                      <View style={[styles.radio, referralSource === source && styles.radioSelected]} />
                      <Text style={styles.radioLabel}>{source}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {referralSource === 'Other - Enter name of Person who referred you or other referral source for a free sticker' && (
                  <View>
                    <Text style={styles.label}>Please specify where you heard about us <Text style={styles.requiredAsterisk}>*</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={otherReferralSource}
                      onChangeText={setOtherReferralSource}
                      placeholder="Enter referral source"
                    />
                  </View>
                )}

                <Text style={styles.label}>Which city are you located in? <Text style={styles.requiredAsterisk}>*</Text></Text>
                <CityDropdown
                  selectedCity={selectedCity}
                  onSelectCity={(city) => {
                    setSelectedCity(city);
                    setCityError('');
                  }}
                />
                {selectedCity === 'Other' && (
                  <View style={styles.otherInputContainer}>
                    <Text style={styles.label}>Please specify your city <Text style={styles.requiredAsterisk}>*</Text></Text>
                    <TextInput
                      style={[styles.input, cityError && styles.inputError]}
                      value={otherCity}
                      onChangeText={(text) => {
                        setOtherCity(text);
                        setCityError('');
                      }}
                      placeholder="Enter your city"
                    />
                  </View>
                )}
                {cityError ? <Text style={styles.errorText}>{cityError}</Text> : null}

                <Text style={styles.label}>What hesitations do you have about using an app to connect you to local pet care? <Text style={styles.optional}>(Optional)</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={hesitations}
                  onChangeText={setHesitations}
                  placeholder="Share your concerns"
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>What features or tools would make Critter Cove perfect for you? <Text style={styles.optional}>(Optional)</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={desiredFeatures}
                  onChangeText={setDesiredFeatures}
                  placeholder="Share your ideas"
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.addressSection}>
                  <Text style={styles.label}>Mailing Address <Text style={styles.optional}>(Optional)</Text></Text>
                  <Text style={styles.addressNote}>
                    🎁 <Text style={{ fontStyle: 'italic' }}> Want a custom sticker featuring your pet? Add your mailing address and we'll send you one for joining the waitlist!</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={streetAddress}
                    onChangeText={setStreetAddress}
                    placeholder="Street Address"
                  />
                  <TextInput
                    style={styles.input}
                    value={aptUnit}
                    onChangeText={setAptUnit}
                    placeholder="Apartment/Unit # (if applicable)"
                  />
                  <View style={styles.cityStateContainer}>
                    <TextInput
                      style={[styles.input, styles.cityInput]}
                      value={city}
                      onChangeText={setCity}
                      placeholder="City"
                    />
                    <TextInput
                      style={[styles.input, styles.stateInput]}
                      value={stateRegion}
                      onChangeText={setStateRegion}
                      placeholder="State"
                      maxLength={2}
                      autoCapitalize="characters"
                    />
                    <TextInput
                      style={[styles.input, styles.zipInput]}
                      value={zipCode}
                      onChangeText={setZipCode}
                      placeholder="ZIP"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Would you like to be added to the email newsletter for updates on the app, pet care tips, discounts and more? <Text style={styles.optional}>(Optional)</Text></Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.button, newsletter && styles.buttonSelected]}
                    onPress={() => setNewsletter(true)}
                  >
                    <Text style={[styles.buttonText, newsletter && styles.buttonTextSelected]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, !newsletter && styles.buttonSelected]}
                    onPress={() => setNewsletter(false)}
                  >
                    <Text style={[styles.buttonText, !newsletter && styles.buttonTextSelected]}>No</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>I agree to the terms and conditions and understand my data will be used to improve the app experience. <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.button, agreeToTerms && styles.buttonSelected]}
                    onPress={() => setAgreeToTerms(true)}
                  >
                    <Text style={[styles.buttonText, agreeToTerms && styles.buttonTextSelected]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, !agreeToTerms && styles.buttonSelected]}
                    onPress={() => setAgreeToTerms(false)}
                  >
                    <Text style={[styles.buttonText, !agreeToTerms && styles.buttonTextSelected]}>No</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.submitButton, (isSubmitting || !agreeToTerms) && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || !agreeToTerms}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </CrossPlatformContent>
      </ScrollView>
      <ValidationModal
        visible={validationModal.visible}
        message={validationModal.message}
        onClose={() => setValidationModal({ visible: false, message: '' })}
      />
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  contentWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  title: {
    fontSize: theme.fontSizes.largeLarge,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.fontSizes.medium,
    marginBottom: 20,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    width: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  nameField: {
    flex: 1,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    marginBottom: 5,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
    fontSize: theme.fontSizes.medium,
    width: '100%',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxGroup: {
    marginBottom: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 10,
  },
  checkboxIcon: {
    marginRight: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  radioGroup: {
    marginBottom: 15,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  submitButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  disabledButton: {
    opacity: 0.7,
  },
  successMessage: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  otherInputContainer: {
    paddingLeft: 34,
    width: '100%',
  },
  otherInput: {
    marginTop: 5,
    marginBottom: 10,
    width: '90%',
  },
  addressSection: {
    marginBottom: 20,
  },
  cityStateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cityInput: {
    flex: 2,
    marginBottom: 0,
  },
  stateInput: {
    flex: 1,
    marginBottom: 0,
  },
  zipInput: {
    flex: 1,
    marginBottom: 0,
  },
  addressNote: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    marginBottom: 10,
    // fontStyle: 'italic',
    paddingHorizontal: 5,
  },
  optional: {
    color: theme.colors.secondary,
    fontSize: theme.fontSizes.small,
    fontStyle: 'italic',
  },
  referralSection: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 10,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'white',
    minWidth: 80,
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  buttonTextSelected: {
    color: 'white',
  },
  requiredFieldNote: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  requiredAsterisk: {
    color: '#FF0000',
    fontSize: theme.fontSizes.medium,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  link: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    marginRight: 10,
  },
  copyButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalText: {
    fontSize: theme.fontSizes.medium,
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF0000',
    fontSize: theme.fontSizes.small,
    marginTop: -10,
    marginBottom: 15,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownContainer: {
    marginBottom: 15,
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 15,
  },
  dropdownButtonText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 5,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginTop: 5,
    maxHeight: 300,
    zIndex: 1000,
  },
  searchInput: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  cityList: {
    maxHeight: 250,
  },
  cityItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cityItemText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  requiredField: {
    borderColor: '#FF0000',
    borderWidth: 1,
  },
  otherCityItem: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  otherCityText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

export default Waitlist; 