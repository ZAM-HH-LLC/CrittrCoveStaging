import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform, SafeAreaView, StatusBar, TouchableWithoutFeedback } from 'react-native';
import { Chip, Card, Title, Paragraph, Button, Portal, Modal, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import SearchBar from '../components/SearchBar';
import { mockOwners } from '../data/mockData';

const Owners = ({ navigation }) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [tempFilters, setTempFilters] = useState([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOwners(mockOwners);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  const filters = [
    { label: 'Dog Sitting', value: 'Dog' },
    { label: 'Cat Sitting', value: 'Cat' },
    { label: 'Exotic Sitting', value: 'Exotic' },
    { label: 'Last Week', value: 'week' },
    { label: 'Last Month', value: 'month' },
    { label: 'Last Year', value: 'year' },
  ];

  const toggleFilter = useCallback((filter) => {
    setTempFilters(prevFilters =>
      prevFilters.includes(filter)
        ? prevFilters.filter(f => f !== filter)
        : [...prevFilters, filter]
    );
  }, []);

  const applyFilters = useCallback(() => {
    setSelectedFilters(tempFilters);
    setIsFilterModalVisible(false);
  }, [tempFilters]);

  const filteredOwners = useMemo(() => {
    return owners.filter(owner => {
      const matchesSearch = owner.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilters = selectedFilters.length === 0 || selectedFilters.every(filter => {
        if (['Dog', 'Cat', 'Exotic'].includes(filter)) {
          return owner.pet_types.includes(filter);
        }
        const lastBookingDate = new Date(owner.last_booking);
        const currentDate = new Date();
        switch (filter) {
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(currentDate.getDate() - 7);
            return lastBookingDate >= weekAgo;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(currentDate.getMonth() - 1);
            return lastBookingDate >= monthAgo;
          case 'year':
            const yearAgo = new Date();
            yearAgo.setFullYear(currentDate.getFullYear() - 1);
            return lastBookingDate >= yearAgo;
          default:
            return true;
        }
      });
      return matchesSearch && matchesFilters;
    });
  }, [owners, searchQuery, selectedFilters]);

  const renderOwner = useCallback(({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('OwnerHistory', { ownerId: item.id })}>
      <Card style={styles.ownerCard}>
        <Card.Content>
          <Title>{item.name}</Title>
          <Paragraph>Last booking: {item.last_booking}</Paragraph>
          <View style={styles.petTypes}>
            {item.pet_types.map(pet => (
              <Chip key={pet} style={styles.petChip}>{pet}</Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  ), [navigation]);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  return Platform.OS === 'web' ? (
    <View style={styles.container}>
      <View style={styles.searchAndFilterContainer}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <SearchBar
            placeholder="Search owners"
            onChangeText={handleSearchChange}
            initialValue={searchQuery}
            style={styles.searchBar}
          />
        </TouchableWithoutFeedback>
        <Button 
          mode="outlined" 
          onPress={() => {
            setTempFilters(selectedFilters);
            setIsFilterModalVisible(true);
          }}
          style={styles.filterButton}
        >
          Filters
        </Button>
      </View>
      {filteredOwners.length > 0 ? (
        <FlatList
          data={filteredOwners}
          renderItem={renderOwner}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ownerList}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        />
      ) : (
        <View style={styles.noOwnersContainer}>
          <Paragraph>No owners match your search or filters.</Paragraph>
        </View>
      )}
      <Portal>
        <Modal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.closeIcon}>
            <MaterialCommunityIcons name="close" size={24} color="black" />
          </TouchableOpacity>
          <Title style={styles.modalTitle}>Filters</Title>
          <View style={styles.filtersContainer}>
            {filters.map(filter => (
              <Chip
                key={filter.value}
                style={styles.filterChip}
                selected={tempFilters.includes(filter.value)}
                onPress={() => toggleFilter(filter.value)}
                icon={tempFilters.includes(filter.value) ? ({size, color}) => (
                  <MaterialCommunityIcons name="check" size={size} color={color} />
                ) : undefined}
              >
                {filter.label}
              </Chip>
            ))}
          </View>
          <Button mode="contained" onPress={applyFilters} style={styles.applyButton}>
            Apply Filters
          </Button>
        </Modal>
      </Portal>
    </View>
  ) : (
    <SafeAreaView style={[styles.container, styles.androidSafeArea]}>
      <View style={styles.searchAndFilterContainer}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <SearchBar
            placeholder="Search owners"
            onChangeText={handleSearchChange}
            initialValue={searchQuery}
            style={styles.searchBar}
          />
        </TouchableWithoutFeedback>
        <Button 
          mode="outlined" 
          onPress={() => {
            setTempFilters(selectedFilters);
            setIsFilterModalVisible(true);
          }}
          style={styles.filterButton}
        >
          Filters
        </Button>
      </View>
      {filteredOwners.length > 0 ? (
        <FlatList
          data={filteredOwners}
          renderItem={renderOwner}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ownerList}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        />
      ) : (
        <View style={styles.noOwnersContainer}>
          <Paragraph>No owners match your search or filters.</Paragraph>
        </View>
      )}
      <Portal>
        <Modal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.closeIcon}>
            <MaterialCommunityIcons name="close" size={24} color="black" />
          </TouchableOpacity>
          <Title style={styles.modalTitle}>Filters</Title>
          <View style={styles.filtersContainer}>
            {filters.map(filter => (
              <Chip
                key={filter.value}
                style={styles.filterChip}
                selected={tempFilters.includes(filter.value)}
                onPress={() => toggleFilter(filter.value)}
                icon={tempFilters.includes(filter.value) ? ({size, color}) => (
                  <MaterialCommunityIcons name="check" size={size} color={color} />
                ) : undefined}
              >
                {filter.label}
              </Chip>
            ))}
          </View>
          <Button mode="contained" onPress={applyFilters} style={styles.applyButton}>
            Apply Filters
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  androidSafeArea: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  searchAndFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    marginLeft: Platform.OS === 'web' ? 0 : 8,
  },
  filterButton: {
    minWidth: 80,
    marginRight: Platform.OS === 'web' ? 0 : 8,
  },
  ownerList: {
    padding: 16,
  },
  ownerCard: {
    marginBottom: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  petTypes: {
    flexDirection: 'row',
    marginTop: 8,
  },
  petChip: {
    marginRight: 8,
  },
  noOwnersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 5,
    maxWidth: 600,
    alignSelf: 'center',
    width: '90%',
  },
  modalTitle: {
    marginBottom: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  filterChip: {
    margin: 4,
  },
  applyButton: {
    marginTop: 10,
  },
  closeButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
});

export default Owners;
