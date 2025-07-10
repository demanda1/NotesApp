# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native Core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo SDK Core
-keep class expo.modules.** { *; }
-keep class versioned.host.exp.exponent.** { *; }
-keep class host.exp.exponent.** { *; }

# File System Operations (Critical for this app)
-keep class expo.modules.filesystem.** { *; }
-keep class com.facebook.react.modules.storage.** { *; }
-keep class android.os.storage.** { *; }
-keep class java.io.** { *; }
-keep class java.nio.** { *; }

# SQLite Database Operations
-keep class org.sqlite.** { *; }
-keep class android.database.** { *; }
-keep class expo.modules.sqlite.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Navigation/Router
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# Performance & Memory
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.flipper.** { *; }

# Networking
-keep class com.facebook.react.modules.network.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Image Loading
-keep class com.facebook.react.modules.image.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }

# JavaScript Interface
-keep class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Native Modules (General)
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.module.** { *; }
-keep class com.facebook.react.modules.core.** { *; }

# Hermes/JSC Engine
-keep class com.facebook.hermes.instrumentation.** { *; }
-keep class com.facebook.jsc.** { *; }

# React Native Paper/UI Components
-keep class com.oblador.vectoricons.** { *; }

# Common third-party libraries
-keep class androidx.** { *; }
-keep class android.support.** { *; }

# Keep native method names
-keepclassmembers class * {
    native <methods>;
}

# Keep React Native classes with native methods
-keepclassmembers class com.facebook.react.** {
    native <methods>;
}

# Android specific
-keep class android.app.** { *; }
-keep class android.content.** { *; }
-keep class android.os.** { *; }

# Prevent obfuscation of View classes
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(...);
    *** get*();
}

# Keep classes that are referenced by XML layouts
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Add any project specific keep options here:
