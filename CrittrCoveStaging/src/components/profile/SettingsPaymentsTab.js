import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal, FlatList, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { getTimeSettings, updateTimeSettings } from '../../api/API';
import { debugLog } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { USER_TIMEZONE_OPTIONS, getTimezoneDisplayName, searchTimezones, getGroupedTimezones } from '../../data/Timezones';
import { sanitizeInput } from '../../validation/validation';
import TermsOfServiceModal from '../modals/TermsOfServiceModal';
import PrivacyPolicyModal from '../modals/PrivacyPolicyModal';
import { API_BASE_URL } from '../../config/config';
import axios from 'axios';
import PaymentMethodsManager from '../PaymentMethodsManager';
import StripeModalSafe from '../StripeModalSafe';

const SubscriptionPlan = ({ plan, isPopular, isCurrent, onSwitch }) => (
  <View style={[
    styles.planCard,
    isCurrent && styles.currentPlanBorder
  ]}>
    {isPopular && (
      <View style={styles.popularTag}>
        <Text style={styles.popularTagText}>Popular</Text>
      </View>
    )}
    <Text style={styles.planTitle}>{plan.title}</Text>
    <Text style={styles.planPrice}>{plan.price}</Text>
    <Text style={styles.planDescription}>{plan.description}</Text>
    <View style={styles.featuresList}>
      {plan.features.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
    <TouchableOpacity
      style={[styles.planButton, isCurrent && styles.currentPlanButton]}
      onPress={() => !isCurrent && onSwitch(plan.id)}
    >
      <Text style={[styles.planButtonText, isCurrent && styles.currentPlanButtonText]}>
        {isCurrent ? 'Current Plan' : 'Switch Plan'}
      </Text>
    </TouchableOpacity>
  </View>
);

const SettingsPaymentsTab = ({
  push_notifications,
  email_updates,
  marketing_communications,
  profile_visibility,
  timezone: propTimezone,
  use_military_time,
  onUpdateSetting,
  isMobile,
  currentPlan = { 
    id: 'waitlist',
    title: 'Waitlist Signup',
    nextBilling: 'N/A',
    connections: { used: 0, total: 'Unlimited' }
  },
  onSwitchPlan,
  userRole,
  isApprovedProfessional,
  navigation,
}) => {
  const [timezone, setTimezone] = useState(propTimezone || 'UTC');
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);
  const [timezones, setTimezones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [modalError, setModalError] = useState('');
  const showToast = useToast();
  
  // Stripe modal state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [refreshPaymentMethods, setRefreshPaymentMethods] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [closeDropdown, setCloseDropdown] = useState(false);
  const isSwitchingDropdownRef = useRef(false);
  
  // Debug: Log when refresh function changes
  useEffect(() => {
    debugLog('MBA12345', 'refreshPaymentMethods state changed:', refreshPaymentMethods ? 'function available' : 'null');
  }, [refreshPaymentMethods]);
  
  const handleCloseDropdown = () => {
    debugLog('MBA12345', 'handleCloseDropdown called, isDropdownOpen:', isDropdownOpen, 'isSwitchingDropdown:', isSwitchingDropdownRef.current);
    if (isDropdownOpen) {
      debugLog('MBA12345', 'Triggering dropdown close');
      setCloseDropdown(true);
      isSwitchingDropdownRef.current = false; // Reset switching state when closing
      // Reset closeDropdown after a brief delay to allow effect to run
      setTimeout(() => setCloseDropdown(false), 50);
    }
  };
  
  // Debug: Log when dropdown state changes
  useEffect(() => {
    debugLog('MBA12345', 'isDropdownOpen state changed:', isDropdownOpen);
  }, [isDropdownOpen]);
  
  
  // Add document click listener when dropdown is open
  useEffect(() => {
    const handleDocumentClick = (event) => {
      // Small delay to allow other handlers (like menu button clicks) to process first
      setTimeout(() => {
        // Check if click was on dropdown content
        const clickedElement = event.target;
        const isDropdownClick = clickedElement.closest('[data-dropdown="true"]');
        const isMenuButtonClick = clickedElement.closest('[data-menu-button="true"]');
        
        debugLog('MBA12345', 'Document click detected (delayed):', {
          isDropdownClick: !!isDropdownClick,
          isMenuButtonClick: !!isMenuButtonClick,
          target: clickedElement.tagName,
          currentDropdownState: isDropdownOpen,
          isSwitchingDropdown: isSwitchingDropdownRef.current
        });
        
        // Only close if we're still in the same state, it wasn't a dropdown-related click, and we're not switching
        if (!isDropdownClick && !isMenuButtonClick && isDropdownOpen && !isSwitchingDropdownRef.current) {
          debugLog('MBA12345', 'Click outside dropdown, closing...');
          handleCloseDropdown();
        } else if (isSwitchingDropdownRef.current) {
          debugLog('MBA12345', 'Ignoring click during dropdown switch');
        } else if (!isDropdownOpen) {
          debugLog('MBA12345', 'No dropdown open, ignoring click');
        } else {
          debugLog('MBA12345', 'Click on dropdown-related element, ignoring');
        }
      }, 0);
    };
    
    if (isDropdownOpen) {
      debugLog('MBA12345', 'Adding document click listener');
      document.addEventListener('click', handleDocumentClick, true);
    }
    
    return () => {
      debugLog('MBA12345', 'Removing document click listener');
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    // Fetch user's time settings when component mounts
    const fetchTimeSettings = async () => {
      try {
        setLoading(true);
        const timeSettings = await getTimeSettings();
        setTimezone(timeSettings.timezone);
        debugLog('MBA12345 Fetched time settings:', timeSettings);
      } catch (error) {
        debugLog('MBA12345 Error fetching time settings:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check if timezone is in the props already
    if (propTimezone) {
      setTimezone(propTimezone);
    } else {
      fetchTimeSettings();
    }
    
    // Fetch deletion status
    const fetchDeletionStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/v1/deletion-status/`);
        setDeletionStatus(response.data);
      } catch (error) {
        debugLog('MBA12345 Error fetching deletion status:', error);
      }
    };
    
    fetchDeletionStatus();
  }, [propTimezone]);


  const handleTimezoneChange = async (newTimezone) => {
    try {
      setLoading(true);
      await updateTimeSettings(newTimezone);
      setTimezone(newTimezone);
      setTimezoneModalVisible(false);
      setSearchQuery(''); // Clear search when timezone is selected
      debugLog('MBA12345 Updated timezone to:', newTimezone);
      
      // Get display name for the toast using centralized function
      const friendlyName = getTimezoneDisplayName(newTimezone);
      
      showToast({
        message: `Timezone updated to ${friendlyName}`,
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      debugLog('MBA12345 Error updating timezone:', error);
      showToast({
        message: 'Failed to update timezone. Please try again.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const openTimezoneModal = () => {
    setTimezones(USER_TIMEZONE_OPTIONS);
    setSearchQuery(''); // Clear search when opening modal
    setTimezoneModalVisible(true);
  };

  // Get display name for current timezone using centralized mapping
  const getCurrentTimezoneDisplayName = () => {
    return getTimezoneDisplayName(timezone);
  };

  const renderTimezoneModal = () => {
    // Use centralized search function
    const filteredTimezones = searchTimezones(searchQuery);
    
    // Use centralized grouping function
    const groupedTimezones = getGroupedTimezones(filteredTimezones);

    const renderTimezoneGroup = (zoneName, timezones) => (
      <View key={zoneName} style={styles.timezoneGroup}>
        <Text style={styles.timezoneGroupHeader}>{zoneName} Time Zone</Text>
        {timezones.map((tz) => (
          <TouchableOpacity
            key={tz.id}
            style={[
              styles.timezoneItem,
              tz.id === timezone && styles.selectedTimezoneItem
            ]}
            onPress={() => handleTimezoneChange(tz.id)}
          >
            <View style={styles.timezoneItemContent}>
              <Text style={[
                styles.timezoneText,
                tz.id === timezone && styles.selectedTimezoneText
              ]}>
                {tz.displayName}
              </Text>
            </View>
            {tz.id === timezone && (
              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );

    return (
              <Modal
          animationType="slide"
          transparent={true}
          visible={timezoneModalVisible}
          onRequestClose={() => {
            setTimezoneModalVisible(false);
            setSearchQuery(''); // Clear search when closing modal
          }}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity onPress={() => {
                setTimezoneModalVisible(false);
                setSearchQuery(''); // Clear search when closing modal
              }}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search timezones (e.g., 'Texas', 'Central Time', 'Mountain')..."
              value={searchQuery}
              onChangeText={(text) => {
                debugLog('MBA7777', 'Timezone search input change:', text);
                const sanitized = sanitizeInput(text, 'service_name', { maxLength: 50 });
                setSearchQuery(sanitized);
              }}
              placeholderTextColor={theme.colors.secondary}
            />
            
            <FlatList
              data={Object.keys(groupedTimezones)}
              keyExtractor={(zoneName) => zoneName}
              renderItem={({ item: zoneName }) => 
                renderTimezoneGroup(zoneName, groupedTimezones[zoneName])
              }
              showsVerticalScrollIndicator={true}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const getSubscriptionPlans = () => {
    const commonPlans = [
      {
        id: 'free',
        title: 'Free Tier',
        price: 'Free',
        description: '1 Free Booking/Month, then 15% per booking',
        features: ['Basic profile listing', 'Up to 1 booking/month', 'Standard support'],
        isPopular: false,
      },
      {
        id: 'waitlist',
        title: 'Waitlist Tier',
        price: 'Free',
        description: 'No commissions, no subscriptions, no fees',
        features: ['Early signup discounts', 'Waitlist for early access', 'Unlimited connections', 'Priority support',],
        isPopular: false,
      }
    ];

    if (userRole === 'professional') {
      return [
        ...commonPlans,
        {
          id: 'subscription',
          title: 'Pro Subscription',
          price: '$29.99/month',
          description: 'No fees as pro',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics', 'No commission fees'],
          isPopular: true,
        },
        {
          id: 'dual_subscription',
          title: 'Dual Role Subscription',
          price: '$39.99/month',
          description: 'No fees as pro or owner',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics', 'No commission fees', 'Use as both pro and owner'],
          isPopular: false,
        }
      ];
    } else {
      return [
        ...commonPlans,
        {
          id: 'subscription',
          title: 'Owner Subscription',
          price: '$19.99/month',
          description: 'Unlimited bookings',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics'],
          isPopular: true,
        }
      ];

      if (isApprovedProfessional) {
        plans.push({
          id: 'dual_subscription',
          title: 'Dual Role Subscription',
          price: '$39.99/month',
          description: 'No fees as pro or owner',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics', 'No commission fees', 'Use as both pro and owner'],
          isPopular: false,
        });
      }

      return plans;
    }
  };

  const renderPlansSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Subscription Plans</Text>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.plansScroll}
        contentContainerStyle={styles.plansScrollContent}
      >
        {getSubscriptionPlans().map((plan) => (
          <View key={plan.id} style={styles.planCardContainer}>
            <SubscriptionPlan
              plan={plan}
              isPopular={plan.isPopular}
              isCurrent={currentPlan?.id === plan.id}
              onSwitch={onSwitchPlan}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderCurrentPlanInfo = () => (
    <View style={styles.currentPlanInfo}>
      <Text style={styles.currentPlanTitle}>{currentPlan?.title || 'Waitlist Signup'}</Text>
      <Text style={styles.currentPlanBilling}>
        Next billing date: {currentPlan?.nextBilling || 'N/A'}
      </Text>
      <View style={styles.usageStats}>
        <Text style={styles.usageText}>
          {currentPlan?.id === 'waitlist' ? 'Unlimited connections available' : `${currentPlan?.connections?.used || 0} of ${currentPlan?.connections?.total || 'Unlimited'} connections used`}
        </Text>
        {currentPlan?.id !== 'waitlist' && (
          <View style={styles.usageBar}>
            <View style={[styles.usageProgress, { width: `${(currentPlan?.connections?.used / currentPlan?.connections?.total) * 100 || 0}%` }]} />
          </View>
        )}
      </View>
    </View>
  );


  const renderDesktopLayout = () => (
    <View style={styles.desktopContainer}>
      <View style={styles.leftColumn}>
        {/*
        TODO: Add back in after MVP 
        {renderPlansSection()} */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          {renderNotificationSettings()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security Settings</Text>
          {renderPrivacySettings()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          {renderLegalSection()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Settings</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Timezone</Text>
                <Text style={styles.settingDescription}>Set your local timezone for accurate time display</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.timezoneButton}
              onPress={openTimezoneModal}
            >
              <Text style={styles.timezoneButtonText}>{getCurrentTimezoneDisplayName()}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {/* TODO: implement after MVP Launch 
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <MaterialCommunityIcons name="clock-time-eight" size={24} color={theme.colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Military Time (24-hour)</Text>
                <Text style={styles.settingDescription}>Use 24-hour time format instead of 12-hour format</Text>
              </View>
            </View>
            <Switch
              value={use_military_time}
              onValueChange={(value) => handleUpdateSetting('use_military_time', value)}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
            />
          </View> */}
        </View>
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.section}>
          <PaymentMethodsManager 
            userRole={userRole} 
            onRefresh={() => {
              // Refresh any parent state if needed
              console.log('Payment methods refreshed');
            }}
            onShowModal={handleShowStripeModal}
            onPaymentMethodsUpdate={(refreshFn) => {
              debugLog('MBA12345', 'PaymentMethodsManager onPaymentMethodsUpdate called with:', refreshFn ? 'function' : 'null');
              setRefreshPaymentMethods(() => refreshFn);
            }}
            onDropdownStateChange={(isOpen, isSwitching = false) => {
              debugLog('MBA12345', 'Dropdown state changed:', { isOpen, isSwitching });
              setIsDropdownOpen(isOpen);
              isSwitchingDropdownRef.current = isSwitching;
            }}
            closeDropdown={closeDropdown}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing History</Text>
          <View style={styles.emptyBillingContainer}>
            <Text style={styles.emptyBillingText}>No billing history yet</Text>
            <Text style={styles.emptyBillingSubtext}>Your transaction history will appear here once you start using payment methods</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMobileLayout = () => (
    <ScrollView style={styles.mobileContainer} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.section}>
        <PaymentMethodsManager 
          userRole={userRole} 
          onRefresh={() => {
            // Refresh any parent state if needed
            console.log('Payment methods refreshed');
          }}
          onShowModal={handleShowStripeModal}
          onPaymentMethodsUpdate={(refreshFn) => {
            debugLog('MBA12345', 'Mobile PaymentMethodsManager onPaymentMethodsUpdate called with:', refreshFn ? 'function' : 'null');
            setRefreshPaymentMethods(() => refreshFn);
          }}
          onDropdownStateChange={(isOpen, isSwitching = false) => {
            debugLog('MBA12345', 'Mobile dropdown state changed:', { isOpen, isSwitching });
            setIsDropdownOpen(isOpen);
            isSwitchingDropdownRef.current = isSwitching;
          }}
          closeDropdown={closeDropdown}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing History</Text>
        <View style={styles.emptyBillingContainer}>
          <Text style={styles.emptyBillingText}>No billing history yet</Text>
          <Text style={styles.emptyBillingSubtext}>Your transaction history will appear here once you start using payment methods</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        {renderNotificationSettings()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security Settings</Text>
        {renderPrivacySettings()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        {renderLegalSection()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Settings</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Timezone</Text>
              <Text style={styles.settingDescription}>Set your local timezone for accurate time display</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.timezoneButton}
            onPress={openTimezoneModal}
          >
            <Text style={styles.timezoneButtonText}>{getCurrentTimezoneDisplayName()}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* TODO: implement after MVP Launch 
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="clock-time-eight" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Military Time (24-hour)</Text>
              <Text style={styles.settingDescription}>Use 24-hour time format instead of 12-hour format</Text>
            </View>
          </View>
          <Switch
            value={use_military_time}
            onValueChange={(value) => handleUpdateSetting('use_military_time', value)}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View> */}
      </View>
    </ScrollView>
  );

  const renderNotificationSettings = () => {
    return (
      <>
        {/* TODO: Uncomment for ios/android code
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="bell" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications for updates</Text>
            </View>
          </View>
          <Switch
            value={push_notifications}
            onValueChange={(value) => handleUpdateSetting('push_notifications', value)}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View> */}

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="email" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Email Updates</Text>
              <Text style={styles.settingDescription}>Receive important updates via email</Text>
            </View>
          </View>
          <Switch
            value={email_updates}
            onValueChange={(value) => handleUpdateSetting('email_updates', value)}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Marketing Communications</Text>
              <Text style={styles.settingDescription}>Receive promotions and marketing emails</Text>
            </View>
          </View>
          <Switch
            value={marketing_communications}
            onValueChange={(value) => handleUpdateSetting('marketing_communications', value)}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View>
      </>
    );
  };

  const renderPrivacySettings = () => {
    return (
      <>
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="account-eye" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Profile Visibility</Text>
              <Text style={styles.settingDescription}>Make your profile visible to others</Text>
            </View>
          </View>
          <Switch
            value={profile_visibility}
            onValueChange={(value) => handleUpdateSetting('profile_visibility', value)}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="lock-reset" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingDescription}>Update your account password</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.actionButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
        
        {/* TODO: Add location privacy toggle after MVP launch */}
      </>
    );
  };

  const renderLegalSection = () => {
    return (
      <>
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="shield-account" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>Read our privacy policy and data practices</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowPrivacyModal(true)}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="file-document" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
              <Text style={styles.settingDescription}>Read our terms of service and user agreement</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowTermsModal(true)}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="download" size={24} color={theme.colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Export My Data</Text>
              <Text style={styles.settingDescription}>Download all your account data in JSON format</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleExportData}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? 'Exporting...' : 'Export'}
            </Text>
          </TouchableOpacity>
        </View> */}

        {/* Account Deletion Section */}
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="account-remove" size={24} color={theme.colors.error} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Delete Account</Text>
              <Text style={styles.settingDescription}>
                {deletionStatus?.is_deletion_requested 
                  ? 'Account deletion requested. Check your email to confirm.'
                  : 'Permanently delete your account and all associated data'
                }
              </Text>
              {deletionStatus?.is_deletion_requested && (
                <Text style={styles.expiryText}>
                  Request expires: {new Date(deletionStatus.deletion_token_expires_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          {deletionStatus?.is_deletion_requested ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelAccountDeletion}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => setShowDeleteModal(true)}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  const renderSettingItem = (setting) => (
    <View key={setting.id} style={styles.settingItem}>
      <View style={styles.settingContent}>
        <MaterialCommunityIcons name={setting.icon} size={24} color={theme.colors.primary} />
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{setting.title}</Text>
          {setting.description && (
            <Text style={styles.settingDescription}>{setting.description}</Text>
          )}
        </View>
      </View>
      {setting.type === 'toggle' ? (
        <Switch
          value={setting.value}
          onValueChange={(value) => handleUpdateSetting(setting.id, value)}
          trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
        />
      ) : setting.type === 'timezone' ? (
        <TouchableOpacity 
          style={styles.timezoneButton}
          onPress={openTimezoneModal}
        >
          <Text style={styles.timezoneButtonText}>{getCurrentTimezoneDisplayName()}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleUpdateSetting(setting.id)}
        >
          <Text style={styles.actionButtonText}>{setting.actionText || 'Update'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );


  // Handle setting updates with toast notifications
  const handleUpdateSetting = (id, value) => {
    debugLog('MBA54321 Updating setting:', { id, value });
    
    // Get readable setting name for toast messages
    const settingNames = {
      'push_notifications': 'Push Notifications',
      'email_updates': 'Email Updates',
      'marketing_communications': 'Marketing Communications',
      'profile_visibility': 'Profile Visibility',
      'use_military_time': 'Military Time'
    };
    
    const settingName = settingNames[id] || id;
    
    // Call the parent update function
    onUpdateSetting(id, value)
      .then(() => {
        // Show success toast
        showToast({
          message: `${settingName} ${value ? 'enabled' : 'disabled'} successfully`,
          type: 'success',
          duration: 3000
        });
      })
      .catch(error => {
        debugLog('MBA54321 Error updating setting:', error);
        // Show error toast
        showToast({
          message: `Failed to update ${settingName.toLowerCase()}. Please try again.`,
          type: 'error',
          duration: 4000
        });
      });
  };

  const handleRequestAccountDeletion = async () => {
    // Clear previous error
    setModalError('');
    
    // Validate deletion reason
    if (!deletionReason.trim()) {
      setModalError('Please provide a reason for deleting your account.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/users/v1/request-deletion/`, {
        reason: deletionReason.trim()
      });
      
      setDeletionStatus({
        ...deletionStatus,
        is_deletion_requested: true,
        deletion_requested_at: new Date().toISOString(),
        deletion_token_expires_at: response.data.expires_at
      });
      
      setShowDeleteModal(false);
      setDeletionReason(''); // Reset the reason field
      setModalError(''); // Clear any errors
      showToast({
        message: 'Account deletion request submitted. Please check your email to confirm.',
        type: 'success',
        duration: 5000
      });
      
    } catch (error) {
      debugLog('MBA12345 Error requesting account deletion:', error);
      
      if (error.response?.data?.active_bookings) {
        // Handle active bookings error with detailed information
        const activeBookings = error.response.data.active_bookings;
        const bookingsList = activeBookings.map(booking => 
          `${booking.service} with ${booking.other_party} (${booking.role === 'client' ? 'professional' : 'client'})`
        ).join(', ');
        
        setModalError(`Cannot delete account. You have active bookings: ${bookingsList}. Please wait for them to complete.`);
      } else if (error.response?.data?.incomplete_bookings) {
        // Handle incomplete bookings error with detailed information
        const incompleteBookings = error.response.data.incomplete_bookings;
        const bookingsList = incompleteBookings.map(booking => 
          `Booking ID: ${booking.booking_id} (${booking.service} with ${booking.other_party})`
        ).join(', ');
        
        setModalError(`Cannot delete account. You have incomplete past bookings that need to be marked as complete: ${bookingsList}. Please mark all past bookings as completed before deleting your account.`);
      } else {
        setModalError(error.response?.data?.error || 'Failed to request account deletion. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAccountDeletion = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/api/users/v1/cancel-deletion/`);
      
      setDeletionStatus({
        ...deletionStatus,
        is_deletion_requested: false,
        deletion_requested_at: null,
        deletion_token_expires_at: null
      });
      
      showToast({
        message: 'Account deletion request cancelled successfully.',
        type: 'success',
        duration: 3000
      });
      
    } catch (error) {
      debugLog('MBA12345 Error cancelling account deletion:', error);
      showToast({
        message: 'Failed to cancel account deletion. Please contact support.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowStripeModal = (clientSecret) => {
    setStripeClientSecret(clientSecret);
    setShowStripeModal(true);
  };
  
  const handleStripeModalClose = () => {
    setShowStripeModal(false);
    setStripeClientSecret(null);
  };
  
  const handleStripeSuccess = () => {
    debugLog('MBA12345', 'SettingsPaymentsTab: handleStripeSuccess called');
    
    // Refresh payment methods list once
    if (refreshPaymentMethods) {
      debugLog('MBA12345', 'SettingsPaymentsTab: Calling refreshPaymentMethods once');
      refreshPaymentMethods();
    } else {
      debugLog('MBA12345', 'SettingsPaymentsTab: refreshPaymentMethods is null');
    }
    
    handleStripeModalClose();
    showToast({
      message: 'Payment method saved successfully',
      type: 'success',
      duration: 3000
    });
  };
  
  const handleStripeError = (error) => {
    showToast({
      message: error,
      type: 'error',
      duration: 4000
    });
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/users/v1/export-data/`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `crittrcove_data_export_${new Date().toISOString().split('T')[0]}.json`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast({
        message: 'Data export downloaded successfully.',
        type: 'success',
        duration: 3000
      });
      
    } catch (error) {
      debugLog('MBA12345 Error exporting data:', error);
      showToast({
        message: 'Failed to export data. Please try again.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}
      {renderTimezoneModal()}
      
      {/* Terms of Service Modal */}
      <TermsOfServiceModal 
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Account Deletion Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => {
          setShowDeleteModal(false);
          setDeletionReason(''); // Reset the reason when modal closes
          setModalError(''); // Clear any errors
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
              <Text style={styles.deleteModalTitle}>Delete Account</Text>
              <Text style={styles.deleteModalWarning}>This action cannot be undone</Text>
            </View>
            
            <ScrollView style={styles.deleteModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.deleteModalDescription}>
                Are you sure you want to delete your account? This will:
              </Text>
              
              <View style={styles.deleteInfoList}>
                <Text style={styles.deleteInfoItem}>• Remove your profile and personal information</Text>
                <Text style={styles.deleteInfoItem}>• Cancel all future bookings (other parties will be notified)</Text>
                <Text style={styles.deleteInfoItem}>• Anonymize your name in existing conversations</Text>
                <Text style={styles.deleteInfoItem}>• Process deletion within 60 days</Text>
              </View>
              
              <View style={styles.retentionWarning}>
                <Text style={styles.retentionWarningText}>
                  Some data may be retained for legal compliance (financial records, booking history) as outlined in our Terms of Service.
                </Text>
              </View>
              
              {/* Deletion Reason Input */}
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Reason for deletion (required):</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Please tell us why you're deleting your account..."
                  placeholderTextColor={theme.colors.secondary}
                  value={deletionReason}
                  onChangeText={(text) => {
                    const sanitized = sanitizeInput(text, 'general', { maxLength: 500 });
                    setDeletionReason(sanitized);
                  }}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={styles.reasonCounter}>
                  {deletionReason.length}/500 characters
                </Text>
              </View>
            </ScrollView>
            
            {/* Error display area */}
            {modalError && (
              <View style={styles.modalErrorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.error} />
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            )}
            
            <View style={styles.deleteModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelModalButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletionReason(''); // Reset the reason when cancelling
                  setModalError(''); // Clear any errors
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.confirmDeleteButton]}
                onPress={handleRequestAccountDeletion}
                disabled={loading}
              >
                <Text style={styles.confirmDeleteButtonText}>
                  {loading ? 'Processing...' : 'Delete My Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Stripe Payment Setup Modal - Full Screen Overlay */}
      <StripeModalSafe
        visible={showStripeModal}
        clientSecret={stripeClientSecret}
        onClose={handleStripeModalClose}
        onSuccess={handleStripeSuccess}
        onError={handleStripeError}
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  desktopContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  leftColumn: {
    flex: 1,
    gap: 24,
  },
  rightColumn: {
    width: '35%',
    minWidth: 300,
    gap: 24,
  },
  mobileContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
  },
  plansScroll: {
    marginHorizontal: -20,
  },
  plansScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  planCardContainer: {
    width: 280,
    marginRight: 16,
    paddingBottom: 4,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    position: 'relative',
    marginTop: 12,
    height: '100%',
    borderWidth: 0,
  },
  currentPlanBorder: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  popularPlan: {
  },
  popularTag: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  popularTagText: {
    color: theme.colors.surfaceContrast,
    fontWeight: '600',
    fontSize: 12,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 5,
  },
  planDescription: {
    color: theme.colors.secondary,
    marginBottom: 15,
  },
  featuresList: {
    gap: 10,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: theme.colors.text,
  },
  planButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 0,
  },
  currentPlanButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  planButtonText: {
    color: theme.colors.surfaceContrast,
    fontWeight: '600',
  },
  currentPlanButtonText: {
    color: theme.colors.primary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.placeHolderText,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  currentPlanInfo: {
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 8,
  },
  currentPlanTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  currentPlanBilling: {
    color: theme.colors.secondary,
    marginBottom: 15,
  },
  usageStats: {
    gap: 8,
  },
  usageText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  usageBar: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
  },
  usageProgress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 10,
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  paymentTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  paymentDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  setDefaultButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  setDefaultText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 5,
  },
  addButtonText: {
    color: theme.colors.surfaceContrast,
    marginLeft: 5,
    fontWeight: '500',
  },
  viewAllButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timezoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedTimezoneItem: {
    backgroundColor: theme.colors.primaryLight,
  },
  timezoneText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  selectedTimezoneText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timezoneButtonText: {
    color: theme.colors.primary,
    fontWeight: '500',
    marginRight: 5,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timezoneGroup: {
    marginBottom: 20,
  },
  timezoneGroupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  timezoneItemContent: {
    flex: 1,
  },
  timezoneId: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  noPaymentMethodsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  noPaymentMethodsText: {
    color: theme.colors.secondary,
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  expiryText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 15,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  deleteModalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fff5f5',
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: 12,
    textAlign: 'center',
  },
  deleteModalWarning: {
    fontSize: 14,
    color: theme.colors.error,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  deleteModalBody: {
    padding: 24,
    flex: 1,
  },
  deleteModalDescription: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  deleteInfoList: {
    marginBottom: 20,
  },
  deleteInfoItem: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  retentionWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  retentionWarningText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  deleteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelModalButtonText: {
    color: theme.colors.text,
    fontWeight: '500',
    fontSize: 16,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reasonContainer: {
    marginTop: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 80,
    maxHeight: 120,
  },
  reasonCounter: {
    fontSize: 12,
    color: theme.colors.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    gap: 8,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    lineHeight: 18,
  },
  emptyBillingContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  emptyBillingText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyBillingSubtext: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  fullScreenOverlay: {
    position: 'fixed', // Use fixed positioning to ensure it covers entire screen
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100, // Low z-index, well below dropdown
    backgroundColor: 'transparent',
  },
});

export default SettingsPaymentsTab; 