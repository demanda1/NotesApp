import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

export default function SidebarMenu({
  visible,
  onClose,
  menuItems = [],
  title = 'Menu',
  footerInfo = null,
}) {
  const leftSlideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(leftSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(leftSlideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.modalContainer}>
      {/* Animated Overlay */}
      <Animated.View 
        style={[
          styles.modalBackground,
          {
            opacity: overlayOpacity,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Left Sidebar */}
      <Animated.View 
        style={[
          styles.leftSidebar,
          {
            transform: [{ translateX: leftSlideAnim }],
          }
        ]}
      >
        <View style={[styles.sidebarHeader, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.sidebarTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.sidebarContent}>
          {menuItems.map((item, index) => (
            <View key={index}>
              {item.type === 'divider' ? (
                <View style={styles.divider} />
              ) : (
                <TouchableOpacity 
                  style={styles.sidebarItem}
                  onPress={() => {
                    if (item.action) {
                      item.action();
                    }
                  }}
                >
                  <Ionicons name={item.icon} size={20} color={item.color || "#6366f1"} />
                  <Text style={styles.sidebarItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {footerInfo && (
            <View style={styles.footerInfo}>
              <Text style={styles.footerTitle}>{footerInfo.title}</Text>
              <Text style={styles.footerPath}>{footerInfo.subtitle}</Text>
              <Text style={styles.footerStatus}>{footerInfo.status}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  leftSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
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
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  footerInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  footerPath: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  footerStatus: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});
