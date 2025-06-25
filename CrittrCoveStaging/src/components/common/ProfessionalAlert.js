import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const ProfessionalAlert = ({ isProfessional, fromApprovalModal = false }) => {
  if (!isProfessional || fromApprovalModal) return null;

  return (
    <View style={styles.alertContainer}>
      <View style={styles.alertHeader}>
        <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.error} />
        <Text style={styles.alertBold}>Professional Reminders</Text>
      </View>
      <Text style={styles.alertText}>
        • <Text style={styles.alertText}>Collect payment from your client before the booking begins</Text>
      </Text>
      <Text style={styles.alertText}>
        • Consider scheduling a meet-and-greet before confirming this booking to ensure compatibility and discuss specific care requirements
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  alertContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertBold: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  alertText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ProfessionalAlert; 