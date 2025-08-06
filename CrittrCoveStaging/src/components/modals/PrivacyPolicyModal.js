import React, { useContext } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';
import { privacyPolicyData } from '../../data/mockData';

const PrivacyPolicyModal = ({ visible, onClose, privacyData }) => {
  const { screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;

  const privacy = privacyData || privacyPolicyData;

  const renderSubsection = (subsection) => {
    return (
      <View key={subsection.subtitle} style={styles.subsection}>
        <Text style={styles.subsectionTitle}>{subsection.subtitle}</Text>
        {subsection.content && (
          <Text style={styles.subsectionContent}>{subsection.content}</Text>
        )}
        {subsection.items && (
          subsection.items.map((item, index) => (
            <Text key={index} style={styles.listItem}>• {item}</Text>
          ))
        )}
      </View>
    );
  };

  const renderSection = (section) => {
    return (
      <View key={section.title} style={styles.section}>
        <Text style={styles.sectionHeader}>{section.title}</Text>
        
        {section.content && (
          <Text style={styles.sectionBody}>{section.content}</Text>
        )}
        
        {section.listItems && (
          section.listItems.map((item, index) => (
            <Text key={index} style={styles.listItem}>• {item}</Text>
          ))
        )}
        
        {section.subsections && (
          section.subsections.map((subsection, index) => renderSubsection(subsection))
        )}
        
        {section.additionalInfo && (
          <Text style={styles.additionalInfo}>{section.additionalInfo}</Text>
        )}
        
        {section.contactInfo && (
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>{section.contactInfo.company}</Text>
            <Text style={styles.contactText}>{section.contactInfo.attention}</Text>
            <Text style={styles.contactText}>{section.contactInfo.address}</Text>
            <Text style={styles.contactText}>{section.contactInfo.email}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPrivacyContent = () => {
    return (
      <>
        <Text style={styles.introduction}>{privacy.introduction}</Text>
        {privacy.sections.map((section, index) => renderSection(section))}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[
          styles.container, 
          isDesktop ? styles.desktopContainer : {}
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{privacy.title}</Text>
              <Text style={styles.lastUpdated}>Last Updated: {privacy.lastUpdated}</Text>
              <Text style={styles.version}>Version {privacy.version}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {renderPrivacyContent()}
          </ScrollView>
          
          {/* Footer */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[styles.button, styles.closeFooterButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    margin: Platform.OS === 'web' ? 0 : 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  desktopContainer: {
    maxWidth: 800,
    maxHeight: '90%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  lastUpdated: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 2,
  },
  version: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  introduction: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
    marginBottom: 4,
    marginLeft: 8,
  },
  subsection: {
    marginTop: 12,
    marginLeft: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 4,
  },
  subsectionContent: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
    marginBottom: 8,
  },
  additionalInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  contactInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 20,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFooterButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default PrivacyPolicyModal;