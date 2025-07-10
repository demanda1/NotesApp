import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const Logo = ({ size = 80, color = '#6366f1', showText = true, style, noShadow = false }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.logoContainer, 
        { width: size, height: size },
        noShadow && styles.noShadow
      ]}>
        <Image 
          source={require('../assets/images/notesapplogo.png')}
          style={[
            styles.logoImage, 
            { width: size * 0.8, height: size * 0.8 },
            noShadow && styles.noImageShadow
          ]}
          resizeMode="contain"
        />
      </View>
      {showText && (
        <Text style={[
          styles.appName, 
          { color },
          noShadow && styles.noTextShadow
        ]}>
          NotesApp
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 8,
  },
  noShadow: {
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
  },
  logoImage: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  noImageShadow: {
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  noTextShadow: {
    textShadowColor: 'transparent',
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: 0,
  },
});

export default Logo; 