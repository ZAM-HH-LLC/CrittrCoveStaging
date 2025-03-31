import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ServiceIcon = ({ service }) => {
  const iconMap = {
    'Dog Walking': 'walk',
    'Pet Sitting': 'home',
    'Overnight Care': 'bed',
    // Add more mappings as needed
  };

  return (
    <MaterialCommunityIcons 
      name={iconMap[service] || 'paw'} 
      size={24} 
      color={theme.colors.text} 
    />
  );
};

const ServicesAvailabilityTab = ({
  services = [
    {
      id: 1,
      name: 'Dog Walking',
      price: 25,
      unit: 'walk',
      isActive: true,
      unavailableDays: ['Sun']
    },
    {
      id: 2,
      name: 'Pet Sitting',
      price: 35,
      unit: 'visit',
      isActive: true,
      unavailableDays: ['Sat', 'Sun']
    },
    {
      id: 3,
      name: 'Overnight Care',
      price: 85,
      unit: 'night',
      isActive: true,
      isOvernight: true
    }
  ],
  onToggleService,
  onEditHours,
  onBlockService,
  onPartialDayBlock,
}) => {
  const { screenWidth } = useContext(AuthContext);
  const navigation = useNavigation();
  const [selectedService, setSelectedService] = useState(null);
  const isStacked = screenWidth <= 1250;

  const renderServiceItem = (service, index) => (
    <TouchableOpacity
      key={service.id}
      style={[
        styles.serviceItem,
        { backgroundColor: index % 2 === 0 ? 
          theme.colors.proDashboard.secondary : 
          theme.colors.proDashboard.tertiary 
        },
        selectedService?.id === service.id && styles.selectedServiceItem
      ]}
      onPress={() => setSelectedService(service)}
    >
      <View style={styles.serviceItemContent}>
        <ServiceIcon service={service.name} />
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.servicePrice}>${service.price}/{service.unit}</Text>
        </View>
      </View>
      <Switch
        value={service.isActive}
        onValueChange={() => onToggleService(service.id)}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.background}
      />
    </TouchableOpacity>
  );

  const renderDayAvailability = (service) => {
    if (service.isOvernight) {
      // For overnight services, show next unavailable date
      return (
        <View style={styles.nextUnavailableContainer}>
          <Text style={styles.nextUnavailableText}>Next Unavailable: Dec 24-25</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.daysScrollContainer}
        contentContainerStyle={styles.daysContainer}
      >
        {DAYS_OF_WEEK.map((day) => {
          const isUnavailable = service.unavailableDays?.includes(day);
          return (
            <View 
              key={day} 
              style={[
                styles.dayItem,
                isUnavailable && styles.unavailableDayItem
              ]}
            >
              {isUnavailable && <View style={styles.unavailableSlash} />}
              <Text style={[
                styles.dayText,
                isUnavailable && styles.unavailableDayText
              ]}>{day}</Text>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderAvailabilitySection = (service, index) => (
    <View style={styles.availabilitySection}>
      <View style={styles.availabilityHeader}>
        <Text style={styles.availabilityTitle}>{service.name}</Text>
        <TouchableOpacity 
          style={styles.editHoursButton}
          onPress={() => onEditHours(service.id)}
        >
          <Text style={styles.editHoursText}>Edit Hours</Text>
        </TouchableOpacity>
      </View>
      {renderDayAvailability(service)}
      <Text style={styles.availabilityTime}>
        {service.isOvernight ? 'Check-in: 3 PM, Check-out: 11 AM' : 'Available 9 AM - 5 PM'}
      </Text>
      {index !== services.length - 1 && <View style={styles.availabilityDivider} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[
        styles.content,
        { flexDirection: isStacked ? 'column' : 'row' }
      ]}>
        {/* Services Section */}
        <View style={[
          styles.servicesSection,
          !isStacked && { maxWidth: 400 },
          styles.sectionBox
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Services</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('ServiceManager')}
            >
              <Text style={styles.editButtonText}>Edit Services</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.servicesList}>
            {services.map((service, index) => (
              <View key={service.id} style={styles.serviceWrapper}>
                {renderServiceItem(service, index)}
                {index !== services.length - 1 && <View style={styles.serviceDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Availability Section */}
        <View style={[
          styles.availabilityContainer,
          isStacked && { marginTop: 24 },
          styles.sectionBox
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Availability</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.controlsScrollContainer}
            contentContainerStyle={styles.availabilityControls}
          >
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={onBlockService}
            >
              <View style={styles.blockButtonContent}>
                <MaterialCommunityIcons name="block-helper" size={20} color={theme.colors.error} />
                <Text style={styles.blockButtonText}>Block All Services</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={onPartialDayBlock}
            >
              <View style={styles.partialBlockButtonContent}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#F97316" />
                <Text style={styles.partialBlockText}>Partial Day Block</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlButton}
            >
              <View style={styles.dateRangeButtonContent}>
                <MaterialCommunityIcons name="calendar-range" size={20} color="#3B82F6" />
                <Text style={styles.dateRangeText}>Date Range</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.controlsDivider} />
          <View style={styles.availabilityList}>
            {services.map((service, index) => renderAvailabilitySection(service, index))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  sectionBox: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 16,
    alignSelf: 'flex-start',
  },
  servicesSection: {
    width: '100%',
  },
  servicesList: {
    width: '100%',
  },
  serviceWrapper: {
    width: '100%',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedServiceItem: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  serviceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  servicePrice: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  availabilityContainer: {
    flex: 1,
    width: '100%',
  },
  controlsScrollContainer: {
    marginBottom: 16,
  },
  availabilityControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlsDivider: {
    height: 1,
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
  },
  daysScrollContainer: {
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  availabilityDivider: {
    height: 4,
    backgroundColor: theme.colors.surface,
    marginTop: 16,
  },
  availabilitySection: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editHoursButton: {
    backgroundColor: 'transparent',
  },
  editHoursText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  dayItem: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  petsittingDayItem: {
    backgroundColor: theme.colors.warningLight,
  },
  dayText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    zIndex: 1,
  },
  availabilityTime: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  serviceDivider: {
    // height: 1,
    backgroundColor: theme.colors.surface,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  availabilityList: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editButton: {
    backgroundColor: 'transparent',
  },
  editButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  controlButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blockButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  blockButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  partialBlockButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFEDD5',
    gap: 6,
  },
  partialBlockText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '500',
  },
  dateRangeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  dateRangeText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  unavailableDayItem: {
    borderColor: theme.colors.error,
  },
  unavailableSlash: {
    position: 'absolute',
    top: '50%',
    left: -5,
    right: -5,
    height: 1,
    backgroundColor: theme.colors.error,
    transform: [{ rotate: '45deg' }],
  },
  unavailableDayText: {
    color: theme.colors.error,
  },
  nextUnavailableContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  nextUnavailableText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
});

export default ServicesAvailabilityTab; 