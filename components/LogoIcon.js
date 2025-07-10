import React from 'react';
import { Image, StyleSheet } from 'react-native';

const LogoIcon = ({ size = 32, style }) => {
  return (
    <Image 
      source={require('../assets/images/notesapplogo.png')}
      style={[
        styles.logoIcon, 
        { width: size, height: size },
        style
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  logoIcon: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default LogoIcon; 