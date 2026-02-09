/**
 * HomeScreen - Primary entry point for EcoTrails
 * Mission control for exploration, planning, and active adventure
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../components/ui/Text';
import { colors } from '../config/colors';
import { api } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';
import { useHikeStore } from '../store/useHikeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;

// Featured parks data (can be fetched from API)
const FEATURED_PARKS = [
  { id: 'yell', name: 'Yellowstone', location: 'Wyoming, USA', image: 'https://images.unsplash.com/photo-1565017054380-2a2b6c0a1b9a?w=800', rating: 4.9 },
  { id: 'yose', name: 'Yosemite', location: 'California, USA', image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800', rating: 4.8 },
  { id: 'grca', name: 'Grand Canyon', location: 'Arizona, USA', image: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=800', rating: 4.9 },
  { id: 'zion', name: 'Zion', location: 'Utah, USA', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800', rating: 4.8 },
];

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'browse', icon: 'map', label: 'Browse by State', color: '#4F8A6B', route: 'Explore' },
  { id: 'hike', icon: 'footsteps', label: 'Start a Hike', color: '#E67E22', route: 'TrackingSetup' },
  { id: 'journal', icon: 'book', label: 'My Journal', color: '#3498DB', route: 'JournalTab' },
  { id: 'offline', icon: 'cloud-download', label: 'Offline Maps', color: '#9B59B6', route: 'OfflineMaps' },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { currentHike } = useHikeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentHike, setRecentHike] = useState<any>(null);
  const [hikesCount, setHikesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = useCallback(async () => {
    try {
      // Load recent hike
      const hikesRes = await api.get('/api/v1/hikes', { params: { limit: 1 } });
      if (hikesRes.data?.hikes?.length > 0) {
        setRecentHike(hikesRes.data.hikes[0]);
      }
      setHikesCount(hikesRes.data?.total || 0);

      // Load alerts (if available)
      try {
        const alertsRes = await api.get('/api/v1/alerts/nearby');
        setAlerts(alertsRes.data?.alerts || []);
      } catch {
        setAlerts([]);
      }
    } catch (error) {
      console.log('[Home] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('MainTabs', { 
        screen: 'Explore',
        params: { searchQuery: searchQuery.trim() }
      });
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.route === 'JournalTab') {
      navigation.navigate('MainTabs', { screen: 'Journal' });
    } else if (action.route === 'Explore') {
      navigation.navigate('MainTabs', { screen: 'Explore' });
    } else {
      navigation.navigate(action.route);
    }
  };

  const handleParkPress = async (park: typeof FEATURED_PARKS[0]) => {
    try {
      // Search for the park and navigate to details
      const res = await api.get('/api/v1/places/search', { params: { query: park.name + ' national park', limit: 1 } });
      if (res.data?.places?.length > 0) {
        navigation.navigate('PlaceDetail', { placeId: res.data.places[0].id });
      }
    } catch (error) {
      console.log('[Home] Error navigating to park:', error);
    }
  };

  const userName = user?.name?.split(' ')[0] || 'Explorer';
  const statusText = hikesCount > 0 
    ? `${hikesCount} hike${hikesCount > 1 ? 's' : ''} completed` 
    : 'Ready for your next adventure';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}, {userName}</Text>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'You' })}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.profileGradient}
            >
              <Text style={styles.profileInitial}>{userName[0].toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <BlurView intensity={80} tint="light" style={styles.searchBlur}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search parks, trails, or ask anything..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </BlurView>
        </View>

        {/* Featured Parks Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Today</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 16}
          >
            {FEATURED_PARKS.map((park) => (
              <TouchableOpacity
                key={park.id}
                style={styles.parkCard}
                onPress={() => handleParkPress(park)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: park.image }} style={styles.parkImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.parkGradient}
                >
                  <View style={styles.parkInfo}>
                    <Text style={styles.parkName}>{park.name}</Text>
                    <Text style={styles.parkLocation}>{park.location}</Text>
                    <View style={styles.parkRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>{park.rating}</Text>
                    </View>
                  </View>
                  <View style={styles.viewParkButton}>
                    <Text style={styles.viewParkText}>View Park</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Active/Recent Hike Card */}
        {currentHike ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Hike</Text>
            <TouchableOpacity
              style={styles.hikeCard}
              onPress={() => navigation.navigate('DuringHike', { hikeId: currentHike.id })}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hikeCardGradient}
              >
                <View style={styles.hikeCardContent}>
                  <Ionicons name="footsteps" size={32} color="#fff" />
                  <View style={styles.hikeCardText}>
                    <Text style={styles.hikeCardTitle}>{currentHike.trail?.name || 'Active Hike'}</Text>
                    <Text style={styles.hikeCardSubtitle}>Hike in progress</Text>
                  </View>
                </View>
                <View style={styles.resumeButton}>
                  <Text style={styles.resumeButtonText}>Resume Hike</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : recentHike ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              style={styles.recentHikeCard}
              onPress={() => navigation.navigate('HikeDetail', { hikeId: recentHike.id })}
            >
              <View style={styles.recentHikeIcon}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.recentHikeInfo}>
                <Text style={styles.recentHikeName}>{recentHike.trail?.name || 'Recent Hike'}</Text>
                <Text style={styles.recentHikeDate}>
                  {new Date(recentHike.completed_at || recentHike.started_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('HikeDetail', { hikeId: recentHike.id })}
              >
                <Text style={styles.viewDetailsText}>View</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.emptyHikeCard}>
              <Ionicons name="compass-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyHikeText}>Plan your first hike</Text>
              <TouchableOpacity 
                style={styles.planButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Explore' })}
              >
                <Text style={styles.planButtonText}>Explore Parks</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Safety & Alerts Panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Alerts</Text>
          <View style={styles.alertsCard}>
            {alerts.length > 0 ? (
              alerts.slice(0, 2).map((alert, index) => (
                <View key={index} style={styles.alertItem}>
                  <Ionicons 
                    name={alert.severity === 'high' ? 'warning' : 'information-circle'} 
                    size={20} 
                    color={alert.severity === 'high' ? '#E74C3C' : '#F39C12'} 
                  />
                  <Text style={styles.alertText} numberOfLines={2}>{alert.message}</Text>
                </View>
              ))
            ) : (
              <View style={styles.allClearContainer}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.allClearText}>All clear for nearby parks</Text>
              </View>
            )}
          </View>
        </View>

        {/* AI Companion Teaser */}
        <TouchableOpacity 
          style={styles.aiCompanionCard}
          onPress={() => {/* Open AI companion */}}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiGradient}
          >
            <View style={styles.aiContent}>
              <View style={styles.aiIconContainer}>
                <Ionicons name="sparkles" size={24} color="#fff" />
              </View>
              <View style={styles.aiTextContainer}>
                <Text style={styles.aiTitle}>Talk to Sage</Text>
                <Text style={styles.aiSubtitle}>Your AI hiking companion</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  statusText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  profileGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  carouselContent: {
    paddingRight: 20,
  },
  parkCard: {
    width: CARD_WIDTH,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  parkImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  parkGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    padding: 16,
    justifyContent: 'flex-end',
  },
  parkInfo: {
    marginBottom: 8,
  },
  parkName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  parkLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  parkRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  viewParkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewParkText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginRight: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  hikeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  hikeCardGradient: {
    padding: 20,
  },
  hikeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hikeCardText: {
    marginLeft: 16,
    flex: 1,
  },
  hikeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  hikeCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
  },
  recentHikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  recentHikeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentHikeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  recentHikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recentHikeDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewDetailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: 20,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyHikeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyHikeText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  planButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 25,
  },
  planButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  alertsCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 12,
    lineHeight: 20,
  },
  allClearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  allClearText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 10,
  },
  aiCompanionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  aiGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTextContainer: {
    marginLeft: 14,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  aiSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

export default HomeScreen;
