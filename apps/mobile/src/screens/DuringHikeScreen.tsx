/**
 * DuringHikeScreen (Mobile)
 * Active hike screen with real-time tracking, discoveries, and gamification
 * Updated with gamified "Discover Mode" experience
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { useHikeStore } from '../store/useHikeStore';
import { useWearableStore } from '../store/useWearableStore';
import { WearableService } from '../services/wearableService';
import { api } from '../config/api';
import {
  Discovery,
  DiscoveryWithDistance,
  CapturedDiscovery,
  DISCOVERY_ICONS,
  DISCOVERY_COLORS,
  DEFAULT_REVEAL_RADIUS_METERS,
} from '../types/discovery';
import { Badge, BADGE_DEFINITIONS } from '../types/badge';
import {
  DiscoveryMarker,
  DiscoveryCard,
  CaptureModal,
  BadgeToast,
  HikeSummaryModal,
  LiveCameraDiscovery,
  DiscoveryQuest,
  generateQuestItems,
} from '../components/discovery';
import type { QuestItem } from '../components/discovery';
import { getTrailDiscoveries, captureDiscovery } from '../services/discoveryService';
import { visionService, IdentificationResult } from '../services/visionService';
import { haversineDistanceMeters } from '../utils/geoUtils';
import { formatElapsedTime, formatMiles, formatFeet } from '../utils/formatting';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UserLocation {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
}

export const DuringHikeScreen: React.FC = ({ route, navigation }: any) => {
  const { trailId, trailName, placeId, parkName, trailLat, trailLng, trailBounds } = route.params || {};
  const { currentHike, addRoutePoint, addSensorBatch, endHike, clearHike } = useHikeStore();
  const { getConnectedDevices } = useWearableStore();

  // Location & tracking state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [distance, setDistance] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [wearableStatus, setWearableStatus] = useState<string[]>([]);

  // Discovery state
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [discoveryMap, setDiscoveryMap] = useState<Map<string, DiscoveryWithDistance>>(new Map());
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [capturedDiscoveries, setCapturedDiscoveries] = useState<CapturedDiscovery[]>([]);
  const [capturedIds, setCapturedIds] = useState<Set<string>>(new Set());

  // Badge state
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [showBadgeToast, setShowBadgeToast] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);

  // Modal state
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);

  // Camera Discovery state (Pokemon Go-style)
  const [cameraVisible, setCameraVisible] = useState(false);
  const [questVisible, setQuestVisible] = useState(false);
  const [questItems, setQuestItems] = useState<QuestItem[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);

  // UI state
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Navigation state
  const [trailheadCoords, setTrailheadCoords] = useState<{lat: number, lng: number} | null>(null);

  // Trail center (must come from selected trail; no hard-coded defaults)
  const [trailCenter, setTrailCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [trailRoute, setTrailRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Refs
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const wearableService = useRef(WearableService.getInstance());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathingAnim = useRef(new Animated.Value(1)).current;
  const previousAltitude = useRef<number | null>(null);

  // =====================
  // Lifecycle Effects
  // =====================

  useEffect(() => {
    initializeHike();
    return cleanup;
  }, []);

  // Load navigation data (including trail route)
  useEffect(() => {
    const loadNavigation = async () => {
      if (!trailId) return;
      try {
        // Load trailhead navigation
        const navResponse = await api.get(`/api/v1/trails/${trailId}/navigation`);
        setTrailheadCoords(navResponse.data.trailhead);
        console.log('[DuringHike] Navigation data loaded');
        
        // Load trail route polyline
        const routeResponse = await api.get(`/api/v1/trails/${trailId}/route`);
        const geojson = routeResponse.data?.geojson;
        if (geojson && geojson.coordinates && Array.isArray(geojson.coordinates)) {
          // Convert [lng, lat] GeoJSON format to react-native-maps format
          const routeCoords = geojson.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setTrailRoute(routeCoords);
          console.log('[DuringHike] Trail route loaded with', routeCoords.length, 'points');
        }
      } catch (error) {
        console.warn('[DuringHike] Navigation/route data unavailable:', error);
      }
    };
    loadNavigation();
  }, [trailId]);

  useEffect(() => {
    // Breathing animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Update discovery distances when user location changes
  useEffect(() => {
    if (userLocation) {
      updateDiscoveryDistances();
    }
  }, [userLocation, discoveries]);

  // =====================
  // Initialization
  // =====================

  const initializeHike = async () => {
    // Resolve trail center BEFORE rendering the map
    const resolvedLat =
      typeof trailLat === 'number'
        ? trailLat
        : typeof currentHike.trailLocation?.lat === 'number'
          ? currentHike.trailLocation.lat
          : null;
    const resolvedLng =
      typeof trailLng === 'number'
        ? trailLng
        : typeof currentHike.trailLocation?.lng === 'number'
          ? currentHike.trailLocation.lng
          : null;

    if (resolvedLat === null || resolvedLng === null) {
      setLocationError('Unable to load trail location. Please try again.');
      setIsPreparing(false);
      return;
    }

    const center = { lat: resolvedLat, lng: resolvedLng };
    setTrailCenter(center);

    // Start location tracking
    await startLocationTracking();

    // Start timer
    startTimer();

    // Load discoveries for trail
    if (trailId) {
      loadDiscoveries();
      loadQuestItems();
    }

    // Start wearable collection
    const devices = getConnectedDevices();
    setWearableStatus(devices);
    if (devices.length > 0) {
      wearableService.current.startCollection();
    }

    // Center map on the TRAIL (not SF, not user) and zoom-to-bounds when available
    const b = trailBounds || currentHike.trailBounds;
    if (b && typeof b.north === 'number') {
      const latDelta = Math.max(0.005, Math.min(0.5, (b.north - b.south) * 1.2));
      const lngDelta = Math.max(0.005, Math.min(0.5, (b.east - b.west) * 1.2));
      mapRef.current?.animateToRegion({
        latitude: (b.north + b.south) / 2,
        longitude: (b.east + b.west) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
    } else {
      mapRef.current?.animateToRegion({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
    setIsPreparing(false);
  };

  // Load quest items for the trail (Pokemon Go-style find list)
  const loadQuestItems = async () => {
    try {
      // Fetch species hints from backend (uses Gemini)
      const location = trailCenter || userLocation;
      if (!location) {
        throw new Error('No location available for hints');
      }
      const hints = await visionService.getSpeciesHints(location);
      
      // Generate quest items from hints
      const items = generateQuestItems(trailId, trailName || 'Trail Quest', hints);
      setQuestItems(items);
      
      // Calculate total XP
      const total = items.reduce((sum, item) => sum + item.xp, 0) + 50; // +50 completion bonus
      setTotalXp(total);
    } catch (error) {
      console.warn('[DuringHike] Failed to load quest items:', error);
      // Use fallback quest items
      setQuestItems([
        { id: 'q1', name: 'Oak Tree', category: 'plant', hint: 'Look for lobed leaves', xp: 20, rarity: 'common', completed: false },
        { id: 'q2', name: 'Songbird', category: 'bird', hint: 'Listen for melodic calls', xp: 25, rarity: 'common', completed: false },
        { id: 'q3', name: 'Wildflower', category: 'plant', hint: 'Check sunny clearings', xp: 30, rarity: 'uncommon', completed: false },
        { id: 'q4', name: 'Deer Sighting', category: 'animal', hint: 'Watch meadows at dusk', xp: 45, rarity: 'uncommon', completed: false },
        { id: 'q5', name: 'Hawk', category: 'bird', hint: 'Scan the sky near ridges', xp: 65, rarity: 'rare', completed: false },
      ]);
      setTotalXp(235); // 20+25+30+45+65+50 bonus
    }
  };

  const cleanup = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    wearableService.current.stopCollection();
  };

  // =====================
  // Location Tracking
  // =====================

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'Location is needed to track your hike and show discoveries.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get initial location
    try {
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const initialLoc = {
        lat: initial.coords.latitude,
        lng: initial.coords.longitude,
        altitude: initial.coords.altitude ?? undefined,
        accuracy: initial.coords.accuracy ?? undefined,
      };
      setUserLocation(initialLoc);
      previousAltitude.current = initialLoc.altitude ?? null;
    } catch (err) {
      console.warn('Failed to get initial location:', err);
    }

    // Start watching
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        const newLoc = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          altitude: location.coords.altitude ?? undefined,
          accuracy: location.coords.accuracy ?? undefined,
        };

        // Calculate distance from previous point
        if (currentHike.routePoints.length > 0) {
          const prev = currentHike.routePoints[currentHike.routePoints.length - 1];
          const dist = calculateDistanceMiles(
            prev.location.lat,
            prev.location.lng,
            newLoc.lat,
            newLoc.lng
          );
          setDistance((d) => d + dist);
        }

        // Calculate elevation gain
        if (newLoc.altitude !== undefined && previousAltitude.current !== null) {
          const elevDiff = newLoc.altitude - previousAltitude.current;
          if (elevDiff > 0) {
            setElevationGain((e) => e + elevDiff * 3.28084); // Convert to feet
          }
          previousAltitude.current = newLoc.altitude;
        }

        setUserLocation(newLoc);

        // Add route point
        addRoutePoint({
          sequence: currentHike.routePoints.length,
          timestamp: new Date(),
          location: newLoc,
        });

        // Add sensor batch periodically
        if (currentHike.routePoints.length > 0 && currentHike.routePoints.length % 10 === 0) {
          addSensorBatch([
            {
              timestamp: new Date(),
              type: 'sensor',
              data: {
                heartRate: Math.floor(Math.random() * 40) + 80,
                temperature: Math.floor(Math.random() * 10) + 65,
              },
              location: { lat: newLoc.lat, lng: newLoc.lng },
              confidence: 'High',
            },
          ]);
        }
      }
    );
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (currentHike.startTimeMs) {
        const elapsed = Math.floor((Date.now() - currentHike.startTimeMs) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);
  };

  // =====================
  // Discoveries
  // =====================

  const loadDiscoveries = async () => {
    try {
      const trailDiscoveries = await getTrailDiscoveries(trailId);
      setDiscoveries(trailDiscoveries);
    } catch (error) {
      console.error('Failed to load discoveries:', error);
    }
  };

  const updateDiscoveryDistances = useCallback(() => {
    if (!userLocation) return;

    const newMap = new Map<string, DiscoveryWithDistance>();

    discoveries.forEach((discovery) => {
      const distanceMeters = haversineDistanceMeters(
        userLocation,
        { lat: discovery.lat, lng: discovery.lng }
      );
      const revealRadius = discovery.revealRadiusMeters || DEFAULT_REVEAL_RADIUS_METERS;
      const isRevealed = distanceMeters <= revealRadius;
      const isCaptured = capturedIds.has(discovery.id);

      newMap.set(discovery.id, {
        ...discovery,
        distanceMeters,
        isRevealed,
        isCaptured,
      });

      // Trigger haptic if newly revealed
      if (isRevealed && !discoveryMap.get(discovery.id)?.isRevealed && !isCaptured) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });

    setDiscoveryMap(newMap);
  }, [userLocation, discoveries, capturedIds, discoveryMap]);

  const handleDiscoveryPress = (discovery: Discovery) => {
    setSelectedDiscovery(discovery);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCloseDiscoveryCard = () => {
    setSelectedDiscovery(null);
  };

  const handleOpenCaptureModal = () => {
    setCaptureModalVisible(true);
  };

  const handleCapture = async (
    photoUri: string | null,
    notes: string
  ): Promise<{ badge: Badge | null }> => {
    if (!selectedDiscovery || !userLocation || !currentHike.id) {
      return { badge: null };
    }

    const result = await captureDiscovery(
      currentHike.id,
      selectedDiscovery.id,
      { lat: userLocation.lat, lng: userLocation.lng },
      photoUri ?? undefined,
      notes
    );

    if (result.success && result.capturedDiscovery) {
      // Mark as captured
      setCapturedIds((prev) => new Set(prev).add(selectedDiscovery.id));
      setCapturedDiscoveries((prev) => [...prev, result.capturedDiscovery!]);

      // Award badge
      if (result.badge) {
        setEarnedBadges((prev) => [...prev, result.badge!]);
        setCurrentBadge(result.badge);
        setShowBadgeToast(true);
      }

      // Clear selection
      setCaptureModalVisible(false);
      setSelectedDiscovery(null);
    }

    return { badge: result.badge };
  };

  // =====================
  // Hike Controls
  // =====================

  const handleEndHike = async () => {
    Alert.alert('End Hike', 'Are you sure you want to end your hike?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Hike',
        style: 'destructive',
        onPress: async () => {
          await endHike();
          setSummaryModalVisible(true);
        },
      },
    ]);
  };

  const handleCaptureMoment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CaptureMoment');
  };

  const openGoogleMapsNavigation = () => {
    if (!trailheadCoords) {
      Alert.alert('Navigation Unavailable', 'Trail coordinates not available');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const scheme = Platform.select({
      ios: 'comgooglemaps://',
      android: 'google.navigation:q='
    });
    
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${trailheadCoords.lat},${trailheadCoords.lng}&travelmode=driving`;
    
    const url = Platform.select({
      ios: `${scheme}?daddr=${trailheadCoords.lat},${trailheadCoords.lng}&directionsmode=driving`,
      android: `${scheme}${trailheadCoords.lat},${trailheadCoords.lng}&mode=d`
    });
    
    Linking.canOpenURL(url!).then(supported => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        // Fallback to browser
        Linking.openURL(fallback);
      }
    }).catch(err => {
      console.error('Failed to open maps:', err);
      Linking.openURL(fallback);
    });
  };

  // =====================
  // Camera Discovery Handlers (Pokemon Go-style)
  // =====================

  const handleOpenCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCameraVisible(true);
  };

  const handleCloseCamera = () => {
    setCameraVisible(false);
  };

  const handleCameraDiscovery = (result: IdentificationResult, xpAwarded: number) => {
    // Add XP
    setEarnedXp(prev => prev + xpAwarded);

    // Update quest items if this matches a quest
    const matchingQuestIndex = questItems.findIndex(
      item => !item.completed && 
      item.name.toLowerCase().includes(result.name.toLowerCase().split(' ')[0])
    );

    if (matchingQuestIndex >= 0) {
      setQuestItems(prev => prev.map((item, idx) => 
        idx === matchingQuestIndex ? { ...item, completed: true } : item
      ));
    }

    // Award camera discovery badge on first use
    const cameraDiscoveryCount = capturedDiscoveries.filter(d => d.photoUri).length + 1;
    if (cameraDiscoveryCount === 1) {
      const cameraBadge: Badge = {
        id: `badge-camera-${Date.now()}`,
        ...BADGE_DEFINITIONS.camera_discovery,
      };
      setEarnedBadges(prev => [...prev, cameraBadge]);
      setCurrentBadge(cameraBadge);
      setShowBadgeToast(true);
    }

    // Award legendary finder badge if rarity is legendary
    if (result.rarity === 'legendary') {
      const legendaryBadge: Badge = {
        id: `badge-legendary-${Date.now()}`,
        ...BADGE_DEFINITIONS.legendary_find,
      };
      setEarnedBadges(prev => [...prev, legendaryBadge]);
      setTimeout(() => {
        setCurrentBadge(legendaryBadge);
        setShowBadgeToast(true);
      }, 2500);
    }

    // Award nature photographer badge at 10 captures
    if (cameraDiscoveryCount === 10) {
      const photoBadge: Badge = {
        id: `badge-photo-${Date.now()}`,
        ...BADGE_DEFINITIONS.nature_photographer,
      };
      setEarnedBadges(prev => [...prev, photoBadge]);
      setTimeout(() => {
        setCurrentBadge(photoBadge);
        setShowBadgeToast(true);
      }, 2500);
    }

    setCameraVisible(false);
  };

  // =====================
  // Quest Handlers
  // =====================

  const handleOpenQuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuestVisible(true);
  };

  const handleCloseQuest = () => {
    setQuestVisible(false);
  };

  const handleQuestItemClick = (item: QuestItem) => {
    // Close quest and open camera to find this item
    setQuestVisible(false);
    setCameraVisible(true);
  };

  // Calculate quest completion bonus
  const questCompletionBonus = 50;
  const isQuestComplete = questItems.length > 0 && questItems.every(item => item.completed);

  // Award quest complete badge when all items are found
  useEffect(() => {
    if (isQuestComplete && !earnedBadges.some(b => b.type === 'quest_complete')) {
      const questBadge: Badge = {
        id: `badge-quest-${Date.now()}`,
        ...BADGE_DEFINITIONS.quest_complete,
      };
      setEarnedBadges(prev => [...prev, questBadge]);
      setEarnedXp(prev => prev + questCompletionBonus);
      setTimeout(() => {
        setCurrentBadge(questBadge);
        setShowBadgeToast(true);
      }, 1000);
    }
  }, [isQuestComplete]);

  const handleViewJournal = () => {
    setSummaryModalVisible(false);
    clearHike();
    navigation.navigate('Journal');
  };

  const handleShareHike = () => {
    Alert.alert('Share', 'Sharing will be available soon!');
  };

  const handleCloseSummary = () => {
    setSummaryModalVisible(false);
    clearHike();
    navigation.navigate('Explore');
  };

  const toggleMapExpand = () => {
    setIsMapExpanded(!isMapExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // =====================
  // Helpers
  // =====================

  const calculateDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getRevealedDiscoveries = (): DiscoveryWithDistance[] => {
    return Array.from(discoveryMap.values()).filter((d) => d.isRevealed);
  };

  const getInitialRegion = () => {
    const b = trailBounds || currentHike.trailBounds;
    if (b && typeof b.north === 'number') {
      const latDelta = Math.max(0.005, Math.min(0.5, (b.north - b.south) * 1.2));
      const lngDelta = Math.max(0.005, Math.min(0.5, (b.east - b.west) * 1.2));
      return {
        latitude: (b.north + b.south) / 2,
        longitude: (b.east + b.west) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }
    if (trailCenter) {
      return {
        latitude: trailCenter.lat,
        longitude: trailCenter.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    if (userLocation) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return null;
  };

  // =====================
  // Render
  // =====================

  const revealedDiscoveries = getRevealedDiscoveries();

  if (isPreparing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text variant="h2">Preparing your hike...</Text>
          <Text variant="body" color="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
            Loading trail location and setting up tracking.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (locationError || !trailCenter) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text variant="h2">Unable to load trail location</Text>
          <Text variant="body" color="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
            Unable to load trail location. Please try again.
          </Text>
          <View style={{ marginTop: 16, width: '100%' }}>
            <Button title="Go Back" onPress={() => navigation.goBack()} size="lg" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const initialRegion = getInitialRegion();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View
            style={[styles.liveIndicator, { transform: [{ scale: breathingAnim }] }]}
          />
          <Text variant="caption" color="secondary">
            LIVE
          </Text>
        </View>
        <View style={styles.headerCenter}>
          <Text variant="h3" numberOfLines={1}>
            {trailName || 'Hike in Progress'}
          </Text>
          {parkName ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {parkName}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {wearableStatus.length > 0 && (
            <View style={styles.wearableBadge}>
              <Ionicons name="watch" size={14} color={colors.success} />
            </View>
          )}
        </View>
      </View>

      {/* Map Section */}
      <View style={[styles.mapContainer, isMapExpanded && styles.mapExpanded]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion as any}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          followsUserLocation={false}
        >
          {/* Tracked route */}
          {currentHike.routePoints.length > 1 && (
            <Polyline
              coordinates={currentHike.routePoints.map((p) => ({
                latitude: p.location.lat,
                longitude: p.location.lng,
              }))}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          )}

          {/* Discovery markers */}
          {revealedDiscoveries.map((discovery) => (
            <DiscoveryMarker
              key={discovery.id}
              discovery={discovery}
              isRevealed={discovery.isRevealed}
              isCaptured={discovery.isCaptured}
              distanceMeters={discovery.distanceMeters}
              onPress={() => handleDiscoveryPress(discovery)}
            />
          ))}
        </MapView>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapButton} onPress={toggleMapExpand}>
            <Ionicons
              name={isMapExpanded ? 'contract-outline' : 'expand-outline'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              if (userLocation) {
                mapRef.current?.animateToRegion({
                  latitude: userLocation.lat,
                  longitude: userLocation.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              }
            }}
          >
            <Ionicons name="locate" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Google Maps Navigation Button */}
          {trailheadCoords && (
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#4285F4',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
              onPress={openGoogleMapsNavigation}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={20} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>

        {/* Discovery count badge */}
        {revealedDiscoveries.length > 0 && (
          <View style={styles.discoveryCountBadge}>
            <Text style={styles.discoveryCountIcon}>🔍</Text>
            <Text variant="caption" style={styles.discoveryCountText}>
              {revealedDiscoveries.filter((d) => !d.isCaptured).length} nearby
            </Text>
          </View>
        )}
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="h2" style={styles.statValue}>
              {formatElapsedTime(elapsedTime)}
            </Text>
            <Text variant="caption" color="secondary">
              Duration
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="h2" style={styles.statValue}>
              {formatMiles(distance)}
            </Text>
            <Text variant="caption" color="secondary">
              Miles
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="h2" style={styles.statValue}>
              {formatFeet(elevationGain)}
            </Text>
            <Text variant="caption" color="secondary">
              Elevation
            </Text>
          </View>
        </View>

        {/* Discovery progress */}
        <View style={styles.discoveryProgress}>
          <View style={styles.discoveryProgressHeader}>
            <Text variant="caption" color="secondary">
              Discoveries
            </Text>
            <Text variant="caption" color="secondary">
              {capturedDiscoveries.length} / {discoveries.length}
            </Text>
          </View>
          <View style={styles.discoveryProgressBar}>
            <View
              style={[
                styles.discoveryProgressFill,
                {
                  width:
                    discoveries.length > 0
                      ? `${(capturedDiscoveries.length / discoveries.length) * 100}%`
                      : '0%',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Primary Discovery Buttons */}
        <View style={styles.discoveryButtons}>
          {/* AI Camera Discovery Button */}
          <TouchableOpacity
            style={styles.cameraDiscoveryButton}
            onPress={handleOpenCamera}
            activeOpacity={0.8}
          >
            <View style={styles.cameraButtonIcon}>
              <Ionicons name="scan" size={28} color={colors.surface} />
            </View>
            <View style={styles.cameraButtonText}>
              <Text variant="body" style={styles.captureText}>
                AI Discovery
              </Text>
              <Text variant="caption" style={styles.captureSubtext}>
                Point & Identify
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quest Button */}
          <TouchableOpacity
            style={styles.questButton}
            onPress={handleOpenQuest}
            activeOpacity={0.8}
          >
            <Text style={styles.questIcon}>🎯</Text>
            <Text variant="caption" style={styles.questButtonText}>
              Quest
            </Text>
            {questItems.length > 0 && (
              <View style={styles.questBadge}>
                <Text style={styles.questBadgeText}>
                  {questItems.filter(q => q.completed).length}/{questItems.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Secondary: Original Capture Moment */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCaptureMoment}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color={colors.surface} />
          <Text variant="body" style={styles.captureText}>
            Photo Journal
          </Text>
        </TouchableOpacity>

        {/* XP Progress */}
        {totalXp > 0 && (
          <View style={styles.xpProgress}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpIcon}>⚡</Text>
              <Text style={styles.xpLabel}>XP Earned</Text>
              <Text style={styles.xpValue}>{earnedXp} / {totalXp}</Text>
            </View>
            <View style={styles.xpBar}>
              <View 
                style={[
                  styles.xpFill, 
                  { width: `${Math.min(100, (earnedXp / totalXp) * 100)}%` }
                ]} 
              />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.endButton} onPress={handleEndHike}>
          <Text style={styles.endButtonText}>End Hike</Text>
        </TouchableOpacity>
      </View>

      {/* Discovery Card (when selected) */}
      {selectedDiscovery && (
        <DiscoveryCard
          discovery={selectedDiscovery}
          distanceMeters={discoveryMap.get(selectedDiscovery.id)?.distanceMeters || 0}
          isCaptured={capturedIds.has(selectedDiscovery.id)}
          onCapture={handleOpenCaptureModal}
          onClose={handleCloseDiscoveryCard}
        />
      )}

      {/* Capture Modal */}
      {selectedDiscovery && (
        <CaptureModal
          visible={captureModalVisible}
          discovery={selectedDiscovery}
          onClose={() => setCaptureModalVisible(false)}
          onCapture={handleCapture}
        />
      )}

      {/* Badge Toast */}
      <BadgeToast
        badge={currentBadge}
        visible={showBadgeToast}
        onHide={() => {
          setShowBadgeToast(false);
          setCurrentBadge(null);
        }}
      />

      {/* Hike Summary Modal */}
      <HikeSummaryModal
        visible={summaryModalVisible}
        hikeData={
          currentHike.id
            ? {
                id: currentHike.id,
                trailName: trailName,
                parkName: parkName,
                startTime: currentHike.startTimeMs ? new Date(currentHike.startTimeMs) : new Date(),
                endTime: new Date(),
                distanceMiles: distance,
                elevationGainFeet: elevationGain,
                routePoints: currentHike.routePoints.map((p) => ({
                  lat: p.location.lat,
                  lng: p.location.lng,
                })),
              }
            : null
        }
        capturedDiscoveries={capturedDiscoveries}
        earnedBadges={earnedBadges}
        onClose={handleCloseSummary}
        onViewJournal={handleViewJournal}
        onShareHike={handleShareHike}
      />

      {/* Live Camera Discovery (Pokemon Go-style) */}
      <LiveCameraDiscovery
        visible={cameraVisible}
        onClose={handleCloseCamera}
        hikeId={currentHike.id || ''}
        currentLocation={userLocation || undefined}
        onDiscoveryMade={handleCameraDiscovery}
      />

      {/* Discovery Quest Sheet */}
      <DiscoveryQuest
        visible={questVisible}
        onClose={handleCloseQuest}
        trailName={trailName || 'Trail Quest'}
        questItems={questItems}
        totalXp={totalXp}
        earnedXp={earnedXp}
        completionBonus={questCompletionBonus}
        onItemClick={handleQuestItemClick}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 60,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  wearableBadge: {
    backgroundColor: '#D1FAE5',
    padding: 6,
    borderRadius: 12,
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.35,
    position: 'relative',
  },
  mapExpanded: {
    height: SCREEN_HEIGHT * 0.55,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  discoveryCountBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  discoveryCountIcon: {
    fontSize: 16,
  },
  discoveryCountText: {
    color: colors.primary,
    fontWeight: '600',
  },
  statsPanel: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    marginBottom: 4,
    color: colors.text,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  discoveryProgress: {
    marginTop: 8,
  },
  discoveryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discoveryProgressBar: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  discoveryProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 32,
  },
  discoveryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cameraDiscoveryButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cameraButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonText: {
    flex: 1,
  },
  captureSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  questButton: {
    width: 80,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  questIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  questButtonText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 12,
  },
  questBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  questBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  captureText: {
    color: colors.surface,
    fontWeight: '600',
  },
  xpProgress: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  xpLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
  },
  xpValue: {
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  xpBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  endButton: {
    alignItems: 'center',
    padding: 12,
  },
  endButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 16,
  },
});
