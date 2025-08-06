import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import { handleBack } from '../components/Navigation';
import { AuthContext } from '../context/AuthContext';
import { defaultTermsData } from '../data/mockData';

const TermsOfService = () => {
  const navigation = useNavigation();

  const renderSection = (section) => {
    return (
      <View key={section.header}>
        <Text style={styles.sectionTitle}>{section.header}</Text>
        
        {section.body && (
          <Text style={styles.paragraph}>{section.body}</Text>
        )}
        
        {section.subsections && (
          section.subsections.map((subsection, index) => (
            <View key={index} style={styles.subsection}>
              <Text style={styles.subsectionTitle}>{subsection.subtitle}</Text>
              <Text style={styles.paragraph}>{subsection.body}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Terms of Service" 
        onBackPress={() => handleBack(navigation)} 
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Terms of Service for CrittrCove</Text>
        <Text style={styles.date}>Effective Date: {defaultTermsData.lastUpdated}</Text>
        <Text style={styles.version}>Version {defaultTermsData.version}</Text>
        
        {defaultTermsData.terms.map((section, index) => (
          renderSection(section)
        ))}
      </ScrollView>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
  },
  date: {
    fontSize: 16,
    marginBottom: 5,
    color: theme.colors.text,
  },
  version: {
    fontSize: 14,
    marginBottom: 20,
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: theme.colors.primary,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: theme.colors.primary,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 10,
    color: theme.colors.text,
  },
  subsection: {
    marginLeft: 10,
    marginTop: 10,
  },
});

export default TermsOfService;
