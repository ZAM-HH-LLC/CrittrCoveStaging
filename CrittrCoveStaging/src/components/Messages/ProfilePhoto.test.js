import React from 'react';
import { render } from '@testing-library/react-native';
import ProfilePhoto from './ProfilePhoto';

describe('ProfilePhoto Component', () => {
  test('renders an image when profilePicture is provided', () => {
    const testUrl = 'https://example.com/profile.jpg';
    const { getByTestId } = render(
      <ProfilePhoto 
        profilePicture={testUrl} 
        testID="profile-photo"
      />
    );
    
    const imageElement = getByTestId('profile-photo');
    expect(imageElement.props.source).toEqual({ uri: testUrl });
  });
  
  test('renders fallback icon when no profilePicture is provided', () => {
    const { getByTestId } = render(
      <ProfilePhoto 
        profilePicture={null}
        testID="profile-photo-fallback"
      />
    );
    
    const fallbackElement = getByTestId('profile-photo-fallback');
    expect(fallbackElement).toBeTruthy();
  });
  
  test('applies custom size correctly', () => {
    const customSize = 80;
    const { getByTestId } = render(
      <ProfilePhoto 
        profilePicture="https://example.com/profile.jpg"
        size={customSize}
        testID="profile-photo"
      />
    );
    
    const imageElement = getByTestId('profile-photo');
    expect(imageElement.props.style).toMatchObject({
      width: customSize,
      height: customSize,
      borderRadius: customSize / 2
    });
  });
}); 