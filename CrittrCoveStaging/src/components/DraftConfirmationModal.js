import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal, Portal, Button } from 'react-native-paper';
import { theme } from '../styles/theme';

const DraftConfirmationModal = ({ visible, onClose, onContinueExisting, onCreateNew }) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Existing Draft Found</Text>
          <Text style={styles.description}>
            Would you like to continue with the existing draft or start a new one?
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onCreateNew}
              style={styles.button}
              textColor={theme.colors.error}
            >
              Create New
            </Button>
            <Button
              mode="contained"
              onPress={onContinueExisting}
              style={styles.button}
            >
              Continue Existing
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxWidth: 500,
    alignSelf: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
  },
});

export default DraftConfirmationModal; 