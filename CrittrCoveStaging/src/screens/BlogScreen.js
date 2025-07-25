import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  TextInput
} from 'react-native';
import { useTheme, Searchbar } from 'react-native-paper';
import { BLOG_POSTS } from '../data/mockData';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import { theme } from '../styles/theme';
import { navigateToFrom } from '../components/Navigation';

const BlogScreen = ({ navigation }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState(BLOG_POSTS);

  const handleBack = () => {
    navigation.navigate('Home');
  };

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    const lowercaseQuery = query.toLowerCase();
    const filtered = BLOG_POSTS.filter(post => 
      post.title.toLowerCase().includes(lowercaseQuery) ||
      post.author.name.toLowerCase().includes(lowercaseQuery) ||
      post.content.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredPosts(filtered);
  }, []);

  const renderBlogPost = (post) => {
    const truncatedContent = post.content.slice(0, 200) + '...';

    return (
      <TouchableOpacity
        key={post.id}
        style={[styles.blogCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigateToFrom(navigation, 'BlogPost', 'Blog', { postId: post.id })}
      >
        <View style={styles.authorContainer}>
          <Image
            source={{ uri: post.author.profilePicture }}
            style={styles.authorImage}
          />
          <View style={styles.blogContent}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>{post.title}</Text>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.colors.secondary }]}>
                {post.author.name}
              </Text>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.readTime}>{post.readTime}</Text>
            </View>
            <Text style={styles.preview} numberOfLines={3}>
              {truncatedContent}
            </Text>
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
            <View style={styles.stats}>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="heart-outline" size={20} color={theme.colors.secondary} />
                <Text style={styles.statText}>{post.likes}</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="comment-outline" size={20} color={theme.colors.secondary} />
                <Text style={styles.statText}>{post.comments}</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="share-outline" size={20} color={theme.colors.secondary} />
                <Text style={styles.statText}>{post.shares}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BackHeader 
        title="Blog" 
        onBackPress={handleBack}
      />
      <View style={styles.searchBarContainer}>
        {Platform.OS === 'web' ? (
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.primary} />
            <TextInput
              placeholder="Search by title, author, or content"
              onChangeText={handleSearch}
              value={searchQuery}
              style={styles.webSearchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <Searchbar
            placeholder="Search by title, author, or content"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            icon="magnify"
            clearIcon="close-circle"
          />
        )}
      </View>
      <ScrollView style={styles.scrollView}>
        {filteredPosts.length > 0 ? (
          filteredPosts.map(renderBlogPost)
        ) : (
          <View style={styles.noResultsContainer}>
            <MaterialCommunityIcons 
              name="magnify-close" 
              size={48} 
              color={theme.colors.secondary} 
            />
            <Text style={[styles.noResultsText, { color: theme.colors.secondary }]}>
              No blog posts found
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    margin: 16,
  },
  searchBar: {
    elevation: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  searchInput: {
    fontSize: 16,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  blogCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  authorContainer: {
    flexDirection: 'row',
  },
  authorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  blogContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
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
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dot: {
    marginHorizontal: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  readTime: {
    fontSize: 14,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  preview: {
    fontSize: 14,
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
    fontSize: 12,
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
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  webSearchInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    color: theme.colors.text,
    border: 'none',
    backgroundColor: 'transparent',
    WebkitTapHighlightColor: 'transparent',
    outlineWidth: 0,
    outlineStyle: 'none',
    boxShadow: 'none',
    borderColor: 'transparent',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BlogScreen;