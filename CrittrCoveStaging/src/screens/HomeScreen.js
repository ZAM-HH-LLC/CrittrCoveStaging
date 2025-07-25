import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, Image, StyleSheet, Linking, Dimensions, Platform, TouchableOpacity, TextInput } from 'react-native';
import { Button, Text, Card, Title, Paragraph, useTheme } from 'react-native-paper';
import { ImageBackground } from 'react-native';
import { theme } from '../styles/theme';
import { SCREEN_WIDTH } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { navigateToFrom } from '../components/Navigation';
import { FontAwesome } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import RoadmapSection from '../components/RoadmapSection';
// Conditionally import formspree only on web
let useForm, ValidationError;
if (Platform.OS === 'web') {
  try {
    const formspree = require('@formspree/react');
    useForm = formspree.useForm;
    ValidationError = formspree.ValidationError;
  } catch (error) {
    console.log('Formspree not available:', error);
  }
}
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { BLOG_POSTS } from '../data/mockData';
import { AuthContext } from '../context/AuthContext';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

// Define a sample reviews array
const reviews = [
  {
    image: require('../../assets/user1.png'),
    text: "\"CrittrCove has been amazing for finding reliable pet professionals!",
    author: "John Smith"
  },
  {
    image: require('../../assets/user2.png'),
    text: "\"Great experience with pet sitting services!",
    author: "Jane Doe"
  },
  {
    image: require('../../assets/user3.png'),
    text: "\"Found the perfect sitter for my exotic pets!",
    author: "Sudhakar Vuluvala"
  },
  {
    image: require('../../assets/user4.png'),
    text: "\"I've had a fantastic experience with CrittrCove's pet grooming services!",
    author: "Alice Brown"
  }
];

// Define the ReviewImage component
const ReviewImage = ({ source, style }) => {
  if (Platform.OS === 'web') {
    return <img src={source} style={style} alt="" />;
  }
  return <Image source={source} style={style} />;
};

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { screenWidth } = useContext(AuthContext);
  const isMobileView = screenWidth < 660;
  const openAppStore = (url) => {
    Linking.openURL(url);
  };

  // Add state for social media popup visibility
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const AutoScrollSection = ({ data, renderItem, title, cardWidth = 320, onTitlePress }) => {
    const scrollViewRef = React.useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userScrolling, setUserScrolling] = useState(false);
    const autoScrollTimerRef = React.useRef(null);

    // Auto-scroll effect
    useEffect(() => {
      if (!userScrolling) {
        autoScrollTimerRef.current = setInterval(() => {
          if (scrollViewRef.current) {
            const nextIndex = (currentIndex + 1) % data.length;
            scrollToIndex(nextIndex);
          }
        }, 3000);
      }

      return () => {
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
        }
      };
    }, [currentIndex, userScrolling, data.length]);

    const scrollToIndex = (index) => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: index * cardWidth,
          animated: true
        });
        setCurrentIndex(index);
      }
    };

    const handleScroll = (event) => {
      const contentOffset = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffset / cardWidth);
      setCurrentIndex(index);
    };

    const handleScrollBegin = () => {
      setUserScrolling(true);
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };

    const handleScrollEnd = () => {
      // Reset after a short delay to prevent immediate auto-scroll
      setTimeout(() => {
        setUserScrolling(false);
      }, 1000);
    };

    const handleDotPress = (index) => {
      setUserScrolling(true);
      scrollToIndex(index);
      // Reset auto-scroll after a delay
      setTimeout(() => {
        setUserScrolling(false);
      }, 1000);
    };

    return (
      <View style={styles.section}>
        {onTitlePress ? (
          <TouchableOpacity onPress={onTitlePress}>
            <Text style={[styles.sectionTitle, { textDecorationLine: 'underline' }]}>{title}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        <View style={styles.scrollContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={true}
            style={[styles.scrollContainer, { WebkitOverflowScrolling: 'touch' }]}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            pagingEnabled={Platform.OS !== 'web'}
            onScrollBeginDrag={handleScrollBegin}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
          >
            {data.map((item, index) => renderItem(item, index))}
          </ScrollView>
          {/* Clickable scroll indicators */}
          <View style={styles.scrollIndicators}>
            {data.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleDotPress(index)}
                style={styles.scrollIndicatorButton}
              >
                <View
                  style={[
                    styles.scrollIndicator,
                    currentIndex === index && styles.scrollIndicatorActive
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
          {/* Scroll hint for mobile */}
          {Platform.OS !== 'web' && (
            <View style={styles.scrollHint}>
              <Text style={styles.scrollHintText}>Swipe for more</Text>
              <MaterialCommunityIcons name="gesture-swipe-horizontal" size={24} color={theme.colors.primary} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const ReviewsSection = () => {
    const renderReview = (review, index) => (
      <View key={index} style={styles.reviewCard}>
        <Text style={styles.reviewText}>{review.text}</Text>
        <View style={styles.reviewAuthorContainer}>
          <ReviewImage
            source={review.image}
            style={styles.reviewerImage}
          />
          <View>
            <Text style={styles.reviewAuthorName}>{review.author}</Text>
            <Text style={styles.reviewAuthorTitle}>Owner Review</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((_, index) => (
                <MaterialCommunityIcons 
                  key={index}
                  name="star"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.starIcon}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    );

    return (
      <AutoScrollSection
        data={reviews}
        renderItem={renderReview}
        title="Kind Words From Users"
      />
    );
  };

  const BlogSection = () => {
    const renderBlogPost = (post, index) => (
      <TouchableOpacity 
        key={post.id} 
        style={[
          styles.blogCard,
          { marginRight: index === BLOG_POSTS.length - 1 ? 0 : 10 }
        ]} 
        onPress={() => navigateToFrom(navigation, 'BlogPost', 'Home', { postId: post.id })}
      >
        <View style={styles.authorContainer}>
          {/* Add safety check for image source */}
          {post.author.profilePicture && (
            <Image
              source={
                typeof post.author.profilePicture === 'string' 
                  ? { uri: post.author.profilePicture }
                  : post.author.profilePicture
              }
              style={styles.authorImage}
              onError={(error) => {
                console.log('Image load error:', error);
              }}
            />
          )}
          <View style={styles.blogContent}>
            <Text style={[styles.title, { color: theme.colors.primary }]} numberOfLines={2}>
              {post.title}
            </Text>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.colors.secondary }]}>
                {post.author.name}
              </Text>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.readTime}>{post.readTime}</Text>
            </View>
            <Text style={styles.preview} numberOfLines={3}>
              {post.content.slice(0, 100)}...
            </Text>
            <View style={styles.tags}>
              {post.tags.slice(0, 2).map((tag, tagIndex) => (
                <View 
                  key={tagIndex} 
                  style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}
                >
                  <Text style={[styles.tagText, { color: theme.colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="heart-outline" size={16} color={theme.colors.secondary} />
                <Text style={styles.statText}>{post.likes}</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="comment-outline" size={16} color={theme.colors.secondary} />
                <Text style={styles.statText}>{post.comments}</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="share-outline" size={16} color={theme.colors.secondary} />
                <Text style={styles.statText}>{post.shares}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <AutoScrollSection
        data={BLOG_POSTS}
        renderItem={renderBlogPost}
        title="Blog"
        cardWidth={320}
        onTitlePress={() => navigateToFrom(navigation, 'Blog', 'Home')}
      />
    );
  };

  const Features = () => {
    const [activeTab, setActiveTab] = useState('owners'); // Default to owners tab

    // Add roadmap colors array
    const roadmapColors = ['#515d6c', '#516a6c', '#516C61', '#6A6C51'];

    // Update the feature item structure and styles
    const featureItemStyle = {
      flexDirection: 'row',
      marginBottom: 20,
      alignItems: 'flex-start',
      width: '100%',
    };

    const featureContentStyle = {
      flex: 1,
      marginLeft: 5,
    };

    return (
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, activeTab === 'owners' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('owners')}
          >
            <Text style={[styles.toggleButtonText, activeTab === 'owners' && styles.toggleButtonTextActive]}>For Pet Owners</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, activeTab === 'sitters' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('sitters')}
          >
            <Text style={[styles.toggleButtonText, activeTab === 'sitters' && styles.toggleButtonTextActive]}>For Pet Professionals</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          {activeTab === 'owners' && (
            <View style={styles.featureColumn}>
              <Text style={styles.columnTitle}>For Pet Owners</Text>
              <View style={styles.featuresList}>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[0] }]}>
                    <FontAwesome6 name="person-running" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Complete Your Profile</Text>
                    <Text style={styles.featureText}>Submit details about you and your requirements.</Text>
                  </View>
                </View>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[1] }]}>
                    <MaterialCommunityIcons name="horse-human" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Complete Pet Profile</Text>
                    <Text style={styles.featureText}>Submit details about your pet and sitting requirements.</Text>
                  </View>
                </View>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[2] }]}>
                    <MaterialCommunityIcons name="professional-hexagon" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Search for Pro's</Text>
                    <Text style={styles.featureText}>You can use our marketplace to find the best pro for your desired service.</Text>
                  </View>
                </View>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[3] }]}>
                    <FontAwesome5 name="calendar-check" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Confirm Your Booking</Text>
                    <Text style={styles.featureText}>Coordinate directly with your professional to finalize details.</Text>
                  </View>
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigateToFrom(navigation, 'SignUp', 'Home')}>
                  <Text style={styles.buttonText}>Sign up Today!</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {activeTab === 'sitters' && (
            <View style={styles.featureColumn}>
              <Text style={styles.columnTitle}>For Pet Professionals</Text>
              <View style={styles.featuresList}>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[0] }]}>
                    <FontAwesome name="sign-in" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Apply to Join Pro Community</Text>
                    <Text style={styles.featureText}>Submit your specialties, documents, bio, and availability to begin.</Text>
                  </View>
                </View>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[1] }]}>
                    <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Create Services</Text>
                    <Text style={styles.featureText}>Create services to offer to pet owners.</Text>
                  </View>
                </View>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[2] }]}>
                    <FontAwesome6 name="handshake-simple" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Get Matched with Owners</Text>
                    <Text style={styles.featureText}>Pet owners in your area will reach out to you for yourservices.</Text>
                  </View>
                </View>
                <View style={featureItemStyle}>
                  <View style={[styles.featureIconCircle, { backgroundColor: roadmapColors[3] }]}>
                    <MaterialIcons name="auto-graph" size={24} color="white" />
                  </View>
                  <View style={featureContentStyle}>
                    <Text style={styles.featureTitle}>Grow Your Business</Text>
                    <Text style={styles.featureText}>Manage bookings and get support as you build your pet service business.</Text>
                  </View>
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigateToFrom(navigation, 'SignUp', 'Home')}>
                  <Text style={styles.buttonText}>Become a Professional</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const ContactSection = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Use formspree only on web
    const webFormData = Platform.OS === 'web' && useForm ? useForm("mkgobpro") : [null, null];
    const [state, handleSubmit] = webFormData;

    const handleFormSubmit = async (e) => {
      if (Platform.OS === 'web') {
        e.preventDefault();
      }
      
      setIsSubmitting(true);

      if (Platform.OS === 'web' && handleSubmit) {
        // Use formspree on web
        const formData = {
          name: name,
          email: email,
          message: message
        };
        
        await handleSubmit(formData);
        
        if (state && state.succeeded) {
          setName('');
          setEmail('');
          setMessage('');
          setIsSubmitted(true);
        }
      } else {
        // On mobile, use mailto or show success message
        const subject = `Contact from ${name}`;
        const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
        const mailtoUrl = `mailto:support@crittrcove.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        try {
          await Linking.openURL(mailtoUrl);
          setName('');
          setEmail('');
          setMessage('');
          setIsSubmitted(true);
        } catch (error) {
          console.log('Error opening mail app:', error);
          // Still show success for better UX
          setIsSubmitted(true);
        }
      }
      
      setIsSubmitting(false);
    };

    const isWebSubmitted = Platform.OS === 'web' && state && state.succeeded;
    const showSuccessMessage = isSubmitted || isWebSubmitted;

    if (showSuccessMessage) {
      return (
        <View style={styles.contactSection}>
          <View style={styles.contactContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              Thanks for reaching out!
            </Text>
            <Text style={styles.successMessage}>
              {Platform.OS === 'web' 
                ? "We'll get back to you soon." 
                : "Your email app should open with a pre-filled message."}
            </Text>
          </View>
        </View>
      );
    }

    const webErrors = Platform.OS === 'web' && state ? state.errors : null;
    const currentlySubmitting = isSubmitting || (Platform.OS === 'web' && state && state.submitting);

    return (
      <View style={styles.contactSection}>
        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <TextInput
            placeholder="Your Name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            name="name"
          />
          {Platform.OS === 'web' && ValidationError && (
            <ValidationError prefix="Name" field="name" errors={webErrors} />
          )}
          
          <TextInput
            placeholder="Your Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            name="email"
            autoCapitalize="none"
          />
          {Platform.OS === 'web' && ValidationError && (
            <ValidationError prefix="Email" field="email" errors={webErrors} />
          )}
          
          <TextInput
            placeholder="Your Message"
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            multiline
            name="message"
          />
          {Platform.OS === 'web' && ValidationError && (
            <ValidationError prefix="Message" field="message" errors={webErrors} />
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                currentlySubmitting && styles.disabledButton
              ]}
              onPress={handleFormSubmit}
              disabled={currentlySubmitting}
            >
              <Text style={styles.buttonText}>
                {currentlySubmitting ? 'Sending...' : (Platform.OS === 'web' ? 'Send' : 'Open Email')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const ServiceCard = ({ icon, title, description, color }) => {
    const cardStyles = {
      container: {
        width: isMobileView ? '90%' : '45%',
        minWidth: isMobileView ? 'auto' : 300,
        maxWidth: 500,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
        alignSelf: 'center',
      },
      header: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 15,
      },
      iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: `${theme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
      },
      title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: theme.fonts.header.fontFamily,
        textAlign: 'center',
        marginBottom: 10,
      },
      description: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.text,
        fontFamily: theme.fonts.regular.fontFamily,
        textAlign: 'center',
      },
    };

    return (
      <View style={cardStyles.container}>
        <View style={cardStyles.header}>
          <View style={cardStyles.iconContainer}>
            <MaterialCommunityIcons name={icon} size={32} color={color} />
          </View>
          <Text style={cardStyles.title}>{title}</Text>
        </View>
        <Text style={cardStyles.description}>{description}</Text>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      bounces={false}
      overScrollMode="never"
    >
      <View style={styles.heroSection}>
        <Image
          source={require('../../assets/hero-image.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroContent}>
          <Text style={styles.heroText}>Welcome to CrittrCove</Text>
          <TouchableOpacity 
            style={styles.heroSignupButton} 
            onPress={() => navigateToFrom(navigation, 'SignUp', 'Home')}
          >
            <Text style={styles.heroSignupButtonText}>Sign Up Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Service Highlights Section */}
      <View style={styles.serviceHighlightsSection}>
        <Text style={styles.mainServiceTitle}>Marketplace for Pet Owners and Care Professionals</Text>
        
        <View style={[styles.servicesGrid, { 
          flexDirection: isMobileView ? 'column' : 'row',
          alignItems: isMobileView ? 'center' : 'flex-start',
        }]}>
          <ServiceCard
            icon="paw"
            title="All Animals Welcome"
            description="From everyday pets to exotic companions, CrittrCove is a marketplace where you can find independent professionals offerring care for a wide variety of animals."
            color={theme.colors.mainColors.senary}
          />
          <ServiceCard
            icon="calendar-clock"
            title="Flexible Booking Options"
            description="Book single visits, multiple days, or set up recurring services. Create subscription plans or schedule services months in advance."
            color={theme.colors.mainColors.quinary}
          />
          <ServiceCard
            icon="shield-check"
            title="Verified Badges"
            description="All professionals are allowed on the platform, and clients can see their verified badges to ensure they are who they say they are."
            color={theme.colors.mainColors.main}
          />
          <ServiceCard
            icon="tune-variant"
            title="Customizable Services"
            description="Professionals can create custom service packages and pricing plans tailored to your specific needs and preferences."
            color={theme.colors.mainColors.quaternary}
          />
        </View>
      </View>

      <Features />
      <ReviewsSection />
      <BlogSection />

      {/* Roadmap Section */}
      <RoadmapSection />

      {/* FAQ Section */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAQs</Text>
         {faqs.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity 
              style={styles.faqButton}
              onPress={() => setSelectedFaq(selectedFaq === index ? null : index)}
            >
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqToggle}>{selectedFaq === index ? '-' : '+'}</Text>
            </TouchableOpacity>
            {selectedFaq === index && (
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            )}
          </View>
        ))} 
      </View> */}

      {/* Contact Us Section */}
      <ContactSection />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.socialIconsRow}>
          <TouchableOpacity 
            style={styles.socialIcon} 
            onPress={() => Linking.openURL('https://www.instagram.com/crittrcove')}
          >
            <FontAwesome name="instagram" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialIcon} 
            onPress={() => Linking.openURL('https://discord.gg/ZX3sj6w6')}
          >
            <FontAwesome5 name="discord" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.footerLinksRow}>
          <Text style={styles.footerLink} onPress={() => navigateToFrom(navigation, 'PrivacyPolicy', 'Home')}>Privacy Policy</Text>
          <Text style={styles.footerLink} onPress={() => navigateToFrom(navigation, 'TermsOfService', 'Home')}>Terms of Service</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  heroSection: {
    height: Platform.OS === 'web' ? '70vh' : windowHeight * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
  },
  heroText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: theme.fonts.header.fontFamily,
    textAlign: 'center',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
    marginBottom: 20,
  },
  heroSignupButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  heroSignupButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  section: {
    padding: 20,
    width: '100%',
    maxWidth: 1200,
    marginLeft: 'auto',
    marginRight: 'auto',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSizes.largeLarge,
    fontWeight: 'bold',
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 10,
    textAlign: 'center',
    color: 'black',
  },
  card: {
    marginBottom: 10,
  },
  appButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  appButton: {
    width: '45%',
  },
  reviewsSection: {
    // height: 350,
    marginBottom: 20,
  },
  reviewsBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewsOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reviewsSubtitle: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  reviewsTitle: {
    fontSize: theme.fontSizes.largeLarge,
    fontFamily: theme.fonts.header.fontFamily,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
  },
  reviewsContainer: {
    width: '100%',
    maxWidth: 1200,
    marginLeft: 'auto',
    marginRight: 'auto',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'auto',
    scrollbarWidth: 'auto',
    scrollbarColor: `${theme.colors.primary} transparent`,
  },
  reviewsContent: {
    flexDirection: 'row',
    minWidth: 'min-content',
    gap: 10,
    padding: 20,
    paddingBottom: 40, // Add space for indicators
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewCard: {
    width: 300,
    height: 200,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 10,
  },
  reviewCardMobile: {
    width: '100%',
    height: '100%',
  },
  reviewQuote: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
  },
  reviewText: {
    fontSize: 18,
    color: 'black',
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 15,
    flex: 1,
  },
  reviewAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerImage: {
    width: 45,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    objectFit: 'cover',
  },
  reviewAuthorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  reviewAuthorTitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 2,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    margin: 5,
  },
  paginationDotActive: {
    backgroundColor: 'black',
  },
  featuresSection: {
    marginBottom: 80,
    marginTop: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  toggleButton: {
    padding: 10,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  toggleButtonTextActive: {
    color: theme.colors.whiteText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureColumn: {
    width: SCREEN_WIDTH < 768 ? '90%' : '100%',
    maxWidth: 600,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  columnTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'black',
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
  },
  featuresList: {
    width: '100%',
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
    width: '100%',
  },
  featureIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  featureIcon: {
    fontSize: 40,
  },
  featureTitle: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    marginBottom: 5,
    color: 'black',
    fontFamily: theme.fonts.header.fontFamily,
  },
  featureText: {
    fontSize: theme.fontSizes.mediumLarge + 2,
    color: 'black',
    lineHeight: 22,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  actionButton: {
    backgroundColor: '#6A6C51',
    width: '50%',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  blogSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  blogCard: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
    marginRight: 10,
  },
  authorContainer: {
    flexDirection: 'column',
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
  },
  blogContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: theme.fonts.header.fontFamily,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dot: {
    marginHorizontal: 4,
    color: '#666',
  },
  readTime: {
    fontSize: 16,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  preview: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 12,
    color: '#444',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  roadmapSection: {
    marginBottom: 20,
  },
  roadmapImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadmapOverlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  faqSection: {
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 10,
  },
  faqButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  faqToggle: {
    fontSize: 14,
    color: 'gray',
  },
  faqAnswer: {
    fontSize: 16,
  },
  contactSection: {
    // maxWidth: 800,
    width: '100%',
    // display: 'flex',
    // flexDirection: 'column',
    // alignItems: 'center',
    // justifyContent: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
  },
  contactContainer: {
    width: '100%',
    maxWidth: 600,
  },
  input: {
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  socialIcon: {
    marginHorizontal: 15,
    padding: 5,
  },
  footerLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerLink: {
    color: 'white',
    fontFamily: theme.fonts.regular.fontFamily,
    marginHorizontal: 15,
    textDecorationLine: 'underline',
  },
  successMessage: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    color: 'black',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  validationError: {
    color: 'red',
    fontSize: 16,
    marginTop: -5,
    marginBottom: 10,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starIcon: {
    marginRight: 2,
  },
  waitlistSection: {
    // backgroundColor: '#f5f5f5',
    marginVertical: 20,
    borderRadius: 10,
  },
  waitlistDescription: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: 'black',
    fontFamily: theme.fonts.regular.fontFamily,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  waitlistButton: {
    marginTop: 10,
    width: '80%',
    maxWidth: 300,
    padding: 15,
  },
  scrollIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  scrollIndicatorButton: {
    padding: 10, // Increase touch target
    marginHorizontal: -6, // Compensate for padding while maintaining visual spacing
  },
  scrollIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  scrollIndicatorActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scrollHintText: {
    color: theme.colors.primary,
    marginRight: 5,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  scrollContainer: {
    width: '100%',
    maxWidth: 1200,
    marginLeft: 'auto',
    marginRight: 'auto',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'auto',
    scrollbarWidth: 'auto',
    scrollbarColor: `${theme.colors.primary} transparent`,
  },
  scrollContent: {
    flexDirection: 'row',
    minWidth: 'min-content',
    gap: 10,
    padding: 20,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceHighlightsSection: {
    padding: 20,
    width: '100%',
    maxWidth: 1200,
    marginLeft: 'auto',
    marginRight: 'auto',
    alignItems: 'center',
  },
  mainServiceTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  servicesGrid: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
});
