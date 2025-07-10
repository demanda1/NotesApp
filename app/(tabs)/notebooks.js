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
  Easing,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import fileSystemManager from '../../utils/fileSystemManager';
import settingsManager from '../../utils/settingsManager';
import SidebarMenu from "../../components/SidebarMenu";
import FileSystemDemo from '../../components/FileSystemDemo';
import SearchComponent from '../../components/SearchComponent';

const { width, height } = Dimensions.get('window');

export default function NotebooksScreen() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(false);
  const [fileSystemDemoVisible, setFileSystemDemoVisible] = useState(false);
  const [createNotebookModalVisible, setCreateNotebookModalVisible] = useState(false);
  const [notebooks, setNotebooks] = useState([]);
  const [notebookName, setNotebookName] = useState('');
  const [notebookDescription, setNotebookDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [selectedIcon, setSelectedIcon] = useState('book-outline');
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState(null);
  const [recycleBinVisible, setRecycleBinVisible] = useState(false);
  const [deletedNotebooks, setDeletedNotebooks] = useState([]);
  const [editingNotebook, setEditingNotebook] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Export modal states
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState('collections'); // 'collections' or 'notebooks'
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [availableChapters, setAvailableChapters] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Animation values
  
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      loadNotebooks();
    }, [])
  );

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Initialize file system manager
      const fsInitialized = await fileSystemManager.initialize();
      if (!fsInitialized) {
        console.warn('File system manager initialization failed');
        Alert.alert('Warning', 'File system initialization failed. Some features may not work properly.');
      }
      
      // Load notebooks from file system
      await loadNotebooks();
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to initialize app');
      console.error(error);
    }
  };

  const loadNotebooks = async () => {
    try {
      const hierarchy = await fileSystemManager.getHierarchy();
      
      if (hierarchy && hierarchy.structure && hierarchy.structure.notebooks) {
        // Convert file system notebooks to array format and filter out deleted ones
        const notebooksArray = await Promise.all(
          Object.entries(hierarchy.structure.notebooks)
            .filter(([id, notebook]) => !notebook.deleted) // Filter out deleted notebooks
            .map(async ([id, notebook]) => {
              // Get collections for this notebook
              const collections = await fileSystemManager.getCollectionsForNotebook(id);
              
              return {
                id: id,
                name: notebook.title,
                description: notebook.description || '',
                color: notebook.color || '#6366f1',
                icon: notebook.icon || 'book-outline',
                created_at: notebook.created,
                updated_at: notebook.lastModified,
                note_count: notebook.chaptersCount || 0, // Use chaptersCount instead of notesCount
                collections: collections // Add collections info
              };
            })
        );
        
        // Sort using the settings manager
        const sortedNotebooks = await settingsManager.sortItems(notebooksArray);
        
        setNotebooks(sortedNotebooks);
      } else {
        setNotebooks([]);
      }
    } catch (error) {
      console.error('Failed to load notebooks from file system:', error);
      Alert.alert('Error', 'Failed to load notebooks: ' + error.message);
      setNotebooks([]);
    }
  };

  const loadDeletedNotebooks = async () => {
    try {
      const deletedNotebooksData = await fileSystemManager.getDeletedNotebooks();
      setDeletedNotebooks(deletedNotebooksData.map((notebook) => ({
        id: notebook.id,
        name: notebook.title,
        description: notebook.description || '',
        color: notebook.color || '#6366f1',
        icon: notebook.icon || 'book-outline',
        created_at: notebook.created,
        updated_at: notebook.lastModified,
        deleted_at: notebook.deletedAt,
        note_count: notebook.chaptersCount || 0 // Use chaptersCount instead of notesCount
      })));
    } catch (error) {
      console.error('Failed to load deleted notebooks:', error);
      setDeletedNotebooks([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force complete refresh of file system manager
      await fileSystemManager.forceRefresh();
      
      // Reload notebooks from the hierarchy file
      await loadNotebooks();
      
      // Also reload deleted notebooks if the recycle bin is open
      if (recycleBinVisible) {
        await loadDeletedNotebooks();
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };



  const handleDeleteNotebook = (notebook) => {
    setNotebookToDelete(notebook);
    setDeleteConfirmVisible(true);
  };

  const handleEditNotebook = (notebook) => {
    setEditingNotebook(notebook);
    setIsEditMode(true);
    setNotebookName(notebook.name);
    setNotebookDescription(notebook.description || '');
    setSelectedColor(notebook.color);
    setSelectedIcon(notebook.icon);
    setShowIconDropdown(false);
    setCreateNotebookModalVisible(true);
  };

  const handleCreateNotebook = () => {
    setEditingNotebook(null);
    setIsEditMode(false);
    setNotebookName('');
    setNotebookDescription('');
    setSelectedColor('#6366f1');
    setSelectedIcon('book-outline');
    setShowIconDropdown(false);
    setCreateNotebookModalVisible(true);
  };

  const createNotebook = async () => {
    if (!notebookName.trim()) {
      Alert.alert('Error', 'Please enter a notebook name');
      return;
    }

    try {
      let result;
      
      if (isEditMode && editingNotebook) {
        // Update existing notebook
        result = await fileSystemManager.updateNotebook(editingNotebook.id, {
          title: notebookName.trim(),
          description: notebookDescription.trim(),
          color: selectedColor,
          icon: selectedIcon
        });
      } else {
        // Create new notebook
        result = await fileSystemManager.createNotebook({
          title: notebookName.trim(),
          description: notebookDescription.trim(),
          tags: [],
          color: selectedColor,
          icon: selectedIcon
        });
      }

      if (result.success) {
        Alert.alert('Success', isEditMode ? 'Notebook updated successfully!' : 'Notebook created successfully!');
        
        // Reset form
        setNotebookName('');
        setNotebookDescription('');
        setSelectedColor('#6366f1');
        setSelectedIcon('book-outline');
        setShowIconDropdown(false);
        setEditingNotebook(null);
        setIsEditMode(false);
        setCreateNotebookModalVisible(false);
        
        // Reload notebooks from file system
        await loadNotebooks();
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditMode ? 'update' : 'create'} notebook`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} notebook`);
      console.error(error);
    }
  };



  const getChapterCountText = (count) => {
    if (count === 0) return 'No chapters';
    if (count === 1) return '1 chapter';
    return `${count} chapters`;
  };

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openSearch = () => {
    setSearchVisible(true);
  };

  const closeSearch = () => {
    setSearchVisible(false);
  };

  const openCollections = () => {
    router.push('/collections');
  };

  const handleSearchResult = (result) => {
    setSearchVisible(false);
    
    // Navigate based on result type
    switch (result.type) {
      case 'notebook':
        router.push(`/notebook/${result.id}`);
        break;
      case 'collection':
        router.push(`/collections`);
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

  const confirmDeleteNotebook = async () => {
    if (!notebookToDelete) return;

    try {
      const result = await fileSystemManager.softDeleteNotebook(notebookToDelete.id);
      
      if (result.success) {
        Alert.alert('Success', 'Notebook moved to recycle bin');
        await loadNotebooks(); // Reload notebooks to update the list
        setDeleteConfirmVisible(false);
        setNotebookToDelete(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete notebook');
      }
    } catch (error) {
      console.error('Error deleting notebook:', error);
      Alert.alert('Error', 'Failed to delete notebook');
    }
  };

  const cancelDeleteNotebook = () => {
    setDeleteConfirmVisible(false);
    setNotebookToDelete(null);
  };

  const restoreNotebook = async (notebookId) => {
    try {
      const result = await fileSystemManager.restoreNotebook(notebookId);
      
      if (result.success) {
        Alert.alert('Success', 'Notebook restored successfully');
        await loadNotebooks();
        await loadDeletedNotebooks();
      } else {
        Alert.alert('Error', result.error || 'Failed to restore notebook');
      }
    } catch (error) {
      console.error('Error restoring notebook:', error);
      Alert.alert('Error', 'Failed to restore notebook');
    }
  };

  const permanentlyDeleteNotebook = async (notebookId) => {
    Alert.alert(
      'Permanent Delete',
      'Are you sure you want to permanently delete this notebook? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await fileSystemManager.permanentlyDeleteNotebook(notebookId);
              
              if (result.success) {
                Alert.alert('Success', 'Notebook permanently deleted');
                await loadDeletedNotebooks();
              } else {
                Alert.alert('Error', result.error || 'Failed to permanently delete notebook');
              }
            } catch (error) {
              console.error('Error permanently deleting notebook:', error);
              Alert.alert('Error', 'Failed to permanently delete notebook');
            }
          }
        }
      ]
    );
  };

  const openRecycleBin = async () => {
    await loadDeletedNotebooks();
    setRecycleBinVisible(true);
  };


  const handleHamburgerMenu = () => {
    setLeftSidebarVisible(true);
  };

  const closeSidebars = () => {
    setLeftSidebarVisible(false);
  };
  const handleMenuAction = (action, message) => {
    setTimeout(async () => {
      if (action === 'Export Notes') {
        await openExportModal();
      } else if (action === 'Backup & Restore') {
        setFileSystemDemoVisible(true);
      } else if (action === 'Settings') {
        router.push('/settings');
      } else {
        Alert.alert(action, message);
      }
    }, 300);
  };

  // Generate menu items for the sidebar
  const getMenuItems = () => [
    {
      icon: "download-outline",
      label: "Export Notes",
      color: "#6366f1",
      action: () => handleMenuAction("Export Notes", "Export all notes to file...")
    },
    {
      icon: "folder-outline",
      label: "Backup & Restore",
      color: "#10b981",
      action: () => handleMenuAction("Backup & Restore", "Show backup & restore options...")
    },
    {
      icon: "trash-outline",
      label: "Recycle Bin",
      color: "#ef4444",
      action: () => {
        closeSidebars();
        openRecycleBin();
      }
    },
    { type: "divider" },
    {
      icon: "settings-outline",
      label: "Settings",
      color: "#6366f1",
      action: () => handleMenuAction("Settings", "App settings and preferences...")
    }
  ];

  const openExportModal = async () => {
    try {
      // Load available collections
      const collectionsData = await fileSystemManager.getNotebookCollections();
      setAvailableCollections(collectionsData);
      
      // Reset export state
      setExportType('collections');
      setSelectedCollections([]);
      setSelectedNotebooks([]);
      setSelectedChapters([]);
      setAvailableChapters([]);
      
      setExportModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load export data');
      console.error(error);
    }
  };

  const handleExportTypeChange = (type) => {
    setExportType(type);
    setSelectedCollections([]);
    setSelectedNotebooks([]);
    setSelectedChapters([]);
    setAvailableChapters([]);
  };

  const handleCollectionSelection = (collection) => {
    setSelectedCollections(prev => {
      const isSelected = prev.some(c => c.id === collection.id);
      if (isSelected) {
        return prev.filter(c => c.id !== collection.id);
      } else {
        return [...prev, collection];
      }
    });
  };

  const handleNotebookSelection = async (notebook) => {
    const isSelected = selectedNotebooks.some(n => n.id === notebook.id);
    
    if (isSelected) {
      // Remove notebook and its chapters
      setSelectedNotebooks(prev => prev.filter(n => n.id !== notebook.id));
      setSelectedChapters(prev => prev.filter(c => c.notebookId !== notebook.id));
      
      // Remove chapters from available chapters
      setAvailableChapters(prev => prev.filter(c => c.notebookId !== notebook.id));
    } else {
      // Add notebook and load its chapters
      setSelectedNotebooks(prev => [...prev, notebook]);
      
      try {
        const chapters = await fileSystemManager.getChapters(notebook.id);
        const chaptersWithNotebookId = chapters.map(chapter => ({
          ...chapter,
          notebookId: notebook.id,
          notebookName: notebook.name
        }));
        setAvailableChapters(prev => [...prev, ...chaptersWithNotebookId]);
      } catch (error) {
        Alert.alert('Error', 'Failed to load chapters for notebook');
        console.error(error);
      }
    }
  };

  const handleChapterSelection = (chapter) => {
    setSelectedChapters(prev => {
      const isSelected = prev.some(c => c.id === chapter.id);
      if (isSelected) {
        return prev.filter(c => c.id !== chapter.id);
      } else {
        return [...prev, chapter];
      }
    });
  };

  const selectAllChapters = () => {
    setSelectedChapters([...availableChapters]);
  };

  const deselectAllChapters = () => {
    setSelectedChapters([]);
  };

  const generatePDFContent = async () => {
    try {
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>NotesApp Export</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #6366f1;
              padding-bottom: 20px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #6b7280;
            }
            .collection {
              margin-bottom: 40px;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 20px;
            }
            .collection-header {
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              color: white;
              padding: 15px 20px;
              border-radius: 8px;
              margin: -20px -20px 20px -20px;
            }
            .collection-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .collection-description {
              font-size: 14px;
              opacity: 0.9;
            }
            .notebook {
              margin: 30px 0;
              border-left: 4px solid #6366f1;
              padding-left: 20px;
            }
            .notebook-title {
              font-size: 22px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .notebook-description {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 20px;
              font-style: italic;
            }
            .chapter {
              margin: 20px 0 20px 20px;
              background: #f8fafc;
              border-radius: 8px;
              padding: 15px;
            }
            .chapter-title {
              font-size: 18px;
              font-weight: bold;
              color: #374151;
              margin-bottom: 10px;
            }
            .chapter-description {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 15px;
            }
            .note {
              margin: 15px 0 15px 20px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
            }
            .note-title {
              font-size: 16px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .note-content {
              font-size: 14px;
              color: #374151;
              line-height: 1.5;
            }
            .metadata {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #f3f4f6;
            }
            .page-break {
              page-break-before: always;
            }
            .summary {
              background: #f0f4ff;
              border: 1px solid #c7d2fe;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 30px;
            }
            .summary-title {
              font-size: 16px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">NotesApp Export</div>
            <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
      `;

      // Add export summary
      if (exportType === 'collections') {
        htmlContent += `
          <div class="summary">
            <div class="summary-title">Export Summary</div>
            <p><strong>Export Type:</strong> Collections</p>
            <p><strong>Selected Collections:</strong> ${selectedCollections.length}</p>
            <p><strong>Collections:</strong> ${selectedCollections.map(c => c.name).join(', ')}</p>
          </div>
        `;

        // Export collections with their notebooks
        for (const collection of selectedCollections) {
          htmlContent += `
            <div class="collection">
              <div class="collection-header">
                <div class="collection-title">${collection.name}</div>
                ${collection.description ? `<div class="collection-description">${collection.description}</div>` : ''}
              </div>
          `;

          try {
            // Get notebooks in this collection
            const notebooksInCollection = await fileSystemManager.getNotebooksInCollection(collection.id);
            
            for (const notebook of notebooksInCollection) {
              htmlContent += await generateNotebookContent(notebook);
            }
          } catch (error) {
            console.error('Error loading collection notebooks:', error);
          }

          htmlContent += `</div>`;
        }
      } else {
        // Export specific notebooks
        htmlContent += `
          <div class="summary">
            <div class="summary-title">Export Summary</div>
            <p><strong>Export Type:</strong> Specific Notebooks</p>
            <p><strong>Selected Notebooks:</strong> ${selectedNotebooks.length}</p>
            <p><strong>Selected Chapters:</strong> ${selectedChapters.length}</p>
            <p><strong>Notebooks:</strong> ${selectedNotebooks.map(n => n.name).join(', ')}</p>
          </div>
        `;

        for (const notebook of selectedNotebooks) {
          htmlContent += await generateNotebookContent(notebook, selectedChapters.filter(c => c.notebookId === notebook.id));
        }
      }

      htmlContent += `
        </body>
        </html>
      `;

      return htmlContent;
    } catch (error) {
      console.error('Error generating PDF content:', error);
      throw error;
    }
  };

  const generateNotebookContent = async (notebook, specificChapters = null) => {
    let content = `
      <div class="notebook">
        <div class="notebook-title">${notebook.name || notebook.title}</div>
        ${notebook.description ? `<div class="notebook-description">${notebook.description}</div>` : ''}
    `;

    try {
      // Get chapters for this notebook
      const allChapters = await fileSystemManager.getChapters(notebook.id);
      const chaptersToInclude = specificChapters || allChapters;

      for (const chapter of chaptersToInclude) {
        content += `
          <div class="chapter">
            <div class="chapter-title">${chapter.title}</div>
            ${chapter.description ? `<div class="chapter-description">${chapter.description}</div>` : ''}
        `;

        try {
          // Get notes for this chapter
          const notes = await fileSystemManager.getNotes(notebook.id, chapter.id);
          
          for (const note of notes) {
            content += `
              <div class="note">
                <div class="note-title">${note.title}</div>
                <div class="note-content">${note.content || 'No content'}</div>
                <div class="metadata">
                  Created: ${new Date(note.created).toLocaleDateString()} | 
                  Modified: ${new Date(note.lastModified).toLocaleDateString()}
                </div>
              </div>
            `;
          }
        } catch (error) {
          console.error('Error loading notes:', error);
        }

        content += `</div>`;
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
    }

    content += `</div>`;
    return content;
  };

  const performExport = async () => {
    try {
      setExportLoading(true);
      
      // Generate formatted HTML content
      const htmlContent = await generatePDFContent();
      
      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      
      // Show options to user
      Alert.alert(
        'PDF Generated Successfully',
        'What would you like to do with your exported PDF?',
        [
          {
            text: 'Print',
            onPress: async () => {
              try {
                await Print.printAsync({
                  uri,
                  printerUrl: undefined,
                });
              } catch (error) {
                Alert.alert('Print Error', 'Failed to print PDF');
                console.error(error);
              }
            }
          },
          {
            text: 'Share',
            onPress: async () => {
              try {
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share NotesApp Export',
                  });
                } else {
                  Alert.alert('Share Error', 'Sharing is not available on this device');
                }
              } catch (error) {
                Alert.alert('Share Error', 'Failed to share PDF');
                console.error(error);
              }
            }
          },
          {
            text: 'View PDF',
            onPress: async () => {
              try {
                await Print.printAsync({
                  uri,
                  printerUrl: undefined,
                });
              } catch (error) {
                Alert.alert('View Error', 'Failed to open PDF');
                console.error(error);
              }
            }
          },
          {
            text: 'Close',
            style: 'cancel',
            onPress: () => {
              setExportModalVisible(false);
              resetExportModal();
            }
          }
        ],
        { cancelable: false }
      );
      
    } catch (error) {
      Alert.alert('Export Error', 'Failed to generate PDF: ' + error.message);
      console.error(error);
    } finally {
      setExportLoading(false);
    }
  };

  const resetExportModal = () => {
    setExportType('collections');
    setSelectedCollections([]);
    setSelectedNotebooks([]);
    setSelectedChapters([]);
    setAvailableCollections([]);
    setAvailableChapters([]);
    setExportLoading(false);
  };

  const closeExportModal = () => {
    setExportModalVisible(false);
    resetExportModal();
  };

  const exportNotesToFileSystem = async () => {
    try {
      const result = await fileSystemManager.exportData();
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `Data exported to: ${result.path}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export notes to file system');
      console.error(error);
    }
  };

  const showFileSystemInfo = async () => {
    try {
      const stats = await fileSystemManager.getStats();
      if (stats) {
        Alert.alert(
          'File System Information',
          `Folder Path: ${stats.folderPath}\n\n` +
          `Total Notebooks: ${stats.totalNotebooks}\n` +
          `Total Notes: ${stats.totalNotes}\n` +
          `Total Collections: ${stats.totalNotebookCollections}\n\n` +
          `Last Modified: ${new Date(stats.lastModified).toLocaleDateString()}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('File System Info', 'Unable to retrieve file system information');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get file system information');
      console.error(error);
    }
  };

  const renderNotebook = ({ item }) => (
    <TouchableOpacity 
      style={styles.notebookCard}
      onPress={() => router.push(`/notebook/${item.id}`)}
    >
      <View style={[styles.notebookCover, { backgroundColor: item.color }]}>
        <View style={styles.bookSpine} />
        <Ionicons 
          name={item.icon} 
          size={48} 
          color="#fff" 
        />
      </View>
      <View style={styles.notebookInfo}>
        <View style={styles.notebookHeader}>
          <Text style={styles.notebookName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.notebookActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditNotebook(item);
              }}
            >
              <Ionicons name="pencil" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteNotebook(item);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
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
              {getChapterCountText(item.note_count || 0)}
            </Text>
          </View>
          <Text style={styles.notebookDate}>
            Created {formatDate(item.created_at)}
          </Text>
        </View>
        {item.collections && item.collections.length > 0 && (
          <View style={styles.collectionsSection}>
            <Text style={styles.collectionsLabel}>In collections:</Text>
            <View style={styles.collectionTags}>
              {item.collections.map((collection, index) => (
                <View key={collection.id} style={[styles.collectionTag, { backgroundColor: collection.color + '20' }]}>
                  <Ionicons name={collection.icon} size={12} color={collection.color} />
                  <Text style={[styles.collectionTagText, { color: collection.color }]} numberOfLines={1}>
                    {collection.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      
      {/* Custom Header with Title and Search */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        {/* Title Bar with Menus */}
        <View style={styles.titleBar}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleHamburgerMenu}
          >
            <Ionicons name="menu-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>NotesApp</Text>
          
          <View style={styles.rightHeaderButtons}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={openCollections}
            >
              <Ionicons name="folder-outline" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={openSearch}
            >
              <Ionicons name="search-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#6366f1" />
          <Text style={styles.loadingText}>Loading notebooks...</Text>
        </View>
      ) : notebooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            No notebooks yet
          </Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to create your first notebook
          </Text>
        </View>
      ) : (
        <FlatList
          data={notebooks}
          renderItem={renderNotebook}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.notebooksList}
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
        onPress={handleCreateNotebook}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Sidebar Menu */}
      <SidebarMenu
        visible={leftSidebarVisible}
        onClose={closeSidebars}
        title="Menu"
        menuItems={getMenuItems()}
      />
      
      {/* File System Demo Modal */}
      <Modal
        visible={fileSystemDemoVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <FileSystemDemo
          visible={fileSystemDemoVisible}
          onClose={() => setFileSystemDemoVisible(false)}
        />
      </Modal>

      {/* Create Notebook Modal */}
      <Modal
        visible={createNotebookModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.createNotebookContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.createNotebookHeader, { paddingTop: insets.top }]}>
            <View style={styles.createNotebookHeaderContent}>
              <TouchableOpacity 
                onPress={() => setCreateNotebookModalVisible(false)} 
                style={styles.closeModalButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.createNotebookTitle}>{isEditMode ? 'Edit Notebook' : 'Create Notebook'}</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <ScrollView style={styles.createNotebookContent}>
            {/* Notebook Name */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Notebook Name *</Text>
              <TextInput
                style={styles.formInput}
                value={notebookName}
                onChangeText={setNotebookName}
                placeholder="Enter notebook name"
                placeholderTextColor="#9ca3af"
                maxLength={50}
              />
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={notebookDescription}
                onChangeText={setNotebookDescription}
                placeholder="Enter notebook description"
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
                      .find(item => item.icon === selectedIcon)?.name || 'Book'}
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
                !notebookName.trim() && styles.createButtonDisabled
              ]}
              onPress={createNotebook}
              disabled={!notebookName.trim()}
            >
              <Text style={styles.createButtonText}>{isEditMode ? 'Update Notebook' : 'Create Notebook'}</Text>
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
            <Text style={styles.deleteModalTitle}>Delete Notebook</Text>
            <Text style={styles.deleteModalMessage}>
              Do you really want to delete this notebook?{'\n'}
              "{notebookToDelete?.name}"
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This notebook will be moved to the recycle bin and can be restored later.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.deleteModalCancelButton}
                onPress={cancelDeleteNotebook}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteNotebook}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recycle Bin Modal */}
      <Modal
        visible={recycleBinVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.recycleBinContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#ef4444" />
          
          {/* Header */}
          <View style={[styles.recycleBinHeader, { paddingTop: insets.top }]}>
            <View style={styles.recycleBinHeaderContent}>
              <TouchableOpacity 
                onPress={() => setRecycleBinVisible(false)} 
                style={styles.closeModalButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.recycleBinTitle}>Recycle Bin</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <View style={styles.recycleBinContent}>
            {deletedNotebooks.length === 0 ? (
              <View style={styles.emptyRecycleBin}>
                <Ionicons name="trash-outline" size={64} color="#9ca3af" />
                <Text style={styles.emptyRecycleBinText}>Recycle bin is empty</Text>
                <Text style={styles.emptyRecycleBinSubtext}>
                  Deleted notebooks will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={deletedNotebooks}
                renderItem={({ item }) => (
                  <View style={styles.deletedNotebookCard}>
                    <View style={[styles.notebookCover, { backgroundColor: item.color }]}>
                      <View style={styles.bookSpine} />
                      <Ionicons 
                        name={item.icon} 
                        size={48} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.deletedNotebookInfo}>
                      <Text style={styles.deletedNotebookName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text style={styles.deletedNotebookDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                      <Text style={styles.deletedNotebookDate}>
                        Deleted {formatDate(item.deleted_at)}
                      </Text>
                    </View>
                    <View style={styles.deletedNotebookActions}>
                      <TouchableOpacity 
                        style={styles.restoreButton}
                        onPress={() => restoreNotebook(item.id)}
                      >
                        <Ionicons name="arrow-undo-outline" size={20} color="#10b981" />
                        <Text style={styles.restoreButtonText}>Restore</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.permanentDeleteButton}
                        onPress={() => permanentlyDeleteNotebook(item.id)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        <Text style={styles.permanentDeleteButtonText}>Delete Forever</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.deletedNotebooksList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.exportModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.exportModalHeader, { paddingTop: insets.top }]}>
            <View style={styles.exportModalHeaderContent}>
              <TouchableOpacity 
                onPress={closeExportModal} 
                style={styles.closeModalButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.exportModalTitle}>Export Notes</Text>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <ScrollView style={styles.exportModalContent}>
            {/* Export Type Selection */}
            <View style={styles.exportSection}>
              <Text style={styles.exportSectionTitle}>What would you like to export?</Text>
              <View style={styles.exportTypeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.exportTypeButton,
                    exportType === 'collections' && styles.exportTypeButtonSelected
                  ]}
                  onPress={() => handleExportTypeChange('collections')}
                >
                  <Ionicons 
                    name="folder-outline" 
                    size={24} 
                    color={exportType === 'collections' ? '#fff' : '#6366f1'} 
                  />
                  <Text style={[
                    styles.exportTypeButtonText,
                    exportType === 'collections' && styles.exportTypeButtonTextSelected
                  ]}>
                    Collections
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.exportTypeButton,
                    exportType === 'notebooks' && styles.exportTypeButtonSelected
                  ]}
                  onPress={() => handleExportTypeChange('notebooks')}
                >
                  <Ionicons 
                    name="book-outline" 
                    size={24} 
                    color={exportType === 'notebooks' ? '#fff' : '#6366f1'} 
                  />
                  <Text style={[
                    styles.exportTypeButtonText,
                    exportType === 'notebooks' && styles.exportTypeButtonTextSelected
                  ]}>
                    Specific Notebooks
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Collections Selection */}
            {exportType === 'collections' && (
              <View style={styles.exportSection}>
                <Text style={styles.exportSectionTitle}>
                  Select Collections ({selectedCollections.length} selected)
                </Text>
                {availableCollections.length === 0 ? (
                  <View style={styles.emptySelectionContainer}>
                    <Ionicons name="folder-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptySelectionText}>No collections available</Text>
                  </View>
                ) : (
                  <View style={styles.selectionList}>
                    {availableCollections.map((collection) => (
                      <TouchableOpacity 
                        key={collection.id}
                        style={styles.selectionItem}
                        onPress={() => handleCollectionSelection(collection)}
                      >
                        <View style={styles.selectionItemLeft}>
                          <View style={[styles.selectionIcon, { backgroundColor: collection.color }]}>
                            <Ionicons name={collection.icon} size={20} color="#fff" />
                          </View>
                          <View style={styles.selectionItemInfo}>
                            <Text style={styles.selectionItemName}>{collection.name}</Text>
                            {collection.description && (
                              <Text style={styles.selectionItemDescription} numberOfLines={1}>
                                {collection.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={[
                          styles.selectionCheckbox,
                          selectedCollections.some(c => c.id === collection.id) && styles.selectionCheckboxSelected
                        ]}>
                          {selectedCollections.some(c => c.id === collection.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Notebooks Selection */}
            {exportType === 'notebooks' && (
              <View style={styles.exportSection}>
                <Text style={styles.exportSectionTitle}>
                  Select Notebooks ({selectedNotebooks.length} selected)
                </Text>
                {notebooks.length === 0 ? (
                  <View style={styles.emptySelectionContainer}>
                    <Ionicons name="book-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptySelectionText}>No notebooks available</Text>
                  </View>
                ) : (
                  <View style={styles.selectionList}>
                    {notebooks.map((notebook) => (
                      <TouchableOpacity 
                        key={notebook.id}
                        style={styles.selectionItem}
                        onPress={() => handleNotebookSelection(notebook)}
                      >
                        <View style={styles.selectionItemLeft}>
                          <View style={[styles.selectionIcon, { backgroundColor: notebook.color }]}>
                            <Ionicons name={notebook.icon} size={20} color="#fff" />
                          </View>
                          <View style={styles.selectionItemInfo}>
                            <Text style={styles.selectionItemName}>{notebook.name}</Text>
                            {notebook.description && (
                              <Text style={styles.selectionItemDescription} numberOfLines={1}>
                                {notebook.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={[
                          styles.selectionCheckbox,
                          selectedNotebooks.some(n => n.id === notebook.id) && styles.selectionCheckboxSelected
                        ]}>
                          {selectedNotebooks.some(n => n.id === notebook.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Chapters Selection */}
            {exportType === 'notebooks' && selectedNotebooks.length > 0 && (
              <View style={styles.exportSection}>
                <View style={styles.chaptersHeader}>
                  <Text style={styles.exportSectionTitle}>
                    Select Chapters ({selectedChapters.length} selected)
                  </Text>
                  <TouchableOpacity 
                    style={styles.chaptersToggleButton}
                    onPress={selectedChapters.length === availableChapters.length ? deselectAllChapters : selectAllChapters}
                  >
                    <Ionicons 
                      name={selectedChapters.length === availableChapters.length ? "checkbox-outline" : "square-outline"} 
                      size={24} 
                      color="#6366f1" 
                    />
                  </TouchableOpacity>
                </View>
                
                {availableChapters.length === 0 ? (
                  <View style={styles.emptySelectionContainer}>
                    <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptySelectionText}>No chapters available</Text>
                  </View>
                ) : (
                  <View style={styles.selectionList}>
                    {availableChapters.map((chapter) => (
                      <TouchableOpacity 
                        key={`${chapter.notebookId}-${chapter.id}`}
                        style={styles.selectionItem}
                        onPress={() => handleChapterSelection(chapter)}
                      >
                        <View style={styles.selectionItemLeft}>
                          <View style={styles.chapterIcon}>
                            <Ionicons name="document-text-outline" size={20} color="#6366f1" />
                          </View>
                          <View style={styles.selectionItemInfo}>
                            <Text style={styles.selectionItemName}>{chapter.title}</Text>
                            <Text style={styles.selectionItemDescription} numberOfLines={1}>
                              From: {chapter.notebookName}
                            </Text>
                          </View>
                        </View>
                        <View style={[
                          styles.selectionCheckbox,
                          selectedChapters.some(c => c.id === chapter.id) && styles.selectionCheckboxSelected
                        ]}>
                          {selectedChapters.some(c => c.id === chapter.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Export Button */}
            <View style={styles.exportButtonContainer}>
              <TouchableOpacity 
                style={[
                  styles.exportButton,
                  (
                    (exportType === 'collections' && selectedCollections.length === 0) ||
                    (exportType === 'notebooks' && selectedNotebooks.length === 0)
                  ) && styles.exportButtonDisabled
                ]}
                onPress={performExport}
                disabled={
                  exportLoading ||
                  (exportType === 'collections' && selectedCollections.length === 0) ||
                  (exportType === 'notebooks' && selectedNotebooks.length === 0)
                }
              >
                {exportLoading ? (
                  <View style={styles.exportButtonLoading}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.exportButtonText}>Generating PDF...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={24} color="#fff" />
                    <Text style={styles.exportButtonText}>Generate PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Search Component */}
      <SearchComponent
        visible={searchVisible}
        onClose={closeSearch}
        searchContext="all"
        onResultSelect={handleSearchResult}
        placeholder="Search notebooks, collections, chapters, notes..."
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
  rightHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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
  notebooksList: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCard: {
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
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
  notebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notebookName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  notebookActions: {
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
  notebookDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  notebookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  notebookDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  createNotebookContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  createNotebookHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  createNotebookHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeModalButton: {
    padding: 8,
  },
  createNotebookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  createNotebookContent: {
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
  recycleBinContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  recycleBinHeader: {
    backgroundColor: '#ef4444',
    padding: 16,
  },
  recycleBinHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recycleBinTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  recycleBinContent: {
    flex: 1,
    padding: 16,
  },
  emptyRecycleBin: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRecycleBinText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyRecycleBinSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  deletedNotebookCard: {
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
  deletedNotebookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deletedNotebookName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  deletedNotebookDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  deletedNotebookDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deletedNotebookActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
    marginLeft: 12,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    backgroundColor: '#f0fff4',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    marginLeft: 4,
  },
  permanentDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  permanentDeleteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    marginLeft: 4,
  },
  deletedNotebooksList: {
    paddingBottom: 20,
  },
  collectionsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  collectionsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  collectionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  collectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: 120,
  },
  collectionTagText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Export Modal Styles
  exportModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  exportModalHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  exportModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  exportModalContent: {
    flex: 1,
    padding: 16,
  },
  exportSection: {
    marginBottom: 24,
  },
  exportSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  exportTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  exportTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  exportTypeButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  exportTypeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    marginTop: 8,
    textAlign: 'center',
  },
  exportTypeButtonTextSelected: {
    color: '#fff',
  },
  selectionList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chapterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#f0f4ff',
  },
  selectionItemInfo: {
    flex: 1,
  },
  selectionItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  selectionItemDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectionCheckboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  emptySelectionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptySelectionText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chaptersToggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
  },
  exportButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  exportButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  exportButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 