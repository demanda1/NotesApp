import settingsManager from './settingsManager';
import fileSystemManager from './fileSystemManager';

class StoryRefreshService {
  constructor() {
    this.listeners = new Set();
    this.refreshTimer = null;
    this.lastRefreshTime = null;
    this.isActive = false;
  }

  // Add a listener for story changes
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove a listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners that stories have changed
  notifyListeners(newStories) {
    this.listeners.forEach(callback => {
      try {
        callback(newStories);
      } catch (error) {
        console.error('Error notifying story refresh listener:', error);
      }
    });
  }

  // Generate random stories
  async generateRandomStories() {
    try {
      const hierarchy = await fileSystemManager.getHierarchy();
      const revisionPages = await settingsManager.getRevisionPages();
      
      if (!hierarchy || !hierarchy.structure || !hierarchy.structure.notebooks) {
        return [];
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
      const selectedNotes = shuffled.slice(0, Math.min(revisionPages, allNotes.length));
      
      return selectedNotes;
    } catch (error) {
      console.error('Failed to generate random stories:', error);
      return [];
    }
  }

  // Refresh stories and notify listeners
  async refreshStories() {
    try {
      console.log('🔄 Starting story refresh...');
      const newStories = await this.generateRandomStories();
      this.lastRefreshTime = new Date();
      
      console.log(`📚 Stories refreshed at ${this.lastRefreshTime.toLocaleTimeString()}`);
      console.log(`📖 Generated ${newStories.length} new stories:`, newStories.map(s => s.title));
      
      // Notify all listeners about new stories
      console.log(`📢 Notifying ${this.listeners.size} listeners about new stories`);
      this.notifyListeners(newStories);
      
      return newStories;
    } catch (error) {
      console.error('❌ Failed to refresh stories:', error);
      return [];
    }
  }

  // Start automatic story refresh timer
  async startAutoRefresh() {
    await this.stopAutoRefresh(); // Clear any existing timer
    
    try {
      const storyInterval = await settingsManager.getStoryInterval();
      let intervalMs;
      
      // Handle fractional hours (like 1/60 for 1 minute)
      if (storyInterval < 1) {
        // For intervals less than 1 hour, convert to minutes then milliseconds
        intervalMs = storyInterval * 60 * 60 * 1000;
      } else {
        // For 1 hour or more, convert hours to milliseconds
        intervalMs = storyInterval * 60 * 60 * 1000;
      }
      
      // Ensure minimum interval of 10 seconds for testing
      intervalMs = Math.max(intervalMs, 10000);
      
      console.log(`⏱️  Starting auto refresh with interval: ${storyInterval} hours`);
      console.log(`📊 Interval in milliseconds: ${intervalMs}ms (${intervalMs/1000} seconds)`);
      
      this.isActive = true;
      
      // Set up refresh timer
      this.refreshTimer = setInterval(async () => {
        if (this.isActive) {
          console.log('🔄 Auto-refresh timer triggered!');
          await this.refreshStories();
        } else {
          console.log('⚠️  Auto-refresh timer triggered but service is not active');
        }
      }, intervalMs);
      
      console.log(`✅ Auto refresh timer created with ${intervalMs}ms interval`);
      console.log(`🔄 Auto refresh started - stories will update every ${storyInterval} hours`);
      
      const nextRefreshTime = new Date(Date.now() + intervalMs);
      console.log(`⏰ Next refresh scheduled for: ${nextRefreshTime.toLocaleTimeString()}`);
      
      // Test that the timer is working by logging in 5 seconds
      setTimeout(() => {
        console.log(`⏰ Timer test: Auto refresh is ${this.isActive ? 'ACTIVE' : 'INACTIVE'} after 5 seconds`);
        console.log(`📊 Timer reference exists: ${this.refreshTimer ? 'YES' : 'NO'}`);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start auto refresh:', error);
      return false;
    }
  }

  // Stop automatic story refresh timer
  async stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isActive = false;
    console.log('🛑 Auto refresh stopped');
  }

  // Update refresh interval
  async updateRefreshInterval() {
    if (this.isActive) {
      console.log('🔄 Updating refresh interval...');
      await this.startAutoRefresh(); // Restart with new interval
    }
  }

  // Check if auto refresh is active
  isAutoRefreshActive() {
    return this.isActive;
  }

  // Get last refresh time
  getLastRefreshTime() {
    return this.lastRefreshTime;
  }

  // Get time until next refresh
  async getTimeUntilNextRefresh() {
    if (!this.lastRefreshTime || !this.isActive) {
      return null;
    }

    try {
      const storyInterval = await settingsManager.getStoryInterval();
      
      // Calculate interval in milliseconds
      let intervalMs;
      if (storyInterval < 1) {
        intervalMs = storyInterval * 60 * 60 * 1000;
      } else {
        intervalMs = storyInterval * 60 * 60 * 1000;
      }
      
      const nextRefreshTime = new Date(this.lastRefreshTime.getTime() + intervalMs);
      const timeUntilRefresh = nextRefreshTime.getTime() - Date.now();
      
      return timeUntilRefresh > 0 ? timeUntilRefresh : 0;
    } catch (error) {
      console.error('Failed to calculate time until next refresh:', error);
      return null;
    }
  }

  // Manual refresh (for user-initiated refresh)
  async manualRefresh() {
    console.log('🔄 Manual story refresh triggered');
    console.log(`📊 Current listeners count: ${this.listeners.size}`);
    const result = await this.refreshStories();
    console.log(`✅ Manual refresh completed, ${result.length} stories generated`);
    return result;
  }

  // Get debug info
  getDebugInfo() {
    return {
      isActive: this.isActive,
      hasTimer: !!this.refreshTimer,
      listenerCount: this.listeners.size,
      lastRefreshTime: this.lastRefreshTime
    };
  }
}

// Export singleton instance
const storyRefreshService = new StoryRefreshService();
export default storyRefreshService;
