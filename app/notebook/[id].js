import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  StatusBar,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import fileSystemManager from '../../utils/fileSystemManager';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

export default function ChapterScreen() {
  const { id: notebookId } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(false);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(false);
  const [createChapterModalVisible, setCreateChapterModalVisible] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [notebook, setNotebook] = useState(null);
  const [chapterName, setChapterName] = useState('');
  const [chapterDescription, setChapterDescription] = useState('');
  const [selectedChapterColor, setSelectedChapterColor] = useState('#6366f1');
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Animation values
  const leftSlideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const rightSlideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadNotebookAndChapters();
  }, [notebookId]);

  const loadNotebookAndChapters = async () => {
    try {
      setLoading(true);
      
      // Load notebook details
      const hierarchy = await fileSystemManager.getHierarchy();
      if (hierarchy && hierarchy.structure && hierarchy.structure.notebooks[notebookId]) {
        setNotebook(hierarchy.structure.notebooks[notebookId]);
      }
      
      // Load chapters
      await loadChapters();
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to load notebook');
      console.error(error);
    }
  };

  const loadChapters = async () => {
    try {
      const chaptersData = await fileSystemManager.getChapters(notebookId);
      setChapters(chaptersData);
    } catch (error) {
      console.error('Failed to load chapters:', error);
      Alert.alert('Error', 'Failed to load chapters');
      setChapters([]);
    }
  };

  const createChapter = async () => {
    if (!chapterName.trim()) {
      Alert.alert('Error', 'Please enter a chapter name');
      return;
    }

    try {
      let result;
      
      if (isEditMode && editingChapter) {
        // Update existing chapter
        result = await fileSystemManager.updateChapter(notebookId, editingChapter.id, {
          title: chapterName.trim(),
          description: chapterDescription.trim(),
          color: selectedChapterColor,
          chapterNumber: selectedChapterNumber
        });
      } else {
        // Create new chapter
        result = await fileSystemManager.createChapter(notebookId, {
          title: chapterName.trim(),
          description: chapterDescription.trim(),
          color: selectedChapterColor,
          chapterNumber: selectedChapterNumber
        });
      }

      if (result.success) {
        Alert.alert('Success', isEditMode ? 'Chapter updated successfully!' : 'Chapter created successfully!');
        
        // Reset form
        setChapterName('');
        setChapterDescription('');
        setSelectedChapterColor('#6366f1');
        setSelectedChapterNumber(1);
        setEditingChapter(null);
        setIsEditMode(false);
        setCreateChapterModalVisible(false);
        
        // Reload chapters
        await loadChapters();
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditMode ? 'update' : 'create'} chapter`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} chapter`);
      console.error(error);
    }
  };

  const handleEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setIsEditMode(true);
    setChapterName(chapter.title);
    setChapterDescription(chapter.description || '');
    setSelectedChapterColor(chapter.color);
    setSelectedChapterNumber(chapter.chapterNumber || 1);
    setCreateChapterModalVisible(true);
  };

  const handleCreateChapter = () => {
    setEditingChapter(null);
    setIsEditMode(false);
    setChapterName('');
    setChapterDescription('');
    setSelectedChapterColor('#6366f1');
    setSelectedChapterNumber(1);
    setCreateChapterModalVisible(true);
  };

  const handleDeleteChapter = (chapter) => {
    setChapterToDelete(chapter);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteChapter = async () => {
    if (!chapterToDelete) return;

    try {
      const result = await fileSystemManager.softDeleteChapter(notebookId, chapterToDelete.id);
      
      if (result.success) {
        Alert.alert('Success', 'Chapter moved to recycle bin');
        await loadChapters();
        setDeleteConfirmVisible(false);
        setChapterToDelete(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete chapter');
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      Alert.alert('Error', 'Failed to delete chapter');
    }
  };

  const cancelDeleteChapter = () => {
    setDeleteConfirmVisible(false);
    setChapterToDelete(null);
  };

  const getChapterIcon = (color) => {
    const colorToIcon = {
      '#6366f1': 'document-text-outline',
      '#10b981': 'leaf-outline',
      '#f59e0b': 'star-outline',
      '#ef4444': 'heart-outline',
      '#8b5cf6': 'diamond-outline',
      '#06b6d4': 'water-outline'
    };
    return colorToIcon[color] || 'document-text-outline';
  };

  const chapterColorOptions = [
    '#6366f1', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#6b7280', '#14b8a6', '#be185d'
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const slideInLeft = () => {
    setLeftSidebarVisible(true);
    Animated.parallel([
      Animated.timing(leftSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const slideInRight = () => {
    setRightSidebarVisible(true);
    Animated.parallel([
      Animated.timing(rightSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const slideOut = () => {
    Animated.parallel([
      Animated.timing(leftSlideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rightSlideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLeftSidebarVisible(false);
      setRightSidebarVisible(false);
    });
  };

  const handleHamburgerMenu = () => {
    slideInLeft();
  };

  const handleKebabMenu = () => {
    slideInRight();
  };

  const closeSidebars = () => {
    slideOut();
  };

  const filteredChapters = chapters.filter(chapter =>
    chapter.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChapter = ({ item }) => (
    <TouchableOpacity 
      style={styles.chapterCard}
      onPress={() => router.push(`/notes/${item.notebookId}/${item.id}`)}
    >
      <TouchableOpacity 
        style={styles.editChapterIconContainer}
        onPress={(e) => {
          e.stopPropagation();
          handleEditChapter(item);
        }}
      >
        <Ionicons name="pencil" size={16} color="#6366f1" />
      </TouchableOpacity>
      
      <View style={[styles.chapterIcon, { backgroundColor: item.color }]}>
        <Text style={styles.chapterNumberDisplay}>
          {item.chapterNumber || 1}
        </Text>
      </View>
      <View style={styles.chapterInfo}>
        <View style={styles.chapterHeader}>
          <Text style={styles.chapterName} numberOfLines={1}>
            {item.title}
          </Text>
          <TouchableOpacity 
            style={styles.deleteChapterButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteChapter(item);
            }}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
        {item.description ? (
          <Text style={styles.chapterDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.chapterMeta}>
          <View style={styles.noteCount}>
            <Ionicons name="document-outline" size={12} color="#6366f1" />
            <Text style={styles.noteCountText}>
              {item.notesCount || 0} notes
            </Text>
          </View>
          <Text style={styles.chapterDate}>
            {formatDate(item.created)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      
      {/* Custom Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        {/* Title Bar with Back Button */}
        <View style={styles.titleBar}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {notebook?.title || 'Notebook'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {chapters.length} chapters
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleKebabMenu}
          >
            <Ionicons name="ellipsis-vertical-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chapters..."
            placeholderTextColor="#9ca3af"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#6366f1" />
          <Text style={styles.loadingText}>Loading chapters...</Text>
        </View>
      ) : filteredChapters.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No chapters found' : 'No chapters yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Tap the + button to create your first chapter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChapters}
          renderItem={renderChapter}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.chaptersList}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.chapterRow}
        />
      )}
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreateChapter}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Animated Overlay and Sidebars */}
      {(leftSidebarVisible || rightSidebarVisible) && (
        <View style={styles.modalContainer}>
          {/* Animated Overlay */}
          <Animated.View 
            style={[
              styles.modalBackground,
              {
                opacity: overlayOpacity,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.overlayTouchable}
              onPress={closeSidebars}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Right Sidebar */}
          {rightSidebarVisible && (
            <Animated.View 
              style={[
                styles.rightSidebar,
                {
                  transform: [{ translateX: rightSlideAnim }],
                }
              ]}
            >
              <View style={[styles.sidebarHeader, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.sidebarTitle}>Options</Text>
                <TouchableOpacity onPress={closeSidebars} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.sidebarContent}>
                <TouchableOpacity style={styles.sidebarItem}>
                  <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                  <Text style={styles.sidebarItemText}>Sort by Date</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.sidebarItem}>
                  <Ionicons name="filter-outline" size={20} color="#6366f1" />
                  <Text style={styles.sidebarItemText}>Filter Chapters</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      {/* Create Chapter Modal */}
      <Modal
        visible={createChapterModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.createChapterContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.createChapterHeader, { paddingTop: insets.top }]}>
            <View style={styles.createChapterHeaderContent}>
              <TouchableOpacity 
                onPress={() => setCreateChapterModalVisible(false)} 
                style={styles.closeModalButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.createChapterTitle}>{isEditMode ? 'Edit Chapter' : 'Create Chapter'}</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <ScrollView style={styles.createChapterContent}>
            {/* Chapter Name */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Chapter Name *</Text>
              <TextInput
                style={styles.formInput}
                value={chapterName}
                onChangeText={setChapterName}
                placeholder="Enter chapter name"
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={chapterDescription}
                onChangeText={setChapterDescription}
                placeholder="Enter chapter description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Color Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Choose Color</Text>
              <View style={styles.colorGrid}>
                {chapterColorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedChapterColor === color && styles.selectedColor
                    ]}
                    onPress={() => setSelectedChapterColor(color)}
                  >
                    {selectedChapterColor === color && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chapter Number Input */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Chapter Number (Chronology)</Text>
              <TextInput
                style={styles.formInput}
                value={selectedChapterNumber.toString()}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  if (numericValue === '') {
                    setSelectedChapterNumber(1);
                  } else {
                    const number = parseInt(numericValue);
                    if (number >= 1 && number <= 999) {
                      setSelectedChapterNumber(number);
                    }
                  }
                }}
                placeholder="Enter chapter number (1-999)"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            {/* Create Button */}
            <TouchableOpacity 
              style={[
                styles.createButton,
                !chapterName.trim() && styles.createButtonDisabled
              ]}
              onPress={createChapter}
              disabled={!chapterName.trim()}
            >
              <Text style={styles.createButtonText}>{isEditMode ? 'Update Chapter' : 'Create Chapter'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" style={styles.deleteModalIcon} />
            <Text style={styles.deleteModalTitle}>Delete Chapter</Text>
            <Text style={styles.deleteModalMessage}>
              Do you really want to delete this chapter?{'\n'}
              "{chapterToDelete?.title}"
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This chapter will be moved to the recycle bin.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.deleteModalCancelButton}
                onPress={cancelDeleteChapter}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteChapter}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#c7d2fe',
    textAlign: 'center',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    marginLeft: 8,
  },
  chaptersList: {
    padding: 16,
    paddingBottom: 100,
  },
  chapterRow: {
    justifyContent: 'space-between',
  },
  chapterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: (width - 48) / 2,
    position: 'relative',
  },
  editChapterIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    zIndex: 1,
  },
  chapterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chapterName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 4,
  },
  deleteChapterButton: {
    padding: 2,
  },
  chapterDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 16,
  },
  chapterMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  noteCountText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 2,
  },
  chapterDate: {
    fontSize: 9,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  rightSidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  createChapterContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  createChapterHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  createChapterHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeModalButton: {
    padding: 8,
  },
  createChapterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  createChapterContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  chapterNumberDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  deleteModalIcon: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteModalSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  deleteModalConfirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
}); 