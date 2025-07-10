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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import fileSystemManager from '../../../utils/fileSystemManager';
import settingsManager from '../../../utils/settingsManager';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

export default function NotesScreen() {
  const { notebookId, chapterId } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const [createNoteModalVisible, setCreateNoteModalVisible] = useState(false);
  const [notes, setNotes] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [notebook, setNotebook] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTag1, setNoteTag1] = useState('');
  const [noteTag2, setNoteTag2] = useState('');
  const [notePriority, setNotePriority] = useState('Low');
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewNoteModalVisible, setViewNoteModalVisible] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isReaderMode, setIsReaderMode] = useState(true);
  
  // Rich text formatting
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const contentInputRef = useRef(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  
  // Keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Animation values
  const rightSlideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadChapterAndNotes();
  }, [notebookId, chapterId]);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
      
      // Auto-scroll to bottom when keyboard appears
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const loadChapterAndNotes = async () => {
    try {
      setLoading(true);
      
      // Load notebook and chapter details
      const hierarchy = await fileSystemManager.getHierarchy();
      if (hierarchy && hierarchy.structure && hierarchy.structure.notebooks[notebookId]) {
        setNotebook(hierarchy.structure.notebooks[notebookId]);
        
        if (hierarchy.structure.notebooks[notebookId].chapters[chapterId]) {
          setChapter(hierarchy.structure.notebooks[notebookId].chapters[chapterId]);
        }
      }
      
      // Load notes
      await loadNotes();
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to load chapter');
      console.error(error);
    }
  };

  const loadNotes = async () => {
    try {
      const notesData = await fileSystemManager.getNotes(notebookId, chapterId);
      
      // Sort notes using the settings manager
      const sortedNotes = await settingsManager.sortItems(notesData || []);
      
      setNotes(sortedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes');
      setNotes([]);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'Low':
        return { name: 'flag-outline', color: '#10b981' }; // Green
      case 'Mid':
        return { name: 'flag', color: '#f59e0b' }; // Yellow
      case 'High':
        return { name: 'flag', color: '#f97316' }; // Orange
      case 'Very High':
        return { name: 'flag', color: '#ef4444' }; // Red
      default:
        return { name: 'flag-outline', color: '#10b981' }; // Default to Low
    }
  };

  const createNote = async () => {
    if (!noteTitle.trim()) {
      Alert.alert('Error', 'Please enter a note title');
      return;
    }

    try {
      // Prepare tags array with priority
      const tags = [];
      if (noteTag1.trim()) tags.push(noteTag1.trim());
      if (noteTag2.trim()) tags.push(noteTag2.trim());
      tags.push(`priority:${notePriority}`);

      let result;
      
      if (isEditMode && editingNote) {
        // Update existing note
        result = await fileSystemManager.updateNote(notebookId, chapterId, editingNote.id, {
          title: noteTitle.trim(),
          content: noteContent.trim(),
          tags: tags
        });
      } else {
        // Create new note
        result = await fileSystemManager.createNote(notebookId, chapterId, {
          title: noteTitle.trim(),
          content: noteContent.trim(),
          tags: tags
        });
      }

      if (result.success) {
        Alert.alert('Success', isEditMode ? 'Note updated successfully!' : 'Note created successfully!');
        
        // Reset form
        setNoteTitle('');
        setNoteContent('');
        setNoteTag1('');
        setNoteTag2('');
        setNotePriority('Low');
        setEditingNote(null);
        setIsEditMode(false);
        setCreateNoteModalVisible(false);
        resetFormatting();
        
        // Reload notes
        await loadNotes();
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditMode ? 'update' : 'create'} note`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} note`);
      console.error(error);
    }
  };

  const extractPriorityFromTags = (tags) => {
    if (!tags || !Array.isArray(tags)) return 'Low';
    
    const priorityTag = tags.find(tag => tag.startsWith('priority:'));
    if (priorityTag) {
      const priority = priorityTag.replace('priority:', '');
      return ['Low', 'Mid', 'High', 'Very High'].includes(priority) ? priority : 'Low';
    }
    return 'Low';
  };

  const getNonPriorityTags = (tags) => {
    if (!tags || !Array.isArray(tags)) return ['', ''];
    
    const nonPriorityTags = tags.filter(tag => !tag.startsWith('priority:'));
    return [
      nonPriorityTags[0] || '',
      nonPriorityTags[1] || ''
    ];
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setIsEditMode(true);
    setNoteTitle(note.title);
    setNoteContent(note.content || '');
    const [tag1, tag2] = getNonPriorityTags(note.tags);
    setNoteTag1(tag1);
    setNoteTag2(tag2);
    setNotePriority(extractPriorityFromTags(note.tags));
    setCreateNoteModalVisible(true);
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsEditMode(false);
    setNoteTitle('');
    setNoteContent('');
    setNoteTag1('');
    setNoteTag2('');
    setNotePriority('Low');
    setIsEditingContent(true);
    resetFormatting();
    setCreateNoteModalVisible(true);
  };

  const handleViewNote = (note) => {
    setViewingNote(note);
    setIsReaderMode(true); // Default to reader mode
    setViewNoteModalVisible(true);
  };

  const handleEditFromViewer = () => {
    if (viewingNote) {
      setEditingNote(viewingNote);
      setIsEditMode(true);
      setNoteTitle(viewingNote.title);
      setNoteContent(viewingNote.content || '');
      const [tag1, tag2] = getNonPriorityTags(viewingNote.tags);
      setNoteTag1(tag1);
      setNoteTag2(tag2);
      setNotePriority(extractPriorityFromTags(viewingNote.tags));
      setViewNoteModalVisible(false);
      setCreateNoteModalVisible(true);
    }
  };

  const closeNoteViewer = () => {
    setViewNoteModalVisible(false);
    setViewingNote(null);
    setNewMessage('');
    setIsReaderMode(true);
  };

  const handleDeleteNote = (note) => {
    setNoteToDelete(note);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      const result = await fileSystemManager.softDeleteNote(notebookId, chapterId, noteToDelete.id);
      
      if (result.success) {
        Alert.alert('Success', 'Note moved to recycle bin');
        await loadNotes();
        setDeleteConfirmVisible(false);
        setNoteToDelete(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  };

  const cancelDeleteNote = () => {
    setDeleteConfirmVisible(false);
    setNoteToDelete(null);
  };

  const resetFormatting = () => {
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setTextAlign('left');
    setSelectionStart(0);
    setSelectionEnd(0);
    setIsEditingContent(false);
  };

  const applyFormatting = (type) => {
    // Switch to editing mode if not already editing
    if (!isEditingContent) {
      setIsEditingContent(true);
      // Use setTimeout to allow the TextInput to render before applying formatting
      setTimeout(() => {
        applyFormattingInternal(type);
      }, 100);
      return;
    }
    
    applyFormattingInternal(type);
  };

  const applyFormattingInternal = (type) => {
    const hasSelection = selectionStart !== selectionEnd;
    
    if (!hasSelection && type !== 'bullet' && type !== 'numbered') {
      // If no text is selected, just toggle the formatting state for new text
      switch (type) {
        case 'bold':
          setIsBold(!isBold);
          break;
        case 'italic':
          setIsItalic(!isItalic);
          break;
        case 'underline':
          setIsUnderline(!isUnderline);
          break;
      }
      return;
    }

    const beforeText = noteContent.substring(0, selectionStart);
    const selectedText = noteContent.substring(selectionStart, selectionEnd);
    const afterText = noteContent.substring(selectionEnd);

    let newText = '';
    let newCursorPosition = selectionEnd;

    switch (type) {
      case 'bold':
        if (hasSelection) {
          // Check if text is already bold
          if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
            // Remove bold formatting
            newText = beforeText + selectedText.slice(2, -2) + afterText;
            newCursorPosition = selectionStart + selectedText.length - 4;
          } else {
            // Add bold formatting
            newText = beforeText + '**' + selectedText + '**' + afterText;
            newCursorPosition = selectionEnd + 4;
          }
        }
        break;
      case 'italic':
        if (hasSelection) {
          // Check if text is already italic
          if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
            // Remove italic formatting
            newText = beforeText + selectedText.slice(1, -1) + afterText;
            newCursorPosition = selectionStart + selectedText.length - 2;
          } else {
            // Add italic formatting
            newText = beforeText + '*' + selectedText + '*' + afterText;
            newCursorPosition = selectionEnd + 2;
          }
        }
        break;
      case 'underline':
        if (hasSelection) {
          // Check if text is already underlined
          if (selectedText.startsWith('__') && selectedText.endsWith('__')) {
            // Remove underline formatting
            newText = beforeText + selectedText.slice(2, -2) + afterText;
            newCursorPosition = selectionStart + selectedText.length - 4;
          } else {
            // Add underline formatting
            newText = beforeText + '__' + selectedText + '__' + afterText;
            newCursorPosition = selectionEnd + 4;
          }
        }
        break;
      case 'bullet':
        const lines = noteContent.split('\n');
        const lastLine = lines[lines.length - 1];
        if (!lastLine.startsWith('• ')) {
          setNoteContent(noteContent + '\n• ');
        }
        return;
      case 'numbered':
        const numberedLines = noteContent.split('\n');
        const lastNumberedLine = numberedLines[numberedLines.length - 1];
        const nextNumber = numberedLines.filter(line => /^\d+\./.test(line)).length + 1;
        if (!/^\d+\./.test(lastNumberedLine)) {
          setNoteContent(noteContent + `\n${nextNumber}. `);
        }
        return;
    }

    if (newText !== '') {
      setNoteContent(newText);
      
      // Set cursor position after formatting
      setTimeout(() => {
        if (contentInputRef.current) {
          contentInputRef.current.setNativeProps({
            selection: { start: newCursorPosition, end: newCursorPosition }
          });
        }
      }, 100);
    }
  };

  const setAlignment = (alignment) => {
    setTextAlign(alignment);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };



  const filteredNotes = notes.filter(note =>
    (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const getPreviewText = (content, paragraphs) => {
    if (paragraphs && paragraphs.length > 0 && paragraphs[0] && paragraphs[0].text) {
      // Get the first paragraph text
      const firstParagraph = paragraphs[0].text;
      return firstParagraph.length > 100 ? firstParagraph.substring(0, 100) + '...' : firstParagraph;
    }
    if (!content) return 'No content';
    
    // Strip markdown formatting for preview
    const cleanContent = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\*([^*]+?)\*/g, '$1') // Remove italic markers
      .replace(/__(.*?)__/g, '$1') // Remove underline markers
      .replace(/\n/g, ' '); // Replace newlines with spaces
    
    return cleanContent.substring(0, 100) + (cleanContent.length > 100 ? '...' : '');
  };

  const renderNote = ({ item }) => (
    <TouchableOpacity 
      style={styles.noteCard}
      onPress={() => handleViewNote(item)}
    >
      <View style={styles.noteIcon}>
        <Ionicons 
          name="document-text-outline" 
          size={24} 
          color="#fff" 
        />
      </View>
      
      <View style={styles.noteInfo}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title || 'Untitled Note'}
          </Text>
          <TouchableOpacity 
            style={styles.deleteNoteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteNote(item);
            }}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.notePreview} numberOfLines={2}>
          {getPreviewText(item.content, item.paragraphs)}
        </Text>
        
        {/* Tags and Word Count Row */}
        <View style={styles.noteTagsWordRow}>
          {/* Priority and Tags Display */}
          <View style={styles.noteTagsContainer}>
            {/* Priority Icon */}
            {(() => {
              const priority = extractPriorityFromTags(item.tags);
              const icon = getPriorityIcon(priority);
              return (
                <View style={[styles.notePriorityTag, { borderColor: icon.color }]}>
                  <Ionicons 
                    name={icon.name} 
                    size={12} 
                    color={icon.color} 
                  />
                  <Text style={[styles.notePriorityText, { color: icon.color }]}>
                    {priority}
                  </Text>
                </View>
              );
            })()}
            
            {/* Regular Tags */}
            {(() => {
              const [tag1, tag2] = getNonPriorityTags(item.tags);
              return (
                <>
                  {tag1 && (
                    <View style={styles.noteTag}>
                      <Text style={styles.noteTagText}>{tag1}</Text>
                    </View>
                  )}
                  {tag2 && (
                    <View style={styles.noteTag}>
                      <Text style={styles.noteTagText}>{tag2}</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
          
          {/* Word Count */}
          <View style={styles.noteWordCount}>
            <Ionicons name="text-outline" size={12} color="#6366f1" />
            <Text style={styles.noteWordCountText}>
              {item.content ? item.content.split(' ').length : 0} words
            </Text>
          </View>
        </View>
        
        <View style={styles.noteMeta}>
          <Text style={styles.noteDate}>
            {formatDate(item.lastModified)}
          </Text>
          </View>
      </View>
    </TouchableOpacity>
  );

  const sendMessage = async () => {
    if (!newMessage.trim() || !viewingNote) return;

    try {
      // Simply append the new message to the existing content
      const updatedContent = viewingNote.content 
        ? `${viewingNote.content}\n${newMessage.trim()}`
        : newMessage.trim();

      const timestamp = new Date().toISOString();

      // Create updated note object
      const updatedNote = {
        ...viewingNote,
        content: updatedContent,
        lastModified: timestamp
      };

      // Update in file system
      await fileSystemManager.updateNote(notebookId, chapterId, viewingNote.id, {
        title: viewingNote.title,
        content: updatedContent,
        lastModified: timestamp
      });

      // Update the viewing note state
      setViewingNote(updatedNote);

      // Update the notes list to reflect changes
      loadNotes();

      // Clear input
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleViewMode = () => {
    setIsReaderMode(!isReaderMode);
  };

  // Helper function to parse content into chat editor paragraphs
  const parseContentToParagraphs = (content) => {
    if (!content || content.trim() === '') return [];
    
    // Split by line breaks and filter out empty lines
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    return lines.map((text, index) => ({
      id: `paragraph-${index}`,
      text: text.trim(),
      timestamp: new Date().toISOString()
    }));
  };

  // Helper function to check if selected text has formatting
  const getSelectionFormatting = () => {
    if (selectionStart === selectionEnd) {
      return { bold: isBold, italic: isItalic, underline: isUnderline };
    }
    
    const selectedText = noteContent.substring(selectionStart, selectionEnd);
    return {
      bold: selectedText.startsWith('**') && selectedText.endsWith('**'),
      italic: selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**') && !selectedText.endsWith('***'),
      underline: selectedText.startsWith('__') && selectedText.endsWith('__')
    };
  };

  const currentFormatting = getSelectionFormatting();

  // Function to parse and render markdown text
  const parseMarkdownText = (text) => {
    if (!text) return [];

    // First, let's escape and replace markdown patterns step by step
    let workingText = text;
    const parts = [];
    let currentIndex = 0;
    
    // Find all formatting patterns with their positions
    const allMatches = [];
    
    // Find bold patterns (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        style: { fontWeight: 'bold' },
        type: 'bold',
        priority: 1
      });
    }
    
    // Find underline patterns (__text__)
    const underlineRegex = /__(.*?)__/g;
    while ((match = underlineRegex.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        style: { textDecorationLine: 'underline' },
        type: 'underline',
        priority: 2
      });
    }
    
    // Find italic patterns (*text*) - but exclude those inside bold patterns
    const italicRegex = /(?<!\*)\*([^*\n]+?)\*(?!\*)/g;
    // Since React Native doesn't support lookbehind, let's manually check
    let textForItalics = text;
    let italicMatch;
    let searchIndex = 0;
    
    while (searchIndex < textForItalics.length) {
      const remainingText = textForItalics.substring(searchIndex);
      const italicRegexSimple = /\*([^*\n]+?)\*/;
      italicMatch = remainingText.match(italicRegexSimple);
      
      if (italicMatch) {
        const actualIndex = searchIndex + italicMatch.index;
        const matchEnd = actualIndex + italicMatch[0].length;
        
        // Check if this is not part of a bold pattern
        const prevChar = actualIndex > 0 ? text[actualIndex - 1] : '';
        const nextChar = matchEnd < text.length ? text[matchEnd] : '';
        
        if (prevChar !== '*' && nextChar !== '*') {
          // Also check if this doesn't overlap with existing bold/underline
          const overlaps = allMatches.some(existing => 
            actualIndex < existing.end && matchEnd > existing.start
          );
          
          if (!overlaps) {
            allMatches.push({
              start: actualIndex,
              end: matchEnd,
              content: italicMatch[1],
              style: { fontStyle: 'italic' },
              type: 'italic',
              priority: 3
            });
          }
        }
        
        searchIndex = actualIndex + 1;
      } else {
        break;
      }
    }

    // Sort by start position, then by priority (bold > underline > italic)
    allMatches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.priority - b.priority;
    });

    // Remove overlapping matches (keep higher priority ones)
    const finalMatches = [];
    for (let i = 0; i < allMatches.length; i++) {
      const current = allMatches[i];
      const overlaps = finalMatches.some(existing => 
        current.start < existing.end && current.end > existing.start
      );
      
      if (!overlaps) {
        finalMatches.push(current);
      }
    }

    // Build the parts array
    currentIndex = 0;
    finalMatches.forEach((range, index) => {
      // Add text before this range
      if (range.start > currentIndex) {
        const beforeText = text.substring(currentIndex, range.start);
        if (beforeText) {
          parts.push({
            text: beforeText,
            style: {},
            key: `text-${index}-before`
          });
        }
      }
      
      // Add the formatted text
      parts.push({
        text: range.content,
        style: range.style,
        key: `formatted-${index}-${range.type}`
      });
      
      currentIndex = range.end;
    });

    // Add any remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push({
          text: remainingText,
          style: {},
          key: `text-remaining`
        });
      }
    }

    // If no formatting was found, return the original text
    if (parts.length === 0) {
      parts.push({
        text: text,
        style: {},
        key: 'original-text'
      });
    }

    return parts;
  };

  // Component to render formatted text
  const FormattedTextRenderer = ({ text, style, isChat = false }) => {
    const parts = parseMarkdownText(text);
    
    return (
      <Text style={isChat ? style : [styles.contentInput, style]}>
        {parts.map((part) => (
          <Text key={part.key} style={part.style}>
            {part.text}
          </Text>
        ))}
      </Text>
    );
  };

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
              {chapter?.title || 'Chapter'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {notes.length} notes • {notebook?.title || 'Notebook'}
            </Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes, content, or tags..."
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
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Tap the + button to create your first note'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleCreateNote}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>



      {/* Rich Text Editor Modal */}
      <Modal
        visible={createNoteModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.editorContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Scrollable Upper Section */}
          <ScrollView 
            ref={scrollViewRef}
            style={[
              styles.editorScrollView,
              {
                maxHeight: isKeyboardVisible 
                  ? Math.max(200, height - keyboardHeight - 300) // Reserve more space for content editor
                  : height - 350 // Reserve space for toolbar and content editor
              }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={[styles.editorHeader, { paddingTop: insets.top }]}>
              <View style={styles.editorHeaderContent}>
                <TouchableOpacity 
                  onPress={() => setCreateNoteModalVisible(false)} 
                  style={styles.closeModalButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.editorTitle}>{isEditMode ? 'Edit Note' : 'Create Note'}</Text>
                <TouchableOpacity 
                  onPress={createNote}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveButtonText}>{isEditMode ? 'Update' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Note Title */}
            <View style={styles.titleSection}>
              <TextInput
                style={styles.titleInput}
                value={noteTitle}
                onChangeText={setNoteTitle}
                placeholder="Note title..."
                placeholderTextColor="#9ca3af"
                maxLength={100}
              />
            </View>

            {/* Tags & Priority Button */}
            <View style={styles.tagsSection}>
              <TouchableOpacity 
                style={styles.tagsButton}
                onPress={() => setTagModalVisible(true)}
              >
                <View style={styles.tagsButtonContent}>
                  <Ionicons name="pricetag-outline" size={20} color="#6366f1" />
                  <Text style={styles.tagsButtonText}>
                    {(noteTag1 || noteTag2) ? 
                      `Tags: ${[noteTag1, noteTag2].filter(tag => tag).join(', ')} • ${notePriority}` : 
                      `Add Tags & Priority • ${notePriority}`
                    }
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Fixed Formatting Toolbar */}
          <View style={styles.toolbar}>
            <Text style={styles.toolbarHint}>Select text and tap formatting buttons, or type **bold**, *italic*, __underline__. Formatting shows instantly!</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
              <TouchableOpacity 
                style={[styles.toolbarButton, isBold && styles.toolbarButtonActive]}
                onPress={() => applyFormatting('bold')}
              >
                <Ionicons name="text" size={20} color={isBold ? "#fff" : "#6366f1"} />
                <Text style={[styles.toolbarButtonText, isBold && styles.toolbarButtonTextActive]}>B</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toolbarButton, isItalic && styles.toolbarButtonActive]}
                onPress={() => applyFormatting('italic')}
              >
                <Text style={[styles.toolbarButtonTextItalic, isItalic && styles.toolbarButtonTextActive]}>I</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toolbarButton, isUnderline && styles.toolbarButtonActive]}
                onPress={() => applyFormatting('underline')}
              >
                <Text style={[styles.toolbarButtonTextUnderline, isUnderline && styles.toolbarButtonTextActive]}>U</Text>
              </TouchableOpacity>
              
              <View style={styles.toolbarDivider} />
              
              <TouchableOpacity 
                style={styles.toolbarButton}
                onPress={() => applyFormatting('bullet')}
              >
                <Ionicons name="list" size={20} color="#6366f1" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.toolbarButton}
                onPress={() => applyFormatting('numbered')}
              >
                <Ionicons name="list-outline" size={20} color="#6366f1" />
              </TouchableOpacity>
              
              <View style={styles.toolbarDivider} />
              
              <TouchableOpacity 
                style={[styles.toolbarButton, textAlign === 'left' && styles.toolbarButtonActive]}
                onPress={() => setAlignment('left')}
              >
                <Ionicons name="chevron-back" size={20} color={textAlign === 'left' ? "#fff" : "#6366f1"} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toolbarButton, textAlign === 'center' && styles.toolbarButtonActive]}
                onPress={() => setAlignment('center')}
              >
                <Ionicons name="remove" size={20} color={textAlign === 'center' ? "#fff" : "#6366f1"} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toolbarButton, textAlign === 'right' && styles.toolbarButtonActive]}
                onPress={() => setAlignment('right')}
              >
                <Ionicons name="chevron-forward" size={20} color={textAlign === 'right' ? "#fff" : "#6366f1"} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Content Editor - Takes remaining space */}
          <View style={[
            styles.editorContent,
            {
              flex: 1,
              minHeight: isKeyboardVisible ? 150 : 200, // Ensure minimum usable height
            }
          ]}>
            {isEditingContent ? (
              <TextInput
                style={[
                  styles.contentInput,
                  {
                    textAlign: textAlign,
                    flex: 1,
                    minHeight: isKeyboardVisible ? 150 : 200, // Ensure text input has minimum height
                  }
                ]}
                value={noteContent}
                onChangeText={setNoteContent}
                onSelectionChange={(event) => {
                  const { start, end } = event.nativeEvent.selection;
                  setSelectionStart(start);
                  setSelectionEnd(end);
                }}
                onFocus={() => {
                  // Scroll to bottom when content editor gets focus
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
                onBlur={() => setIsEditingContent(false)}
                placeholder="Start writing your note... (Use **bold**, *italic*, __underline__)"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                ref={contentInputRef}
                autoFocus
              />
            ) : (
              <TouchableOpacity 
                style={styles.formattedTextContainer}
                onPress={() => setIsEditingContent(true)}
                activeOpacity={0.7}
              >
                {noteContent ? (
                  <FormattedTextRenderer 
                    text={noteContent} 
                    style={[styles.contentInput, { textAlign: textAlign }]}
                  />
                ) : (
                  <Text style={styles.placeholderText}>
                    Tap to start writing...{'\n\n'}Try: **bold text**, *italic text*, __underlined text__
                  </Text>
                )}
                <View style={styles.editHint}>
                  <Ionicons name="create-outline" size={20} color="#9ca3af" />
                  <Text style={styles.editHintText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Tags & Priority Modal */}
      <Modal
        visible={tagModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <View style={styles.tagModalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          
          {/* Modal Header */}
          <View style={[styles.tagModalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              onPress={() => setTagModalVisible(false)}
              style={styles.tagModalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.tagModalTitle}>Tags & Priority</Text>
            <TouchableOpacity 
              onPress={() => setTagModalVisible(false)}
              style={styles.tagModalDoneButton}
            >
              <Text style={styles.tagModalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.tagModalContent}>
            {/* Tags Section */}
            <View style={styles.tagModalSection}>
              <Text style={styles.tagModalSectionTitle}>Tags</Text>
              <Text style={styles.tagModalSectionSubtitle}>Add up to 2 tags to organize your note</Text>
              
              <View style={styles.tagModalInputs}>
                <TextInput
                  style={styles.tagModalInput}
                  value={noteTag1}
                  onChangeText={setNoteTag1}
                  placeholder="First tag..."
                  placeholderTextColor="#9ca3af"
                  maxLength={20}
                />
                <TextInput
                  style={styles.tagModalInput}
                  value={noteTag2}
                  onChangeText={setNoteTag2}
                  placeholder="Second tag..."
                  placeholderTextColor="#9ca3af"
                  maxLength={20}
                />
              </View>
            </View>

            {/* Priority Section */}
            <View style={styles.tagModalSection}>
              <Text style={styles.tagModalSectionTitle}>Priority</Text>
              <Text style={styles.tagModalSectionSubtitle}>Set the importance level of this note</Text>
              
              <View style={styles.priorityDropdown}>
                {['Low', 'Mid', 'High', 'Very High'].map((priority) => {
                  const icon = getPriorityIcon(priority);
                  const isSelected = notePriority === priority;
                  
                  return (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityOption,
                        isSelected && styles.priorityOptionSelected
                      ]}
                      onPress={() => setNotePriority(priority)}
                    >
                      <View style={styles.priorityOptionContent}>
                        <Ionicons 
                          name={icon.name} 
                          size={20} 
                          color={icon.color} 
                        />
                        <Text style={[
                          styles.priorityOptionText,
                          isSelected && styles.priorityOptionTextSelected
                        ]}>
                          {priority}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#6366f1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Note Viewer Modal */}
      <Modal
        visible={viewNoteModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
            <View style={styles.chatHeaderContent}>
              <TouchableOpacity 
                onPress={closeNoteViewer} 
                style={styles.closeModalButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatTitle} numberOfLines={1} ellipsizeMode="tail">
                  {viewingNote?.title}
                </Text>
                <Text style={styles.chatSubtitle}>
                  {isReaderMode ? 'Reader Mode' : `${parseContentToParagraphs(viewingNote?.content || '').length} messages`}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={handleEditFromViewer}
                style={styles.editFromViewerButton}
              >
                <Ionicons name="pencil" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggle Buttons */}
          <View style={styles.modeToggleContainer}>
            <View style={styles.toggleSwitchContainer}>
              <TouchableOpacity 
                style={[styles.toggleOption, isReaderMode && styles.toggleOptionActive]}
                onPress={() => setIsReaderMode(true)}
              >
                <Ionicons 
                  name="document-text-outline" 
                  size={16} 
                  color={isReaderMode ? "#fff" : "#6366f1"} 
                />
                <Text style={[styles.toggleText, isReaderMode && styles.toggleTextActive]}>
                  Reader
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toggleOption, !isReaderMode && styles.toggleOptionActive]}
                onPress={() => setIsReaderMode(false)}
              >
                <Ionicons 
                  name="chatbubble-outline" 
                  size={16} 
                  color={!isReaderMode ? "#fff" : "#6366f1"} 
                />
                <Text style={[styles.toggleText, !isReaderMode && styles.toggleTextActive]}>
                  Chat Editor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reader Mode View */}
          {isReaderMode ? (
            <ScrollView style={styles.readerContent} contentContainerStyle={styles.readerContentContainer}>
              <View style={styles.readerTitleSection}>
                <Text style={styles.readerNoteTitle}>
                  {viewingNote?.title}
                </Text>
                <Text style={styles.readerNoteDate}>
                  {viewingNote && formatDate(viewingNote.lastModified)}
                </Text>
              </View>
              
              <View style={styles.readerTextSection}>
                <FormattedTextRenderer 
                  text={viewingNote?.content || 'No content available'} 
                  style={styles.readerNoteContent}
                />
              </View>
            </ScrollView>
          ) : (
            /* Chat Editor Mode View */
            <>
              <FlatList
                style={styles.chatMessages}
                data={parseContentToParagraphs(viewingNote?.content || '')}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <View style={styles.messageContainer}>
                    <View style={styles.messageBubble}>
                      <FormattedTextRenderer 
                        text={item.text} 
                        style={styles.messageText}
                        isChat={true}
                      />
                      <Text style={styles.messageTime}>
                        {formatMessageTime(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.chatMessagesContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptyChat}>
                    <Ionicons name="chatbubble-outline" size={64} color="#9ca3af" />
                    <Text style={styles.emptyChatText}>No messages yet</Text>
                    <Text style={styles.emptyChatSubtext}>Start writing your first message</Text>
                  </View>
                )}
              />

              {/* Chat Editor Input - Only show in chat editor mode */}
              <View style={styles.chatInputContainer}>
                <View style={styles.chatInputWrapper}>
                  <TextInput
                    style={styles.chatInput}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message in chat editor..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.sendButton,
                      newMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive
                    ]}
                    onPress={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color={newMessage.trim() ? "#fff" : "#9ca3af"} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
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
            <Text style={styles.deleteModalTitle}>Delete Note</Text>
            <Text style={styles.deleteModalMessage}>
              Do you really want to delete this note?{'\n'}
              "{noteToDelete?.title}"
            </Text>
            <Text style={styles.deleteModalSubtext}>
              This note will be moved to the recycle bin.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.deleteModalCancelButton}
                onPress={cancelDeleteNote}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteModalConfirmButton}
                onPress={confirmDeleteNote}
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
  notesList: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCard: {
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: 80,
  },

  noteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  noteInfo: {
    flex: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 4,
  },
  deleteNoteButton: {
    padding: 2,
  },
  notePreview: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteWordCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  noteWordCountText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 2,
  },
  noteDate: {
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
  // Rich Text Editor Styles
  editorContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  editorHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  editorHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeModalButton: {
    padding: 8,
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  titleSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingVertical: 8,
  },
  toolbar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  toolbarContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  toolbarButtonActive: {
    backgroundColor: '#6366f1',
  },
  toolbarButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  toolbarButtonTextActive: {
    color: '#fff',
  },
  toolbarButtonTextItalic: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: 'bold',
    color: '#6366f1',
  },
  toolbarButtonTextUnderline: {
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    color: '#6366f1',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  editorContent: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  // Delete Modal Styles
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
  // Note Viewer Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatHeader: {
    backgroundColor: '#6366f1',
    padding: 16,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    maxWidth: '100%',
  },
  chatSubtitle: {
    fontSize: 14,
    color: '#c7d2fe',
    textAlign: 'center',
    marginTop: 2,
  },
  editFromViewerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatMessages: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  chatMessagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#6366f1',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
    marginTop: 4,
  },
  chatInputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 120,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#6366f1',
  },
  sendButtonInactive: {
    backgroundColor: '#d1d5db',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyChatText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  toggleSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 25,
    padding: 4,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 4,
  },
  toggleTextActive: {
    color: '#fff',
  },
  readerContent: {
    flex: 1,
  },
  readerContentContainer: {
    padding: 16,
  },
  readerTitleSection: {
    marginBottom: 16,
  },
  readerNoteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  readerNoteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  readerTextSection: {
    flex: 1,
  },
  readerNoteContent: {
    fontSize: 16,
    color: '#6b7280',
  },
  tagsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tagsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
  },
  priorityContainer: {
    flex: 1,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  priorityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  notePriorityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 4,
    marginRight: 6,
  },
  notePriorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noteTagsWordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  noteTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  noteTag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  noteTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  toolbarHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  previewContainer: {
    flex: 1,
    padding: 4,
  },
  previewText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  formattedTextContainer: {
    flex: 1,
    padding: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  editHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 4,
  },
  // Tags Button Styles
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  tagsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagsButtonText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  // Tags Modal Styles
  tagModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tagModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tagModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  tagModalDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#6366f1',
  },
  tagModalDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tagModalContent: {
    flex: 1,
    padding: 16,
  },
  tagModalSection: {
    marginBottom: 32,
  },
  tagModalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagModalSectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  tagModalInputs: {
    gap: 12,
  },
  tagModalInput: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f8fafc',
  },
  priorityDropdown: {
    gap: 8,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  priorityOptionSelected: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  priorityOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  priorityOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  // Editor scroll view for keyboard handling
  editorScrollView: {
    flex: 1,
  },
  // Editor container styles
  editorContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  editorContent: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contentInput: {
    fontSize: 16,
    color: '#1f2937',
    padding: 16,
    textAlignVertical: 'top',
  },
  // Editor header styles
  editorHeader: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  editorHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  closeModalButton: {
    padding: 8,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Title and tags sections
  titleSection: {
    padding: 16,
    paddingBottom: 8,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  tagsSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  // Toolbar styles
  toolbar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toolbarButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 4,
  },
  toolbarButtonTextActive: {
    color: '#fff',
  },
  toolbarButtonTextItalic: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#6366f1',
  },
  toolbarButtonTextUnderline: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    color: '#6366f1',
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
}); 