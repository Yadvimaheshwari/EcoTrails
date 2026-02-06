/**
 * DiscoveryQuest Component (Mobile)
 * 
 * Pokemon Go-style quest tracker for trail completion.
 * Users must find specific items along the trail to complete it.
 * Provides gamification and encourages exploration.
 * 
 * Mobile Developers (Android/iOS):
 * - ScrollView for quest list
 * - Haptic feedback on interactions
 * - Animated progress bar
 * - Quest items fetched from Gemini-powered backend
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { CATEGORY_ICONS, RARITY_CONFIG } from '../../services/visionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface QuestItem {
  id: string;
  name: string;
  category: 'plant' | 'animal' | 'bird' | 'geology' | 'landmark' | 'water' | 'insect' | 'fungi';
  hint: string;
  xp: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  completed: boolean;
  imageUrl?: string;
}

interface DiscoveryQuestProps {
  visible: boolean;
  onClose: () => void;
  trailName: string;
  questItems: QuestItem[];
  totalXp: number;
  earnedXp: number;
  completionBonus: number;
  onItemClick: (item: QuestItem) => void;
}

// Category icons mapping (supports more categories)
const QUEST_ICONS: Record<string, string> = {
  plant: '🌿',
  animal: '🦌',
  bird: '🦅',
  geology: '🪨',
  landmark: '🏔️',
  water: '💧',
  insect: '🦋',
  fungi: '🍄',
  ...CATEGORY_ICONS,
};

// Rarity colors
const QUEST_RARITY_COLORS = {
  common: { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
  uncommon: { bg: '#D1FAE5', border: '#6EE7B7', text: '#059669' },
  rare: { bg: '#EDE9FE', border: '#C4B5FD', text: '#7C3AED' },
  legendary: { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706' },
};

export const DiscoveryQuest: React.FC<DiscoveryQuestProps> = ({
  visible,
  onClose,
  trailName,
  questItems,
  totalXp,
  earnedXp,
  completionBonus,
  onItemClick,
}) => {
  const completedCount = questItems.filter(item => item.completed).length;
  const progressPercent = questItems.length > 0 ? (completedCount / questItems.length) * 100 : 0;
  const isComplete = completedCount === questItems.length && questItems.length > 0;

  const handleItemPress = useCallback((item: QuestItem) => {
    if (item.completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onItemClick(item);
  }, [onItemClick]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose} 
      />

      {/* Quest Sheet */}
      <Animated.View 
        style={styles.sheet}
        entering={FadeInDown.springify().damping(15)}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>🎯</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerLabel}>TRAIL QUEST</Text>
              <Text style={styles.trailName}>{trailName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {completedCount} / {questItems.length} discovered
            </Text>
            <View style={styles.xpContainer}>
              <Text style={styles.xpIcon}>⚡</Text>
              <Text style={styles.xpText}>{earnedXp} / {totalXp} XP</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[styles.progressBar, { width: `${progressPercent}%` }]} 
            />
          </View>
        </View>

        {/* Quest Items List */}
        <ScrollView 
          style={styles.questList}
          contentContainerStyle={styles.questListContent}
          showsVerticalScrollIndicator={false}
        >
          {questItems.map((item, index) => {
            const colors = QUEST_RARITY_COLORS[item.rarity];
            const isLocked = index > 0 && !questItems[index - 1].completed && item.rarity === 'legendary';
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.questItem,
                  item.completed && styles.questItemCompleted,
                  isLocked && styles.questItemLocked,
                  !item.completed && !isLocked && { 
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleItemPress(item)}
                disabled={item.completed || isLocked}
                activeOpacity={0.7}
              >
                {/* Status Icon */}
                <View style={[
                  styles.itemIcon,
                  item.completed && styles.itemIconCompleted,
                  isLocked && styles.itemIconLocked,
                ]}>
                  {item.completed ? (
                    <Text style={styles.itemIconText}>✓</Text>
                  ) : isLocked ? (
                    <Text style={styles.itemIconText}>🔒</Text>
                  ) : (
                    <Text style={styles.itemIconText}>{QUEST_ICONS[item.category] || '❓'}</Text>
                  )}
                </View>

                {/* Item Info */}
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Text style={[
                      styles.itemName,
                      item.completed && styles.itemNameCompleted,
                    ]}>
                      {item.completed || !isLocked ? item.name : '???'}
                    </Text>
                    {item.rarity !== 'common' && !isLocked && (
                      <View style={[styles.rarityBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <Text style={[styles.rarityText, { color: colors.text }]}>
                          {item.rarity}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemHint}>
                    {item.completed 
                      ? '✓ Discovered!' 
                      : isLocked 
                      ? 'Complete previous quests to unlock'
                      : item.hint
                    }
                  </Text>
                </View>

                {/* XP Reward */}
                <View style={[
                  styles.itemXp,
                  item.completed && styles.itemXpCompleted,
                ]}>
                  <Text style={[
                    styles.itemXpIcon,
                    item.completed && styles.itemXpIconCompleted,
                  ]}>⚡</Text>
                  <Text style={[
                    styles.itemXpText,
                    item.completed && styles.itemXpTextCompleted,
                  ]}>{item.xp}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Completion Bonus */}
          <View style={[
            styles.bonusItem,
            isComplete && styles.bonusItemComplete,
          ]}>
            <View style={[
              styles.itemIcon,
              isComplete ? styles.bonusIconComplete : styles.bonusIconLocked,
            ]}>
              <Text style={styles.itemIconText}>{isComplete ? '🏆' : '○'}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={[
                styles.itemName,
                isComplete && styles.bonusNameComplete,
              ]}>
                Quest Completion Bonus
              </Text>
              <Text style={styles.itemHint}>
                {isComplete ? 'Congratulations! Quest complete!' : 'Find all discoveries to unlock'}
              </Text>
            </View>
            <View style={[
              styles.itemXp,
              isComplete && styles.itemXpComplete,
            ]}>
              <Text style={styles.bonusXpIcon}>⭐</Text>
              <Text style={styles.bonusXpText}>+{completionBonus}</Text>
            </View>
          </View>

          {/* Complete Banner */}
          {isComplete && (
            <View style={styles.completeBanner}>
              <Text style={styles.completeIcon}>✨</Text>
              <Text style={styles.completeText}>All discoveries found! Trail mastered!</Text>
              <Text style={styles.completeIcon}>✨</Text>
            </View>
          )}
        </ScrollView>

        {/* Start Discovering Button */}
        {!isComplete && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
              // Parent should open camera
            }}
          >
            <Text style={styles.startButtonIcon}>📷</Text>
            <Text style={styles.startButtonText}>Open Camera to Discover</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

/**
 * Generate quest items from species hints
 */
export function generateQuestItems(
  trailId: string,
  trailName: string,
  hints: Array<{ name: string; category: string; likelihood: string; hint: string; xp: number }>
): QuestItem[] {
  return hints.map((hint, index) => ({
    id: `quest-${trailId}-${index}`,
    name: hint.name,
    category: hint.category as QuestItem['category'],
    hint: hint.hint,
    xp: hint.xp,
    rarity: hint.xp >= 80 ? 'legendary' : hint.xp >= 50 ? 'rare' : hint.xp >= 30 ? 'uncommon' : 'common',
    completed: false,
  }));
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  trailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#064E3B',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  xpText: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FCD34D',
    borderRadius: 5,
  },
  questList: {
    flex: 1,
  },
  questListContent: {
    padding: 16,
    gap: 12,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  questItemCompleted: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  questItemLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    opacity: 0.6,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemIconCompleted: {
    backgroundColor: '#10B981',
  },
  itemIconLocked: {
    backgroundColor: '#D1D5DB',
  },
  itemIconText: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#059669',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemHint: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemXp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemXpCompleted: {
    opacity: 0.5,
  },
  itemXpComplete: {
    opacity: 1,
  },
  itemXpIcon: {
    fontSize: 14,
  },
  itemXpIconCompleted: {
    color: '#10B981',
  },
  itemXpText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  itemXpTextCompleted: {
    color: '#10B981',
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    marginTop: 8,
  },
  bonusItemComplete: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderStyle: 'solid',
  },
  bonusIconComplete: {
    backgroundColor: '#F59E0B',
  },
  bonusIconLocked: {
    backgroundColor: '#FFF',
  },
  bonusNameComplete: {
    color: '#D97706',
  },
  bonusXpIcon: {
    fontSize: 14,
  },
  bonusXpText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginLeft: 4,
  },
  completeBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  completeIcon: {
    fontSize: 16,
  },
  completeText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  startButtonIcon: {
    fontSize: 20,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DiscoveryQuest;
