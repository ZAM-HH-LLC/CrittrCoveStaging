import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';

const ProfessionalCard = ({ professional, onPress }) => {
  const navigation = useNavigation();
  
  const handlePress = () => {
    navigation.navigate('ProfessionalProfile', { 
      professional: professional 
    });
  };

  return (
    <TouchableOpacity style={styles.listItem} onPress={handlePress}>
      <Image 
        source={{ uri: professional.profilePicture }} 
        style={styles.profileImage}
      />
      <View style={styles.infoContainer}>
        <View style={styles.header}>
          <Text style={styles.name}>{professional.id}. {professional.name}</Text>
          <View style={styles.starProfessionalBadge}>
            <Text style={styles.price}>from ${professional.price}/night</Text>
            {/* <Text style={styles.starProfessionalText}>Star Professional</Text> */}
          </View>
        </View>
        <Text style={styles.location}>{professional.location}</Text>
        <View style={styles.stats}>
          <View style={styles.rating}>
            <MaterialCommunityIcons name="star" size={16} color={theme.colors.primary} />
            <Text style={styles.ratingText}>{professional.rating ? professional.rating : '4.5'}</Text>
            <Text style={styles.reviews}>- {professional.reviewCount ? professional.reviewCount : '52'} reviews</Text>
          </View>
        </View>
        
      </View>
    </TouchableOpacity>
  );
};

const ProfessionalList = ({ professionals, onLoadMore, onProfessionalSelect }) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={professionals}
        renderItem={({ item }) => (
          <ProfessionalCard 
            professional={item}
            onPress={onProfessionalSelect}
          />
        )}
        keyExtractor={item => item.id}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    maxHeight: '100%',
  },
  list: {
    flex: 1,
    height: '100%',
  },
  listContent: {
    flexGrow: 1,
  },
  listItem: {
    flexDirection: 'row',
    padding: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: theme.spacing.medium,
  },
  infoContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.small,
  },
  name: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  location: {
    fontSize: theme.fontSizes.medium + 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  starProfessionalBadge: {
    backgroundColor: theme.colors.primary,
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  starProfessionalText: {
    fontSize: theme.fontSizes.small + 2,
    fontWeight: 'bold',
    color: theme.colors.surface,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: theme.fontSizes.small + 2,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: (theme.fontSizes.small + 2) * 1.5,
  },
  reviews: {
    fontSize: theme.fontSizes.small + 2,
    color: theme.colors.text,
    marginLeft: 2,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: (theme.fontSizes.small + 2) * 1.5,
  },
  repeats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: theme.fontSizes.medium + 2,
    fontWeight: 'bold',
    color: theme.colors.whiteText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ProfessionalList;