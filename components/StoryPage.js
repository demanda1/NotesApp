import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function StoryPage({ 
  note, 
  index, 
  currentIndex, 
  isActive 
}) {
  const scrollViewRef = useRef(null);

  // Reset scroll position when this story becomes active
  useEffect(() => {
    if (isActive && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isActive]);

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'Low':
        return { name: 'flag-outline', color: '#10b981' };
      case 'Mid':
        return { name: 'flag', color: '#f59e0b' };
      case 'High':
        return { name: 'flag', color: '#f97316' };
      case 'Very High':
        return { name: 'flag', color: '#ef4444' };
      default:
        return { name: 'flag-outline', color: '#10b981' };
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

  const renderFormattedContent = (content) => {
    if (!content) {
      return <Text style={styles.noteText}>No content available</Text>;
    }

    const lines = content.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (line.trim() === '') {
        return <View key={lineIndex} style={styles.lineBreak} />;
      }

      let textStyle = [styles.noteText];
      let processedLine = line;

      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        textStyle.push(styles.bulletPoint);
        processedLine = line.trim();
      }
      else if (/^\d+\./.test(line.trim())) {
        textStyle.push(styles.numberedList);
        processedLine = line.trim();
      }
      else if (line.trim().endsWith(':') && line.trim().length < 100) {
        textStyle.push(styles.headerText);
        processedLine = line.trim();
      }
      else if (line.includes('**') || line.includes('*')) {
        return (
          <Text key={lineIndex} style={styles.noteText}>
            {formatInlineText(line)}
          </Text>
        );
      }

      return (
        <Text key={lineIndex} style={textStyle}>
          {processedLine}
        </Text>
      );
    });
  };

  const formatInlineText = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    
    let processedText = text.replace(boldRegex, (match, content) => {
      return `__BOLD__${content}__BOLD__`;
    });
    
    processedText = processedText.replace(italicRegex, (match, content) => {
      return `__ITALIC__${content}__ITALIC__`;
    });
    
    const segments = processedText.split(/(__BOLD__|__ITALIC__)/);
    let isBold = false;
    let isItalic = false;
    
    return segments.map((segment, segmentIndex) => {
      if (segment === '__BOLD__') {
        isBold = !isBold;
        return null;
      } else if (segment === '__ITALIC__') {
        isItalic = !isItalic;
        return null;
      } else if (segment) {
        const style = [styles.inlineText];
        if (isBold) style.push(styles.boldText);
        if (isItalic) style.push(styles.italicText);
        
        return (
          <Text key={segmentIndex} style={style}>
            {segment}
          </Text>
        );
      }
      return null;
    });
  };

  const priority = extractPriorityFromTags(note.tags);
  const icon = getPriorityIcon(priority);

  return (
    <View style={[styles.storyContainer, { backgroundColor: note.notebookColor }]}>
      {/* Header */}
      <View style={styles.storyHeader}>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>
            {note.notebookTitle} • {note.chapterTitle}
          </Text>
        </View>
        <View style={styles.priorityDisplay}>
          <View style={[styles.priorityTag, { borderColor: icon.color }]}>
            <Ionicons name={icon.name} size={16} color={icon.color} />
            <Text style={[styles.priorityText, { color: icon.color }]}>
              {priority}
            </Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.storyTitle}>{note.title}</Text>

      {/* Content - Fully independent ScrollView */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.contentScrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        directionalLockEnabled={true}
        automaticallyAdjustContentInsets={false}
        alwaysBounceVertical={true}
        pointerEvents="auto"
        scrollsToTop={false}
        pagingEnabled={false}
        decelerationRate="normal"
      >
        {renderFormattedContent(note.content)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  storyContainer: {
    width: width,
    height: height,
    padding: 20,
    paddingTop: 120, // Account for top section
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  breadcrumb: {
    flex: 1,
  },
  breadcrumbText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  priorityDisplay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    lineHeight: 36,
  },
  contentScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  contentContainer: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  noteText: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
    opacity: 0.9,
    marginBottom: 8,
  },
  lineBreak: {
    height: 12,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
    opacity: 0.9,
    marginBottom: 6,
    paddingLeft: 8,
  },
  numberedList: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
    opacity: 0.9,
    marginBottom: 6,
    paddingLeft: 8,
  },
  headerText: {
    fontSize: 20,
    color: '#fff',
    lineHeight: 30,
    fontWeight: 'bold',
    opacity: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  inlineText: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
    opacity: 0.9,
  },
  boldText: {
    fontWeight: 'bold',
    opacity: 1,
  },
  italicText: {
    fontStyle: 'italic',
  },
});
