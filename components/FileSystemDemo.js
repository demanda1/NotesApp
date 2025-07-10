import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import fileSystemManager from '../utils/fileSystemManager';

export default function FileSystemDemo({ visible, onClose }) {
  const [stats, setStats] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (visible) {
      loadStorageLocation();
    }
  }, [visible]);

  const loadStorageLocation = async () => {
    try {
      const statsData = await fileSystemManager.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load storage location:', error);
    }
  };



  const shareHierarchyFile = async () => {
    setSharing(true);
    try {
      const result = await fileSystemManager.shareHierarchyFile();
      if (result.success) {
        Alert.alert(
          'Backup Shared',
          `${result.message}\n\nFilename: ${result.filename}\nSize: ${result.size} bytes\n\nYou can now email it to yourself or save it to Google Drive.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Share Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Share Error', 'Failed to share hierarchy file');
      console.error(error);
    } finally {
      setSharing(false);
    }
  };

  const restoreFromBackup = async () => {
    // Show info about file location first
    Alert.alert(
      'Restore from Backup',
      'Select the NotesApp backup JSON file you previously shared/emailed to yourself.\n\nMake sure the file is saved in:\n• Downloads folder\n• Google Drive\n• Email attachments\n• Or any accessible location',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Select File', 
          onPress: () => {
            // Show warning before restore
            Alert.alert(
              'Confirm Restore',
              'This will replace all your current data with the data from the backup file. Your current data will be saved as a backup before restore. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Restore', 
                  style: 'destructive',
                  onPress: async () => {
                    setRestoring(true);
                    try {
                      const result = await fileSystemManager.restoreFromBackup();
                      if (result.success) {
                        Alert.alert(
                          'Restore Successful',
                          `${result.message}\n\nRestored Items:\n• ${result.restoredNotebooks} notebooks\n• ${result.restoredCollections} collections\n\nOriginal backup from: ${result.originalPlatform}\nExport date: ${new Date(result.exportDate).toLocaleDateString()}\n\nPull down to refresh on the main screens to see your restored data!`,
                          [{ 
                            text: 'OK',
                            onPress: () => {
                              // Reload the storage location to show updated data
                              loadStorageLocation();
                            }
                          }]
                        );
                      } else {
                        const errorMessage = result.helpText 
                          ? `${result.error}\n\n${result.helpText}`
                          : (result.error || 'Unknown error');
                        Alert.alert('Restore Failed', errorMessage);
                      }
                    } catch (error) {
                      Alert.alert('Restore Error', 'Failed to restore from backup');
                      console.error(error);
                    } finally {
                      setRestoring(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backup & Restore</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {stats ? (
          <View style={styles.locationSection}>
            <View style={styles.locationHeader}>
              <Ionicons name="folder-outline" size={32} color="#6366f1" />
              <Text style={styles.locationTitle}>NotesApp Data Location</Text>
            </View>
            
            <View style={styles.pathContainer}>
              <Text style={styles.pathLabel}>Storage Path:</Text>
              <View style={styles.pathBox}>
                <Text style={styles.pathText} selectable={true}>
                  {stats.folderPath}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.infoText}>
                  This is where all your notebooks, collections, and notes are stored on your device.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
                <Text style={styles.infoText}>
                  Your data is stored locally and synced with the device file system.
                </Text>
              </View>
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.shareButton} 
                onPress={shareHierarchyFile}
                disabled={sharing}
              >
                <Ionicons 
                  name={sharing ? "hourglass-outline" : "share-outline"} 
                  size={18} 
                  color="#fff" 
                />
                <Text style={styles.shareButtonText}>
                  {sharing ? 'Sharing...' : 'Backup & Share'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.restoreButton} 
                onPress={restoreFromBackup}
                disabled={restoring}
              >
                <Ionicons 
                  name={restoring ? "hourglass-outline" : "download-outline"} 
                  size={18} 
                  color="#fff" 
                />
                <Text style={styles.restoreButtonText}>
                  {restoring ? 'Restoring...' : 'Restore Data'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.helpSection}>
              <Text style={styles.helpTitle}>How to use Backup & Restore</Text>
              
              <View style={styles.helpItem}>
                <View style={styles.helpItemHeader}>
                  <Ionicons name="share-outline" size={16} color="#10b981" />
                  <Text style={styles.helpItemTitle}>Backup & Share</Text>
                </View>
                <Text style={styles.helpItemText}>
                  Creates a backup file of all your notebooks and collections. You can email it to yourself or save it to Google Drive for safekeeping.
                </Text>
              </View>

              <View style={styles.helpItem}>
                <View style={styles.helpItemHeader}>
                  <Ionicons name="download-outline" size={16} color="#f59e0b" />
                  <Text style={styles.helpItemTitle}>Restore Data</Text>
                </View>
                <Text style={styles.helpItemText}>
                  Restores your data from a backup file. Make sure the backup file is accessible in Downloads, Google Drive, or email attachments. Your current data will be backed up before restore.
                </Text>
              </View>

              <View style={styles.helpItem}>
                <View style={styles.helpItemHeader}>
                  <Ionicons name="information-circle-outline" size={16} color="#6366f1" />
                  <Text style={styles.helpItemTitle}>Data Storage</Text>
                </View>
                <Text style={styles.helpItemText}>
                  Your data is stored locally on your device at the location shown above. Use backup regularly to prevent data loss when changing devices.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass-outline" size={32} color="#6b7280" />
            <Text style={styles.loadingText}>Loading storage location...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  locationSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  pathContainer: {
    marginBottom: 24,
  },
  pathLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pathBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pathText: {
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  infoContainer: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },

  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 12,
    flex: 1,
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 12,
    flex: 1,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  helpSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  helpItem: {
    marginBottom: 16,
  },
  helpItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  helpItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  helpItemText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginLeft: 24,
  },
}); 