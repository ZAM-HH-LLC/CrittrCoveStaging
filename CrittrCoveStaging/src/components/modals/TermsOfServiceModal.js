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
import { defaultTermsData } from '../../data/mockData';

const TermsOfServiceModal = ({ visible, onClose, termsData }) => {
  const { screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;

  const terms = termsData || defaultTermsData;

  const renderSection = (section) => {
    return (
      <View key={section.header} style={styles.section}>
        <Text style={styles.sectionHeader}>{section.header}</Text>
        
        {section.body && (
          <Text style={styles.sectionBody}>{section.body}</Text>
        )}
        
        {section.subsections && (
          section.subsections.map((subsection, index) => (
            <View key={index} style={styles.subsection}>
              <Text style={styles.subsectionTitle}>{subsection.subtitle}</Text>
              <Text style={styles.subsectionBody}>{subsection.body}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderTermsContent = () => {
    return terms.map((section, index) => renderSection(section));
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
            <Text style={styles.title}>Terms of Service</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {renderTermsContent()}
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
    alignItems: 'center',
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
  subsectionBody: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
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

export default TermsOfServiceModal; 