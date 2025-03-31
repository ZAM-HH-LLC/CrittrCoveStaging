import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

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
  settings,
  onUpdateSetting,
  paymentMethods,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPayment,
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
}) => {
  const getSubscriptionPlans = () => {
    if (userRole === 'professional') {
      return [
        {
          id: 'waitlist',
          title: 'Waitlist Tier',
          price: 'Free',
          description: 'No commissions',
          features: ['Early signup discounts', 'Waitlist for early access', 'Unlimited connections', 'Priority support',],
          isPopular: false,
        },
        {
          id: 'free',
          title: 'Free Tier',
          price: 'Free',
          description: 'Limited to 5 connections per month',
          features: ['Basic profile listing', 'Up to 5 connections/month', 'Standard support'],
          isPopular: false,
        },
        {
          id: 'subscription',
          title: 'Pro Subscription',
          price: '$29.99/month',
          description: 'No fees as pro',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics', 'No commission fees'],
          isPopular: true,
        },
        {
          id: 'commission',
          title: 'Commission Based',
          price: '15% per booking',
          description: 'Pay as you go',
          features: ['Unlimited connections', 'Standard support', 'Pay only when you book'],
          isPopular: false,
        },
        {
          id: 'dual_subscription',
          title: 'Dual Role Subscription',
          price: '$39.99/month',
          description: 'No fees as pro or client',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics', 'No commission fees', 'Use as both pro and client'],
          isPopular: false,
        }
      ];
    } else {
      const plans = [
        {
          id: 'waitlist',
          title: 'Waitlist Tier',
          price: 'Free',
          description: 'No commissions',
          features: ['Early signup discounts', 'Waitlist for early access', 'Unlimited connections', 'Priority support',],
          isPopular: false,
        },
        {
          id: 'commission',
          title: 'Commission Based',
          price: '15% per booking',
          description: 'Pay as you go',
          features: ['Unlimited connections', 'Standard support', 'Pay only when you book'],
          isPopular: false,
        },
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
          description: 'No fees as pro or client',
          features: ['Unlimited connections', 'Priority support', 'Advanced analytics', 'No commission fees', 'Use as both pro and client'],
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
        {renderPlansSection()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          {settings.filter(s => s.category === 'notifications').map(renderSettingItem)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          {settings.filter(s => s.category === 'privacy').map(renderSettingItem)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          {settings.filter(s => s.category === 'security').map(renderSettingItem)}
        </View>
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          {renderCurrentPlanInfo()}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity style={styles.addButton} onPress={onAddPaymentMethod}>
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>
          {paymentMethods.map(renderPaymentMethod)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing History</Text>
          {/* Add billing history items here */}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Transactions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderMobileLayout = () => (
    <ScrollView style={styles.mobileContainer}>
      {renderPlansSection()}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity style={styles.addButton} onPress={onAddPaymentMethod}>
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.background} />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        </View>
        {paymentMethods.map(renderPaymentMethod)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        {settings.filter(s => s.category === 'notifications').map(renderSettingItem)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        {settings.filter(s => s.category === 'privacy').map(renderSettingItem)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        {settings.filter(s => s.category === 'security').map(renderSettingItem)}
      </View>
    </ScrollView>
  );

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
          onValueChange={(value) => onUpdateSetting(setting.id, value)}
          trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
        />
      ) : (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onUpdateSetting(setting.id)}
        >
          <Text style={styles.actionButtonText}>{setting.actionText || 'Update'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPaymentMethod = (method) => (
    <View key={method.id} style={styles.paymentItem}>
      <View style={styles.paymentContent}>
        <MaterialCommunityIcons 
          name={method.type === 'card' ? 'credit-card' : 'bank'} 
          size={24} 
          color={theme.colors.primary} 
        />
        <View style={styles.paymentTextContainer}>
          <View style={styles.paymentTitleRow}>
            <Text style={styles.paymentTitle}>
              {method.type === 'card' ? `•••• ${method.last4}` : method.bankName}
            </Text>
            {!method.isDefault && (
              <TouchableOpacity 
                style={styles.setDefaultButton}
                onPress={() => onSetDefaultPayment(method.id)}
              >
                <Text style={styles.setDefaultText}>Set Default</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.paymentDescription} numberOfLines={1}>
            {method.type === 'card' ? `Expires ${method.expiry}` : `Account ending in ${method.last4}`}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => onRemovePaymentMethod(method.id)}
      >
        <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return isMobile ? renderMobileLayout() : renderDesktopLayout();
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
});

export default SettingsPaymentsTab; 