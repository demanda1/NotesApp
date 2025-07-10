import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SplashScreen from '../components/SplashScreen';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      // Add any app initialization logic here
      // This could include loading fonts, checking authentication, etc.
      await new Promise(resolve => setTimeout(resolve, 100)); // Minimum splash time
      setAppReady(true);
    };

    initializeApp();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        
        {/* Main App Content */}
        {appReady && (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen 
              name="add-note" 
              options={{ 
                title: 'Add Note',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                presentation: 'modal',
              }} 
            />
            <Stack.Screen 
              name="edit-note/[id]" 
              options={{ 
                title: 'Edit Note',
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                presentation: 'modal',
              }} 
            />
          </Stack>
        )}
        
        {/* Splash Screen Overlay */}
        {showSplash && appReady && (
          <SplashScreen onAnimationComplete={handleSplashComplete} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
} 