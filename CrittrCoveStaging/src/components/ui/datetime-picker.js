import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../../styles/theme';

const DatetimePicker = ({ 
  format = [
    ["months", "days", "years"],
    ["hours", "minutes", "am/pm"]
  ],
  value,
  onChange,
  disabled = false,
  isInModal = false,
  error = false
}) => {
  const [selectedValues, setSelectedValues] = useState({
    months: '',
    days: '',
    years: '',
    hours: '',
    minutes: '',
    ampm: 'AM'
  });

  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  const handleSelectChange = (type, value) => {
    if (disabled) return;
    
    const newValues = { ...selectedValues, [type]: value };
    setSelectedValues(newValues);
    
    if (onChange) {
      // Convert to date object and call onChange
      const date = convertToDate(newValues);
      onChange(date);
    }
  };

  const convertToDate = (values) => {
    const { months, days, years, hours, minutes, ampm } = values;
    if (!months || !days || !years) return null;
    
    let hour = parseInt(hours || '12');
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    return new Date(
      parseInt(years),
      parseInt(months) - 1,
      parseInt(days),
      hour,
      parseInt(minutes || '0')
    );
  };

  const renderSelect = (type) => {
    let options = [];
    switch (type) {
      case 'months':
        options = Array.from({ length: 12 }, (_, i) => ({
          value: (i + 1).toString(),
          label: new Date(2000, i).toLocaleString('default', { month: 'long' })
        }));
        break;
      case 'days':
        options = Array.from({ length: 31 }, (_, i) => ({
          value: (i + 1).toString(),
          label: (i + 1).toString()
        }));
        break;
      case 'years':
        const currentYear = new Date().getFullYear();
        options = Array.from({ length: 100 }, (_, i) => ({
          value: (currentYear - 50 + i).toString(),
          label: (currentYear - 50 + i).toString()
        }));
        break;
      case 'hours':
        options = Array.from({ length: 12 }, (_, i) => ({
          value: (i + 1).toString(),
          label: (i + 1).toString()
        }));
        break;
      case 'minutes':
        options = Array.from({ length: 60 }, (_, i) => ({
          value: i.toString().padStart(2, '0'),
          label: i.toString().padStart(2, '0')
        }));
        break;
      case 'am/pm':
        options = [
          { value: 'AM', label: 'AM' },
          { value: 'PM', label: 'PM' }
        ];
        break;
    }

    const handleChange = (e) => {
      if (isInModal && Platform.OS === 'web') {
        e.stopPropagation();
      }
      handleSelectChange(type === 'am/pm' ? 'ampm' : type, e.target.value);
    };

    const selectStyle = {
      ...styles.select,
      ...(error ? styles.errorSelect : {}),
      ...(type === 'months' ? styles.monthSelect : {}),
      ...(type === 'years' ? styles.yearSelect : {}),
      ...(type === 'days' ? styles.daySelect : {})
    };

    return (
      React.createElement('select', {
        value: selectedValues[type === 'am/pm' ? 'ampm' : type],
        onChange: handleChange,
        style: selectStyle,
        disabled: disabled
      }, [
        React.createElement('option', { 
          key: 'default', 
          value: '' 
        }, type.charAt(0).toUpperCase() + type.slice(1)),
        ...options.map(option => 
          React.createElement('option', {
            key: option.value,
            value: option.value
          }, option.label)
        )
      ])
    );
  };

  return (
    <View style={styles.container}>
      {format.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((type, index) => (
            <View key={type} style={styles.selectContainer}>
              {renderSelect(type)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  selectContainer: {
    flex: 1,
  },
  select: {
    width: '100%',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    paddingRight: 8,
    cursor: 'pointer',
  },
  monthSelect: {
    flex: 1.5,
  },
  daySelect: {
    flex: 0.8,
  },
  yearSelect: {
    flex: 1.2,
  },
  errorSelect: {
    borderColor: theme.colors.danger,
  }
});

export { DatetimePicker }; 