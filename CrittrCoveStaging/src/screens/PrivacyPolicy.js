import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { handleBack } from '../components/Navigation';
import { privacyPolicyData } from '../data/mockData';

const PrivacyPolicy = () => {
  const navigation = useNavigation();

  const renderSection = (section) => {
    return (
      <View key={section.title}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        
        {section.content && (
          <Text style={styles.paragraph}>{section.content}</Text>
        )}
        
        {section.listItems && (
          section.listItems.map((item, index) => (
            <Text key={index} style={styles.listItem}>• {item}</Text>
          ))
        )}
        
        {section.subsections && (
          section.subsections.map((subsection, index) => (
            <View key={index} style={styles.subsection}>
              <Text style={styles.subsectionTitle}>{subsection.subtitle}</Text>
              
              {subsection.content && (
                <Text style={styles.paragraph}>{subsection.content}</Text>
              )}
              
              {subsection.items && (
                subsection.items.map((item, itemIndex) => (
                  <Text key={itemIndex} style={styles.listItem}>• {item}</Text>
                ))
              )}
              
              {subsection.additionalInfo && (
                <Text style={styles.additionalInfo}>{subsection.additionalInfo}</Text>
              )}
            </View>
          ))
        )}
        
        {section.additionalInfo && (
          <Text style={styles.additionalInfo}>{section.additionalInfo}</Text>
        )}
        
        {section.contactInfo && (
          <View style={styles.contactInfo}>
            <Text style={styles.listItem}>{section.contactInfo.company}</Text>
            <Text style={styles.listItem}>{section.contactInfo.attention}</Text>
            <Text style={styles.listItem}>{section.contactInfo.address}</Text>
            <Text style={styles.listItem}>Email: {section.contactInfo.email}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Privacy Policy" 
        onBackPress={() => handleBack(navigation)} 
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>{privacyPolicyData.title}</Text>
        <Text style={styles.date}>Last Updated: {privacyPolicyData.lastUpdated}</Text>
        
        <Text style={styles.paragraph}>
          {privacyPolicyData.introduction}
        </Text>

        {privacyPolicyData.sections.map((section, index) => (
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
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'web' ? 16 : 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.primary,
  },
  date: {
    fontSize: 16,
    marginBottom: 20,
    color: theme.colors.text,
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
  listItem: {
    fontSize: 16,
    marginBottom: 5,
    marginLeft: 10,
    color: theme.colors.text,
  },
  subsection: {
    marginLeft: 10,
    marginTop: 10,
  },
  additionalInfo: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 5,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  contactInfo: {
    marginTop: 10,
  },
});

export default PrivacyPolicy;
