import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import { theme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLOG_POSTS } from '../data/mockData';
import { handleBack, navigateToFrom } from '../components/Navigation';
import ColoradoSpringsCTA from '../components/ColoradoSpringsCTA';

const BlogPost = ({ route, navigation }) => {
  const [post, setPost] = useState(null);
  const theme = useTheme();

  // Validate post data structure
  const isValidPost = (postData) => {
    return postData && 
           typeof postData === 'object' && 
           postData.author && 
           typeof postData.author === 'object' &&
           postData.author.name &&
           postData.author.profilePicture &&
           postData.author.bio &&
           postData.title &&
           postData.content &&
           Array.isArray(postData.tags);
  };

  useEffect(() => {
    const loadPost = async () => {
      try {
        let postId = null;

        // First priority: Get postId from route params
        if (route?.params?.postId) {
          postId = route.params.postId;
        }
        // Second priority: Get post object from route params (legacy support)
        else if (route?.params?.post && isValidPost(route.params.post)) {
          setPost(route.params.post);
          // Store the post data
          if (Platform.OS === 'web') {
            sessionStorage.setItem('currentBlogPost', JSON.stringify(route.params.post));
          } else {
            await AsyncStorage.setItem('currentBlogPost', JSON.stringify(route.params.post));
          }
          return;
        }
        // Third priority: Get postId from URL params on web
        else if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          postId = urlParams.get('post') || urlParams.get('postId');
        }

        // If we have a postId, find the post in BLOG_POSTS
        if (postId) {
          const foundPost = BLOG_POSTS.find(p => p.id === postId);
          if (foundPost && isValidPost(foundPost)) {
            setPost(foundPost);
            // Store the post data
            if (Platform.OS === 'web') {
              sessionStorage.setItem('currentBlogPost', JSON.stringify(foundPost));
            } else {
              await AsyncStorage.setItem('currentBlogPost', JSON.stringify(foundPost));
            }
            return;
          }
        }

        // If no postId found, try to load from storage
        let storedPost;
        if (Platform.OS === 'web') {
          storedPost = sessionStorage.getItem('currentBlogPost');
        } else {
          storedPost = await AsyncStorage.getItem('currentBlogPost');
        }

        if (storedPost) {
          const parsedPost = JSON.parse(storedPost);
          if (isValidPost(parsedPost)) {
            setPost(parsedPost);
            return;
          }
        }

        // If still no valid post, redirect to blog list
        navigateToFrom(navigation, 'Blog', 'BlogPost');
      } catch (error) {
        console.error('Error loading blog post:', error);
        navigateToFrom(navigation, 'Blog', 'BlogPost');
      }
    };

    loadPost();
  }, [route?.params]);

  // If no post data is available, show an error state
  if (!post || !isValidPost(post)) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
        <BackHeader 
          title="Blog Post"
          onBackPress={() => handleBack(navigation)}
        />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons 
            name="alert-circle-outline" 
            size={48} 
            color={theme.colors.error} 
          />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Blog post not found or invalid
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigateToFrom(navigation, 'Blog', 'BlogPost')}
          >
            <Text style={[styles.errorButtonText, { color: theme.colors.surface }]}>
              Go to Blog List
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleReferencePress = (reference) => {
    if (reference.url) {
      Linking.openURL(reference.url);
    } else if (reference.doi) {
      Linking.openURL(`https://doi.org/${reference.doi}`);
    }
  };

  // Function to render formatted content with markdown-like styling
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('## ')) {
        // Subheading
        return (
          <Text key={index} style={[styles.subheading, { color: theme.colors.primary }]}>
            {line.replace('## ', '')}
          </Text>
        );
      } else if (line.startsWith('- **') && line.includes('**:')) {
        // Bold list item
        const parts = line.split('**:');
        const boldPart = parts[0].replace('- **', '');
        const rest = parts[1] || '';
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.bulletPoint, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.content, { color: theme.colors.text, flex: 1 }]}>
              <Text style={[styles.boldText, { color: theme.colors.primary }]}>{boldPart}</Text>
              {rest}
            </Text>
          </View>
        );
      } else if (line.startsWith('- ')) {
        // Regular list item
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.bulletPoint, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.content, { color: theme.colors.text, flex: 1 }]}>
              {line.replace('- ', '')}
            </Text>
          </View>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold text
        return (
          <Text key={index} style={[styles.boldText, { color: theme.colors.primary }]}>
            {line.replace(/\*\*/g, '')}
          </Text>
        );
      } else if (line.trim() === '') {
        // Empty line for spacing
        return <View key={index} style={styles.emptyLine} />;
      } else {
        // Regular paragraph
        return (
          <Text key={index} style={[styles.content, { color: theme.colors.text }]}>
            {line}
          </Text>
        );
      }
    });
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <BackHeader 
        title={post.title}
        onBackPress={() => handleBack(navigation)}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.authorContainer}>
            <Image
              source={{ uri: post.author.profilePicture }}
              style={styles.authorImage}
            />
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.colors.secondary }]}>
                {post.author.name}
              </Text>
              <Text style={[styles.authorBio, { color: theme.colors.textSecondary }]}>
                {post.author.bio}
              </Text>
              <View style={styles.postInfo}>
                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                  {post.publishDate}
                </Text>
                <Text style={[styles.dot, { color: theme.colors.textSecondary }]}> • </Text>
                <Text style={[styles.readTime, { color: theme.colors.textSecondary }]}>
                  {post.readTime}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tags}>
          {post.tags.map((tag, index) => (
            <View 
              key={index} 
              style={[styles.tag, { backgroundColor: theme.colors.primary + '15' }]}
            >
              <Text style={[styles.tagText, { color: theme.colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contentContainer}>
          {renderFormattedContent(post.content)}
        </View>

        {/* Call-to-Action for Colorado Springs users */}
        <ColoradoSpringsCTA navigation={navigation} variant="default" />

        {/* Engagement metrics removed - they were fake
        <View style={[styles.stats, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.stat}>
            <MaterialCommunityIcons name="heart-outline" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat}>
            <MaterialCommunityIcons name="comment-outline" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat}>
            <MaterialCommunityIcons name="share-outline" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>{post.shares}</Text>
          </TouchableOpacity>
        </View>
        */}

        <View style={styles.references}>
          <Text style={[styles.referencesTitle, { color: theme.colors.primary }]}>References</Text>
          {post.references.map((reference, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reference}
              onPress={() => handleReferencePress(reference)}
            >
              <Text style={[styles.referenceText, { color: theme.colors.textSecondary }]}>
                {reference.authors} ({reference.year || 'n.d.'}). {reference.title}. {reference.publication}.
                {reference.doi && ` DOI: ${reference.doi}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  authorImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: theme.fonts.header.fontFamily,
  },
  authorBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  postInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dot: {
    marginHorizontal: 6,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  readTime: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  boldText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  emptyLine: {
    height: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  references: {
    padding: 20,
    paddingTop: 16,
  },
  referencesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  reference: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  referenceText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BlogPost;