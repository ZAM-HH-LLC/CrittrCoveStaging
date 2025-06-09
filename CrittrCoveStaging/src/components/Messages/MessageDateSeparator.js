import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

/**
 * Renders a date separator between message groups
 */
const MessageDateSeparator = ({ date }) => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{date}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dateContainer: {
    paddingHorizontal: 12,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default MessageDateSeparator; 