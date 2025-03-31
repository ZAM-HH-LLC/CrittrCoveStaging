import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';

const TabBar = ({ tabs, activeTab, onTabPress, isMobile }) => {
  return (
    <ScrollView 
      horizontal={isMobile}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        isMobile && styles.mobileContainer
      ]}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.activeTab,
            isMobile && styles.mobileTab
          ]}
          onPress={() => onTabPress(tab.id)}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText,
            isMobile && styles.mobileTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  mobileContainer: {
    padding: 4,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  mobileTab: {
    flex: 0,
    minWidth: 150,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts?.regular?.fontFamily,
  },
  mobileTabText: {
    fontSize: 14,
  },
  activeTabText: {
    color: theme.colors.whiteText || theme.colors.background,
  },
});

export default TabBar; 