import * as FileSystem from 'expo-file-system';

class SettingsManager {
  constructor() {
    this.settingsPath = FileSystem.documentDirectory + 'app_settings.json';
    this.cachedSettings = null;
  }

  async getSettings() {
    try {
      if (this.cachedSettings) {
        return this.cachedSettings;
      }

      const settingsInfo = await FileSystem.getInfoAsync(this.settingsPath);
      
      if (settingsInfo.exists) {
        const settingsContent = await FileSystem.readAsStringAsync(this.settingsPath);
        this.cachedSettings = JSON.parse(settingsContent);
      } else {
        // Default settings
        this.cachedSettings = {
          defaultSorting: 'lastModified',
          revisionPages: 2,
          storyInterval: 24,
        };
      }
      
      return this.cachedSettings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        defaultSorting: 'lastModified',
        revisionPages: 2,
        storyInterval: 24,
      };
    }
  }

  async getSortingPreference() {
    const settings = await this.getSettings();
    return settings.defaultSorting || 'lastModified';
  }

  async getRevisionPages() {
    const settings = await this.getSettings();
    return settings.revisionPages || 2;
  }

  async getStoryInterval() {
    const settings = await this.getSettings();
    return settings.storyInterval || 24;
  }


  async updateSetting(key, value) {
    try {
      const settings = await this.getSettings();
      settings[key] = value;
      
      await FileSystem.writeAsStringAsync(this.settingsPath, JSON.stringify(settings, null, 2));
      this.cachedSettings = settings;
      
      return true;
    } catch (error) {
      console.error('Failed to update setting:', error);
      return false;
    }
  }

  // Clear cached settings to force refresh
  clearCache() {
    this.cachedSettings = null;
  }

  // Sort function that can be used throughout the app
  async sortItems(items, sortType = null) {
    if (!items || !Array.isArray(items)) return [];
    
    let sortingType = sortType;
    
    // If no sort type is provided, get the current setting
    if (!sortingType) {
      if (this.cachedSettings) {
        sortingType = this.cachedSettings.defaultSorting || 'lastModified';
      } else {
        // Force load settings if not cached
        const settings = await this.getSettings();
        sortingType = settings.defaultSorting || 'lastModified';
      }
    }
    
    return [...items].sort((a, b) => {
      switch (sortingType) {
        case 'name':
          return (a.name || a.title || '').localeCompare(b.name || b.title || '');
          
        case 'nameDesc':
          return (b.name || b.title || '').localeCompare(a.name || a.title || '');
          
        case 'created':
          return new Date(a.created_at || a.created) - new Date(b.created_at || b.created);
          
        case 'createdDesc':
          return new Date(b.created_at || b.created) - new Date(a.created_at || a.created);
          
        case 'lastModified':
        default:
          return new Date(b.updated_at || b.lastModified || b.created_at || b.created) - 
                 new Date(a.updated_at || a.lastModified || a.created_at || a.created);
      }
    });
  }

  // Get sorting options for display
  getSortingOptions() {
    return [
      { key: 'lastModified', label: 'Last Modified Date', icon: 'time-outline' },
      { key: 'name', label: 'Name (A-Z)', icon: 'text-outline' },
      { key: 'nameDesc', label: 'Name (Z-A)', icon: 'text-outline' },
      { key: 'created', label: 'Creation Date', icon: 'calendar-outline' },
      { key: 'createdDesc', label: 'Creation Date (Newest)', icon: 'calendar-outline' },
    ];
  }

  // Get readable label for sorting option
  getSortingLabel(sortKey) {
    const option = this.getSortingOptions().find(opt => opt.key === sortKey);
    return option ? option.label : 'Last Modified Date';
  }
}

// Export singleton instance
const settingsManager = new SettingsManager();
export default settingsManager; 