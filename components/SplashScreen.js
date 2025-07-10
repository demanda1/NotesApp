import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Logo from './Logo';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onAnimationComplete }) => {
  useEffect(() => {
    // Just show for a static duration then complete
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 2000); // Show for 2 seconds

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      
      {/* Logo Container */}
      <View style={styles.logoContainer}>
        <Logo size={140} color="#ffffff" showText={true} noShadow={true} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    zIndex: 1000,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen; 