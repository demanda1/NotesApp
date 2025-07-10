import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import fileSystemManager from '../../utils/fileSystemManager';
import settingsManager from '../../utils/settingsManager';
import SearchComponent from '../../components/SearchComponent';
const { width, height } = Dimensions.get('window');

export default function CollectionsScreen() {
  const [collections, setCollections] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [selectedIcon, setSelectedIcon] = useState('library-outline');
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit functionality
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  
  // Collection viewer modal
  const [collectionViewerVisible, setCollectionViewerVisible] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [notebooksInCollection, setNotebooksInCollection] = useState([]);
  const [availableNotebooks, setAvailableNotebooks] = useState([]);
  const [addNotebookModalVisible, setAddNotebookModalVisible] = useState(false);
  
  // Animation values
  
  const insets = useSafeAreaInsets();

  const colorOptions = [
    '#6366f1', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#6b7280', '#14b8a6', '#be185d'
  ];

  const iconCategories = {
    'Academic Subjects': [
      { name: 'History', icon: 'library-outline' },
      { name: 'Geography', icon: 'earth-outline' },
      { name: 'Science', icon: 'flask-outline' },
      { name: 'Mathematics', icon: 'calculator-outline' },
      { name: 'Literature', icon: 'book-outline' },
      { name: 'Language', icon: 'language-outline' },
      { name: 'Philosophy', icon: 'bulb-outline' },
      { name: 'Psychology', icon: 'head-outline' }
    ],
    'STEM Fields': [
      { name: 'Biology', icon: 'leaf-outline' },
      { name: 'Chemistry', icon: 'flask-outline' },
      { name: 'Physics', icon: 'nuclear-outline' },
      { name: 'Engineering', icon: 'construct-outline' },
      { name: 'Computer Science', icon: 'code-slash-outline' },
      { name: 'Astronomy', icon: 'telescope-outline' },
      { name: 'Research', icon: 'search-outline' },
      { name: 'Lab Notes', icon: 'beaker-outline' }
    ],
    'Business & Finance': [
      { name: 'Economics', icon: 'trending-up-outline' },
      { name: 'Accounting', icon: 'calculator-outline' },
      { name: 'Marketing', icon: 'megaphone-outline' },
      { name: 'Management', icon: 'people-outline' },
      { name: 'Finance', icon: 'cash-outline' },
      { name: 'Business Plan', icon: 'document-text-outline' },
      { name: 'Presentations', icon: 'easel-outline' },
      { name: 'Analytics', icon: 'stats-chart-outline' }
    ],
    'Arts & Humanities': [
      { name: 'Art History', icon: 'color-palette-outline' },
      { name: 'Music', icon: 'musical-notes-outline' },
      { name: 'Drama', icon: 'happy-outline' },
      { name: 'Creative Writing', icon: 'create-outline' },
      { name: 'Photography', icon: 'camera-outline' },
      { name: 'Design', icon: 'brush-outline' },
      { name: 'Film Studies', icon: 'film-outline' },
      { name: 'Cultural Studies', icon: 'globe-outline' }
    ],
    'Health & Medicine': [
      { name: 'Medicine', icon: 'medical-outline' },
      { name: 'Anatomy', icon: 'body-outline' },
      { name: 'Nutrition', icon: 'nutrition-outline' },
      { name: 'Pharmacy', icon: 'fitness-outline' },
      { name: 'Nursing', icon: 'heart-outline' },
      { name: 'Public Health', icon: 'shield-outline' },
      { name: 'Mental Health', icon: 'happy-outline' },
      { name: 'Exercise Science', icon: 'barbell-outline' }
    ],
    'Social Sciences': [
      { name: 'Sociology', icon: 'people-outline' },
      { name: 'Anthropology', icon: 'person-outline' },
      { name: 'Political Science', icon: 'flag-outline' },
      { name: 'Law', icon: 'scale-outline' },
      { name: 'Criminology', icon: 'shield-checkmark-outline' },
      { name: 'Social Work', icon: 'hand-left-outline' },
      { name: 'International Relations', icon: 'earth-outline' },
      { name: 'Public Policy', icon: 'documents-outline' }
    ],
    'Technology & IT': [
      { name: 'Programming', icon: 'code-slash-outline' },
      { name: 'Web Development', icon: 'globe-outline' },
      { name: 'Database', icon: 'server-outline' },
      { name: 'Cybersecurity', icon: 'lock-closed-outline' },
      { name: 'AI/ML', icon: 'hardware-chip-outline' },
      { name: 'DevOps', icon: 'git-branch-outline' },
      { name: 'Mobile Dev', icon: 'phone-portrait-outline' },
      { name: 'Cloud Computing', icon: 'cloud-outline' }
    ],
    'Personal & Lifestyle': [
      { name: 'Journal', icon: 'journal-outline' },
      { name: 'Travel', icon: 'airplane-outline' },
      { name: 'Cooking', icon: 'restaurant-outline' },
      { name: 'Fitness', icon: 'fitness-outline' },
      { name: 'Hobbies', icon: 'game-controller-outline' },
      { name: 'Goals', icon: 'trophy-outline' },
      { name: 'Ideas', icon: 'bulb-outline' },
      { name: 'Projects', icon: 'hammer-outline' }
    ]
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const collectionsData = await fileSystemManager.getNotebookCollections();
      
      // Sort collections using the settings manager
      const sortedCollections = await settingsManager.sortItems(collectionsData || []);
      
      // Always set collections, even if empty array
      setCollections(sortedCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
      Alert.alert('Error', 'Failed to load collections: ' + error.message);
      // Set empty array on error
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force complete refresh of file system manager
      await fileSystemManager.forceRefresh();
      
      // Reload collections from the hierarchy file
      await loadCollections();
      
      // If collection viewer is open, refresh that data too
      if (collectionViewerVisible && selectedCollection) {
        const notebooks = await fileSystemManager.getNotebooksInCollection(selectedCollection.id);
        setNotebooksInCollection(notebooks);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const createOrUpdateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    try {
      let result;
      
      if (isEditMode && editingCollection) {
        // Update existing collection
        result = await fileSystemManager.updateNotebookCollection(editingCollection.id, {
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim(),
          color: selectedColor,
          icon: selectedIcon
        });
      } else {
        // Create new collection
        result = await fileSystemManager.createNotebookCollection({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim(),
          color: selectedColor,
          icon: selectedIcon
        });
      }

      if (result.success) {
        Alert.alert('Success', `Collection ${isEditMode ? 'updated' : 'created'} successfully!`);
        resetModal();
        loadCollections();
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditMode ? 'update' : 'create'} collection`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} collection`);
      console.error(error);
    }
  };

  const resetModal = () => {
    setNewCollectionName('');
    setNewCollectionDescription('');
    setSelectedColor('#6366f1');
    setSelectedIcon('library-outline');
    setShowIconDropdown(false);
    setIsEditMode(false);
    setEditingCollection(null);
    setIsCreateModalVisible(false);
  };

  const handleCreateCollection = () => {
    setIsEditMode(false);
    setEditingCollection(null);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setSelectedColor('#6366f1');
    setSelectedIcon('library-outline');
    setShowIconDropdown(false);
    setIsCreateModalVisible(true);
  };

  const handleEditCollection = (collection) => {
    setIsEditMode(true);
    setEditingCollection(collection);
    setNewCollectionName(collection.name);
    setNewCollectionDescription(collection.description || '');
    setSelectedColor(collection.color || '#6366f1');
    setSelectedIcon(collection.icon || 'library-outline');
    setShowIconDropdown(false);
    setIsCreateModalVisible(true);
  };

  const deleteCollection = async (id, name) => {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${name}"? This won't delete the notebooks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await fileSystemManager.deleteNotebookCollection(id);
              if (result.success) {
                Alert.alert('Success', 'Collection deleted successfully');
                loadCollections();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete collection');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete collection');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const viewCollection = async (collection) => {
    try {
      setSelectedCollection(collection);
      const notebooks = await fileSystemManager.getNotebooksInCollection(collection.id);
      setNotebooksInCollection(notebooks);
      setCollectionViewerVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load collection contents');
      console.error(error);
    }
  };

  const openAddNotebookModal = async () => {
    try {
      const notebooks = await fileSystemManager.getAvailableNotebooks();
      // Filter out notebooks that are already in the collection
      const notebookIds = notebooksInCollection.map(nb => nb.id);
      const available = notebooks.filter(nb => !notebookIds.includes(nb.id));
      setAvailableNotebooks(available);
      setAddNotebookModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load available notebooks');
      console.error(error);
    }
  };

  const addNotebookToCollection = async (notebookId) => {
    try {
      const result = await fileSystemManager.addNotebookToCollection(selectedCollection.id, notebookId);
      if (result.success) {
        Alert.alert('Success', 'Notebook added to collection!');
        setAddNotebookModalVisible(false);
        // Refresh collection contents
        const notebooks = await fileSystemManager.getNotebooksInCollection(selectedCollection.id);
        setNotebooksInCollection(notebooks);
        // Update collection count
        setSelectedCollection(prev => ({
          ...prev,
          notebooksCount: notebooks.length
        }));
        loadCollections(); // Refresh main list
      } else {
        Alert.alert('Error', result.error || 'Failed to add notebook');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add notebook to collection');
      console.error(error);
    }
  };

  const removeNotebookFromCollection = async (notebookId) => {
    Alert.alert(
      'Remove Notebook',
      'Remove this notebook from the collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await fileSystemManager.removeNotebookFromCollection(selectedCollection.id, notebookId);
              if (result.success) {
                Alert.alert('Success', 'Notebook removed from collection');
                // Refresh collection contents
                const notebooks = await fileSystemManager.getNotebooksInCollection(selectedCollection.id);
                setNotebooksInCollection(notebooks);
                // Update collection count
                setSelectedCollection(prev => ({
                  ...prev,
                  notebooksCount: notebooks.length
                }));
                loadCollections(); // Refresh main list
              } else {
                Alert.alert('Error', result.error || 'Failed to remove notebook');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove notebook from collection');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const navigateToNotebook = (notebookId) => {
    setCollectionViewerVisible(false);
    router.push(`/notebook/${notebookId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const openSearch = () => {
    setSearchVisible(true);
  };

  const closeSearch = () => {
    setSearchVisible(false);
  };

  const handleSearchResult = (result) => {
    setSearchVisible(false);
    
    // Navigate based on result type
    switch (result.type) {
      case 'notebook':
        router.push(`/notebook/${result.id}`);
        break;
      case 'collection':
        // If it's a collection, we could view it
        break;
      case 'chapter':
        router.push(`/notebook/${result.notebookId}`);
        break;
      case 'note':
        router.push(`/notebook/${result.notebookId}`);
        break;
      default:
        console.log('Unknown result type:', result.type);
    }
  };



  const renderCollection = ({ item }) => (
    <TouchableOpacity 
      style={styles.collectionCard}
      onPress={() => viewCollection(item)}
    >
      <View style={[styles.collectionCover, { backgroundColor: item.color }]}>
        <View style={styles.bagHandle} />
        <View style={styles.bagHandleInner} />
        <View style={styles.bagBody}>
          <View style={styles.bagStrap} />
          <View style={styles.bagStrapTwo} />
          <View style={styles.bagBuckle} />
          <View style={styles.bagBuckleTwo} />
          <View style={styles.iconContainer}>
            <Ionicons 
              name={item.icon || 'library-outline'} 
              size={32} 
              color="#fff" 
            />
          </View>
        </View>
      </View>
      <View style={styles.collectionInfo}>
        <View style={styles.collectionHeader}>
          <Text style={styles.collectionName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.collectionActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditCollection(item);
              }}
            >
              <Ionicons name="pencil" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteCollection(item.id, item.name);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.collectionDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.collectionMeta}>
          <View style={styles.notebookCount}>
            <Ionicons name="book-outline" size={14} color="#6366f1" />
            <Text style={styles.notebookCountText}>
              {item.notebooksCount || 0} {(item.notebooksCount || 0) === 1 ? 'notebook' : 'notebooks'}
            </Text>
          </View>
          <Text style={styles.collectionDate}>
            Created {formatDate(item.created_at || item.lastModified)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNotebook = ({ item }) => (
    <TouchableOpacity 
      style={styles.notebookCard}
      onPress={() => navigateToNotebook(item.id)}
    >
      <View style={[styles.notebookCover, { backgroundColor: item.color }]}>
        <View style={styles.bookSpine} />
        <Ionicons 
          name={item.icon || 'book-outline'} 
          size={48} 
          color="#fff" 
        />
      </View>
      <View style={styles.notebookInfo}>
        <View style={styles.notebookHeader}>
          <Text style={styles.notebookName} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation();
              removeNotebookFromCollection(item.id);
            }}
          >
            <Ionicons name="remove-circle-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
        {item.description ? (
          <Text style={styles.notebookDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.notebookMeta}>
          <View style={styles.chapterCount}>
            <Ionicons name="document-text-outline" size={14} color="#6366f1" />
            <Text style={styles.chapterCountText}>
              {item.chaptersCount || item.note_count || 0} chapters
            </Text>
          </View>
          <Text style={styles.notebookDate}>
            Added {formatDate(item.addedToCollectionAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAvailableNotebook = ({ item }) => (
    <TouchableOpacity 
      style={styles.availableNotebookCard}
      onPress={() => addNotebookToCollection(item.id)}
    >
      <View style={styles.availableNotebookInfo}>
        <View style={[styles.notebookColorDot, { backgroundColor: item.color }]} />
        <View style={styles.notebookDetails}>
          <Text style={styles.notebookTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.notebookDescription} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.notebookStatsRow}>
            <Ionicons name="document-text-outline" size={12} color="#6b7280" />
            <Text style={styles.smallChapterCount}>
              {item.chaptersCount || 0} chapters
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.addButton}>
        <Ionicons name="add-circle" size={24} color="#6366f1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      
      {/* Custom Header with Title and Search */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        {/* Title Bar with Search */}
        <View style={styles.titleBar}>
          <View style={styles.menuButton} />
          
          <Text style={styles.headerTitle}>Collections</Text>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={openSearch}
          >
            <Ionicons name="search-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#6366f1" />
          <Text style={styles.loadingText}>Loading collections...</Text>
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            No collections yet
          </Text>
          <Text style={styles.emptySubtext}>
            Create collections to organize your notebooks
          </Text>
        </View>
      ) : (
        <FlatList
          data={collections}
          renderItem={renderCollection}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.collectionsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreateCollection}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Collection Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.createCollectionContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.createCollectionHeader, { paddingTop: insets.top }]}>
            <View style={styles.createCollectionHeaderContent}>
              <TouchableOpacity 
                onPress={resetModal} 
                style={styles.closeModalButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.createCollectionTitle}>{isEditMode ? 'Edit Collection' : 'Create Collection'}</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <ScrollView style={styles.createCollectionContent}>
            {/* Collection Name */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Collection Name *</Text>
              <TextInput
                style={styles.formInput}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Enter collection name"
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={newCollectionDescription}
                onChangeText={setNewCollectionDescription}
                placeholder="Enter collection description"
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
                {colorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColor
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Choose Icon</Text>
              <TouchableOpacity
                style={styles.iconSelector}
                onPress={() => setShowIconDropdown(!showIconDropdown)}
              >
                <View style={styles.selectedIconDisplay}>
                  <View style={[styles.iconPreview, { backgroundColor: selectedColor }]}>
                    <Ionicons name={selectedIcon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.selectedIconText}>
                    {Object.values(iconCategories)
                      .flat()
                      .find(item => item.icon === selectedIcon)?.name || 'Library'}
                  </Text>
                </View>
                <Ionicons 
                  name={showIconDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>

              {showIconDropdown && (
                <View style={styles.iconDropdown}>
                  <ScrollView 
                    style={styles.iconScrollView}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {Object.entries(iconCategories).map(([category, icons]) => (
                      <View key={category} style={styles.iconCategory}>
                        <Text style={styles.iconCategoryTitle}>{category}</Text>
                        <View style={styles.iconGrid}>
                          {icons.map((iconItem) => (
                            <TouchableOpacity
                              key={iconItem.icon}
                              style={[
                                styles.iconOption,
                                selectedIcon === iconItem.icon && styles.selectedIconOption
                              ]}
                              onPress={() => {
                                setSelectedIcon(iconItem.icon);
                                setShowIconDropdown(false);
                              }}
                            >
                              <Ionicons 
                                name={iconItem.icon} 
                                size={20} 
                                color={selectedIcon === iconItem.icon ? selectedColor : '#6b7280'} 
                              />
                              <Text style={[
                                styles.iconOptionText,
                                selectedIcon === iconItem.icon && styles.selectedIconOptionText
                              ]}>
                                {iconItem.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Create Button */}
            <TouchableOpacity 
              style={[
                styles.createButton,
                !newCollectionName.trim() && styles.createButtonDisabled
              ]}
              onPress={createOrUpdateCollection}
              disabled={!newCollectionName.trim()}
            >
              <Text style={styles.createButtonText}>{isEditMode ? 'Update Collection' : 'Create Collection'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Collection Viewer Modal */}
      <Modal
        visible={collectionViewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.viewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.viewerHeader, { paddingTop: insets.top }]}>
            <View style={styles.viewerHeaderContent}>
              <TouchableOpacity 
                onPress={() => setCollectionViewerVisible(false)} 
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.viewerTitleContainer}>
                <Text style={styles.viewerTitle} numberOfLines={1}>
                  {selectedCollection?.name}
                </Text>
                <Text style={styles.viewerSubtitle}>
                  {notebooksInCollection.length} {notebooksInCollection.length === 1 ? 'notebook' : 'notebooks'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={openAddNotebookModal}
                style={styles.addNotebookButton}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Collection Description */}
          {selectedCollection?.description ? (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                {selectedCollection.description}
              </Text>
            </View>
          ) : null}

          {/* Notebooks List */}
          {notebooksInCollection.length === 0 ? (
            <View style={styles.emptyCollectionContainer}>
              <Ionicons name="book-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyCollectionText}>No notebooks in this collection</Text>
              <Text style={styles.emptyCollectionSubtext}>Tap the + button to add notebooks</Text>
            </View>
          ) : (
            <FlatList
              data={notebooksInCollection}
              renderItem={renderNotebook}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.notebooksList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Add Notebook Modal */}
      <Modal
        visible={addNotebookModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddNotebookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addNotebookModalContent}>
            <View style={styles.addNotebookModalHeader}>
              <Text style={styles.addNotebookModalTitle}>Add Notebook</Text>
              <TouchableOpacity 
                onPress={() => setAddNotebookModalVisible(false)}
                style={styles.closeModalButton}
              >
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            
            {availableNotebooks.length === 0 ? (
              <View style={styles.noNotebooksContainer}>
                <Ionicons name="book-outline" size={48} color="#9ca3af" />
                <Text style={styles.noNotebooksText}>No available notebooks</Text>
                <Text style={styles.noNotebooksSubtext}>All notebooks are already in this collection</Text>
              </View>
            ) : (
              <FlatList
                data={availableNotebooks}
                renderItem={renderAvailableNotebook}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.availableNotebooksList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Search Component */}
      <SearchComponent
        visible={searchVisible}
        onClose={closeSearch}
        searchContext="all"
        onResultSelect={handleSearchResult}
        placeholder="Search collections, notebooks, chapters, notes..."
      />
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
  menuButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
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
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#9ca3af',
  },
  clearButton: {
    marginLeft: 8,
  },
  collectionsList: {
    padding: 16,
    paddingBottom: 100,
  },
  collectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionCover: {
    width: 80,
    height: 100,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  bagHandle: {
    position: 'absolute',
    top: -3,
    left: 20,
    width: 40,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bagHandleInner: {
    position: 'absolute',
    top: -1,
    left: 22,
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bagBody: {
    flex: 1,
    width: '100%',
    marginTop: 6,
    borderRadius: 12,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bagStrap: {
    position: 'absolute',
    top: 8,
    left: 15,
    width: 4,
    height: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 2,
  },
  bagStrapTwo: {
    position: 'absolute',
    top: 8,
    right: 15,
    width: 4,
    height: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 2,
  },
  bagBuckle: {
    position: 'absolute',
    top: 20,
    left: 12,
    width: 10,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bagBuckleTwo: {
    position: 'absolute',
    top: 20,
    right: 12,
    width: 10,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  collectionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  collectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  deleteButton: {
    padding: 4,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  collectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  notebookCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notebookCountText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
  },
  collectionDate: {
    fontSize: 11,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#1f2937',
  },
  descriptionInput: {
    height: 120,
  },
  colorSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  createButton: {
    backgroundColor: '#6366f1',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createCollectionContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  createCollectionHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  createCollectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeModalButton: {
    padding: 8,
  },
  createCollectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  createCollectionContent: {
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
    justifyContent: 'flex-start',
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
    borderColor: '#1f2937',
    borderWidth: 3,
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  selectedIconDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedIconText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  iconDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 350,
  },
  iconScrollView: {
    maxHeight: 340,
  },
  iconCategory: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    marginRight: 8,
    marginBottom: 8,
    minWidth: 80,
  },
  selectedIconOption: {
    backgroundColor: '#e0e7ff',
  },
  iconOptionText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  selectedIconOptionText: {
    color: '#4f46e5',
    fontWeight: '500',
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
  viewerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  viewerHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  viewerHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  viewerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
  viewerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  addNotebookButton: {
    padding: 8,
  },
  descriptionContainer: {
    padding: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  emptyCollectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCollectionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCollectionSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  notebooksList: {
    padding: 16,
  },
  notebookCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notebookCover: {
    width: 80,
    height: 100,
    borderRadius: 8,
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
    position: 'relative',
  },
  bookSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  notebookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  notebookName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  notebookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  notebookDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  notebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notebookDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  removeButton: {
    padding: 4,
  },
  chapterCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chapterCountText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
  },
  availableNotebookCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availableNotebookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notebookStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallChapterCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  addButton: {
    padding: 4,
  },
  addNotebookModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  addNotebookModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addNotebookModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeModalButton: {
    padding: 8,
  },
  noNotebooksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noNotebooksText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  noNotebooksSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  availableNotebooksList: {
    padding: 16,
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
}); 