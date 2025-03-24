import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Text, TouchableOpacity, StatusBar } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { AuthContext } from '../context/AuthContext';

const Settings = ({ navigation }) => {
  const { screenWidth, isCollapsed, is_DEBUG } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const styles = createStyles(screenWidth, isCollapsed);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
    };
    updateLayout();
  }, [screenWidth]);

  const settingsItems = [
    { title: 'Change Password', icon: 'lock-reset', route: 'ChangePassword' },
    { title: 'Notification Preferences', icon: 'bell-outline', route: 'NotificationPreferences' },
    { title: 'Privacy Settings', icon: 'shield-account', route: 'PrivacySettings' },
    { title: 'Language', icon: 'translate', route: 'LanguageSettings' },
    { title: 'Display & Accessibility', icon: 'palette', route: 'DisplaySettings' },
    { title: 'Data Usage', icon: 'chart-bar', route: 'DataUsage' },
    { title: 'About', icon: 'information-outline', route: 'About' },
  ];

  const renderSettingsItems = () => {
    return settingsItems.map((item, index) => (
      <React.Fragment key={index}>
        <List.Item
          title={item.title}
          titleStyle={styles.listItemTitle}
          left={props => 
            Platform.OS === 'web' 
              ? <MaterialCommunityIcons 
                  name={item.icon} 
                  size={screenWidth <= 900 ? 20 : 24} 
                  color={theme.colors.primary} 
                />
              : <List.Icon {...props} icon={item.icon} />
          }
          onPress={() => navigation.navigate(item.route)}
          style={[
            styles.webListItem,
            { paddingHorizontal: screenWidth <= 900 ? 8 : 16 }
          ]}
        />
        {index < settingsItems.length - 1 && <Divider />}
      </React.Fragment>
    ));
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {isMobile && (
            <BackHeader 
              title="Settings" 
              onBackPress={() => navigation.navigate('More')} 
            />
          )}
          <View style={styles.webContent}>
            <List.Section style={styles.listSection}>
              {renderSettingsItems()}
            </List.Section>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    height: '100vh',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
    transition: 'margin-left 0.3s ease',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  listSection: {
    backgroundColor: theme.colors.surface,
  },
  webContent: {
    width: '100%',
    maxWidth: screenWidth > 900 ? 800 : 600,
    alignSelf: 'center',
    padding: screenWidth <= 900 ? 10 : 16,
  },
  webListItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: screenWidth <= 900 ? 8 : 12,
  },
  listItemTitle: {
    fontSize: screenWidth <= 900 ? theme.fontSizes.medium : theme.fontSizes.large,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: theme.spacing.small,
    marginHorizontal: theme.spacing.small,
    marginTop: theme.spacing.small,
    borderRadius: 4,
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
  },
});

export default Settings;
