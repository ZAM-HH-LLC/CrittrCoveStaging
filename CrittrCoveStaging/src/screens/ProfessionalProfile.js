import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, useWindowDimensions, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { Calendar } from 'react-native-calendars';
import { mockPets } from '../data/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCREEN_WIDTH } from '../context/AuthContext';
import ServiceCard from '../components/ServiceCard';
import { mockServicesForCards } from '../data/mockData';
import { mockConversations, mockMessages } from '../data/mockData';
// Conditionally import WebMap component
const WebMap = Platform.OS === 'web' ? require('react-leaflet').MapContainer : null;

// Mock API function to fetch profile data
const fetchProfileData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        // profilePhoto: 'https://example.com/profile-photo.jpg',
        bio: "Hi! I'm an experienced pet professional who loves all animals. I have 5 years of experience caring for dogs, cats, and exotic pets.",
        petPhotos: [
          // 'https://example.com/pet-photo-1.jpg',
          // 'https://example.com/pet-photo-2.jpg',
        ],
        services: ['Dog Boarding', 'Dog Walking', 'Drop-In Visits', 'House Sitting'],
        rates: {
          boarding: '35',
          daycare: '25',
          houseSitting: '40',
          dropInVisits: '20',
          dogWalking: '15'
        },
        name: 'John Doe',
        location: 'New York, NY'
      });
    }, 1000);
  });
};

const mockReviews = [
  {
    id: 1,
    name: 'Noah M.',
    service: 'Fish Tank Cleaning',
    date: 'Dec 02, 2024',
    rating: 5,
    text: 'Dina was fantastic with our dog! Sent lots of photos and clearly made sure she was comfortable. Will definitely use again!',
    photo: 'https://via.placeholder.com/50'
  },
  {
    id: 2,
    name: 'Kaily J.',
    service: 'Ferrier',
    date: 'Nov 26, 2024',
    rating: 4,
    text: 'Dina always takes such good care of Elijah. He was having tummy problems today and she kept me updated all day on how he was doing.',
    photo: 'https://via.placeholder.com/50'
  },
  {
    id: 3,
    name: 'Nadia U.',
    service: 'Reptile Boarding & Habitat Maintenance',
    date: 'Nov 19, 2024',
    rating: 5,
    text: 'She took such great care of our puppy! Sent pictures and videos the whole time, her backyard was super nice and clean ❤️ my puppy was definitely in great hands! Bonus her dogs were so sweet with our puppy.',
    photo: 'https://via.placeholder.com/50'
  },
  {
    id: 4,
    name: 'Vanessa G.',
    service: 'Bird Feeding',
    date: 'Nov 19, 2024',
    rating: 5,
    text: 'Dina was great! She communicated through the whole stay and sent plenty of videos and photos. 10/10',
    photo: 'https://via.placeholder.com/50'
  }
];

const useResponsiveLayout = () => {
  const { width } = useWindowDimensions();
  const [isWideScreen, setIsWideScreen] = useState(true);

  useEffect(() => {
    setIsWideScreen(Platform.OS === 'web' && width >= 900);
  }, [width]);

  return isWideScreen;
};

// Move this outside the component
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    .services-scroll::-webkit-scrollbar {
      -webkit-appearance: none;
    }

    .services-scroll::-webkit-scrollbar:vertical {
      width: 11px;
    }

    .services-scroll::-webkit-scrollbar:horizontal {
      height: 11px;
    }

    .services-scroll::-webkit-scrollbar-thumb {
      border-radius: 8px;
      border: 2px solid white;
      background-color: rgba(0, 0, 0, .5);
    }
  `;
  document.head.appendChild(style);
}

const ProfessionalProfile = ({ route, navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, is_DEBUG } = useContext(AuthContext);
  const [professionalData, setProfessionalData] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [specialistModalVisible, setSpecialistModalVisible] = useState(false);
  const [favoriteServices, setFavoriteServices] = useState([]);
  const [servicesModalVisible, setServicesModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const isWideScreen = useResponsiveLayout();

  // Calculate marginLeft to account for sidebar on desktop
  const marginLeft = screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0;

  // Debug component lifecycle
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA9999: ProfessionalProfile component mounted');
    }
    return () => {
      if (is_DEBUG) {
        console.log('MBA9999: ProfessionalProfile component unmounting');
      }
    };
  }, []);

  // Debug professional data changes
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA9999: Professional data changed:', professionalData ? professionalData.name : 'null');
    }
  }, [professionalData]);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
    };
    updateLayout();
  }, [screenWidth]);

  useEffect(() => {
    // Check if we can go back and if SearchProfessionalsListing exists in history
    const state = navigation.getState();
    const hasHistory = state.routes.some(route => route.name === 'SearchProfessionalsListing');
    setCanGoBack(navigation.canGoBack() && hasHistory);
  }, [navigation]);

  const handleBack = () => {
    if (is_DEBUG) {
      console.log('MBA9999: handleBack called, Platform:', Platform.OS);
    }
    
    if (Platform.OS === 'web') {
      sessionStorage.removeItem('currentProfessional');
      if (is_DEBUG) {
        console.log('MBA9999: Navigating back to SearchProfessionalsListing');
      }
      // Always use navigate to ensure consistent behavior
      navigation.navigate('SearchProfessionalsListing');
    } else {
      if (is_DEBUG) {
        console.log('MBA9999: Using navigation.goBack()');
      }
      navigation.goBack();
    }
  };

  // Handle browser back button - REMOVED due to causing navigation issues
  // The browser's native back button will work with React Navigation
  // useEffect(() => {
  //   if (Platform.OS === 'web') {
  //     // Popstate handling removed - was causing automatic navigation
  //   }
  // }, []);

  useEffect(() => {
    const loadProfessionalData = async () => {
      if (is_DEBUG) {
        console.log('MBA9999: loadProfessionalData called', {
          hasRouteParams: !!route?.params?.professional,
          platform: Platform.OS
        });
      }
      
      if (route?.params?.professional) {
        if (is_DEBUG) {
          console.log('MBA9999: Setting professional data from route params:', route.params.professional.name);
        }
        setProfessionalData(route.params.professional);
        // Also store in sessionStorage for web reload persistence
        if (Platform.OS === 'web') {
          sessionStorage.setItem('currentProfessional', JSON.stringify(route.params.professional));
        }
      } else if (Platform.OS === 'web') {
        // Try to get professional data from sessionStorage on web reload
        const storedProfessional = sessionStorage.getItem('currentProfessional');
        if (is_DEBUG) {
          console.log('MBA9999: Checking sessionStorage for professional data:', !!storedProfessional);
        }
        
        if (storedProfessional) {
          try {
            const parsedProfessional = JSON.parse(storedProfessional);
            if (is_DEBUG) {
              console.log('MBA9999: Setting professional data from sessionStorage:', parsedProfessional.name);
            }
            setProfessionalData(parsedProfessional);
          } catch (error) {
            console.error('MBA9999: Error parsing stored professional data:', error);
            // Only redirect if we can't parse the data
            navigation.replace('SearchProfessionalsListing');
          }
        } else {
          if (is_DEBUG) {
            console.log('MBA9999: No professional data found, redirecting to search');
          }
          // If no data, redirect back to search
          navigation.replace('SearchProfessionalsListing');
        }
      }
    };

    loadProfessionalData();
  }, [route?.params?.professional, navigation, is_DEBUG]);

  // Store professional data in AsyncStorage for mobile
  useEffect(() => {
    if (Platform.OS !== 'web' && professionalData) {
      AsyncStorage.setItem('currentProfessional', JSON.stringify(professionalData));
    }
  }, [professionalData]);

  const getContentWidth = () => {
    if (Platform.OS === 'web') {
      // Account for sidebar width on desktop
      const availableWidth = screenWidth > 900 
        ? windowWidth - (isCollapsed ? 70 : 250) 
        : windowWidth;
      return Math.min(1000, availableWidth - 32); // 32px for padding
    }
    return windowWidth - 32; // 16px padding on each side
  };

  const toggleFavorite = (serviceId) => {
    setFavoriteServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const renderServices = () => (
    <View style={styles.servicesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Services</Text>
        <TouchableOpacity 
          style={styles.seeAllButton}
          onPress={() => setServicesModalVisible(true)}
        >
          <Text style={styles.seeAllButtonText}>See All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.servicesWrapper}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={true}
          style={[
            styles.servicesScroll,
            Platform.OS === 'web' && { 
              className: 'services-scroll',
              overflowX: 'scroll'
            }
          ]}
          contentContainerStyle={styles.servicesScrollContent}
          persistentScrollbar={true}
        >
          {mockServicesForCards.slice(0, 5).map(service => (
            <ServiceCard 
              key={service.id}
              service={service}
              onHeartPress={toggleFavorite}
              isFavorite={favoriteServices.includes(service.id)}
              professionalName={professionalData.name}
              professionalId={professionalData.id}
              navigation={navigation}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (!professionalData) {
    return (
      <CrossPlatformView fullWidthHeader={true}>
        <BackHeader 
          title="Professional Profile" 
          onBackPress={handleBack}
        />
        <View style={styles.centered}>
          <Text>Loading...</Text>
        </View>
      </CrossPlatformView>
    );
  }

  const renderProfilePhoto = () => {
    if (professionalData.profilePicture) {
      return <Image source={{ uri: professionalData.profilePicture }} style={styles.profilePhoto} />;
    }
    return (
      <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
        <MaterialCommunityIcons name="account" size={80} color={theme.colors.primary} />
      </View>
    );
  };

  const renderSpecialistExperience = () => (
    <View style={styles.specialistSection}>
      <Text style={styles.sectionTitle}>Specialist Experience</Text>
      <TruncatedText text={professionalData?.bio || ''} />
    </View>
  );

  const renderRatingStars = () => (
    <View style={styles.ratingContainer}>
      <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
      <Text style={styles.rating}>{professionalData.reviews}</Text>
      <Text style={[styles.reviewCount, { marginLeft: 12 }]}>({professionalData.reviewCount || 50} reviews)</Text>
    </View>
  );

  // Add new component for truncated text with Read More
  const TruncatedText = ({ text, maxLines = 3 }) => (
    <View>
      <Text 
        numberOfLines={maxLines} 
        style={styles.specialistText}
      >
        {text}
      </Text>
      <TouchableOpacity 
        style={styles.readMoreButton}
        onPress={() => setSpecialistModalVisible(true)}
      >
        <Text style={styles.readMoreText}>Read more</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMap = () => {
    if (Platform.OS === 'web' && WebMap) {
      const { MapContainer, TileLayer, Marker } = require('react-leaflet');
      return (
        <View style={styles.mapContainer}>
          <MapContainer
            center={[38.8339, -104.8214]} // Default coordinates
            zoom={13}
            style={{ height: 400, width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[38.8339, -104.8214]} />
          </MapContainer>
        </View>
      );
    }
    // For mobile, return null or a placeholder
    return null;
  };

  const renderPets = () => {
    if (!mockPets || mockPets.length === 0) return null;
    
    return (
      <View style={styles.petsSection}>
        <Text style={styles.sectionTitle}>Pets</Text>
        {mockPets.map((pet, index) => (
          <View key={pet.id} style={styles.petItem}>
            <View style={styles.petPhoto}>
              <MaterialCommunityIcons 
                name={pet.animal_type.toLowerCase() === 'dog' ? 'dog' : 
                      pet.animal_type.toLowerCase() === 'cat' ? 'cat' : 'snake'} 
                size={30} 
                color={theme.colors.primary} 
              />
            </View>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petBreed}>{pet.breed}</Text>
              <Text style={styles.petDetails}>
                {`${pet.weight} lbs, ${pet.age.years} years${pet.age.months ? ` ${pet.age.months} months` : ''}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const styles2 = StyleSheet.create({
    modalContent: {
      backgroundColor: theme.colors.background,
      padding: 24,
      borderRadius: 12,
      width: Platform.OS === 'web' ? 
        (screenWidth <= 650 ? '90%' : '60%') : 
        '90%',
      maxWidth: 800,
      maxHeight: '90%',
    },
  });

  // Create services array from professionalData
  const services = [
    { name: 'Boarding', price: "25" },
    { name: 'Doggy Day Care', price: "30" },
    { name: 'House Sitting', price: "40" },
    { name: 'Drop-In Visits', price: "35" },
    { name: 'Dog Walking', price: "45" }
  ];

  const HomeFeature = ({ text }) => (
    <View style={styles.featureBubble}>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  const renderReviews = () => (
    <View style={styles.reviewsSection}>
      <Text style={styles.sectionTitle}>Reviews</Text>
      <View style={styles.reviewsGrid}>
        {mockReviews.slice(0, 4).map(renderReview)}
      </View>
      <TouchableOpacity 
        style={styles.readMoreButton}
        onPress={() => setReviewsModalVisible(true)}
      >
        <Text style={styles.readMoreText}>Read more reviews</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReview = (review) => (
    <View key={review.id} style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: review.photo }} style={styles.reviewerPhoto} />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.name}</Text>
          <View style={styles.reviewMeta}>
            <View style={styles.starContainer}>
              {[...Array(5)].map((_, index) => (
                <MaterialCommunityIcons
                  key={index}
                  name={index < review.rating ? "star" : "star-outline"}
                  size={16}
                  color={theme.colors.primary}
                />
              ))}
            </View>
            <View style={styles.serviceInfo}>
              <MaterialCommunityIcons name="home" size={16} color={theme.colors.secondary} />
              <Text style={styles.serviceText}>{review.service} • {review.date}</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={styles.reviewText}>{review.text}</Text>
    </View>
  );

  const renderHomeSection = () => (
    <View style={styles.homeSection}>
      <Text style={styles.sectionTitle}>Home</Text>
      <View style={styles.homeFeaturesGrid}>
        <HomeFeature text="No children present" />
        <HomeFeature text="Has security system" />
        <HomeFeature text="Non-smoking household" />
        <HomeFeature text="Has 2 dogs" />
        <HomeFeature text="Dogs allowed on bed" />
        <HomeFeature text="Dogs allowed on furniture" />
        <HomeFeature text="Potty breaks every 0-2 hours" />
      </View>
    </View>

  );

  const renderAboutSection = () => (
    <View style={styles.aboutSection}>
      <Text style={styles.sectionTitle}>About {professionalData.name}</Text>
      <View style={styles.aboutSubsections}>
        <View style={styles.communicationSection}>
          <Text style={styles.subsectionTitle}>Communication</Text>
          <Text>22 repeat pet parents</Text>
          <Text>100% response rate</Text>
          <Text>Usually responds in a few minutes</Text>
          <Text>90% bookings with photo updates</Text>
        </View>
        <View style={styles.skillsSection}>
          <Text style={styles.subsectionTitle}>Skills</Text>
          <Text>3 years of experience</Text>
        </View>
      </View> 
    </View>
  );

  const renderAvailability = () => (
    <View style={dynamicStyles.dynamicServicesBox}>
      <View style={styles.calendarSection}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Availability</Text>
        <Calendar
          style={styles.calendar}
          theme={{
            calendarBackground: theme.colors.surface,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.colors.primary,
          }}
        />
      </View>
    </View>
  );

  const renderGallery = () => {
    return (
      <View style={styles.gallerySection}>
        <Text style={styles.sectionTitle}>53 Photos</Text>
        <View style={styles.photoGrid}>
          {[1, 2, 3, 4].map((_, index) => (
            <Image 
              key={index}
              source={{ uri: 'https://via.placeholder.com/150' }}
              style={styles.galleryPhoto}
                      />
          ))}
        </View>
      </View>
    );
  };

  const additionalStyles = StyleSheet.create({
    servicesSection: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    seeAllButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: 'flex-start',
      minWidth: 'auto',
      width: 'auto',
    },
    seeAllButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    servicesScroll: {
      marginHorizontal: -24, // To counteract parent padding
      paddingHorizontal: 24,
    },
    modalServicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
      padding: 16,
    },
  });

  const handleContactPress = () => {
    // Check if conversation already exists
    const existingConversation = mockConversations.find(
      conv => conv.professionalId === professionalData.id
    );

    if (existingConversation) {
      // Use replace instead of navigate to avoid navigation stack issues
      navigation.replace('MessageHistory', {
        selectedConversation: existingConversation.id
      });
    } else {
      // Create new conversation
      const newConversation = {
        id: `conv_${Date.now()}`,
        name: professionalData.name,
        professionalId: professionalData.id,
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unread: false,
        bookingStatus: null
      };

      // Add new conversation to mockConversations
      mockConversations.unshift(newConversation);

      // Initialize empty messages array for this conversation
      mockMessages[newConversation.id] = [];

      // Use replace instead of navigate
      navigation.replace('MessageHistory', {
        selectedConversation: newConversation.id
      });
    }
  };

  // Create dynamic styles that account for sidebar
  const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      height: Platform.OS === 'web' ? '100vh' : '100%',
      overflow: 'hidden',
      position: Platform.OS === 'web' ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
      transition: Platform.OS === 'web' ? 'margin-left 0.3s ease' : undefined,
    },
    dynamicProfileSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
      width: '100%',
      display: windowWidth >= 600 ? 'flex' : 'block',
    },
    dynamicProfileSectionMobile: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
      width: '100%',
      maxWidth: 500,
      alignSelf: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    dynamicServicesBox: {
      backgroundColor: theme.colors.surface,
      padding: 24,
      paddingTop: 0,
      borderRadius: 12,
      marginTop: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 600 : undefined,
      alignSelf: 'center',
    },
  });

  const dynamicStyles = createStyles(screenWidth, isCollapsed);

  // Add this new function to render profile section based on screen size
  const renderProfileSection = () => {
    if (windowWidth >= 600) {
      // Web version - original layout
      return (
        <View style={[styles.leftColumn, !isWideScreen && styles.leftColumnMobile]}>
          <View style={[styles.profileSection, !isWideScreen && styles.profileSectionMobile]}>
            {renderProfilePhoto()}
            <Text style={styles.name}>{professionalData.name}</Text>
            <Text style={styles.location}>{professionalData.location}</Text>
            {renderRatingStars()}
            <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
              <Text style={styles.contactButtonText}>Contact {professionalData.name}</Text>
            </TouchableOpacity>
          </View>
          {isWideScreen && renderAvailability()}
          {isWideScreen && renderMap()}
          {isWideScreen && mockPets && mockPets.length > 0 && renderPets()}
        </View>
      );
    } else {
      // Mobile version - fixed layout
      return (
        <View style={[dynamicStyles.dynamicProfileSection, dynamicStyles.dynamicProfileSectionMobile]}>
          {renderProfilePhoto()}
          <Text style={styles.name}>{professionalData.name}</Text>
          <Text style={styles.location}>{professionalData.location}</Text>
          {renderRatingStars()}
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Text style={styles.contactButtonText}>Contact {professionalData.name}</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={dynamicStyles.mainContainer}>
      <CrossPlatformView fullWidthHeader={true} contentWidth="1200px">
        <BackHeader 
          title="Professional Profile" 
          onBackPress={handleBack}
        />
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={[styles.content, { width: getContentWidth() }]}>
            <View style={[styles.twoColumnLayout, !isWideScreen && styles.singleColumnLayout]}>
              {renderProfileSection()}
              <View style={styles.rightColumn}>
                {/* TODO: Add back after MVP launch */}
                {/* {renderGallery()} */}
                {renderServices()}
                {!isWideScreen && renderAvailability()}
                {renderSpecialistExperience()}
                {renderReviews()}
                {renderHomeSection()}
                {!isWideScreen && renderMap()}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bio Modal */}
        <Modal
          visible={bioModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBioModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles2.modalContent}>
              <Text style={styles.bioText}>{professionalData.bio}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setBioModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Reviews Modal */}
        <Modal
          visible={reviewsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setReviewsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles2.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>All Reviews</Text>
                <TouchableOpacity 
                  style={styles.modalCloseIcon}
                  onPress={() => setReviewsModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                {mockReviews.map((review) => (
                  <View key={review.id} style={styles.modalReviewItem}>
                    {renderReview(review)}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Specialist Experience Modal */}
        <Modal
          visible={specialistModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSpecialistModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles2.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Specialist Experience</Text>
                <TouchableOpacity 
                  style={styles.modalCloseIcon}
                  onPress={() => setSpecialistModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.bioText}>{professionalData?.bio}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Services Modal */}
        <Modal
          visible={servicesModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setServicesModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles2.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>All Services</Text>
                <TouchableOpacity 
                  style={styles.modalCloseIcon}
                  onPress={() => setServicesModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalServicesGrid}>
                  {mockServicesForCards.map(service => (
                    <ServiceCard 
                      key={service.id}
                      service={service}
                      onHeartPress={toggleFavorite}
                      isFavorite={favoriteServices.includes(service.id)}
                      professionalName={professionalData.name}
                      professionalId={professionalData.id}
                      navigation={navigation}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </CrossPlatformView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 16 : 80,
    height: Platform.OS === 'web' ? 'calc(100vh - 124px)' : '100%',
    overflow: 'auto',
  },
  content: {
    alignSelf: 'center',
    padding: 24,
  },
  topSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
    marginBottom: 24,
  },
  gallerySection: {
    maxHeight: 400,
    overflow: 'hidden',
    marginBottom: 24,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxHeight: 320,
    overflow: 'auto',
  },
  bottomSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
  },
  servicesSection: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    backgroundColor: theme.colors.background,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aboutSection: {
    maxHeight: 300,
    overflow: 'auto',
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  profileHeader: {
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  profileInfo: {
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  hostingSection: {
    marginTop: 24,
  },
  hostTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  weightRanges: {
    gap: 8,
  },
  weightRange: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  galleryPhoto: {
    width: Platform.OS === 'web' ? 100 : 50,
    height: Platform.OS === 'web' ? 100 : 50,
    borderRadius: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    alignSelf: 'center',
  },
  profilePhotoPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
  },
  location: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
  },
  bioInput: {
    backgroundColor: theme.colors.surface,
  },
  service: {
    fontSize: 16,
    marginBottom: 5,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rateLabel: {
    flex: 1,
    fontSize: 16,
  },
  rateInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  petPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    margin: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  reviewCount: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginLeft: 4,
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.surface,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  statText: {
    fontSize: 16,
    marginLeft: 5,
  },
  bioText: {
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.text,
    overflow: 'hidden',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceText: {
    fontSize: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  servicePrice: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillBadge: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 5,
    margin: 5,
  },
  skillText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  photoGallery: {
    flexDirection: 'row',
  },
  calculatorText: {
    fontSize: 16,
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  additionalRatesButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  additionalRatesText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  calendarSection: {
    marginTop: 24,
  },
  readMoreButton: {
    marginTop: 8,
  },
  readMoreText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  reviewsSection: {
    marginVertical: 32,
    width: '100%',
    backgroundColor: theme.colors.background,
  },
  reviewItem: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
  },
  servicesSection: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  mapContainer: {
    height: 400,
    width: '100%',
    marginVertical: 24,
  },
  map: {
    flex: 1,
  },
  petsSection: {
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  petInfo: {
    marginLeft: 12,
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: theme.fonts.header.fontFamily,
  },
  petBreed: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petDetails: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  aboutSubsections: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
  },
  communicationSection: {
    flex: 1,
  },
  skillsSection: {
    flex: 1,
  },
  homeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  noReviews: {
    fontSize: 16,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 24,
  },
  singleColumnLayout: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    maxWidth: Platform.OS === 'web' ? 400 : undefined,
  },
  rightColumn: {
    flex: Platform.OS === 'web' ? 2 : undefined,
  },
  calendar: {
    height: 300,
    marginTop: 16,
  },
  serviceText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '100',
  },
  homeFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  featureBubble: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  reviewItem: {
    marginBottom: 24,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: theme.fonts.header.fontFamily,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  modalScroll: {
    maxHeight: Platform.OS === 'web' ? '70vh' : '80%',
  },
  closeButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseIcon: {
    padding: 8,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Platform.OS === 'web' ? 40 : 20,
  },
  reviewsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  reviewItem: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: Platform.OS === 'web' ? 300 : '100%',
    // maxWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : undefined,
    marginBottom: 0, // Remove default margin since we're using gap
  },
  specialistSection: {
    marginTop: 24,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  specialistText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalReviewItem: {
    marginBottom: 16,
    width: '100%',
  },
  leftColumnMobile: {
    maxWidth: '100%',
    alignItems: 'center',
  },
  seeAllButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    minWidth: 'auto',
    width: 'auto',
  },
  seeAllButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    padding: 16,
  },
  reviewMeta: {
    gap: 4,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
});

export default ProfessionalProfile;
