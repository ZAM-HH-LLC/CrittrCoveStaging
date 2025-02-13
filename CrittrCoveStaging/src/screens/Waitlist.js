import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useForm, ValidationError } from '@formspree/react';
import { handleBack } from '../components/Navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Waitlist = () => {
  const navigation = useNavigation();
  const { screenWidth } = useContext(AuthContext);
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

  // Calculate responsive widths
  const isMobile = screenWidth < 768;
  const contentWidth = isMobile ? '90%' : '600px';
  const maxContentWidth = isMobile ? '100%' : '800px';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !firstName || !lastName || !phone || !petInfo || selectedServices.length === 0 || !userType || !agreeToTerms) {
      alert('Please fill in all required fields');
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
          ? [...selectedServices.filter(s => s !== 'Other'), `Other: ${otherService}`]
          : selectedServices,
        userType,
        hesitations,
        desiredFeatures,
        newsletter,
        agreeToTerms
      };

      await handleFormspreeSubmit(formData);

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
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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

  if (state.succeeded) {
    return (
      <CrossPlatformView fullWidthHeader={true} contentWidth={maxContentWidth}>
        <BackHeader 
          title="Join Waitlist" 
          onBackPress={() => handleBack(navigation)} 
        />
        <View style={styles.container}>
          <View style={[styles.contentWrapper, { width: contentWidth }]}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>
              Thank you for joining the CrittrCove waitlist!
            </Text>
            <Text style={styles.successMessage}>
              Whether you're a pet owner looking for trusted pet services or a specialist offering your expertise, 
              you're now part of a community that supports independent animal specialists and small businesses.
            </Text>
            <Text style={styles.successMessage}>
              As a waitlist member, you'll enjoy exclusive early access to the app, priority placement, 
              special gifts, and a unique profile badge to highlight your role as a founding member of CrittrCove.
            </Text>
            <Text style={styles.successMessage}>
              Stay tuned for exciting updates!
            </Text>
          </View>
        </View>
      </CrossPlatformView>
    );
  }

  return (
    <CrossPlatformView fullWidthHeader={true} contentWidth={maxContentWidth}>
      <BackHeader 
        title="Join Waitlist" 
        onBackPress={() => handleBack(navigation)} 
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={[styles.contentWrapper, { width: contentWidth }]}>
            <Text style={styles.title}>Join the CrittrCove Waitlist!</Text>
            <Text style={styles.description}>
              Welcome to Critter Cove's early sign-up, the ultimate pet care marketplace for all pets—whether furry, feathery, or scaly! 
              Our app connects local pet care specialists with pet owners, offering reliable and loving care for your beloved companions.
            </Text>
            <Text style={styles.description}>
              By joining our waitlist, you'll gain early access to exclusive features, special gifts, and a profile badge as a founding member of the Critter Cove community.
            </Text>

            <View style={styles.formSection}>
              <View style={styles.nameContainer}>
                <View style={styles.nameField}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First Name"
                  />
                </View>
                <View style={styles.nameField}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last Name"
                  />
                </View>
              </View>

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone Number"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Do you currently own pets? If yes, tell us all about them! *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={petInfo}
                onChangeText={setPetInfo}
                placeholder="Tell us about your pets"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>What kind of pet care services are you most interested in? *</Text>
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
                        <TextInput
                          style={[styles.input, styles.otherInput]}
                          value={otherService}
                          onChangeText={setOtherService}
                          placeholder="Please specify other service"
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <Text style={styles.label}>Are you signing up as a: *</Text>
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

              <Text style={styles.label}>What hesitations do you have about using an app to connect your to local pet care?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={hesitations}
                onChangeText={setHesitations}
                placeholder="Share your concerns"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>What features or tools would make Critter Cove perfect for you?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={desiredFeatures}
                onChangeText={setDesiredFeatures}
                placeholder="Share your ideas"
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setNewsletter(!newsletter)}
              >
                <MaterialCommunityIcons
                  name={newsletter ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color={theme.colors.primary}
                  style={styles.checkboxIcon}
                />
                <Text style={styles.checkboxLabel}>
                  Would you like to be added to the email newsletter for updates on the app, pet care tips, discounts and more? *
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                <MaterialCommunityIcons
                  name={agreeToTerms ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color={theme.colors.primary}
                  style={styles.checkboxIcon}
                />
                <Text style={styles.checkboxLabel}>
                  I agree to the terms and conditions and understand my data will be used to improve the app experience. *
                </Text>
              </TouchableOpacity>

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
      </ScrollView>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
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
});

export default Waitlist; 