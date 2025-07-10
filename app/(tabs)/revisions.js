import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import fileSystemManager from '../../utils/fileSystemManager';
import settingsManager from '../../utils/settingsManager';
import storyRefreshService from '../../utils/storyRefreshService';
import StoryPage from '../../components/StoryPage';

const { width, height } = Dimensions.get('window');

export default function RevisionsScreen() {
  const [revisionNotes, setRevisionNotes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [numberOfNotes, setNumberOfNotes] = useState(2);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [autoRefreshActive, setAutoRefreshActive] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const horizontalScrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadRandomNotes();
  }, [numberOfNotes]);

  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  // Connect to story refresh service
  useEffect(() => {
    const handleStoryRefresh = (newStories) => {
      console.log('📚 Story refresh handler called with', newStories.length, 'stories');
      setRevisionNotes(newStories);
      setCurrentIndex(0);
      setLastRefreshTime(new Date());
      
      // Reset to first story
      if (horizontalScrollRef.current) {
        horizontalScrollRef.current.scrollTo({ x: 0, animated: false });
      }
      
      // Reset progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    };

    // Add listener for story changes
    storyRefreshService.addListener(handleStoryRefresh);
    
    // Check if auto refresh is active
    setAutoRefreshActive(storyRefreshService.isAutoRefreshActive());
    setLastRefreshTime(storyRefreshService.getLastRefreshTime());

    // Start story refresh service automatically
    const startStoryRefreshService = async () => {
      try {
        if (!storyRefreshService.isAutoRefreshActive()) {
          console.log('🔄 Starting story refresh service from revisions screen...');
          await storyRefreshService.startAutoRefresh();
          setAutoRefreshActive(true);
          console.log('✅ Story refresh service started successfully');
        } else {
          console.log('🔄 Story refresh service already active');
        }
      } catch (error) {
        console.error('❌ Failed to start story refresh service:', error);
      }
    };

    startStoryRefreshService();

    // Set up periodic check for auto refresh status
    const statusCheckInterval = setInterval(() => {
      const isActive = storyRefreshService.isAutoRefreshActive();
      setAutoRefreshActive(isActive);
      const lastRefresh = storyRefreshService.getLastRefreshTime();
      if (lastRefresh && lastRefresh !== lastRefreshTime) {
        setLastRefreshTime(lastRefresh);
      }
    }, 5000);

    // Cleanup
    return () => {
      storyRefreshService.removeListener(handleStoryRefresh);
      clearInterval(statusCheckInterval);
    };
  }, [lastRefreshTime]);

  const loadSettings = async () => {
    try {
      const revisionPages = await settingsManager.getRevisionPages();
      setNumberOfNotes(revisionPages);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadRandomNotes = async () => {
    try {
      setLoading(true);
      const hierarchy = await fileSystemManager.getHierarchy();
      
      if (!hierarchy || !hierarchy.structure || !hierarchy.structure.notebooks) {
        setRevisionNotes([]);
        setLoading(false);
        return;
      }

      const allNotes = [];
      
      // Collect all notes from all notebooks and chapters
      for (const [notebookId, notebook] of Object.entries(hierarchy.structure.notebooks)) {
        if (notebook.deleted) continue;
        
        for (const [chapterId, chapter] of Object.entries(notebook.chapters || {})) {
          if (chapter.deleted) continue;
          
          for (const [noteId, note] of Object.entries(chapter.notes || {})) {
            if (note.deleted) continue;
            
            allNotes.push({
              id: noteId,
              title: note.title,
              content: note.content,
              tags: note.tags || [],
              notebookTitle: notebook.title,
              chapterTitle: chapter.title,
              notebookColor: notebook.color || '#6366f1',
              created: note.created,
              lastModified: note.lastModified
            });
          }
        }
      }

      // Randomly shuffle and select notes
      const shuffled = [...allNotes].sort(() => 0.5 - Math.random());
      const selectedNotes = shuffled.slice(0, Math.min(numberOfNotes, allNotes.length));
      
      setRevisionNotes(selectedNotes);
      setCurrentIndex(0);
      
      // Reset progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
      
    } catch (error) {
      console.error('Failed to load random notes:', error);
      Alert.alert('Error', 'Failed to load notes for revision');
    } finally {
      setLoading(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < revisionNotes.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      if (horizontalScrollRef.current) {
        horizontalScrollRef.current.scrollTo({ x: nextIndex * width, animated: true });
      }
      
      // Reset progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      
      if (horizontalScrollRef.current) {
        horizontalScrollRef.current.scrollTo({ x: prevIndex * width, animated: true });
      }
      
      // Reset progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleHorizontalScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < revisionNotes.length) {
      setCurrentIndex(newIndex);
      
      // Reset progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const refreshNotes = async () => {
    try {
      setLoading(true);
      console.log('🔄 Manual refresh triggered');
      
      // First reload settings to ensure we have the latest configuration
      await loadSettings();
      console.log('⚙️ Settings reloaded');
      
      const newStories = await storyRefreshService.manualRefresh();
      if (newStories.length === 0) {
        console.log('📚 No stories from service, loading directly');
        await loadRandomNotes();
      } else {
        console.log('✅ Manual refresh completed with', newStories.length, 'stories');
      }
    } catch (error) {
      console.error('Manual refresh failed, falling back to direct loading:', error);
      await loadRandomNotes();
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {revisionNotes.map((_, index) => (
        <View key={index} style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: index === currentIndex 
                  ? progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    })
                  : index < currentIndex ? '100%' : '0%'
              }
            ]}
          />
        </View>
      ))}
    </View>
  );


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <Ionicons name="book-outline" size={48} color="#6366f1" />
        <Text style={styles.loadingText}>Loading revision notes...</Text>
      </View>
    );
  }

  if (revisionNotes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <Ionicons name="library-outline" size={64} color="#6b7280" />
        <Text style={styles.emptyTitle}>No Notes Found</Text>
        <Text style={styles.emptyText}>
          Create some notes in your notebooks to start revision
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshNotes}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.refreshButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={revisionNotes[currentIndex]?.notebookColor || '#6366f1'} />
      
      {/* Progress Bar */}
      <View style={[styles.topSection, { paddingTop: insets.top }]}>
        {renderProgressBar()}
        
        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.headerRefreshButton} 
          onPress={refreshNotes}
          disabled={loading}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Horizontal ScrollView for Stories */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleHorizontalScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScrollView}
        contentContainerStyle={styles.horizontalScrollContent}
        bounces={false}
        scrollEnabled={true}
      >
        {revisionNotes.map((note, index) => (
          <StoryPage
            key={note.id}
            note={note}
            index={index}
            currentIndex={currentIndex}
            isActive={index === currentIndex}
          />
        ))}
      </ScrollView>

      {/* Edge Tap Areas for Navigation */}
      <View style={styles.edgeTapAreasContainer}>
        <TouchableOpacity 
          style={styles.tapAreaLeft} 
          onPress={goToPrevious}
          disabled={currentIndex === 0}
        />
        <TouchableOpacity 
          style={styles.tapAreaRight} 
          onPress={goToNext}
          disabled={currentIndex === revisionNotes.length - 1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 16,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  headerRefreshButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  edgeTapAreasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  tapAreaLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'transparent',
  },
  tapAreaRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'transparent',
  },
});
