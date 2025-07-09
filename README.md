# Notesapp - Modern React Native Notes Application

A beautiful and modern notes application built with Expo and React Native, featuring a WhatsApp-style bottom navigation interface, optimized for Android compatibility.

## Features ✨

- **WhatsApp-Style Navigation**: Bottom tab navigation with 4 main sections
- **Modern UI/UX**: Clean, intuitive interface with modern design principles
- **Local Storage**: SQLite database for offline note storage
- **CRUD Operations**: Create, Read, Update, and Delete notes
- **File-based Routing**: Uses Expo Router for navigation
- **Android Optimized**: Latest Android SDK (35) with edge-to-edge display
- **Responsive Design**: Looks great on all screen sizes
- **Real-time Updates**: Instant note updates and synchronization
- **No Login Required**: Works completely offline without any authentication

## Technical Stack 🛠️

- **Expo SDK 53**: Latest stable version
- **React Native 0.79.5**: Latest React Native version
- **Expo Router**: File-based navigation system
- **Expo SQLite**: Local database storage
- **React 19**: Latest React version
- **Modern Android**: Target SDK 35, Compile SDK 35

## Project Structure 📁

```
Notesapp/
├── app/
│   ├── _layout.js          # Root layout with Stack navigation
│   ├── (tabs)/             # Bottom tab navigation
│   │   ├── _layout.js      # Tabs layout configuration
│   │   ├── notebooks.js    # Notebooks tab (default homepage)
│   │   ├── revisions.js    # Revisions tab
│   │   ├── collections.js  # Collections tab
│   │   └── reader.js       # Reader tab
│   ├── add-note.js         # Create new note screen (modal)
│   └── edit-note/
│       └── [id].js         # Edit existing note screen (modal)
├── assets/                 # App icons and images
├── package.json           # Dependencies and scripts
├── app.json              # Expo configuration
└── README.md             # This file
```

## Getting Started 🚀

### Prerequisites

Before building and running the app, ensure you have:
- **Node.js** (v18 or later)
- **npm** or **yarn** package manager
- **Expo CLI** installed globally
- **Android Studio** (for Android development)
- **Physical Android device** or **emulator**
- **Xcode** (for iOS development, Mac only)

### 1. Environment Setup

Install Expo CLI globally:
```bash
npm install -g expo-cli @expo/cli
```

### 2. Project Setup

Navigate to the project directory and install dependencies:
```bash
cd /Users/dmandal/PersonalDevelopment/Resources/Notesapp
npm install
```

### 3. Development Build

Start the development server:
```bash
npx expo start
```

This will show you options to:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for web
- Scan QR code with Expo Go app

### 4. Run on Different Platforms

#### Android Development
**Option A: Using Android Emulator**
```bash
npm run android
# or
npx expo start --android
```

**Option B: Using Physical Device**
1. Install **Expo Go** from Google Play Store
2. Run `npx expo start`
3. Scan the QR code with Expo Go app

#### iOS Development
```bash
npm run ios
# or
npx expo start --ios
```

#### Web Development
```bash
npm run web
# or
npx expo start --web
```

### 5. Production Builds

For production builds, you'll need to use **EAS Build**:

#### Install EAS CLI
```bash
npm install -g eas-cli
```

#### Configure EAS
```bash
eas build:configure
```

#### Build for Android
```bash
eas build --platform android
```

#### Build for iOS
```bash
eas build --platform ios
```

### 6. Alternative Local Builds

#### For Android APK (Legacy)
```bash
npx expo build:android
```

#### For iOS (Legacy)
```bash
npx expo build:ios
```

### 7. Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Clear cache and restart
npx expo start --clear
```

### Android-Specific Setup

The app is configured with:
- **Target SDK**: 35 (Latest Android)
- **Compile SDK**: 35
- **Build Tools**: 35.0.0
- **Permissions**: Read/Write External Storage
- **Edge-to-Edge**: Modern Android UI experience
- **Package**: com.notesapp.notesapp

### App Configuration Details

- **App Name**: Notesapp
- **Package**: com.notesapp.notesapp
- **Target SDK**: 35 (Latest Android)
- **Expo SDK**: 53
- **React Native**: 0.79.5
- **Database**: SQLite (local storage)
- **Navigation**: Expo Router with file-based routing

### Build Troubleshooting

#### Common Issues:

1. **Metro bundler issues**: 
   ```bash
   npx expo start --clear
   ```

2. **Android build issues**: 
   - Check Android SDK installation
   - Verify Android Studio setup
   - Ensure Java JDK is properly configured

3. **iOS build issues**:
   - Verify Xcode installation
   - Check iOS simulator setup
   - Ensure CocoaPods is installed

4. **Dependency issues**:
   ```bash
   rm -rf node_modules
   npm install
   ```

5. **Cache issues**:
   ```bash
   npx expo start --clear
   npm start -- --reset-cache
   ```

## App Features 📱

### 1. Notebooks Tab (Default Homepage)
- View all your notes in a clean card layout
- See note previews with title, content snippet, and timestamp
- Empty state with helpful guidance
- Delete notes with confirmation dialog
- Floating Action Button (FAB) to create new notes
- Real-time note refresh when returning from other screens

### 2. Revisions Tab
- Track all note changes and edits
- View creation and update history
- Color-coded action indicators (Created/Updated)
- Pull-to-refresh functionality
- Relative time formatting (Today, Yesterday, etc.)

### 3. Collections Tab
- Organize notes into categorized collections
- Pre-populated with default collections (Work, Personal, Ideas, Archive)
- Create custom collections with unique names
- Color-coded collection indicators
- Note count for each collection
- Delete collections (notes remain unaffected)

### 4. Reader Tab
- Save articles and links for later reading
- Add custom articles with title and URL
- Mark articles as read/unread automatically
- Favorite articles functionality
- External link opening in default browser
- Sample articles included for new users

### 5. Note Management
- Create new notes with rich text support
- Edit existing notes with pre-populated data
- Input validation and error handling
- Keyboard-aware layouts
- Modal presentation for focused editing

### 6. Database Features
- SQLite local storage for all data
- Automatic database initialization
- CRUD operations with error handling
- Timestamps for created and updated dates
- Separate tables for notes, collections, and articles

## Dependencies 📦

### Core Dependencies
- `expo`: ~53.0.17
- `react`: 19.0.0
- `react-native`: 0.79.5
- `expo-status-bar`: ~2.2.3

### Navigation & Routing
- `expo-router`: Latest file-based routing

### Database & Storage
- `expo-sqlite`: Local database storage
- `expo-file-system`: File system access

### UI & Icons
- `@expo/vector-icons`: Icon library

### Device & System
- `expo-constants`: App constants
- `expo-device`: Device information

## Scripts 📝

- `npm start`: Start Expo development server
- `npm run android`: Start on Android
- `npm run ios`: Start on iOS
- `npm run web`: Start on web

## Android Compatibility 🤖

This app is specifically optimized for Android with:

1. **Latest Android SDK (35)**
2. **Edge-to-edge display support**
3. **Material Design principles**
4. **Proper Android permissions**
5. **Android-specific styling (elevation, shadows)**
6. **Keyboard handling for Android**

## Folder Structure Details 📋

### `/app` Directory
- Uses Expo Router's file-based routing system
- `_layout.js`: Root navigation with Stack for modals
- `(tabs)/`: Bottom tab navigation container
  - `_layout.js`: Tab navigation configuration
  - `notebooks.js`: Main notes listing (default homepage)
  - `revisions.js`: Note revision history
  - `collections.js`: Note organization system
  - `reader.js`: Article reading list
- `add-note.js`: Create new note modal screen
- `edit-note/[id].js`: Dynamic route for editing notes

### Database Schema
```sql
-- Notes table
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collections table
CREATE TABLE collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  reading_progress INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME
);
```

## Development Tips 💡

1. **Hot Reloading**: Changes are reflected immediately during development
2. **Debugging**: Use React Developer Tools and Expo debugging tools
3. **Testing on Device**: Use Expo Go app for real device testing
4. **Android Emulator**: Use Android Studio's emulator for testing

## Customization 🎨

The app uses a modern color scheme that can be easily customized:

- **Primary**: `#6366f1` (Indigo)
- **Background**: `#f8fafc` (Slate)
- **Cards**: `#ffffff` (White)
- **Text**: `#1f2937` (Gray-800)
- **Secondary Text**: `#6b7280` (Gray-500)

## Performance Optimizations ⚡

- **SQLite**: Fast local database
- **FlatList**: Efficient list rendering
- **Memoization**: Optimized re-renders
- **Image Optimization**: Proper asset handling
- **Bundle Splitting**: Expo Router code splitting

## Deployment 🚀

### Expo Application Services (EAS)

EAS is the recommended way to build and deploy Expo apps:

1. **Create EAS account**: Visit [expo.dev](https://expo.dev) and create an account
2. **Login to EAS**: `eas login`
3. **Configure builds**: `eas build:configure`
4. **Submit to stores**: `eas submit`

### App Store Deployment

#### Android (Google Play Store)
```bash
# Build AAB for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

#### iOS (Apple App Store)
```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Local Development Tips

1. **Use physical device**: Better performance than emulators
2. **Enable hot reloading**: Faster development cycle
3. **Use Expo DevTools**: Press `m` in terminal to open
4. **Debug with Flipper**: For advanced debugging

## Advanced Troubleshooting 🔧

### Performance Issues

1. **Slow app startup**:
   ```bash
   npx expo install expo-splash-screen
   ```

2. **Memory issues**:
   - Use FlatList instead of ScrollView for large lists
   - Implement proper image caching
   - Use React.memo for component optimization

3. **Bundle size issues**:
   ```bash
   npx expo-bundle-analyzer
   ```

### Platform-Specific Issues

#### Android
- **Gradle build failures**: Update Android SDK tools
- **Permissions not working**: Check `android.permissions` in app.json
- **APK not installing**: Enable "Unknown sources" in Android settings

#### iOS
- **Provisioning profile issues**: Check Apple Developer account
- **Simulator not working**: Reset iOS Simulator
- **Build failures**: Clear derived data in Xcode

### Database Issues

1. **SQLite errors**:
   ```bash
   npx expo install expo-sqlite
   ```

2. **Database corruption**:
   - Clear app data
   - Reinstall the app
   - Check database migration scripts

### Network Issues

1. **Metro bundler not accessible**:
   ```bash
   npx expo start --tunnel
   ```

2. **Expo Go not connecting**:
   - Check firewall settings
   - Use tunnel mode
   - Verify network connectivity
3. **Database errors**: Check SQLite initialization
4. **Navigation issues**: Verify Expo Router setup

### Build for Production:

```bash
# For Android APK
npx expo build:android

# For EAS Build (recommended)
npm install -g @expo/eas-cli
eas build --platform android
```

## License 📄

This project is open source and available under the [MIT License](LICENSE).

## Support 💬

For issues and questions:
1. Check the Expo documentation
2. Visit React Native community forums
3. Check GitHub issues for similar problems

---

**Built with ❤️ using Expo and React Native** 