import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Chip, Card, Title, Paragraph, Button, Portal, Modal, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import SearchBar from '../components/SearchBar';

const Messages = ({ navigation }) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [tempFilters, setTempFilters] = useState([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Mock data - replace with actual data from your backend
  const messages = [
    { id: '1', name: 'John Doe', lastMessage: 'Hello, how are you?', date: '2023-05-15', time: '14:00', unread: true, type: 'client', bookingStatus: 'booked' },
    { id: '2', name: 'Jane Smith', lastMessage: 'Can we reschedule?', date: '2023-05-17', time: '10:00', unread: false, type: 'professional', bookingStatus: 'unconfirmed' },
  ];

  const filters = [
    { label: 'Booked', value: 'booked' },
    { label: 'Unconfirmed', value: 'unconfirmed' },
    { label: 'Client Messages', value: 'client' },
    { label: 'Professional Messages', value: 'professional' },
    { label: 'Last Week', value: 'week' },
    { label: 'Last Month', value: 'month' },
    { label: 'Last Year', value: 'year' },
    { label: 'Unread', value: 'unread' },
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

  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      const matchesSearch = message.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            message.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilters = selectedFilters.length === 0 || selectedFilters.some(filter => 
        message.bookingStatus === filter || message.type === filter || (filter === 'unread' && message.unread)
      );
      return matchesSearch && matchesFilters;
    });
  }, [messages, searchQuery, selectedFilters]);

  const renderMessage = useCallback(({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.replace('MessageHistory', { 
        messageId: item.id, 
        senderName: item.name 
      })}
    >
      <Card style={styles.messageCard}>
        <Card.Content>
          <View style={styles.messageHeader}>
            <Title>{item.name}</Title>
            <Paragraph>{item.date} {item.time}</Paragraph>
          </View>
          <Paragraph numberOfLines={1}>{item.lastMessage}</Paragraph>
          <View style={styles.messageFooter}>
            {item.unread && <Chip>Unread</Chip>}
            <Chip>{item.type}</Chip>
            <Chip>{item.bookingStatus}</Chip>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  ), [navigation]);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const Content = () => (
    <>
      <View style={styles.searchAndFilterContainer}>
        <SearchBar
          placeholder="Search messages"
          onChangeText={handleSearchChange}
          initialValue={searchQuery}
          style={styles.searchBar}
        />
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
      {filteredMessages.length > 0 ? (
        <FlatList
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
        />
      ) : (
        <View style={styles.noMessagesContainer}>
          <Paragraph>No messages match your search or filters.</Paragraph>
        </View>
      )}
      <Portal>
        <Modal visible={isFilterModalVisible} onDismiss={() => setIsFilterModalVisible(false)} contentContainerStyle={styles.modalContainer}>
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
    </>
  );

  return Platform.OS === 'web' ? (
    <View style={styles.container}>
      <Content />
    </View>
  ) : (
    <SafeAreaView style={[styles.container, styles.androidSafeArea]}>
      <Content />
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    minWidth: 80,
  },
  messageList: {
    padding: 16,
  },
  messageCard: {
    marginBottom: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  noMessagesContainer: {
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
});

export default Messages;
