import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { getProfessionalServicesDetailed, createConversation } from '../api/API';
import { AuthContext, debugLog } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const ProfessionalServicesModal = ({ visible, onClose, professional, primaryService }) => {
  const navigation = useNavigation();
  const { isSignedIn } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null);
  const [mobileView, setMobileView] = useState('services'); // 'services' or 'details'
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth <= 768;
  const isSmallMobile = screenWidth <= 600;

  useEffect(() => {
    if (visible && professional?.professional_id) {
      fetchServices();
    }
  }, [visible, professional?.professional_id]);

  useEffect(() => {
    // Set the primary service as selected when services load
    if (services.length > 0 && primaryService) {
      const primaryServiceData = services.find(s => s.service_id === primaryService.service_id);
      if (primaryServiceData) {
        setSelectedService(primaryServiceData);
      } else {
        // Fallback to first service if primary not found
        setSelectedService(services[0]);
      }
    } else if (services.length > 0) {
      setSelectedService(services[0]);
    }
  }, [services, primaryService]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      debugLog('MBA9999', 'Fetching services for professional:', professional.professional_id);
      const servicesData = await getProfessionalServicesDetailed(professional.professional_id);
      setServices(servicesData);
    } catch (err) {
      debugLog('MBA9999', 'Error fetching professional services:', err);
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedService(null);
    setServices([]);
    setError(null);
    setShowTooltip(null);
    setMobileView('services');
    setShowErrorModal(false);
    setErrorMessage('');
    onClose();
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    if (isMobile) {
      setMobileView('details');
    }
  };

  const handleBackToServices = () => {
    setMobileView('services');
  };

  const formatAnimalTypes = (animalTypes) => {
    if (!animalTypes || typeof animalTypes !== 'object') return 'Various animals';
    const types = Object.keys(animalTypes);
    if (types.length === 0) return 'Various animals';
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]} & ${types[1]}`;
    return `${types[0]}, ${types[1]} & ${types.length - 2} more`;
  };

  const renderAdditionalRates = (rates) => {
    if (!rates || rates.length === 0) return null;
    
    return (
      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Additional Rates</Text>
        {rates.map((rate) => (
          <View key={rate.rate_id} style={styles.additionalRateItem}>
            <View style={styles.additionalRateRow}>
              <View style={styles.additionalRateTitleContainer}>
                {rate.description && (
                  <TouchableOpacity 
                    style={styles.infoIcon}
                    onPress={() => setShowTooltip(showTooltip === rate.rate_id ? null : rate.rate_id)}
                  >
                    <MaterialCommunityIcons 
                      name="information-outline" 
                      size={16} 
                      color={theme.colors.primary} 
                    />
                  </TouchableOpacity>
                )}
                <Text style={styles.additionalRateTitle}>{rate.title}</Text>
              </View>
              <Text style={styles.additionalRatePrice}>${rate.rate}</Text>
            </View>

          </View>
        ))}
      </View>
    );
  };

  const renderServiceDetails = (service) => (
    <>
      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Description</Text>
        <Text style={styles.detailText}>{service.description}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Animal Types</Text>
        <Text style={styles.detailText}>{formatAnimalTypes(service.animal_types)}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Base Rate</Text>
        <Text style={styles.detailText}>${service.base_rate} per {service.unit_of_time}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>Additional Animal Rate</Text>
        <Text style={styles.detailText}>
          ${service.additional_animal_rate} (applies after {service.applies_after} animal{service.applies_after > 1 ? 's' : ''})
        </Text>
      </View>

      {service.holiday_rate && 
       service.holiday_rate !== '$0' && 
       service.holiday_rate !== '$0.00' && 
       service.holiday_rate !== '0%' && 
       service.holiday_rate !== '0.00%' && 
       service.holiday_rate !== '0' && (
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Holiday Rate</Text>
          <Text style={styles.detailText}>{service.holiday_rate}</Text>
        </View>
      )}

      {service.is_overnight && (
        <View style={styles.detailSection}>
          <Text style={styles.overnightBadge}>Overnight Service</Text>
        </View>
      )}

      {renderAdditionalRates(service.additional_rates)}
    </>
  );

  const handleCreateConversation = async () => {
    if (!professional?.professional_id) {
      Alert.alert('Error', 'Professional information not available');
      return;
    }

    // Check if user is signed in before making API call
    if (!isSignedIn) {
      debugLog('MBA3456', 'User not signed in, redirecting to login');
      
      // Close the modal first
      onClose();
      
      // Navigate to sign in screen
      navigation.navigate('SignIn');
      return;
    }

    setIsCreatingConversation(true);
    try {
      debugLog('MBA3456', 'Creating conversation with professional:', professional.professional_id);
      const response = await createConversation(professional.professional_id);
      
      debugLog('MBA3456', 'Conversation created, navigating to MessageHistory with ID:', response.conversation_id);
      
      // Close the modal first
      onClose();
      
      // Navigate to MessageHistory with the conversation ID
      navigation.navigate('MessageHistory', { 
        conversationId: response.conversation_id,
        otherUserName: professional.name
      });
    } catch (err) {
      debugLog('MBA3456', 'Error creating conversation:', err);
      
      // Check if this is the "cannot contact yourself" error
      if (err.response?.status === 400 && 
          err.response?.data?.error === 'Cannot create conversation with yourself') {
        setErrorMessage('You cannot contact yourself.');
        setShowErrorModal(true);
      } else {
        setErrorMessage('Failed to create conversation. Please try again.');
        setShowErrorModal(true);
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isSmallMobile && styles.modalContainerSmallMobile]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.professionalName}>{professional?.name}</Text>
              <Text style={styles.professionalLocation}>{professional?.location}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchServices}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.content, isMobile && styles.contentMobile]}>
              {/* Mobile: Services List View */}
              {isMobile && mobileView === 'services' && (
                <View style={styles.mobileServicesView}>
                  <Text style={styles.sectionTitle}>Services</Text>
                  <ScrollView style={styles.servicesScrollView}>
                    {services.map((service) => (
                      <TouchableOpacity
                        key={service.service_id}
                        style={styles.mobileServiceItem}
                        onPress={() => handleServiceSelect(service)}
                      >
                        <View style={styles.mobileServiceContent}>
                          <Text style={styles.mobileServiceName}>
                            {service.service_name}
                          </Text>
                          <Text style={styles.mobileServicePrice}>
                            ${service.base_rate}/{service.unit_of_time}
                          </Text>
                        </View>
                        <MaterialCommunityIcons 
                          name="chevron-right" 
                          size={24} 
                          color={theme.colors.textSecondary} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Mobile: Service Details View */}
              {isMobile && mobileView === 'details' && selectedService && (
                <View style={styles.mobileDetailsView}>
                  <View style={styles.mobileDetailsHeader}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={handleBackToServices}
                    >
                      <MaterialCommunityIcons 
                        name="arrow-left" 
                        size={24} 
                        color={theme.colors.primary} 
                      />
                    </TouchableOpacity>
                    <Text style={styles.mobileDetailsTitle}>{selectedService.service_name}</Text>
                  </View>
                  <ScrollView style={styles.mobileDetailsScrollView}>
                    {renderServiceDetails(selectedService)}
                  </ScrollView>
                </View>
              )}

              {/* Desktop: Two-panel layout */}
              {!isMobile && (
                <>
                  {/* Services List (Left Side) */}
                  <View style={styles.servicesList}>
                    <Text style={styles.sectionTitle}>Services</Text>
                    <ScrollView style={styles.servicesScrollView}>
                      {services.map((service) => (
                        <TouchableOpacity
                          key={service.service_id}
                          style={[
                            styles.serviceItem,
                            selectedService?.service_id === service.service_id && styles.serviceItemSelected
                          ]}
                          onPress={() => handleServiceSelect(service)}
                        >
                          <Text style={[
                            styles.serviceName,
                            selectedService?.service_id === service.service_id && styles.serviceNameSelected
                          ]}>
                            {service.service_name}
                          </Text>
                          <Text style={[
                            styles.servicePrice,
                            selectedService?.service_id === service.service_id && styles.servicePriceSelected
                          ]}>
                            ${service.base_rate}/{service.unit_of_time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Service Details (Right Side) */}
                  <View style={styles.serviceDetails}>
                    {selectedService ? (
                      <ScrollView style={styles.detailsScrollView}>
                        <Text style={styles.detailsTitle}>{selectedService.service_name}</Text>
                        {renderServiceDetails(selectedService)}
                      </ScrollView>
                    ) : (
                      <View style={styles.noSelectionContainer}>
                        <Text style={styles.noSelectionText}>Select a service to view details</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Contact Button */}
          {!loading && !error && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.contactButton, isCreatingConversation && styles.contactButtonDisabled]} 
                onPress={handleCreateConversation}
                disabled={isCreatingConversation}
              >
                {isCreatingConversation ? (
                  <View style={styles.contactButtonContent}>
                    <ActivityIndicator size="small" color={theme.colors.whiteText} />
                    <Text style={[styles.contactButtonText, { marginLeft: 8 }]}>Creating conversation...</Text>
                  </View>
                ) : (
                  <Text style={styles.contactButtonText}>Contact {professional?.name}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Separate Modal for Tooltip */}
      <Modal
        visible={showTooltip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(null)}
      >
        <TouchableOpacity 
          style={styles.tooltipModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTooltip(null)}
        >
          <View style={styles.tooltipModalContent}>
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTitle}>
                {services.find(s => s.additional_rates?.find(r => r.rate_id === showTooltip))?.additional_rates?.find(r => r.rate_id === showTooltip)?.title || 'Rate Info'}
              </Text>
              <TouchableOpacity 
                style={styles.tooltipCloseButton}
                onPress={() => setShowTooltip(null)}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={18} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.tooltipText}>
              {services.find(s => s.additional_rates?.find(r => r.rate_id === showTooltip))?.additional_rates?.find(r => r.rate_id === showTooltip)?.description || ''}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <TouchableOpacity 
          style={styles.tooltipModalOverlay}
          activeOpacity={1}
          onPress={() => setShowErrorModal(false)}
        >
          <TouchableOpacity 
            style={styles.errorModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.errorModalHeader}>
              <Text style={styles.errorModalTitle}>Error</Text>
              <TouchableOpacity 
                style={styles.errorModalCloseButton}
                onPress={() => setShowErrorModal(false)}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={20} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.errorModalText}>
              {errorMessage}
            </Text>
            <TouchableOpacity 
              style={styles.errorModalOkButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorModalOkText}>OK</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '90%',
    maxWidth: 800,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalContainerSmallMobile: {
    width: 'calc(100% - 10px)',
    height: 'calc(100% - 10px)',
    maxWidth: 'none',
    maxHeight: 'none',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  professionalName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  professionalLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.whiteText,
    fontWeight: '500',
  },
  content: {
    flexDirection: 'row',
    flex: 1,
  },
  contentMobile: {
    flexDirection: 'column',
  },
  // Mobile styles
  mobileServicesView: {
    flex: 1,
    padding: 20,
  },
  mobileServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mobileServiceContent: {
    flex: 1,
  },
  mobileServiceName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mobileServicePrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  mobileDetailsView: {
    flex: 1,
  },
  mobileDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  mobileDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  mobileDetailsScrollView: {
    flex: 1,
    padding: 20,
  },
  // Desktop styles
  servicesList: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  servicesScrollView: {
    flex: 1,
  },
  serviceItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceItemSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: theme.colors.whiteText,
  },
  servicePrice: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  servicePriceSelected: {
    color: theme.colors.whiteText,
  },
  serviceDetails: {
    flex: 1,
    padding: 20,
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
    fontFamily: theme.fonts.header.fontFamily,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  overnightBadge: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.whiteText,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  additionalRateItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
  },
  additionalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  additionalRateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  additionalRateTitle: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    marginLeft: 4,
  },
  infoIcon: {
    padding: 2,
    marginTop: -2,
  },
  additionalRatePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: 16,
  },
  tooltipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipModalContent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  tooltipCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  tooltipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonDisabled: {
    backgroundColor: theme.colors.placeholder,
    opacity: 0.7,
  },
  contactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
  },
  errorModalContent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  errorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  errorModalCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorModalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  errorModalOkButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  errorModalOkText: {
    color: theme.colors.whiteText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfessionalServicesModal; 