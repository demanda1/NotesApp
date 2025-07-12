import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, Alert } from 'react-native';

// Production Error Handling Utility
class FileSystemError extends Error {
  constructor(message, code, isRecoverable = true) {
    super(message);
    this.name = 'FileSystemError';
    this.code = code;
    this.isRecoverable = isRecoverable;
    this.timestamp = new Date().toISOString();
  }
}

class ErrorHandler {
  static async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry if error is not recoverable
        if (error instanceof FileSystemError && !error.isRecoverable) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
  
  static handleError(error, operation = 'file operation') {
    let userMessage = 'An error occurred while performing the operation.';
    let isRecoverable = true;
    
    if (error.message.includes('Network request failed')) {
      userMessage = 'Network connection lost. Please check your internet connection.';
    } else if (error.message.includes('Permission denied')) {
      userMessage = 'Permission denied. Please check file permissions.';
      isRecoverable = false;
    } else if (error.message.includes('No such file or directory')) {
      userMessage = 'File not found. The requested file may have been moved or deleted.';
    } else if (error.message.includes('Not enough storage')) {
      userMessage = 'Not enough storage space available on your device.';
      isRecoverable = false;
    } else if (error.message.includes('Invalid argument')) {
      userMessage = 'Invalid file operation parameters.';
      isRecoverable = false;
    } else if (error.message.includes('Directory not empty')) {
      userMessage = 'Cannot delete folder as it contains files.';
    }
    
    // Log detailed error in development, minimal in production
    if (__DEV__) {
      console.error(`[${operation}] Error:`, error);
    } else {
      console.error(`[${operation}] Error: ${error.message}`);
    }
    
    return new FileSystemError(userMessage, error.code || 'UNKNOWN', isRecoverable);
  }
}

// Path utility functions for production reliability
class PathUtils {
  static normalizePath(path) {
    if (!path || typeof path !== 'string') {
      throw new FileSystemError('Invalid path provided', 'INVALID_PATH', false);
    }
    
    // Remove multiple slashes and normalize path separators
    return path.replace(/\/+/g, '/').replace(/\\/g, '/');
  }
  
  static validatePath(path) {
    if (!path || typeof path !== 'string') {
      return false;
    }
    
    // More lenient validation for mobile platforms
    // Only check for really dangerous characters, not colons which are common in paths
    const invalidChars = /[<>"|?*\x00-\x1f]/;
    if (invalidChars.test(path)) {
      return false;
    }
    
    // Skip Windows reserved names check on mobile platforms
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return true;
    }
    
    // Check for reserved names (Windows compatibility) only on Windows
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    const pathParts = path.split('/');
    for (const part of pathParts) {
      if (reservedNames.test(part)) {
        return false;
      }
    }
    
    return true;
  }
  
  static sanitizeFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      return 'untitled';
    }
    
    // Remove invalid characters but keep dots for file extensions
    // Only remove really dangerous characters for mobile platforms
    return fileName
      .replace(/[<>"|?*\x00-\x1f]/g, '')
      .replace(/\//g, '_') // Replace forward slashes with underscores
      .substring(0, 100)
      .trim() || 'untitled';
  }
  
  static generateSafePath(basePath, ...segments) {
    // Don't sanitize the base path, only the additional segments
    const normalizedSegments = segments.map(segment => {
      if (typeof segment !== 'string') {
        segment = String(segment);
      }
      return PathUtils.sanitizeFileName(segment);
    });
    
    // Build the full path without sanitizing the base path
    const fullPath = PathUtils.normalizePath([basePath, ...normalizedSegments].join('/'));
    
    // More lenient validation that allows mobile file system paths
    if (!fullPath || fullPath.length === 0) {
      throw new FileSystemError('Generated path is empty', 'EMPTY_PATH', false);
    }
    
    return fullPath;
  }
}

class FileSystemManager {
  constructor() {
    this.appFolderName = 'NotesApp';
    this.hierarchyFileName = 'hierarchy.json';
    this.basePath = null;
    this.hierarchyPath = null;
    this.customStoragePath = null;
    this.initialized = false;
  }

  async initialize() {
    return await ErrorHandler.withRetry(async () => {
      try {
        // Check if user has set a custom storage path
        this.customStoragePath = await this.getCustomStoragePath();
        
        if (this.customStoragePath && Platform.OS === 'android') {
          // Use custom storage path
          this.basePath = PathUtils.normalizePath(this.customStoragePath + '/NotesApp/');
        } else {
          // Use default document directory
          this.basePath = PathUtils.normalizePath(FileSystem.documentDirectory + this.appFolderName + '/');
        }
        
        this.hierarchyPath = PathUtils.normalizePath(this.basePath + this.hierarchyFileName);
        
        // Create the NotesApp folder if it doesn't exist
        if (this.customStoragePath && Platform.OS === 'android') {
          try {
            await FileSystem.StorageAccessFramework.createFileAsync(
              this.customStoragePath,
              'NotesApp',
              'directory'
            );
          } catch (error) {
            // NotesApp directory may already exist in custom location
            if (!error.message.includes('already exists')) {
              throw ErrorHandler.handleError(error, 'create app directory');
            }
          }
        } else {
          const folderInfo = await FileSystem.getInfoAsync(this.basePath);
          if (!folderInfo.exists) {
            await FileSystem.makeDirectoryAsync(this.basePath, { intermediates: true });
          }
        }
        
        // Initialize hierarchy file if it doesn't exist
        await this.initializeHierarchy();
        
        this.initialized = true;
        return true;
      } catch (error) {
        const fsError = error instanceof FileSystemError ? error : ErrorHandler.handleError(error, 'initialize file system');
        
        // Show user-friendly error message
        if (Platform.OS === 'android') {
          Alert.alert(
            'File System Error',
            `Failed to initialize NotesApp storage: ${fsError.message}. The app will use default storage.`,
            [{ text: 'OK' }]
          );
        }
        
        // Try fallback to default storage
        if (this.customStoragePath) {
          this.customStoragePath = null;
          this.basePath = PathUtils.normalizePath(FileSystem.documentDirectory + this.appFolderName + '/');
          this.hierarchyPath = PathUtils.normalizePath(this.basePath + this.hierarchyFileName);
          
          try {
            const folderInfo = await FileSystem.getInfoAsync(this.basePath);
            if (!folderInfo.exists) {
              await FileSystem.makeDirectoryAsync(this.basePath, { intermediates: true });
            }
            await this.initializeHierarchy();
            this.initialized = true;
            return true;
          } catch (fallbackError) {
            throw ErrorHandler.handleError(fallbackError, 'initialize fallback storage');
          }
        }
        
        throw fsError;
      }
    }, 2, 1500);
  }

  async forceRefresh() {
    try {
      // Clear initialization flag to force complete re-initialization
      this.initialized = false;
      
      // Clear any cached paths
      this.customStoragePath = null;
      this.basePath = null;
      this.hierarchyPath = null;
      
      // Re-initialize everything
      await this.initialize();
      
      return true;
    } catch (error) {
      console.error('Failed to force refresh file system:', error);
      return false;
    }
  }

  async initializeHierarchy() {
    try {
      if (this.customStoragePath && Platform.OS === 'android') {
        // For custom storage paths, use Storage Access Framework
        try {
          // First check if hierarchy file already exists
          const notesAppUri = this.customStoragePath + '/NotesApp';
          const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(notesAppUri);
          const hierarchyExists = files.some(file => file.name === this.hierarchyFileName);
          
          if (!hierarchyExists) {
            // Create the hierarchy file
            const hierarchyFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              notesAppUri,
              this.hierarchyFileName,
              'application/json'
            );
            
            // Create initial hierarchy structure
            const initialHierarchy = {
              version: '1.0',
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              structure: {
                notebooks: {},
                collections: {},
                revisions: {}
              },
              metadata: {
                totalNotes: 0,
                totalCollections: 0
              }
            };
            
            await FileSystem.writeAsStringAsync(
              hierarchyFileUri,
              JSON.stringify(initialHierarchy, null, 2)
            );
            
            this.hierarchyPath = hierarchyFileUri;
          } else {
            // File exists, construct the path
            this.hierarchyPath = notesAppUri + '/' + this.hierarchyFileName;
          }
        } catch (error) {
          // Fallback to constructed path
          this.hierarchyPath = this.customStoragePath + '/NotesApp/' + this.hierarchyFileName;
        }
      } else {
        // Use standard file system for default location
        const hierarchyInfo = await FileSystem.getInfoAsync(this.hierarchyPath);
        
        if (!hierarchyInfo.exists) {
          // Create initial hierarchy structure
          const initialHierarchy = {
            version: '1.0',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            structure: {
              notebooks: {},
              collections: {},
              revisions: {}
            },
            metadata: {
              totalNotes: 0,
              totalCollections: 0
            }
          };
          
          await FileSystem.writeAsStringAsync(
            this.hierarchyPath,
            JSON.stringify(initialHierarchy, null, 2)
          );
        }
      }
    } catch (error) {
      console.error('Failed to initialize hierarchy:', error);
      throw error;
    }
  }

  async getHierarchy() {
    return await ErrorHandler.withRetry(async () => {
      try {
        if (!this.initialized) {
          await this.initialize();
        }
        
        // Check if hierarchy file exists
        const hierarchyInfo = await FileSystem.getInfoAsync(this.hierarchyPath);
        if (!hierarchyInfo.exists) {
          // Try to recreate hierarchy file if it doesn't exist
          await this.initializeHierarchy();
          const newHierarchyInfo = await FileSystem.getInfoAsync(this.hierarchyPath);
          if (!newHierarchyInfo.exists) {
            throw new FileSystemError('Unable to create or access hierarchy file', 'HIERARCHY_ACCESS_ERROR', false);
          }
        }
        
        const hierarchyContent = await FileSystem.readAsStringAsync(this.hierarchyPath);
        
        // Validate JSON structure
        let hierarchy;
        try {
          hierarchy = JSON.parse(hierarchyContent);
        } catch (parseError) {
          throw new FileSystemError('Hierarchy file is corrupted. Please restore from backup.', 'HIERARCHY_CORRUPTED', false);
        }
        
        // Validate hierarchy structure
        if (!hierarchy.structure || !hierarchy.structure.notebooks) {
          throw new FileSystemError('Hierarchy file has invalid structure', 'HIERARCHY_INVALID_STRUCTURE', false);
        }
        
        return hierarchy;
      } catch (error) {
        const fsError = error instanceof FileSystemError ? error : ErrorHandler.handleError(error, 'read hierarchy');
        
        // For critical errors, show user-friendly message
        if (!fsError.isRecoverable) {
          Alert.alert(
            'Data Access Error',
            `Cannot access your notes data: ${fsError.message}. Please check your storage permissions or restore from backup.`,
            [{ text: 'OK' }]
          );
        }
        
        // Return null to allow app to continue with empty state
        return null;
      }
    }, 3, 1000);
  }

  async updateHierarchy(updatedHierarchy) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      updatedHierarchy.lastModified = new Date().toISOString();
      
      await FileSystem.writeAsStringAsync(
        this.hierarchyPath,
        JSON.stringify(updatedHierarchy, null, 2)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to update hierarchy:', error);
      return false;
    }
  }

  async createNotebook(notebookData) {
    try {
      const notebookId = Date.now().toString();
      const sanitizedTitle = PathUtils.sanitizeFileName(notebookData.title || 'Untitled Notebook');
      const notebookPath = `/notebooks/${notebookId}`;
      const fullPath = PathUtils.normalizePath(this.basePath + `notebooks/${notebookId}`);
      
      // Create notebook directory
      await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
      
      // Create chapters directory
      const chaptersPath = PathUtils.normalizePath(fullPath + '/chapters');
      await FileSystem.makeDirectoryAsync(chaptersPath, { intermediates: true });
      
      // Create metadata.json
      const metadata = {
        id: notebookId,
        title: notebookData.title || 'Untitled Notebook',
        description: notebookData.description || '',
        tags: notebookData.tags || [],
        color: notebookData.color || '#6366f1',
        icon: notebookData.icon || 'book-outline',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        notesCount: 0,
        chaptersCount: 0
      };
      
      const metadataPath = PathUtils.normalizePath(fullPath + '/metadata.json');
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(metadata, null, 2)
      );
      
      // Update hierarchy
      const hierarchy = await this.getHierarchy();
      if (hierarchy) {
        hierarchy.structure.notebooks[notebookId] = {
          path: notebookPath,
          ...metadata
        };
        hierarchy.metadata.totalNotes++;
        await this.updateHierarchy(hierarchy);
      }
      
      return { success: true, notebookId };
    } catch (error) {
      console.error('Failed to create notebook:', error);
      return { success: false, error: error.message };
    }
  }

  async createChapter(notebookId, chapterData) {
    try {
      const chapterId = Date.now().toString();
      const chapterPath = `/notebooks/${notebookId}/chapters/${chapterId}`;
      const fullPath = this.basePath + chapterPath;
      
      // Create chapter directory
      await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
      
      // Create chapter metadata.json
      const metadata = {
        id: chapterId,
        notebookId: notebookId,
        title: chapterData.title,
        description: chapterData.description || '',
        color: chapterData.color || '#6366f1',
        chapterNumber: chapterData.chapterNumber || 1,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        notesCount: 0
      };
      
      await FileSystem.writeAsStringAsync(
        fullPath + '/metadata.json',
        JSON.stringify(metadata, null, 2)
      );
      
      // Update hierarchy
      const hierarchy = await this.getHierarchy();
      if (hierarchy && hierarchy.structure.notebooks[notebookId]) {
        if (!hierarchy.structure.notebooks[notebookId].chapters) {
          hierarchy.structure.notebooks[notebookId].chapters = {};
        }
        hierarchy.structure.notebooks[notebookId].chapters[chapterId] = {
          path: chapterPath,
          ...metadata
        };
        hierarchy.structure.notebooks[notebookId].chaptersCount = 
          (hierarchy.structure.notebooks[notebookId].chaptersCount || 0) + 1;
        hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
        
        await this.updateHierarchy(hierarchy);
      }
      
      return { success: true, chapterId };
    } catch (error) {
      console.error('Failed to create chapter:', error);
      return { success: false, error: error.message };
    }
  }

  async getChapters(notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId]) {
        return [];
      }
      
      const notebook = hierarchy.structure.notebooks[notebookId];
      if (!notebook.chapters) {
        return [];
      }
      
      const chapters = Object.entries(notebook.chapters)
        .filter(([id, chapter]) => !chapter.deleted)
        .map(([id, chapter]) => ({
          id: id,
          ...chapter
        }));
      
      // Sort by last modified date
      chapters.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      
      return chapters;
    } catch (error) {
      console.error('Failed to get chapters:', error);
      return [];
    }
  }

  async softDeleteChapter(notebookId, chapterId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId] || 
          !hierarchy.structure.notebooks[notebookId].chapters[chapterId]) {
        return { success: false, error: 'Chapter not found' };
      }
      
      // Mark as deleted instead of actually deleting
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].deleted = true;
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].deletedAt = new Date().toISOString();
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].lastModified = new Date().toISOString();
      hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to soft delete chapter:', error);
      return { success: false, error: error.message };
    }
  }

  async createNote(notebookId, chapterId, noteData) {
    try {
      const noteId = Date.now().toString();
      const notePath = `/notebooks/${notebookId}/chapters/${chapterId}/notes/${noteId}`;
      const fullPath = this.basePath + notePath;
      
      // Create note directory
      await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
      
      // Create note content and metadata
      const metadata = {
        id: noteId,
        notebookId: notebookId,
        chapterId: chapterId,
        title: noteData.title,
        content: noteData.content || '',
        tags: noteData.tags || [],
        paragraphs: noteData.paragraphs || [{ id: Date.now().toString(), text: noteData.content || '', timestamp: new Date().toISOString() }],
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      await FileSystem.writeAsStringAsync(
        fullPath + '/metadata.json',
        JSON.stringify(metadata, null, 2)
      );
      
      await FileSystem.writeAsStringAsync(
        fullPath + '/content.txt',
        noteData.content || ''
      );
      
      // Update hierarchy
      const hierarchy = await this.getHierarchy();
      if (hierarchy && hierarchy.structure.notebooks[notebookId] && 
          hierarchy.structure.notebooks[notebookId].chapters[chapterId]) {
        
        if (!hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes) {
          hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes = {};
        }
        
        hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes[noteId] = {
          path: notePath,
          ...metadata
        };
        
        // Update notes count
        hierarchy.structure.notebooks[notebookId].chapters[chapterId].notesCount = 
          (hierarchy.structure.notebooks[notebookId].chapters[chapterId].notesCount || 0) + 1;
        
        // Update timestamps
        hierarchy.structure.notebooks[notebookId].chapters[chapterId].lastModified = new Date().toISOString();
        hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
        
        await this.updateHierarchy(hierarchy);
      }
      
      return { success: true, noteId };
    } catch (error) {
      console.error('Failed to create note:', error);
      return { success: false, error: error.message };
    }
  }

  async getNotes(notebookId, chapterId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId] || 
          !hierarchy.structure.notebooks[notebookId].chapters[chapterId]) {
        return [];
      }
      
      const chapter = hierarchy.structure.notebooks[notebookId].chapters[chapterId];
      if (!chapter.notes) {
        return [];
      }
      
      const notes = Object.entries(chapter.notes)
        .filter(([id, note]) => !note.deleted)
        .map(([id, note]) => ({
          id: id,
          ...note
        }));
      
      // Sort by last modified date
      notes.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      
      return notes;
    } catch (error) {
      console.error('Failed to get notes:', error);
      return [];
    }
  }

  async updateNote(notebookId, chapterId, noteId, noteData) {
    return await ErrorHandler.withRetry(async () => {
      try {

        
        // Validate input parameters
        if (!notebookId || !chapterId || !noteId || !noteData) {
          throw new FileSystemError('Invalid parameters provided for note update', 'INVALID_PARAMS', false);
        }
        
        const hierarchy = await this.getHierarchy();
        if (!hierarchy || !hierarchy.structure.notebooks[notebookId] || 
            !hierarchy.structure.notebooks[notebookId].chapters[chapterId] ||
            !hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes[noteId]) {
          throw new FileSystemError('Note not found in the system', 'NOTE_NOT_FOUND', false);
        }
        
        // Update note in hierarchy
        const note = hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes[noteId];
        note.title = noteData.title;
        note.content = noteData.content || '';
        note.tags = noteData.tags || note.tags || [];
        note.paragraphs = noteData.paragraphs || note.paragraphs || [];
        note.lastModified = new Date().toISOString();
        
        // Update timestamps
        hierarchy.structure.notebooks[notebookId].chapters[chapterId].lastModified = new Date().toISOString();
        hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
        
        // Update note files
        const notePath = this.basePath + note.path;
        
        const metadata = {
          id: noteId,
          notebookId: notebookId,
          chapterId: chapterId,
          title: noteData.title,
          content: noteData.content || '',
          tags: noteData.tags || note.tags || [],
          paragraphs: noteData.paragraphs || note.paragraphs || [],
          created: note.created,
          lastModified: new Date().toISOString()
        };
        
        // Check if the note directory exists, create if it doesn't
        const noteDir = notePath.substring(0, notePath.lastIndexOf('/'));
        const noteDirInfo = await FileSystem.getInfoAsync(noteDir);
        
        if (!noteDirInfo.exists) {
          await FileSystem.makeDirectoryAsync(noteDir, { intermediates: true });
        }
        
        // Write files atomically (write to temp files first, then move)
        const metadataPath = notePath + '/metadata.json';
        const contentPath = notePath + '/content.txt';
        const tempMetadataPath = metadataPath + '.tmp';
        const tempContentPath = contentPath + '.tmp';
        
        try {
          // Write to temporary files first
          await FileSystem.writeAsStringAsync(
            tempMetadataPath,
            JSON.stringify(metadata, null, 2)
          );
          
          await FileSystem.writeAsStringAsync(
            tempContentPath,
            noteData.content || ''
          );
          
          // Move temporary files to final location (atomic operation)
          await FileSystem.moveAsync({
            from: tempMetadataPath,
            to: metadataPath
          });
          
          await FileSystem.moveAsync({
            from: tempContentPath,
            to: contentPath
          });
          
        } catch (writeError) {
          // Clean up temporary files on error
          try {
            await FileSystem.deleteAsync(tempMetadataPath, { idempotent: true });
            await FileSystem.deleteAsync(tempContentPath, { idempotent: true });
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          throw writeError;
        }
        
        // Update hierarchy
        await this.updateHierarchy(hierarchy);
        
        return { success: true };
      } catch (error) {
        const fsError = error instanceof FileSystemError ? error : ErrorHandler.handleError(error, 'update note');
        
        // Show user-friendly error message for critical errors
        if (!fsError.isRecoverable) {
          Alert.alert(
            'Unable to Save Note',
            `Failed to save your note: ${fsError.message}. Please try again or check your storage permissions.`,
            [{ text: 'OK' }]
          );
        }
        
        return { success: false, error: fsError.message };
      }
    }, 2, 1000);
  }

  async softDeleteNote(notebookId, chapterId, noteId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId] || 
          !hierarchy.structure.notebooks[notebookId].chapters[chapterId] ||
          !hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes[noteId]) {
        return { success: false, error: 'Note not found' };
      }
      
      // Mark as deleted
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes[noteId].deleted = true;
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].notes[noteId].deletedAt = new Date().toISOString();
      
      // Update notes count
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].notesCount = 
        Math.max(0, (hierarchy.structure.notebooks[notebookId].chapters[chapterId].notesCount || 0) - 1);
      
      // Update timestamps
      hierarchy.structure.notebooks[notebookId].chapters[chapterId].lastModified = new Date().toISOString();
      hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to soft delete note:', error);
      return { success: false, error: error.message };
    }
  }



  async exportData() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const hierarchy = await this.getHierarchy();
      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        hierarchy: hierarchy,
        files: {}
      };
      
      // Get all files in the NotesApp directory
      const getAllFiles = async (dirPath, relativePath = '') => {
        const items = await FileSystem.readDirectoryAsync(dirPath);
        
        for (const item of items) {
          const itemPath = dirPath + item;
          const itemInfo = await FileSystem.getInfoAsync(itemPath);
          
          if (itemInfo.isDirectory) {
            await getAllFiles(itemPath + '/', relativePath + item + '/');
          } else {
            const content = await FileSystem.readAsStringAsync(itemPath);
            exportData.files[relativePath + item] = content;
          }
        }
      };
      
      await getAllFiles(this.basePath);
      
      const exportPath = this.basePath + `export_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(exportPath, JSON.stringify(exportData, null, 2));
      
      return { success: true, path: exportPath };
    } catch (error) {
      console.error('Failed to export data:', error);
      return { success: false, error: error.message };
    }
  }

  async getStats() {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy) return null;
      
      return {
        totalNotebooks: Object.keys(hierarchy.structure.notebooks).length,
        totalNotes: Object.values(hierarchy.structure.notebooks).reduce((sum, notebook) => sum + notebook.notesCount, 0),
        totalNotebookCollections: Object.keys(hierarchy.structure.notebookCollections || {}).length,
        folderPath: this.basePath,
        lastModified: hierarchy.lastModified
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  async setDefaultFileLocation() {
    try {
      if (Platform.OS === 'android') {
        // Request storage access permissions to select a directory
        const { status, directoryUri } = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (status === 'granted' && directoryUri) {
          // Store the selected directory URI in app preferences
          const settingsPath = FileSystem.documentDirectory + 'app_settings.json';
          const settings = {
            customStoragePath: directoryUri,
            lastModified: new Date().toISOString()
          };
          
          await FileSystem.writeAsStringAsync(settingsPath, JSON.stringify(settings, null, 2));
          
          // Update the current instance paths
          this.customStoragePath = directoryUri;
          this.basePath = directoryUri + '/NotesApp/';
          this.hierarchyPath = this.basePath + this.hierarchyFileName;
          
          // Create NotesApp folder in the new location
          try {
            await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              'NotesApp',
              'directory'
            );
          } catch (error) {
            console.log('Directory may already exist:', error.message);
          }
          
          // Initialize hierarchy in the new location
          await this.initializeHierarchy();
          
          return { 
            success: true, 
            path: directoryUri,
            message: 'Default file location updated successfully'
          };
        } else {
          return { 
            success: false, 
            error: 'Permission denied to access storage location' 
          };
        }
      } else {
        // iOS - Cannot change default location, show info
        return { 
          success: false, 
          error: 'Custom storage location is not available on iOS. Files are stored in the app\'s document directory.' 
        };
      }
    } catch (error) {
      console.error('Failed to set default file location:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomStoragePath() {
    try {
      const settingsPath = FileSystem.documentDirectory + 'app_settings.json';
      const settingsInfo = await FileSystem.getInfoAsync(settingsPath);
      
      if (settingsInfo.exists) {
        const settingsContent = await FileSystem.readAsStringAsync(settingsPath);
        const settings = JSON.parse(settingsContent);
        return settings.customStoragePath || null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get custom storage path:', error);
      return null;
    }
  }

  async shareHierarchyFile() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get the hierarchy data directly using the getHierarchy method
      const hierarchyData = await this.getHierarchy();
      if (!hierarchyData) {
        return { success: false, error: 'No hierarchy data found' };
      }
      
      // Create a comprehensive backup object
      const backupData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        platform: Platform.OS,
        storageLocation: this.basePath,
        hierarchy: hierarchyData
      };
      
      // Convert to JSON string
      const backupContent = JSON.stringify(backupData, null, 2);
      
      // Validate content is not empty
      if (!backupContent || backupContent.length < 10) {
        return { success: false, error: 'Backup content is empty or invalid' };
      }
      
      // Create a temporary copy in the app's document directory for sharing
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const tempFileName = `NotesApp_Backup_${timestamp}.json`;
      const tempFilePath = FileSystem.documentDirectory + tempFileName;
      
      // Write to temporary file
      await FileSystem.writeAsStringAsync(tempFilePath, backupContent);
      
      // Verify the file was created with content
      const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
      if (!fileInfo.exists || fileInfo.size === 0) {
        return { success: false, error: 'Failed to create backup file with content' };
      }
      
      console.log(`Backup file created: ${tempFileName}, Size: ${fileInfo.size} bytes`);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Sharing is not available on this device' };
      }
      
      // Share the file
      await Sharing.shareAsync(tempFilePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share NotesApp Backup',
        UTI: 'public.json',
      });
      
      // Clean up temporary file after a short delay
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch (error) {
          console.log('Failed to clean up temporary file:', error);
        }
      }, 5000);
      
      return { 
        success: true, 
        message: 'Hierarchy file shared successfully',
        filename: tempFileName,
        size: fileInfo.size
      };
    } catch (error) {
      console.error('Failed to share hierarchy file:', error);
      return { success: false, error: error.message };
    }
  }

  async restoreFromBackup() {
    try {
      // Open document picker to select backup file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return { 
          success: false, 
          error: 'File selection cancelled', 
          helpText: 'To restore your data:\n1. Make sure you have the backup JSON file\n2. Save it to Downloads or Google Drive\n3. Try again and look for files with .json extension'
        };
      }

      // Get the selected file
      const selectedFile = result.assets[0];
      if (!selectedFile) {
        return { success: false, error: 'No file selected' };
      }

      // Validate file extension
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.json')) {
        return { success: false, error: 'Please select a JSON file (.json extension)' };
      }

      // Read the backup file content
      const backupContent = await FileSystem.readAsStringAsync(selectedFile.uri);
      
      if (!backupContent) {
        return { success: false, error: 'Backup file is empty' };
      }

      // Parse the backup data
      let backupData;
      try {
        backupData = JSON.parse(backupContent);
      } catch (parseError) {
        return { success: false, error: 'Invalid backup file format' };
      }

      // Validate backup structure
      if (!backupData.hierarchy || !backupData.hierarchy.structure) {
        return { success: false, error: 'Invalid backup file structure' };
      }

      // Ensure file system is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Create a backup of current data before restore
      const currentHierarchy = await this.getHierarchy();
      if (currentHierarchy) {
        const backupPath = FileSystem.documentDirectory + `current_backup_${Date.now()}.json`;
        await FileSystem.writeAsStringAsync(backupPath, JSON.stringify(currentHierarchy, null, 2));
        console.log('Current data backed up to:', backupPath);
      }

      // Restore the hierarchy data
      const restoredHierarchy = {
        ...backupData.hierarchy,
        lastModified: new Date().toISOString(),
        restored: true,
        restoredAt: new Date().toISOString(),
        originalExportDate: backupData.exportDate,
        originalPlatform: backupData.platform
      };

      // Save the restored hierarchy
      const success = await this.updateHierarchy(restoredHierarchy);
      
      if (!success) {
        return { success: false, error: 'Failed to save restored data' };
      }

      // Force refresh file system to ensure proper initialization
      await this.forceRefresh();
      
      // Create the complete file system structure
      const reconstructResult = await this.reconstructFileSystemStructure(restoredHierarchy);
      
      if (!reconstructResult.success) {
        return { success: false, error: 'Failed to reconstruct file system structure: ' + reconstructResult.error };
      }

      // Count restored items
      const restoredNotebooks = Object.keys(restoredHierarchy.structure.notebooks || {}).length;
      const restoredCollections = Object.keys(restoredHierarchy.structure.collections || {}).length;

      return {
        success: true,
        message: 'Data restored successfully',
        restoredNotebooks,
        restoredCollections,
        exportDate: backupData.exportDate,
        originalPlatform: backupData.platform,
        reconstructedFiles: reconstructResult.filesCreated
      };

    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return { success: false, error: error.message };
    }
  }

  async reconstructFileSystemStructure(hierarchy) {
    try {
      let filesCreated = 0;
      
      console.log('Starting file system reconstruction...');
      console.log('Base path:', this.basePath);
      console.log('Custom storage path:', this.customStoragePath);
      console.log('Platform:', Platform.OS);
      
      // Create notebook directories and files
      if (hierarchy.structure.notebooks) {
        for (const [notebookId, notebook] of Object.entries(hierarchy.structure.notebooks)) {
          if (notebook.deleted) continue;
          
          console.log(`Reconstructing notebook: ${notebookId}`);
          
          // Use the same directory creation method as createNotebook
          const notebookPath = `/notebooks/${notebookId}`;
          const fullPath = this.basePath + notebookPath;
          
          // Create notebook directory
          if (this.customStoragePath && Platform.OS === 'android') {
            // For custom storage paths, use Storage Access Framework
            try {
              const notesAppUri = this.customStoragePath + '/NotesApp';
              const notebooksUri = notesAppUri + '/notebooks';
              
              // Create notebooks directory if it doesn't exist
              try {
                await FileSystem.StorageAccessFramework.createFileAsync(
                  notesAppUri,
                  'notebooks',
                  'directory'
                );
              } catch (error) {
                // Directory may already exist
              }
              
              // Create notebook directory
              try {
                await FileSystem.StorageAccessFramework.createFileAsync(
                  notebooksUri,
                  notebookId,
                  'directory'
                );
              } catch (error) {
                // Directory may already exist
              }
            } catch (error) {
              console.error('Failed to create notebook directory with SAF:', error);
            }
          } else {
            // Use standard file system for default location
            await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
            await FileSystem.makeDirectoryAsync(fullPath + '/chapters', { intermediates: true });
          }
          
          // Create notebook metadata file
          const notebookMetadata = {
            id: notebookId,
            title: notebook.title,
            description: notebook.description || '',
            color: notebook.color || '#6b7280',
            icon: notebook.icon || 'book-outline',
            created: notebook.created,
            lastModified: notebook.lastModified
          };
          
          if (this.customStoragePath && Platform.OS === 'android') {
            // For custom storage paths, use Storage Access Framework
            try {
              const notebookUri = this.customStoragePath + '/NotesApp/notebooks/' + notebookId;
              const metadataUri = await FileSystem.StorageAccessFramework.createFileAsync(
                notebookUri,
                'metadata.json',
                'application/json'
              );
              await FileSystem.writeAsStringAsync(
                metadataUri,
                JSON.stringify(notebookMetadata, null, 2)
              );
            } catch (error) {
              console.error('Failed to create notebook metadata with SAF:', error);
            }
          } else {
            await FileSystem.writeAsStringAsync(
              fullPath + '/metadata.json',
              JSON.stringify(notebookMetadata, null, 2)
            );
          }
          filesCreated++;
          
          // Create chapters
          if (notebook.chapters) {
            for (const [chapterId, chapter] of Object.entries(notebook.chapters)) {
              if (chapter.deleted) continue;
              
              console.log(`Reconstructing chapter: ${chapterId}`);
              
              // Create chapter directory
              if (this.customStoragePath && Platform.OS === 'android') {
                try {
                  const notebookUri = this.customStoragePath + '/NotesApp/notebooks/' + notebookId;
                  const chaptersUri = notebookUri + '/chapters';
                  
                  // Create chapters directory if it doesn't exist
                  try {
                    await FileSystem.StorageAccessFramework.createFileAsync(
                      notebookUri,
                      'chapters',
                      'directory'
                    );
                  } catch (error) {
                    // Directory may already exist
                  }
                  
                  // Create chapter directory
                  try {
                    await FileSystem.StorageAccessFramework.createFileAsync(
                      chaptersUri,
                      chapterId,
                      'directory'
                    );
                  } catch (error) {
                    // Directory may already exist
                  }
                } catch (error) {
                  console.error('Failed to create chapter directory with SAF:', error);
                }
              } else {
                const chapterPath = fullPath + `/chapters/${chapterId}`;
                await FileSystem.makeDirectoryAsync(chapterPath, { intermediates: true });
                await FileSystem.makeDirectoryAsync(chapterPath + '/notes', { intermediates: true });
              }
              
              // Create chapter metadata file
              const chapterMetadata = {
                id: chapterId,
                notebookId: notebookId,
                title: chapter.title,
                description: chapter.description || '',
                created: chapter.created,
                lastModified: chapter.lastModified
              };
              
              if (this.customStoragePath && Platform.OS === 'android') {
                try {
                  const chapterUri = this.customStoragePath + '/NotesApp/notebooks/' + notebookId + '/chapters/' + chapterId;
                  const metadataUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    chapterUri,
                    'metadata.json',
                    'application/json'
                  );
                  await FileSystem.writeAsStringAsync(
                    metadataUri,
                    JSON.stringify(chapterMetadata, null, 2)
                  );
                } catch (error) {
                  console.error('Failed to create chapter metadata with SAF:', error);
                }
              } else {
                const chapterPath = fullPath + `/chapters/${chapterId}`;
                await FileSystem.writeAsStringAsync(
                  chapterPath + '/metadata.json',
                  JSON.stringify(chapterMetadata, null, 2)
                );
              }
              filesCreated++;
              
              // Create notes
              if (chapter.notes) {
                for (const [noteId, note] of Object.entries(chapter.notes)) {
                  if (note.deleted) continue;
                  
                  console.log(`Reconstructing note: ${noteId}`);
                  
                  // Create note directory
                  if (this.customStoragePath && Platform.OS === 'android') {
                    try {
                      const chapterUri = this.customStoragePath + '/NotesApp/notebooks/' + notebookId + '/chapters/' + chapterId;
                      const notesUri = chapterUri + '/notes';
                      
                      // Create notes directory if it doesn't exist
                      try {
                        await FileSystem.StorageAccessFramework.createFileAsync(
                          chapterUri,
                          'notes',
                          'directory'
                        );
                      } catch (error) {
                        // Directory may already exist
                      }
                      
                      // Create note directory
                      try {
                        await FileSystem.StorageAccessFramework.createFileAsync(
                          notesUri,
                          noteId,
                          'directory'
                        );
                      } catch (error) {
                        // Directory may already exist
                      }
                    } catch (error) {
                      console.error('Failed to create note directory with SAF:', error);
                    }
                  } else {
                    const notePath = fullPath + `/chapters/${chapterId}/notes/${noteId}`;
                    await FileSystem.makeDirectoryAsync(notePath, { intermediates: true });
                  }
                  
                  // Create note metadata file
                  const noteMetadata = {
                    id: noteId,
                    notebookId: notebookId,
                    chapterId: chapterId,
                    title: note.title,
                    content: note.content || '',
                    tags: note.tags || [],
                    paragraphs: note.paragraphs || [{ 
                      id: Date.now().toString(), 
                      text: note.content || '', 
                      timestamp: new Date().toISOString() 
                    }],
                    created: note.created,
                    lastModified: note.lastModified
                  };
                  
                  if (this.customStoragePath && Platform.OS === 'android') {
                    try {
                      const noteUri = this.customStoragePath + '/NotesApp/notebooks/' + notebookId + '/chapters/' + chapterId + '/notes/' + noteId;
                      
                      // Create metadata file
                      const metadataUri = await FileSystem.StorageAccessFramework.createFileAsync(
                        noteUri,
                        'metadata.json',
                        'application/json'
                      );
                      await FileSystem.writeAsStringAsync(
                        metadataUri,
                        JSON.stringify(noteMetadata, null, 2)
                      );
                      
                      // Create content file
                      const contentUri = await FileSystem.StorageAccessFramework.createFileAsync(
                        noteUri,
                        'content.txt',
                        'text/plain'
                      );
                      await FileSystem.writeAsStringAsync(
                        contentUri,
                        note.content || ''
                      );
                    } catch (error) {
                      console.error('Failed to create note files with SAF:', error);
                    }
                  } else {
                    const notePath = fullPath + `/chapters/${chapterId}/notes/${noteId}`;
                    await FileSystem.writeAsStringAsync(
                      notePath + '/metadata.json',
                      JSON.stringify(noteMetadata, null, 2)
                    );
                    await FileSystem.writeAsStringAsync(
                      notePath + '/content.txt',
                      note.content || ''
                    );
                  }
                  filesCreated += 2;
                }
              }
            }
          }
        }
      }
      
      // Create collection directories and files
      if (hierarchy.structure.collections) {
        for (const [collectionId, collection] of Object.entries(hierarchy.structure.collections)) {
          if (collection.deleted) continue;
          
          console.log(`Reconstructing collection: ${collectionId}`);
          
          // Create collection directory
          if (this.customStoragePath && Platform.OS === 'android') {
            try {
              const notesAppUri = this.customStoragePath + '/NotesApp';
              const collectionsUri = notesAppUri + '/collections';
              
              // Create collections directory if it doesn't exist
              try {
                await FileSystem.StorageAccessFramework.createFileAsync(
                  notesAppUri,
                  'collections',
                  'directory'
                );
              } catch (error) {
                // Directory may already exist
              }
              
              // Create collection directory
              try {
                await FileSystem.StorageAccessFramework.createFileAsync(
                  collectionsUri,
                  collectionId,
                  'directory'
                );
              } catch (error) {
                // Directory may already exist
              }
            } catch (error) {
              console.error('Failed to create collection directory with SAF:', error);
            }
          } else {
            const collectionPath = this.basePath + `/collections/${collectionId}`;
            await FileSystem.makeDirectoryAsync(collectionPath, { intermediates: true });
          }
          
          // Create collection metadata file
          const collectionMetadata = {
            id: collectionId,
            name: collection.name,
            description: collection.description || '',
            color: collection.color || '#6b7280',
            icon: collection.icon || 'library-outline',
            notebooks: collection.notebooks || [],
            created: collection.created,
            lastModified: collection.lastModified
          };
          
          if (this.customStoragePath && Platform.OS === 'android') {
            try {
              const collectionUri = this.customStoragePath + '/NotesApp/collections/' + collectionId;
              const metadataUri = await FileSystem.StorageAccessFramework.createFileAsync(
                collectionUri,
                'metadata.json',
                'application/json'
              );
              await FileSystem.writeAsStringAsync(
                metadataUri,
                JSON.stringify(collectionMetadata, null, 2)
              );
            } catch (error) {
              console.error('Failed to create collection metadata with SAF:', error);
            }
          } else {
            const collectionPath = this.basePath + `/collections/${collectionId}`;
            await FileSystem.writeAsStringAsync(
              collectionPath + '/metadata.json',
              JSON.stringify(collectionMetadata, null, 2)
            );
          }
          filesCreated++;
        }
      }
      
      console.log(`File system reconstruction completed. Files created: ${filesCreated}`);
      
      return {
        success: true,
        filesCreated: filesCreated
      };
      
    } catch (error) {
      console.error('Failed to reconstruct file system structure:', error);
      return {
        success: false,
        error: error.message,
        filesCreated: 0
      };
    }
  }

  async deleteItem(type, id) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy) return false;
      
      let itemPath;
      
      switch (type) {
        case 'notebook':
          if (hierarchy.structure.notebooks[id]) {
            itemPath = this.basePath + hierarchy.structure.notebooks[id].path;
            delete hierarchy.structure.notebooks[id];
            hierarchy.metadata.totalNotes--;
          }
          break;
        case 'collection':
          if (hierarchy.structure.collections[id]) {
            itemPath = this.basePath + hierarchy.structure.collections[id].path;
            delete hierarchy.structure.collections[id];
            hierarchy.metadata.totalCollections--;
          }
          break;
        default:
          return false;
      }
      
      if (itemPath) {
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        if (itemInfo.exists) {
          await FileSystem.deleteAsync(itemPath, { idempotent: true });
        }
        
        await this.updateHierarchy(hierarchy);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete item:', error);
      return false;
    }
  }

  async softDeleteNotebook(notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId]) {
        return { success: false, error: 'Notebook not found' };
      }
      
      // Mark as deleted instead of actually deleting
      hierarchy.structure.notebooks[notebookId].deleted = true;
      hierarchy.structure.notebooks[notebookId].deletedAt = new Date().toISOString();
      hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to soft delete notebook:', error);
      return { success: false, error: error.message };
    }
  }

  async restoreNotebook(notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId]) {
        return { success: false, error: 'Notebook not found' };
      }
      
      // Remove deleted flag
      delete hierarchy.structure.notebooks[notebookId].deleted;
      delete hierarchy.structure.notebooks[notebookId].deletedAt;
      hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to restore notebook:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeletedNotebooks() {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks) {
        return [];
      }
      
      const deletedNotebooks = Object.entries(hierarchy.structure.notebooks)
        .filter(([id, notebook]) => notebook.deleted === true)
        .map(([id, notebook]) => ({
          id: id,
          ...notebook
        }));
      
      // Sort by deleted date (most recent first)
      deletedNotebooks.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      
      return deletedNotebooks;
    } catch (error) {
      console.error('Failed to get deleted notebooks:', error);
      return [];
    }
  }

  async permanentlyDeleteNotebook(notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId]) {
        return { success: false, error: 'Notebook not found' };
      }
      
      const notebookPath = this.basePath + hierarchy.structure.notebooks[notebookId].path;
      
      // Actually delete the folder and files
      const itemInfo = await FileSystem.getInfoAsync(notebookPath);
      if (itemInfo.exists) {
        await FileSystem.deleteAsync(notebookPath, { idempotent: true });
      }
      
      // Remove from hierarchy
      delete hierarchy.structure.notebooks[notebookId];
      hierarchy.metadata.totalNotes--;
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to permanently delete notebook:', error);
      return { success: false, error: error.message };
    }
  }

  async updateNotebook(notebookId, notebookData) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId]) {
        return { success: false, error: 'Notebook not found' };
      }
      
      // Update notebook in hierarchy
      const notebook = hierarchy.structure.notebooks[notebookId];
      notebook.title = notebookData.title;
      notebook.description = notebookData.description || '';
      notebook.color = notebookData.color || notebook.color;
      notebook.icon = notebookData.icon || notebook.icon;
      notebook.lastModified = new Date().toISOString();
      
      // Update metadata file
      const notebookPath = this.basePath + notebook.path;
      const metadataPath = notebookPath + '/metadata.json';
      
      const metadata = {
        id: notebookId,
        title: notebookData.title,
        description: notebookData.description || '',
        tags: notebook.tags || [],
        color: notebookData.color || notebook.color,
        icon: notebookData.icon || notebook.icon,
        created: notebook.created,
        lastModified: new Date().toISOString(),
        notesCount: notebook.notesCount || 0,
        chaptersCount: notebook.chaptersCount || 0
      };
      
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(metadata, null, 2)
      );
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update notebook:', error);
      return { success: false, error: error.message };
    }
  }

  async updateChapter(notebookId, chapterId, chapterData) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks[notebookId] || 
          !hierarchy.structure.notebooks[notebookId].chapters[chapterId]) {
        return { success: false, error: 'Chapter not found' };
      }
      
      // Update chapter in hierarchy
      const chapter = hierarchy.structure.notebooks[notebookId].chapters[chapterId];
      chapter.title = chapterData.title;
      chapter.description = chapterData.description || '';
      chapter.color = chapterData.color || chapter.color;
      chapter.chapterNumber = chapterData.chapterNumber || chapter.chapterNumber || 1;
      chapter.lastModified = new Date().toISOString();
      
      // Update parent notebook's lastModified
      hierarchy.structure.notebooks[notebookId].lastModified = new Date().toISOString();
      
      // Update chapter metadata file
      const chapterPath = this.basePath + chapter.path;
      const metadataPath = chapterPath + '/metadata.json';
      
      const metadata = {
        id: chapterId,
        notebookId: notebookId,
        title: chapterData.title,
        description: chapterData.description || '',
        color: chapterData.color || chapter.color,
        chapterNumber: chapterData.chapterNumber || chapter.chapterNumber || 1,
        created: chapter.created,
        lastModified: new Date().toISOString(),
        notesCount: chapter.notesCount || 0
      };
      
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(metadata, null, 2)
      );
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update chapter:', error);
      return { success: false, error: error.message };
    }
  }

  // Notebook Collections Management
  async createNotebookCollection(collectionData) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy) return { success: false, error: 'Failed to load hierarchy' };
      
      const collectionId = Date.now().toString();
      const collectionFolder = `notebook-collections/${collectionId}/`;
      const collectionPath = this.basePath + collectionFolder;
      
      // Create collection folder
      await FileSystem.makeDirectoryAsync(collectionPath, { intermediates: true });
      
      // Create collection metadata
      const metadata = {
        id: collectionId,
        name: collectionData.name,
        description: collectionData.description || '',
        color: collectionData.color || '#6366f1',
        icon: collectionData.icon || 'library-outline',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        notebooksCount: 0,
        notebooks: {}
      };
      
      await FileSystem.writeAsStringAsync(
        collectionPath + 'metadata.json',
        JSON.stringify(metadata, null, 2)
      );
      
      // Update hierarchy
      if (!hierarchy.structure.notebookCollections) {
        hierarchy.structure.notebookCollections = {};
      }
      
      hierarchy.structure.notebookCollections[collectionId] = {
        ...metadata,
        path: collectionFolder
      };
      
      if (!hierarchy.metadata.totalNotebookCollections) {
        hierarchy.metadata.totalNotebookCollections = 0;
      }
      hierarchy.metadata.totalNotebookCollections++;
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true, collectionId, path: collectionPath };
    } catch (error) {
      console.error('Failed to create notebook collection:', error);
      return { success: false, error: error.message };
    }
  }

  async addNotebookToCollection(collectionId, notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return { success: false, error: 'Collection not found' };
      }
      
      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      if (!collectionsData[collectionId]) {
        return { success: false, error: 'Collection not found' };
      }
      
      if (!hierarchy.structure.notebooks[notebookId]) {
        return { success: false, error: 'Notebook not found' };
      }
      
      // Check if notebook is already in the collection
      if (collectionsData[collectionId].notebooks[notebookId]) {
        return { success: false, error: 'Notebook already in this collection' };
      }
      
      // Add notebook to collection
      collectionsData[collectionId].notebooks[notebookId] = {
        addedAt: new Date().toISOString(),
        notebookData: hierarchy.structure.notebooks[notebookId]
      };
      
      collectionsData[collectionId].notebooksCount++;
      collectionsData[collectionId].lastModified = new Date().toISOString();
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to add notebook to collection:', error);
      return { success: false, error: error.message };
    }
  }

  async removeNotebookFromCollection(collectionId, notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return { success: false, error: 'Collection not found' };
      }
      
      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      if (!collectionsData[collectionId]) {
        return { success: false, error: 'Collection not found' };
      }
      
      if (!collectionsData[collectionId].notebooks[notebookId]) {
        return { success: false, error: 'Notebook not in this collection' };
      }
      
      // Remove notebook from collection
      delete collectionsData[collectionId].notebooks[notebookId];
      collectionsData[collectionId].notebooksCount--;
      collectionsData[collectionId].lastModified = new Date().toISOString();
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to remove notebook from collection:', error);
      return { success: false, error: error.message };
    }
  }

  async getNotebookCollections() {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return [];
      }
      
      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      if (Object.keys(collectionsData).length === 0) {
        return [];
      }
      
      return Object.values(collectionsData).map(collection => ({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        icon: collection.icon || 'library-outline',
        created: collection.created,
        created_at: collection.created,
        lastModified: collection.lastModified,
        notebooksCount: collection.notebooksCount || 0
      }));
    } catch (error) {
      console.error('Failed to get notebook collections:', error);
      return [];
    }
  }

  async getNotebooksInCollection(collectionId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return [];
      }
      
      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      if (!collectionsData[collectionId]) {
        return [];
      }
      
      const collection = collectionsData[collectionId];
      const notebooks = [];
      
      for (const [notebookId, notebookInfo] of Object.entries(collection.notebooks || {})) {
        // Get fresh notebook data from hierarchy
        const currentNotebookData = hierarchy.structure.notebooks[notebookId];
        if (currentNotebookData && !currentNotebookData.deleted) {
          notebooks.push({
            id: notebookId,
            ...currentNotebookData,
            addedToCollectionAt: notebookInfo.addedAt
          });
        }
      }
      
      return notebooks;
    } catch (error) {
      console.error('Failed to get notebooks in collection:', error);
      return [];
    }
  }

  async deleteNotebookCollection(collectionId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return { success: false, error: 'Collection not found' };
      }
      
      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      if (!collectionsData[collectionId]) {
        return { success: false, error: 'Collection not found' };
      }
      
      const collectionPath = this.basePath + collectionsData[collectionId].path;
      
      // Delete collection folder
      const collectionInfo = await FileSystem.getInfoAsync(collectionPath);
      if (collectionInfo.exists) {
        await FileSystem.deleteAsync(collectionPath, { idempotent: true });
      }
      
      // Remove from hierarchy (use the same structure that was found)
      if (hierarchy.structure.notebookCollections) {
        delete hierarchy.structure.notebookCollections[collectionId];
      } else if (hierarchy.structure.collections) {
        delete hierarchy.structure.collections[collectionId];
      }
      
      hierarchy.metadata.totalNotebookCollections--;
      
      await this.updateHierarchy(hierarchy);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete notebook collection:', error);
      return { success: false, error: error.message };
    }
  }

  async getAvailableNotebooks() {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks) {
        return [];
      }
      
      return Object.values(hierarchy.structure.notebooks)
        .filter(notebook => !notebook.deleted)
        .map(notebook => ({
          id: notebook.id,
          title: notebook.title,
          description: notebook.description,
          color: notebook.color,
          created: notebook.created,
          lastModified: notebook.lastModified,
          chaptersCount: notebook.chaptersCount || 0
        }));
    } catch (error) {
      console.error('Failed to get available notebooks:', error);
      return [];
    }
  }

  async getCollectionsForNotebook(notebookId) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return [];
      }
      
      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      const collections = [];
      
      for (const [collectionId, collection] of Object.entries(collectionsData)) {
        if (collection.notebooks && collection.notebooks[notebookId]) {
          collections.push({
            id: collectionId,
            name: collection.name,
            color: collection.color,
            icon: collection.icon || 'library-outline'
          });
        }
      }
      
      return collections;
    } catch (error) {
      console.error('Failed to get collections for notebook:', error);
      return [];
    }
  }

  async updateNotebookCollection(collectionId, updateData) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return { success: false, error: 'Collection not found' };
      }

      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};
      
      if (!collectionsData[collectionId]) {
        return { success: false, error: 'Collection not found' };
      }

      const collection = collectionsData[collectionId];
      const collectionPath = this.basePath + collection.path;

      // Update metadata
      const updatedMetadata = {
        ...collection,
        name: updateData.name || collection.name,
        description: updateData.description !== undefined ? updateData.description : collection.description,
        color: updateData.color || collection.color,
        icon: updateData.icon || collection.icon || 'library-outline',
        lastModified: new Date().toISOString()
      };

      // Write updated metadata to file
      await FileSystem.writeAsStringAsync(
        collectionPath + 'metadata.json',
        JSON.stringify(updatedMetadata, null, 2)
      );

      // Update hierarchy (use the same structure that was found)
      if (hierarchy.structure.notebookCollections) {
        hierarchy.structure.notebookCollections[collectionId] = updatedMetadata;
      } else if (hierarchy.structure.collections) {
        hierarchy.structure.collections[collectionId] = updatedMetadata;
      }
      
      await this.updateHierarchy(hierarchy);

      return { success: true };
    } catch (error) {
      console.error('Failed to update notebook collection:', error);
      return { success: false, error: error.message };
    }
  }

  // Search Methods
  async searchNotebooks(query, excludeIds = []) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks) {
        return [];
      }

      const searchTerms = query.toLowerCase().split(' ');
      const results = [];

      for (const [notebookId, notebook] of Object.entries(hierarchy.structure.notebooks)) {
        if (excludeIds.includes(notebookId) || notebook.deleted) {
          continue;
        }

        const searchableText = [
          notebook.title || '',
          notebook.description || '',
          ...(notebook.tags || [])
        ].join(' ').toLowerCase();

        const matches = searchTerms.every(term => searchableText.includes(term));

        if (matches) {
          results.push({
            id: notebookId,
            type: 'notebook',
            title: notebook.title,
            name: notebook.title,
            description: notebook.description,
            color: notebook.color,
            icon: notebook.icon,
            created_at: notebook.created,
            note_count: notebook.chaptersCount || 0,
            breadcrumb: null
          });
        }
      }

      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Failed to search notebooks:', error);
      return [];
    }
  }

  async searchCollections(query, excludeIds = []) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure) {
        return [];
      }

      // Support both old structure (collections) and new structure (notebookCollections)
      const collectionsData = hierarchy.structure.notebookCollections || hierarchy.structure.collections || {};

      const searchTerms = query.toLowerCase().split(' ');
      const results = [];

      for (const [collectionId, collection] of Object.entries(collectionsData)) {
        if (excludeIds.includes(collectionId)) {
          continue;
        }

        const searchableText = [
          collection.name || '',
          collection.description || ''
        ].join(' ').toLowerCase();

        const matches = searchTerms.every(term => searchableText.includes(term));

        if (matches) {
          results.push({
            id: collectionId,
            type: 'collection',
            title: collection.name,
            name: collection.name,
            description: collection.description,
            color: collection.color,
            icon: collection.icon,
            created_at: collection.created,
            notebooksCount: collection.notebooksCount || 0,
            breadcrumb: null
          });
        }
      }

      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Failed to search collections:', error);
      return [];
    }
  }

  async searchChapters(query, notebookId = null, excludeIds = []) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks) {
        return [];
      }

      const searchTerms = query.toLowerCase().split(' ');
      const results = [];

      const notebooksToSearch = notebookId 
        ? { [notebookId]: hierarchy.structure.notebooks[notebookId] }
        : hierarchy.structure.notebooks;

      for (const [nbId, notebook] of Object.entries(notebooksToSearch)) {
        if (notebook.deleted) continue;

        for (const [chapterId, chapter] of Object.entries(notebook.chapters || {})) {
          if (excludeIds.includes(chapterId) || chapter.deleted) {
            continue;
          }

          const searchableText = [
            chapter.title || '',
            chapter.description || '',
            ...(chapter.tags || [])
          ].join(' ').toLowerCase();

          const matches = searchTerms.every(term => searchableText.includes(term));

          if (matches) {
            results.push({
              id: chapterId,
              type: 'chapter',
              title: chapter.title,
              name: chapter.title,
              description: chapter.description,
              created_at: chapter.created,
              note_count: chapter.notesCount || 0,
              notebookId: nbId,
              breadcrumb: `${notebook.title}`
            });
          }
        }
      }

      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Failed to search chapters:', error);
      return [];
    }
  }

  async searchNotes(query, notebookId = null, chapterId = null, excludeIds = []) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks) {
        return [];
      }

      const searchTerms = query.toLowerCase().split(' ');
      const results = [];

      const notebooksToSearch = notebookId 
        ? { [notebookId]: hierarchy.structure.notebooks[notebookId] }
        : hierarchy.structure.notebooks;

      for (const [nbId, notebook] of Object.entries(notebooksToSearch)) {
        if (notebook.deleted) continue;

        const chaptersToSearch = chapterId 
          ? { [chapterId]: notebook.chapters?.[chapterId] }
          : notebook.chapters || {};

        for (const [chId, chapter] of Object.entries(chaptersToSearch)) {
          if (chapter.deleted) continue;

          for (const [noteId, note] of Object.entries(chapter.notes || {})) {
            if (excludeIds.includes(noteId) || note.deleted) {
              continue;
            }

            const searchableText = [
              note.title || '',
              note.content || '',
              ...(note.tags || [])
            ].join(' ').toLowerCase();

            const matches = searchTerms.every(term => searchableText.includes(term));

            if (matches) {
              results.push({
                id: noteId,
                type: 'note',
                title: note.title,
                name: note.title,
                description: note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : ''),
                created_at: note.created,
                notebookId: nbId,
                chapterId: chId,
                breadcrumb: `${notebook.title} > ${chapter.title}`
              });
            }
          }
        }
      }

      return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Failed to search notes:', error);
      return [];
    }
  }

  async searchTags(query) {
    try {
      const hierarchy = await this.getHierarchy();
      if (!hierarchy || !hierarchy.structure.notebooks) {
        return [];
      }

      const searchTerm = query.toLowerCase();
      const tagCounts = {};
      const tagLocations = {};

      // Collect all tags from notebooks, chapters, and notes
      for (const [notebookId, notebook] of Object.entries(hierarchy.structure.notebooks)) {
        if (notebook.deleted) continue;

        // Notebook tags
        (notebook.tags || []).forEach(tag => {
          const lowerTag = tag.toLowerCase();
          if (lowerTag.includes(searchTerm)) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            if (!tagLocations[tag]) tagLocations[tag] = [];
            tagLocations[tag].push({ type: 'notebook', id: notebookId, name: notebook.title });
          }
        });

        // Chapter tags
        for (const [chapterId, chapter] of Object.entries(notebook.chapters || {})) {
          if (chapter.deleted) continue;
          
          (chapter.tags || []).forEach(tag => {
            const lowerTag = tag.toLowerCase();
            if (lowerTag.includes(searchTerm)) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              if (!tagLocations[tag]) tagLocations[tag] = [];
              tagLocations[tag].push({ type: 'chapter', id: chapterId, name: chapter.title });
            }
          });

          // Note tags
          for (const [noteId, note] of Object.entries(chapter.notes || {})) {
            if (note.deleted) continue;
            
            (note.tags || []).forEach(tag => {
              const lowerTag = tag.toLowerCase();
              if (lowerTag.includes(searchTerm)) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                if (!tagLocations[tag]) tagLocations[tag] = [];
                tagLocations[tag].push({ type: 'note', id: noteId, name: note.title });
              }
            });
          }
        }
      }

      return Object.entries(tagCounts).map(([tag, count]) => ({
        id: tag,
        type: 'tag',
        title: tag,
        name: tag,
        description: `Used ${count} time${count === 1 ? '' : 's'}`,
        count: count,
        locations: tagLocations[tag] || []
      })).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Failed to search tags:', error);
      return [];
    }
  }
}

// Create singleton instance
const fileSystemManager = new FileSystemManager();

export default fileSystemManager; 