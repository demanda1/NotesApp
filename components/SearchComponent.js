import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import fileSystemManager from '../utils/fileSystemManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SearchComponent = ({
  visible,
  onClose,
  searchContext, // 'notebooks', 'collections', 'chapters', 'notes', 'all'
  currentNotebookId = null, // For chapter/note searches
  currentChapterId = null, // For note searches
  onResultSelect,
  placeholder = 'Search...',
  excludeIds = [], // IDs to exclude from results
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCategories, setSearchCategories] = useState({
    notebooks: [],
    collections: [],
    chapters: [],
    notes: [],
    tags: []
  });
  
  const insets = useSafeAreaInsets();

  // Memoize excludeIds to prevent unnecessary re-renders
  const memoizedExcludeIds = useMemo(() => excludeIds, [excludeIds?.join(',')]);

  // Create a ref for the debounce timeout
  const debounceTimeoutRef = useRef(null);

  const performSearch = useCallback(async (query) => {
    const results = {
      notebooks: [],
      collections: [],
      chapters: [],
      notes: [],
      tags: []
    };

    // Search notebooks
    if (searchContext === 'notebooks' || searchContext === 'all') {
      results.notebooks = await fileSystemManager.searchNotebooks(query, memoizedExcludeIds);
    }

    // Search collections
    if (searchContext === 'collections' || searchContext === 'all') {
      results.collections = await fileSystemManager.searchCollections(query, memoizedExcludeIds);
    }

    // Search chapters
    if (searchContext === 'chapters' || searchContext === 'all') {
      results.chapters = await fileSystemManager.searchChapters(query, currentNotebookId, memoizedExcludeIds);
    }

    // Search notes
    if (searchContext === 'notes' || searchContext === 'all') {
      results.notes = await fileSystemManager.searchNotes(query, currentNotebookId, currentChapterId, memoizedExcludeIds);
    }

    // Search tags
    if (searchContext === 'tags' || searchContext === 'all') {
      results.tags = await fileSystemManager.searchTags(query);
    }

    return results;
  }, [searchContext, currentNotebookId, currentChapterId, memoizedExcludeIds]);

  // Stable search function
  const performSearchStable = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchCategories({
        notebooks: [],
        collections: [],
        chapters: [],
        notes: [],
        tags: []
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await performSearch(query);
      setSearchCategories(results);
      
      // Flatten results for main display
      const flatResults = [];
      if (searchContext === 'all') {
        flatResults.push(...results.notebooks);
        flatResults.push(...results.collections);
        flatResults.push(...results.chapters);
        flatResults.push(...results.notes);
      } else if (results[searchContext]) {
        flatResults.push(...results[searchContext]);
      }
      
      setSearchResults(flatResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [performSearch, searchContext]);

  // Debounced search with useEffect
  useEffect(() => {
    // Only search if the modal is visible
    if (!visible) return;

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSearchStable(searchQuery);
    }, 300);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearchStable, visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
      }, []);

  const renderSearchResult = ({ item }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'notebook': return item.icon || 'book-outline';
        case 'collection': return item.icon || 'library-outline';
        case 'chapter': return 'document-text-outline';
        case 'note': return 'document-outline';
        case 'tag': return 'pricetag-outline';
        default: return 'search-outline';
      }
    };

    const getColor = () => {
      switch (item.type) {
        case 'notebook': return item.color || '#6366f1';
        case 'collection': return item.color || '#6366f1';
        case 'chapter': return '#10b981';
        case 'note': return '#f59e0b';
        case 'tag': return '#8b5cf6';
        default: return '#6b7280';
      }
    };

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => onResultSelect(item)}
      >
        <View style={[styles.resultIcon, { backgroundColor: getColor() + '20' }]}>
          <Ionicons name={getIcon()} size={20} color={getColor()} />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title || item.name}
          </Text>
          {item.description && (
            <Text style={styles.resultDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.resultMeta}>
            <Text style={styles.resultType}>{item.type}</Text>
            {item.breadcrumb && (
              <Text style={styles.resultBreadcrumb} numberOfLines={1}>
                {item.breadcrumb}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  const renderCategorySection = (categoryName, items) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.categorySection} key={categoryName}>
        <Text style={styles.categoryHeader}>
          {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} ({items.length})
        </Text>
        {items.slice(0, 3).map((item, index) => (
          <View key={`${item.type}-${item.id}-${index}`}>
            {renderSearchResult({ item })}
          </View>
        ))}
        {items.length > 3 && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>Show {items.length - 3} more...</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchCategories({
      notebooks: [],
      collections: [],
      chapters: [],
      notes: [],
      tags: []
    });
    setIsSearching(false);
    // Clear any pending search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  // Reset search when modal becomes invisible
  useEffect(() => {
    if (!visible) {
      clearSearch();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#6366f1" />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results */}
        <View style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="hourglass-outline" size={24} color="#6366f1" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchQuery.trim() === '' ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Start typing to search</Text>
              <Text style={styles.emptySubtext}>
                {searchContext === 'all' 
                  ? 'Search across notebooks, collections, chapters, and notes'
                  : `Search for ${searchContext}`
                }
              </Text>
            </View>
          ) : searchResults.length === 0 && searchContext !== 'all' ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : (
            <FlatList
              data={searchContext === 'all' ? [] : searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsList}
              ListHeaderComponent={() => 
                searchContext === 'all' ? (
                  <View>
                    {renderCategorySection('notebooks', searchCategories.notebooks)}
                    {renderCategorySection('collections', searchCategories.collections)}
                    {renderCategorySection('chapters', searchCategories.chapters)}
                    {renderCategorySection('notes', searchCategories.notes)}
                    {searchCategories.notebooks.length === 0 && 
                     searchCategories.collections.length === 0 && 
                     searchCategories.chapters.length === 0 && 
                     searchCategories.notes.length === 0 && (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={48} color="#9ca3af" />
                        <Text style={styles.emptyText}>No results found</Text>
                        <Text style={styles.emptySubtext}>Try a different search term</Text>
                      </View>
                    )}
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6366f1',
    marginTop: 8,
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
  resultsList: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  resultBreadcrumb: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  showMoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
});

export default SearchComponent; 