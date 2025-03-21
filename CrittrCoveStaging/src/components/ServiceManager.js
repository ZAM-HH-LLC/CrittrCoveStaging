import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import AddServiceModal from './AddServiceModal';
import ProfessionalServiceCard from './ProfessionalServiceCard';
import ConfirmationModal from './ConfirmationModal';
import { Portal } from 'react-native-paper';

const ServiceManager = ({ services, setServices, setHasUnsavedChanges, isProfessionalTab = false, isMobile = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [collapsedServices, setCollapsedServices] = useState([]);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
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
    if (editingService !== null) {
      setServices(prev => 
        prev.map((service, index) => 
          index === editingService.index ? updatedService : service
        )
      );
    } else {
      setServices(prev => [...prev, updatedService]);
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
        const rect = element.getBoundingClientRect();
        
        
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

    const serviceData = {
      serviceName: item.service_name,
      description: item.description,
      lengthOfService: item.unit_of_time,
      rates: {
        base_rate: item.base_rate,
        additionalAnimalRate: item.additional_animal_rate,
        holidayRate: item.holiday_rate
      },
      additionalRates: item.additional_rates.map(rate => ({
        label: rate.title,
        value: rate.rate,
        description: rate.description
      }))
    };

    return (
      <View style={styles.serviceCardWrapper}>
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
      </View>
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
            <TouchableOpacity 
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
            </TouchableOpacity>
            
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
          <View style={styles.servicesGrid}>
            {services.map((item, index) => renderService({ item, index }))}
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
      

      <AddServiceModal
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
