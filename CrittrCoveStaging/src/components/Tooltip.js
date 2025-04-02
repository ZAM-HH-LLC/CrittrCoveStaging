import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { theme } from '../styles/theme';

const Tooltip = ({ children, content, position = 'right' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)}>
        {children}
      </TouchableOpacity>
      <Modal
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.tooltipContainer, styles[position]]}>
              <View style={styles.tooltipHeader}>
                <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tooltipText}>{content}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.medium,
    borderRadius: 8,
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  right: {
    marginLeft: theme.spacing.medium,
  },
  left: {
    marginRight: theme.spacing.medium,
  },
  top: {
    marginBottom: theme.spacing.medium,
  },
  bottom: {
    marginTop: theme.spacing.medium,
  },
  tooltipHeader: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.small,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.text,
    lineHeight: 20,
  },
});

export default Tooltip; 