import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';

const ProfessionalCard = ({ professional, index }) => {
  const navigation = useNavigation();
  
  const handlePress = () => {
    navigation.navigate('ProfessionalProfile', { 
      professional: professional 
    });
  };

  return (
    <TouchableOpacity style={styles.listItem} onPress={handlePress}>
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <Image 
            source={professional.profilePicture} 
            style={styles.profileImage}
          />
        </View>
        
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <View style={styles.nameSection}>
              <Text style={styles.name}>{index + 1}. {professional.name}</Text>
              <Text style={styles.location}>{professional.location}</Text>
              {professional.distance && (
                <Text style={styles.distance}>{professional.distance}</Text>
              )}
            </View>
            
            <View style={styles.priceSection}>
              <Text style={styles.fromText}>from</Text>
              <Text style={styles.amount}>
                <Text style={styles.dollarSign}>$</Text>
                {professional.price}
              </Text>
              <Text style={styles.perNight}>per night</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <View style={styles.ratingContainer}>
          <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{professional.rating}</Text>
          <Text style={styles.dot}> • </Text>
          <Text style={styles.reviews}>{professional.reviewCount} reviews</Text>
          {professional.repeat_clients && (
            <>
              <Text style={styles.dot}> • </Text>
              <MaterialCommunityIcons name="sync" size={16} color={theme.colors.text} />
              <Text style={styles.repeatClients}> {professional.repeat_clients} repeat clients</Text>
            </>
          )}
        </View>

        {professional.bestReview && (
          <View style={styles.bestReviewContainer}>
            <Image 
              source={require('../../assets/default-profile.png')}
              style={styles.reviewerImage}
            />
            <View style={styles.bestReviewTextContainer}>
              <Text style={styles.bestReview} numberOfLines={2}>
                "{professional.bestReview}"
                <Text style={styles.readMore}> Read more</Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ProfessionalList = ({ professionals, onLoadMore, onProfessionalSelect, isMobile, filters, onFilterPress }) => {
  const renderHeader = () => (
    <View style={[styles.header, {borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: theme.spacing.medium}]}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Pet Care Professionals</Text>
        <View style={styles.filterChips}>
          {filters?.categories?.map((filter, index) => (
            <View key={index} style={styles.filterChip}>
              <Text style={styles.filterChipText}>{filter}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
        <MaterialCommunityIcons name="filter" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={professionals}
        renderItem={({ item, index }) => (
          <ProfessionalCard
            professional={item}
            index={index}
            onPress={() => onProfessionalSelect(item)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
  },
  listContent: {
    flexGrow: 1,
    // padding: theme.spacing.medium,
  },
  listItem: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    // marginBottom: theme.spacing.medium,
    // borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.medium,
    paddingTop: theme.spacing.medium,
  },
  leftSection: {
    marginRight: theme.spacing.medium,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameSection: {
    flex: 1,
    marginRight: theme.spacing.medium,
  },
  name: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  location: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  distance: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  fromText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  amount: {
    fontSize: theme.fontSizes.large + 4,
    fontWeight: '600',
    color: theme.colors.primary,
    marginVertical: 2,
  },
  dollarSign: {
    color: theme.colors.primary,
  },
  perNight: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  reviewSection: {
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  ratingText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontWeight: '500',
    marginLeft: 4,
  },
  dot: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  reviews: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  repeatClients: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  bestReviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: theme.spacing.small,
  },
  bestReviewTextContainer: {
    flex: 1,
  },
  bestReview: {
    flex: 1,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  readMore: {
    color: theme.colors.primary,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.medium,
    paddingTop: theme.spacing.medium,
    backgroundColor: theme.colors.surfaceContrast,
    
  },
  headerContent: {
    flex: 1,
    marginRight: theme.spacing.medium,
  },
  headerTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.small,
  },
  filterChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
  },
  filterButton: {
    padding: theme.spacing.small,
    borderRadius: 8,
  },
});

export default ProfessionalList;