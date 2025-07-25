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

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <BackHeader 
        title={post.title}
        onBackPress={() => handleBack(navigation)}
      />
      <ScrollView style={styles.container}>
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
              <Text style={styles.authorBio}>{post.author.bio}</Text>
              <View style={styles.postInfo}>
                <Text style={styles.date}>{post.publishDate}</Text>
                <Text style={styles.dot}> • </Text>
                <Text style={styles.readTime}>{post.readTime}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tags}>
          {post.tags.map((tag, index) => (
            <View 
              key={index} 
              style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}
            >
              <Text style={[styles.tagText, { color: theme.colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.content, { color: theme.colors.text }]}>{post.content}</Text>

        <View style={styles.stats}>
          <TouchableOpacity style={styles.stat}>
            <MaterialCommunityIcons name="heart-outline" size={24} color={theme.colors.secondary} />
            <Text style={styles.statText}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat}>
            <MaterialCommunityIcons name="comment-outline" size={24} color={theme.colors.secondary} />
            <Text style={styles.statText}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat}>
            <MaterialCommunityIcons name="share-outline" size={24} color={theme.colors.secondary} />
            <Text style={styles.statText}>{post.shares}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.references}>
          <Text style={[styles.referencesTitle, { color: theme.colors.primary }]}>References</Text>
          {post.references.map((reference, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reference}
              onPress={() => handleReferencePress(reference)}
            >
              <Text style={styles.referenceText}>
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
    padding: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  authorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: theme.fonts.header.fontFamily,
  },
  authorBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  postInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dot: {
    marginHorizontal: 4,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  readTime: {
    fontSize: 14,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 0,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  references: {
    padding: 16,
  },
  referencesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  reference: {
    marginBottom: 12,
  },
  referenceText: {
    fontSize: 14,
    color: '#444',
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