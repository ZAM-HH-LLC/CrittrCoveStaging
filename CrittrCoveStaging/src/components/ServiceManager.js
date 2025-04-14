import React, { useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import ServiceCreationModal from './ServiceCreationModal';
import ProfessionalServiceCard from './ProfessionalServiceCard';
import ConfirmationModal from './ConfirmationModal';
import { Portal } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';

const ServiceManager = ({ services, setServices, setHasUnsavedChanges, isProfessionalTab = false, isMobile = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [collapsedServices, setCollapsedServices] = useState([]);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const { screenWidth } = useContext(AuthContext);
  const [collapseTooltipPosition, setCollapseTooltipPosition] = useState(null);
  const buttonRef = useRef(null);
  const collapseButtonRef = useRef(null);

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedServices([]);
    } else {
      setCollapsedServices(services.map((_, index) => index));
    }
    setAllCollapsed(!allCollapsed);
  };

  const handleEditService = (index) => {
    const serviceToEdit = { ...services[index], index };
    setEditingService(serviceToEdit);
    setShowModal(true);
  };

  const handleDeleteService = (index) => {
    setServiceToDelete(index);
    setShowDeleteModal(true);
  };

  const handleSaveService = (updatedService) => {
    // Transform the service data to match the backend structure
    const transformedService = {
      service_name: updatedService.serviceName,
      description: updatedService.serviceDescription,
      unit_of_time: updatedService.lengthOfService,
      is_overnight: updatedService.isOvernight || false,
      base_rate: updatedService.rates.base_rate,
      additional_animal_rate: updatedService.rates.additionalAnimalRate,
      holiday_rate: updatedService.rates.holidayRate,
      categories: updatedService.generalCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        is_custom: cat.isCustom || false
      })),
      animal_types: updatedService.animalTypes.map(type => ({
        name: type.name,
        category_id: type.categoryId,
        is_custom: type.isCustom || false
      })),
      additional_rates: updatedService.additionalRates.map(rate => ({
        title: rate.label,
        rate: rate.value,
        description: rate.description
      }))
    };

    if (editingService !== null) {
      setServices(prev => 
        prev.map((service, index) => 
          index === editingService.index ? transformedService : service
        )
      );
    } else {
      setServices(prev => [...prev, transformedService]);
    }
    setHasUnsavedChanges(true);
    setEditingService(null);
  };

  const toggleCollapse = (index) => {
    setCollapsedServices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const confirmDelete = () => {
    setServices(prevServices => 
      prevServices.filter((_, i) => i !== serviceToDelete)
    );
    setHasUnsavedChanges(true);
    setShowDeleteModal(false);
  };

  const showTooltip = (ref, tooltipText, setPosition) => {
    if (ref.current) {
      setTimeout(() => {
        // Get the button's DOM element
        const element = ref.current;
        // Get the button's bounding rectangle relative to the viewport
        const rect = element.getBoundingOwnerRect();
        
        
        setPosition({
          x: rect.left + (rect.width / 2),
          y: rect.top, // Position tooltip at the top of the button
          text: tooltipText
        });
        
        
        setHoveredButton(tooltipText);
      }, 0);
    }
  };

  const renderService = ({ item, index }) => {
    if (!item || typeof item !== 'object') {
      console.warn('Invalid item detected:', item);
      return null;
    }

    // Transform the service data to match the frontend structure
    const serviceData = {
      serviceName: item.service_name,
      description: item.description,
      lengthOfService: item.unit_of_time,
      generalCategories: item.categories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        isCustom: cat.is_custom
      })) || [],
      animalTypes: item.animal_types?.map(type => ({
        name: type.name,
        categoryId: type.category_id,
        isCustom: type.is_custom
      })) || [],
      rates: {
        base_rate: item.base_rate,
        additionalAnimalRate: item.additional_animal_rate,
        holidayRate: item.holiday_rate
      },
      additionalRates: item.additional_rates?.map(rate => ({
        label: rate.title,
        value: rate.rate,
        description: rate.description
      })) || []
    };

    return (
      <ProfessionalServiceCard
        key={`service-${index}`}
        item={serviceData}
        index={index}
        onEdit={() => handleEditService(index)}
        onDelete={() => handleDeleteService(index)}
        isCollapsed={collapsedServices.includes(index)}
        onToggleCollapse={() => toggleCollapse(index)}
        isProfessionalTab={isProfessionalTab}
      />
    );
  };

  // {console.log('Services:', services)}

  return (
    <View style={styles.container}>
      <View style={[
        styles.serviceListContainer,
        {
          maxWidth: 1200,
          marginHorizontal: 'auto',
          width: '100%',
          paddingHorizontal: isMobile ? 20 : 24,
          paddingTop: isMobile ? 0 : 44,
        }
      ]}>
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Service Manager</Text>
          <View style={styles.headerActions}>
            {/* <TouchableOpacity 
              ref={collapseButtonRef}
              onPress={toggleCollapseAll} 
              style={styles.collapseButton}
              onMouseEnter={() => {
                try {
                  showTooltip(
                    collapseButtonRef, 
                    allCollapsed ? 'Expand All' : 'Collapse All', 
                    setCollapseTooltipPosition
                  );
                } catch (error) {
                  console.error('Error showing collapse tooltip:', error);
                }
              }}
              onMouseLeave={() => {
                setHoveredButton(null);
                setCollapseTooltipPosition(null);
              }}
            >
              <MaterialCommunityIcons 
                name={allCollapsed ? "chevron-down" : "chevron-up"} 
                size={24} 
                color={theme.colors.text} 
              />
            </TouchableOpacity> */}
            
            <TouchableOpacity
              ref={buttonRef}
              style={styles.addServiceButton}
              onMouseEnter={() => {
                try {
                  showTooltip(buttonRef, 'Add Service', setTooltipPosition);
                } catch (error) {
                  console.error('Error showing add tooltip:', error);
                }
              }}
              onMouseLeave={() => {
                setHoveredButton(null);
                setTooltipPosition(null);
              }}
              onPress={() => {
                setEditingService(null);
                setShowModal(true);
              }}
            >
              <MaterialCommunityIcons 
                name="plus" 
                size={20} 
                color={theme.colors.surface} 
              />
              <Text style={styles.addServiceText}>Add New Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(Array.isArray(services) && services.length > 0) ? (
          <View style={[styles.servicesGrid, { justifyContent: screenWidth > 600 ? '' : 'center' }]}>
            {services.map((item, index) => (
              <View key={`service-wrapper-${index}`} style={styles.serviceCardWrapper}>
                {renderService({ item, index })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services yet</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.addButtonText}>Add Services</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      

      <ServiceCreationModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingService(null);
        }}
        onSave={handleSaveService}
        initialService={editingService}
        setHasUnsavedChanges={setHasUnsavedChanges}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        actionText="delete this service"
      />

      {tooltipPosition && (
        <Portal>
          <View 
            style={[
              styles.portalTooltip,
              {
                position: 'fixed',
                top: tooltipPosition.y - 40,
                left: tooltipPosition.x - 35,
              }
            ]}
          >
            <Text style={styles.tooltipText}>{tooltipPosition.text}</Text>
          </View>
        </Portal>
      )}

      {collapseTooltipPosition && (
        <Portal>
          <View 
            style={[
              styles.portalTooltip,
              {
                position: 'fixed',
                top: collapseTooltipPosition.y - 40,
                left: collapseTooltipPosition.x - 35,
              }
            ]}
          >
            <Text style={styles.tooltipText}>{collapseTooltipPosition.text}</Text>
          </View>
        </Portal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 9998,
    elevation: 9998,
    backgroundColor: theme.colors.surface,
  },
  serviceListContainer: {
    flex: 1,
    paddingVertical: 0,
  },
  servicesGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 24,
  },
  serviceCardWrapper: {
    flex: 1,
    minWidth: 300,
    maxWidth: 375,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    zIndex: 9999,
    elevation: 9999,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
  },
  addServiceText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: theme.fontSizes.mediumLarge,
    color: theme.colors.text,
    marginBottom: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
  },
  addButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  portalTooltip: {
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 4,
    width: 70,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ServiceManager;
