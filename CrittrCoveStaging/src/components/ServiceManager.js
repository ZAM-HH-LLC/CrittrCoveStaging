import React, { useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import ServiceCreationModal from './ServiceCreationModal';
import ProfessionalServiceCard from './ProfessionalServiceCard';
import ConfirmationModal from './ConfirmationModal';
import { Portal } from 'react-native-paper';
import { AuthContext, debugLog } from '../context/AuthContext';
import { deleteService } from '../api/API';
import { useToast } from './ToastProvider';

// Define GENERAL_CATEGORIES for mapping category names to IDs
const GENERAL_CATEGORIES = [
  {
    id: 'all',
    name: 'All',
    icon: 'paw-outline',
  },
  {
    id: 'farm_animals',
    name: 'Farm Animals',
    icon: 'horse',
  },
  {
    id: 'domestic',
    name: 'Domestic',
    icon: 'paw',
  },
  {
    id: 'reptiles',
    name: 'Reptiles',
    icon: 'snake',
  },
  {
    id: 'aquatic',
    name: 'Aquatic',
    icon: 'fish',
  },
  {
    id: 'invertebrates',
    name: 'Invertebrates',
    icon: 'spider',
  }
];

const ServiceManager = ({ services, setServices, setHasUnsavedChanges, isProfessionalTab = false, isMobile = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [collapsedServices, setCollapsedServices] = useState([]);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const { screenWidth, is_DEBUG } = useContext(AuthContext);
  const [collapseTooltipPosition, setCollapseTooltipPosition] = useState(null);
  const buttonRef = useRef(null);
  const collapseButtonRef = useRef(null);
  const showToast = useToast();

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedServices([]);
    } else {
      setCollapsedServices(services.map((_, index) => index));
    }
    setAllCollapsed(!allCollapsed);
  };

  const handleEditService = (index) => {
    const serviceToEdit = services[index];
    debugLog('MBA87654', 'Original service for editing:', serviceToEdit);
    
    // Convert animal_types from object format to array format if needed
    let formattedAnimalTypes = [];
    
    if (serviceToEdit.animal_types && typeof serviceToEdit.animal_types === 'object' && !Array.isArray(serviceToEdit.animal_types)) {
      // Convert from backend format {animalName: categoryName} to array of objects
      formattedAnimalTypes = Object.entries(serviceToEdit.animal_types).map(([animalName, categoryName]) => {
        // Find category ID from category name
        const category = GENERAL_CATEGORIES.find(cat => cat.name === categoryName);
        const categoryId = category ? category.id : null;
        
        return {
          name: animalName,
          categoryName: categoryName,
          categoryId: categoryId,
          isCustom: false
        };
      });
      
      debugLog('MBA87654', 'Converted animal_types to array format:', formattedAnimalTypes);
    } else if (serviceToEdit.animalTypes) {
      // If we already have animalTypes in the expected format, use it
      formattedAnimalTypes = serviceToEdit.animalTypes;
      debugLog('MBA87654', 'Using existing animalTypes array:', formattedAnimalTypes);
    }
    
    // Transform to the format expected by ServiceCreationModal
    const formattedService = {
      service_id: serviceToEdit.service_id,
      service_name: serviceToEdit.service_name || serviceToEdit.serviceName,
      description: serviceToEdit.description || serviceToEdit.serviceDescription,
      animal_types: serviceToEdit.animal_types,  // Keep the original format for API calls
      animalTypes: formattedAnimalTypes,        // Add the formatted version for the UI
      base_rate: serviceToEdit.base_rate || (serviceToEdit.rates ? serviceToEdit.rates.base_rate : ''),
      additional_animal_rate: serviceToEdit.additional_animal_rate || (serviceToEdit.rates ? serviceToEdit.rates.additionalAnimalRate : '0'),
      holiday_rate: serviceToEdit.holiday_rate || (serviceToEdit.rates ? serviceToEdit.rates.holidayRate : '0'),
      applies_after: serviceToEdit.applies_after || 1,
      unit_of_time: serviceToEdit.unit_of_time || serviceToEdit.lengthOfService || 'Per Visit',
      is_overnight: serviceToEdit.is_overnight || serviceToEdit.isOvernight || false,
      is_active: serviceToEdit.is_active !== undefined ? serviceToEdit.is_active : true,
      holiday_rate_is_percent: serviceToEdit.holiday_rate_is_percent,
      additional_rates: serviceToEdit.additional_rates || 
        (serviceToEdit.additionalRates ? serviceToEdit.additionalRates.map(rate => ({
          title: rate.label || rate.title,
          rate: rate.value || rate.rate,
          description: rate.description || ''
        })) : [])
    };
    
    debugLog('MBA87654', 'Formatted service for editing modal:', formattedService);
    setEditingService(formattedService);
    setShowModal(true);
  };

  const handleDeleteService = (index) => {
    setServiceToDelete(index);
    setShowDeleteModal(true);
  };

  const handleSaveService = (updatedService) => {
    // Add debugging log for service data received
    debugLog('MBA8765', 'Service data received from modal:', updatedService);
    
    // Check if we're updating an existing service
    const isEditingExisting = editingService && updatedService.service_id;
    
    if (isEditingExisting) {
      debugLog('MBA8765', 'Updating existing service with ID:', updatedService.service_id);
      
      // Find the index of this service in our list by service_id
      const serviceIndex = services.findIndex(s => s.service_id === updatedService.service_id);
      
      if (serviceIndex !== -1) {
        // Update the service in the array
        setServices(prev => {
          const newServices = [...prev];
          newServices[serviceIndex] = updatedService;
          return newServices;
        });
        
        debugLog('MBA8765', 'Service updated at index:', serviceIndex);
      } else {
        // If not found by ID, just add it
        debugLog('MBA8765', 'Service ID not found in existing list, adding as new');
        setServices(prev => [...prev, updatedService]);
      }
      
      setHasUnsavedChanges(true);
      setEditingService(null);
      return;
    }
    
    // For new services
    if (updatedService.service_id) {
      debugLog('MBA8765', 'New service created on backend with ID:', updatedService.service_id);
      
      // Add the new service to the list
      setServices(prev => [...prev, updatedService]);
      setHasUnsavedChanges(true);
      setEditingService(null);
      return;
    }
    
    // Legacy support for old-format services (should not reach here with new code)
    debugLog('MBA8765', 'Warning: Falling back to legacy service format handling');
    
    // Create animal_types dictionary from animalTypes array
    const animalTypesDict = {};
    if (updatedService.animalTypes && Array.isArray(updatedService.animalTypes)) {
      updatedService.animalTypes.forEach(animal => {
        if (animal && animal.name) {
          // Use the categoryName directly from the animal object if available
          if (animal.categoryName) {
            animalTypesDict[animal.name] = animal.categoryName;
          } 
          // Fallback if no categoryName is available
          else {
            animalTypesDict[animal.name] = animal.category || 'Other';
          }
        }
      });
    }

    // Transform the service data to match the backend structure
    const transformedService = {
      service_name: updatedService.serviceName,
      description: updatedService.serviceDescription,
      unit_of_time: updatedService.lengthOfService,
      is_overnight: updatedService.isOvernight || false,
      base_rate: updatedService.rates.base_rate,
      additional_animal_rate: updatedService.rates.additionalAnimalRate,
      holiday_rate: updatedService.rates.holidayRate,
      animal_types: animalTypesDict,
      additional_rates: updatedService.additionalRates.map(rate => ({
        title: rate.label,
        rate: rate.value,
        description: rate.description
      }))
    };

    // Legacy code for handling legacy editing
    if (editingService) {
      const existingIndex = services.findIndex(s => 
        s.service_id === editingService.service_id
      );
      
      if (existingIndex !== -1) {
        setServices(prev => {
          const newServices = [...prev];
          newServices[existingIndex] = transformedService;
          return newServices;
        });
      } else {
        setServices(prev => [...prev, transformedService]);
      }
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

  const confirmDelete = async () => {
    try {
      // Get the service ID from the selected service
      const serviceToRemove = services[serviceToDelete];
      if (!serviceToRemove || !serviceToRemove.service_id) {
        showToast({
          message: 'Unable to identify service for deletion',
          type: 'error',
          duration: 3000
        });
        setShowDeleteModal(false);
        return;
      }

      // Call the API to delete the service
      await deleteService(serviceToRemove.service_id);

      // Remove from UI if successful
      setServices(prevServices => 
        prevServices.filter((_, i) => i !== serviceToDelete)
      );
      
      setHasUnsavedChanges(true);
      setShowDeleteModal(false);
      
      showToast({
        message: 'Service deleted successfully',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      // Handle the error case
      const errorMessage = error.response?.data?.error || 'Failed to delete service';
      
      showToast({
        message: errorMessage,
        type: 'error',
        duration: 3000
      });
      
      setShowDeleteModal(false);
    }
  };

  const showTooltip = (ref, tooltipText, setPosition) => {
    if (ref && ref.current) {
      try {
        setTimeout(() => {
          // Get the button's DOM element
          const element = ref.current;
          // Get the button's bounding rectangle relative to the viewport
          if (element.getBoundingOwnerRect) {
            const rect = element.getBoundingOwnerRect();
            
            setPosition({
              x: rect.left + (rect.width / 2),
              y: rect.top, // Position tooltip at the top of the button
              text: tooltipText
            });
            
            setHoveredButton(tooltipText);
          } else {
            console.error('Error: getBoundingOwnerRect method not found on element');
          }
        }, 0);
      } catch (error) {
        console.error('Error showing tooltip:', error);
      }
    }
  };

  const renderService = ({ item, index }) => {
    if (!item || typeof item !== 'object') {
      console.warn('Invalid item detected:', item);
      return null;
    }

    debugLog('MBA8765', 'Rendering service item:', item);

    // Check if this is a service that already has a service_id (created on backend)
    if (item.service_id) {
      debugLog('MBA8765', 'This is a backend-created service with ID:', item.service_id);
      
      // If the item structure already matches what ProfessionalServiceCard expects, use it directly
      if (item.serviceName && item.rates) {
        return (
          <ProfessionalServiceCard
            key={`service-${index}`}
            item={item}
            index={index}
            onEdit={() => handleEditService(index)}
            onDelete={() => handleDeleteService(index)}
            isCollapsed={collapsedServices.includes(index)}
            onToggleCollapse={() => toggleCollapse(index)}
            isProfessionalTab={isProfessionalTab}
          />
        );
      }
    }

    // Convert animal_types from dictionary to array format
    let animalTypesArray = [];
    if (item.animal_types && typeof item.animal_types === 'object' && !Array.isArray(item.animal_types)) {
      // Convert dictionary format to array format
      animalTypesArray = Object.entries(item.animal_types).map(([name, category]) => ({
        name: name,
        categoryId: undefined, // We don't have exact category IDs, just names
        category: category,    // Store the category name
        isCustom: false        // Default to false as we don't know
      }));
    } else if (Array.isArray(item.animal_types)) {
      // If it's already an array, use it directly
      animalTypesArray = item.animal_types;
    }
    
    // Transform the service data to match the frontend structure
    const serviceData = {
      service_id: item.service_id,
      serviceName: item.service_name,
      description: item.description,
      lengthOfService: item.unit_of_time,
      is_active: item.is_active,
      generalCategories: item.categories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        isCustom: cat.is_custom
      })) || [],
      animalTypes: animalTypesArray,
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
