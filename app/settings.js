import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import settingsManager from '../utils/settingsManager';
import storyRefreshService from '../utils/storyRefreshService';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [sortingModalVisible, setSortingModalVisible] = useState(false);
  const [currentSortOption, setCurrentSortOption] = useState('lastModified');
  const [loading, setLoading] = useState(true);
  
  // Revision settings modal
  const [revisionSettingsModalVisible, setRevisionSettingsModalVisible] = useState(false);
  
  // Story settings
  const [revisionPages, setRevisionPages] = useState(2);
  const [revisionPagesText, setRevisionPagesText] = useState('2');
  const [storyInterval, setStoryInterval] = useState(1); // hours (default 1 hour)
  const [storyIntervalText, setStoryIntervalText] = useState('1');
  const [storyIntervalUnit, setStoryIntervalUnit] = useState('hours'); // 'minutes' or 'hours'
  
  const sortingOptions = settingsManager.getSortingOptions();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🔧 Loading settings...');
      const settings = await settingsManager.getSettings();
      setCurrentSortOption(settings.defaultSorting || 'lastModified');
      const pages = settings.revisionPages || 2;
      setRevisionPages(pages);
      setRevisionPagesText(String(pages));
      
      // Handle story interval - default to 1 hour
      const intervalHours = settings.storyInterval || 1;
      setStoryInterval(intervalHours);
      
      // Convert to appropriate unit for display
      if (intervalHours < 1) {
        const minutes = Math.round(intervalHours * 60);
        setStoryIntervalText(String(minutes));
        setStoryIntervalUnit('minutes');
      } else {
        setStoryIntervalText(String(intervalHours));
        setStoryIntervalUnit('hours');
      }
      
      console.log('📋 Settings loaded:', {
        revisionPages: pages,
        storyInterval: intervalHours
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSortOption) => {
    try {
      const success = await settingsManager.updateSetting('defaultSorting', newSortOption);
      
      if (success) {
        setCurrentSortOption(newSortOption);
        settingsManager.clearCache();
        Alert.alert('Success', 'Sorting preference saved successfully!');
      } else {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleRevisionPagesChange = (text) => {
    setRevisionPagesText(text);
  };

  const saveRevisionPages = async () => {
    const newPages = parseInt(revisionPagesText, 10);
    
    // Validation
    if (isNaN(newPages) || newPages < 1 || newPages > 20) {
      Alert.alert('Invalid Input', 'Please enter a number between 1 and 20.');
      return;
    }

    try {
      const success = await settingsManager.updateSetting('revisionPages', newPages);
      
      if (success) {
        setRevisionPages(newPages);
        settingsManager.clearCache();
        Alert.alert('Success', `Revision pages updated to ${newPages}! New stories will use this setting.`);
      } else {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleStoryIntervalChange = (text) => {
    setStoryIntervalText(text);
  };

  const handleUnitChange = (unit) => {
    setStoryIntervalUnit(unit);
  };

  const saveStoryInterval = async () => {
    const value = parseFloat(storyIntervalText);
    
    // Validation
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid positive number.');
      return;
    }

    // Convert to hours for storage
    let intervalInHours;
    if (storyIntervalUnit === 'minutes') {
      intervalInHours = value / 60;
      if (intervalInHours > 24) {
        Alert.alert('Invalid Input', 'Maximum interval is 24 hours (1440 minutes).');
        return;
      }
    } else {
      intervalInHours = value;
      if (intervalInHours > 24) {
        Alert.alert('Invalid Input', 'Maximum interval is 24 hours.');
        return;
      }
    }

    try {
      const success = await settingsManager.updateSetting('storyInterval', intervalInHours);
      
      if (success) {
        setStoryInterval(intervalInHours);
        settingsManager.clearCache();
        
        // Update story refresh service with new interval
        try {
          await storyRefreshService.updateRefreshInterval();
        } catch (error) {
          console.log('Could not update story refresh interval:', error);
        }
        
        const displayValue = storyIntervalUnit === 'minutes' ? `${value} minutes` : `${value} hours`;
        Alert.alert('Success', `Story interval updated to ${displayValue}!`);
      } else {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleSortingOptionSelect = (option) => {
    setSortingModalVisible(false);
    if (option.key !== currentSortOption) {
      saveSettings(option.key);
    }
  };




  
  const handleBack = () => {
    router.back();
  };

  const getCurrentSortLabel = () => {
    return settingsManager.getSortingLabel(currentSortOption);
  };

  const getCurrentRevisionPagesLabel = () => {
    return `${revisionPages} ${revisionPages === 1 ? 'page' : 'pages'}`;
  };

  const getCurrentStoryIntervalLabel = () => {
    if (storyInterval < 1) {
      const minutes = Math.round(storyInterval * 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      return `${storyInterval} ${storyInterval === 1 ? 'hour' : 'hours'}`;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="settings-outline" size={48} color="#6366f1" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <>
            {/* General Settings Section */}
            <View style={styles.settingsSection}>
              {/* Default Sorting Option */}
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setSortingModalVisible(true)}
              >
                <View style={styles.settingItemLeft}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="swap-vertical-outline" size={20} color="#6366f1" />
                  </View>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingTitle}>Default Sorting</Text>
                    <Text style={styles.settingSubtitle}>
                      How notebooks, notes, and collections are sorted
                    </Text>
                    <Text style={styles.settingValue}>
                      {getCurrentSortLabel()}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

                        {/* Revision Settings Section */}
            <View style={styles.settingsSection}>
              {/* Revision Settings */}
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setRevisionSettingsModalVisible(true)}
              >
                <View style={styles.settingItemLeft}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="school-outline" size={20} color="#6366f1" />
                  </View>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingTitle}>Revision Settings</Text>
                    <Text style={styles.settingSubtitle}>
                      Configure story pages and refresh intervals
                    </Text>
                    <Text style={styles.settingValue}>
                      {getCurrentRevisionPagesLabel()}, {getCurrentStoryIntervalLabel()}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sorting Options Modal */}
      <Modal
        visible={sortingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSortingModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              onPress={() => setSortingModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Default Sorting</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Choose how you want notebooks, notes, and collections to be sorted by default throughout the app.
            </Text>
            
            <View style={styles.optionsContainer}>
              {sortingOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionItem,
                    currentSortOption === option.key && styles.optionItemSelected
                  ]}
                  onPress={() => handleSortingOptionSelect(option)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons 
                      name={option.icon} 
                      size={24} 
                      color={currentSortOption === option.key ? '#6366f1' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.optionLabel,
                      currentSortOption === option.key && styles.optionLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {currentSortOption === option.key && (
                    <Ionicons name="checkmark" size={20} color="#6366f1" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Revision Settings Modal */}
      <Modal
        visible={revisionSettingsModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setRevisionSettingsModalVisible(false)}
      >
        <View style={styles.revisionModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
          
          {/* Header */}
          <View style={[styles.revisionModalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              onPress={() => setRevisionSettingsModalVisible(false)}
              style={styles.revisionModalCloseButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.revisionModalTitle}>Revision Settings</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.revisionModalContent}
            contentContainerStyle={[
              styles.revisionModalContentContainer,
              { paddingBottom: insets.bottom + 20 }
            ]}
            showsVerticalScrollIndicator={false}
          >

            {/* Revision Pages Setting */}
            <View style={styles.revisionSettingSection}>
              <View style={styles.revisionSettingItem}>
                <View style={styles.revisionSettingHeader}>
                  <Ionicons name="documents-outline" size={24} color="#6366f1" />
                  <View style={styles.revisionSettingHeaderText}>
                    <Text style={styles.revisionSettingTitle}>Number of Pages</Text>
                    <Text style={styles.revisionSettingSubtitle}>
                      How many stories to show in revision (1-20)
                    </Text>
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.numberInput}
                    value={revisionPagesText}
                    onChangeText={handleRevisionPagesChange}
                    keyboardType="numeric"
                    placeholder="Enter pages"
                    placeholderTextColor="#9ca3af"
                    maxLength={2}
                    onBlur={saveRevisionPages}
                  />
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={saveRevisionPages}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Story Refresh Interval Setting */}
            <View style={styles.revisionSettingSection}>
              <View style={styles.revisionSettingItem}>
                <View style={styles.revisionSettingHeader}>
                  <Ionicons name="time-outline" size={24} color="#6366f1" />
                  <View style={styles.revisionSettingHeaderText}>
                    <Text style={styles.revisionSettingTitle}>Refresh Frequency</Text>
                    <Text style={styles.revisionSettingSubtitle}>
                      How often new stories appear (max 24 hours)
                    </Text>
                  </View>
                </View>
                <View style={styles.intervalInputContainer}>
                  <TextInput
                    style={styles.intervalInput}
                    value={storyIntervalText}
                    onChangeText={handleStoryIntervalChange}
                    keyboardType="numeric"
                    placeholder="Enter time"
                    placeholderTextColor="#9ca3af"
                    maxLength={4}
                    onBlur={saveStoryInterval}
                  />
                  <View style={styles.unitSelector}>
                    <TouchableOpacity
                      style={[
                        styles.unitOption,
                        storyIntervalUnit === 'minutes' && styles.unitOptionSelected
                      ]}
                      onPress={() => handleUnitChange('minutes')}
                    >
                      <Text style={[
                        styles.unitText,
                        storyIntervalUnit === 'minutes' && styles.unitTextSelected
                      ]}>
                        min
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.unitDivider} />
                    <TouchableOpacity
                      style={[
                        styles.unitOption,
                        storyIntervalUnit === 'hours' && styles.unitOptionSelected
                      ]}
                      onPress={() => handleUnitChange('hours')}
                    >
                      <Text style={[
                        styles.unitText,
                        storyIntervalUnit === 'hours' && styles.unitTextSelected
                      ]}>
                        hrs
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={saveStoryInterval}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.revisionInfoSection}>
              <View style={styles.revisionInfoHeader}>
                <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.revisionInfoTitle}>How it works</Text>
              </View>
              <Text style={styles.revisionInfoText}>
                • Story pages determine how many notes appear in each revision session
              </Text>
              <Text style={styles.revisionInfoText}>
                • Refresh interval controls how often new stories are automatically generated
              </Text>
              <Text style={styles.revisionInfoText}>
                • You can manually refresh stories anytime using the refresh button in revision mode
              </Text>
            </View>
          </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  settingItemSpacing: {
    marginTop: 12,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  modalPlaceholder: {
    width: 40,
    height: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  optionItemSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#6366f1',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  // Input Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  numberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  // Interval Input Styles
  intervalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  intervalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
    minWidth: 60,
  },
  unitSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  unitOptionSelected: {
    backgroundColor: '#6366f1',
  },
  unitText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  unitTextSelected: {
    color: '#fff',
  },
  unitDivider: {
    width: 1,
    backgroundColor: '#d1d5db',
  },
  // Revision Modal Styles
  revisionModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  revisionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  revisionModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revisionModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  revisionModalContent: {
    flex: 1,
  },
  revisionModalContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  revisionModalDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  revisionSettingSection: {
    marginBottom: 32,
  },
  revisionSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  revisionSettingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  revisionSettingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  revisionSettingHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  revisionSettingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  revisionSettingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  revisionInfoSection: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  revisionInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  revisionInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  revisionInfoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});
