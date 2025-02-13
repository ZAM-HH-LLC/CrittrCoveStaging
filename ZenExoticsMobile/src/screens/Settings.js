import React, { useContext } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, Text, TouchableOpacity, StatusBar } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import CrossPlatformView from '../components/CrossPlatformView';
import { AuthContext } from '../context/AuthContext';

const Settings = ({ navigation }) => {
  const { is_prototype } = useContext(AuthContext);
  
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
          left={props => 
            Platform.OS === 'web' 
              ? <MaterialCommunityIcons name={item.icon} size={24} color={theme.colors.primary} />
              : <List.Icon {...props} icon={item.icon} />
          }
          onPress={() => navigation.navigate(item.route)}
          style={Platform.OS === 'web' ? styles.webListItem : null}
        />
        {index < settingsItems.length - 1 && <Divider />}
      </React.Fragment>
    ));
  };

  const renderContent = () => (
    <List.Section style={styles.listSection}>
      {renderSettingsItems()}
    </List.Section>
  );

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader 
        title="Settings" 
        onBackPress={() => navigation.navigate('More')} 
      />
      {is_prototype && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Prototype Mode: Only "Change Password" is currently functional
          </Text>
        </View>
      )}
      <View style={Platform.OS === 'web' ? styles.webContent : styles.content}>
        {renderContent()}
      </View>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
  },
  listSection: {
    backgroundColor: theme.colors.surface,
  },
  webContent: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 16,
  },
  webListItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
