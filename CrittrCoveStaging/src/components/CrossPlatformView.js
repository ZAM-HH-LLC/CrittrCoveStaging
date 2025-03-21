import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, Platform, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../styles/theme';

const CrossPlatformView = ({ 
  children, 
  style,
  useSafeArea = true,
  backgroundColor = theme.colors.background,
  fullWidthHeader = false,
  contentWidth = '800px'
}) => {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const updateDimensions = () => {
        setWindowWidth(Dimensions.get('window').width);
      };

      window.addEventListener('resize', updateDimensions);
      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, []);

  // For web platform
  if (Platform.OS === 'web') {
    // Split children into header and content if fullWidthHeader is true
    const headerContent = fullWidthHeader ? children[0] : null;
    const mainContent = fullWidthHeader ? children.slice(1) : children;

    return (
      <div style={{ 
        backgroundColor,
        width: '100%',
        maxWidth: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}>
        {fullWidthHeader && (
          <div style={{ 
            width: '100%', 
            backgroundColor,
          }}>
            {headerContent}
          </div>
        )}
        <div style={{
          ...styles.webContainer,
          maxWidth: contentWidth,
          width: '100%',
          flex: 1,
          overflow: 'hidden',
        }}>
          {mainContent}
        </div>
      </div>
    );
  }

  // For iOS
  if (Platform.OS === 'ios' && useSafeArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]}>
        {children}
      </SafeAreaView>
    );
  }

  // For Android or when SafeAreaView is disabled
  return (
    <View style={[
      styles.container,
      { 
        paddingTop: useSafeArea ? StatusBar.currentHeight : 0,
        backgroundColor 
      },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  webContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '85vh',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
});

export default CrossPlatformView;