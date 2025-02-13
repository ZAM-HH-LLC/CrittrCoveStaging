import React from 'react';
import { View, Text } from 'react-native';

export default function Application({ page, pages, setAppPage }) {
  const renderPage = () => {
    switch (page) {
      case 'about':
        return <Text>About Page</Text>;
      default:
        return <Text>Home Page</Text>;
    }
  };

  return (
    <View>
      {renderPage()}
    </View>
  );
}