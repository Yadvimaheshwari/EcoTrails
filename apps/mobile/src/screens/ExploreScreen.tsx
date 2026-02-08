import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';
import { Screen } from '../ui';
import { Title, BodyText } from '../ui';

interface Place {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
}

interface Trail {
  id: string;
  name: string;
  difficulty: string;
  lengthMiles: number;
  rating: number;
}

export const ExploreScreen: React.FC = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [stateCode, setStateCode] = useState<string>('ca');
  const [stateParks, setStateParks] = useState<Array<{ name: string; parkCode: string; canonicalUrl: string }>>([]);
  const [loadingState, setLoadingState] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    loadNearbyPlaces();
    loadStateParks('ca');
  }, []);

  const loadStateParks = async (sc: string) => {
    setLoadingState(true);
    try {
      const res = await api.get(`/api/nps/state/${sc}`);
      const parks = res.data?.parks || [];
      setStateParks(
        (Array.isArray(parks) ? parks : []).map((p: any) => ({
          name: p?.name,
          parkCode: p?.parkCode,
          canonicalUrl: p?.canonicalUrl || p?.url,
        }))
      );
    } catch (e) {
      setStateParks([]);
    } finally {
      setLoadingState(false);
    }
  };

  const handleStateChange = (sc: string) => {
    setStateCode(sc);
    loadStateParks(sc);
  };

  const handleStateParkSelect = async (park: { name: string; parkCode: string }) => {
    // Convert NPS listing entry -> our PlaceDetail flow by searching our places index for the park name.
    try {
      const resp = await api.get('/api/v1/places/search', { params: { query: park.name, limit: 5 } });
      const places = resp.data?.places || [];
      const match = Array.isArray(places) && places.length > 0 ? places[0] : null;
      if (match?.id) {
        navigation.navigate('PlaceDetail', { placeId: match.id });
        return;
      }
    } catch {}
  };

  const loadNearbyPlaces = async () => {
    try {
      setRequestingLocation(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to show nearby parks.');
        setNearbyPlaces([]);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);

      const response = await api.get('/api/v1/places/nearby', {
        // Match web defaults: radius=50 (backend interprets this consistently across clients)
        params: { lat: loc.lat, lng: loc.lng, radius: 50, limit: 10 },
      });
      setNearbyPlaces(response.data.places || []);
    } catch (error: any) {
      console.error('Failed to load nearby places:', error);
      // Set empty array on error to prevent crashes
      setNearbyPlaces([]);
      setLocationError('Unable to load your location. Please try again.');
    } finally {
      setRequestingLocation(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await api.get('/api/v1/places/search', {
        params: { query: searchQuery, limit: 20 },
      });
      setPlaces(response.data.places || []);
    } catch (error: any) {
      console.error('Search failed:', error);
      setPlaces([]);
    }
  };

  const handlePlaceSelect = async (place: Place) => {
    // Web parity: Explore always takes you to the park/place page; trail selection happens there.
    navigation.navigate('PlaceDetail', { placeId: place.id });
  };

  return (
    <Screen scroll={false} style={styles.container} padding={0}>
      <View style={styles.header}>
        <Title level={2}>Where are you exploring today?</Title>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parks, trails..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {requestingLocation ? (
          <BodyText muted style={{ paddingHorizontal: 20, marginTop: 6, fontSize: 12 }}>
            Requesting location…
          </BodyText>
        ) : locationError ? (
          <BodyText muted style={{ paddingHorizontal: 20, marginTop: 6, fontSize: 12 }}>
            {locationError}
          </BodyText>
        ) : null}

        {userLocation && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {nearbyPlaces
                .filter((place) => place.location?.lat != null && place.location?.lng != null)
                .map((place, index) => (
                  <Marker
                    key={`${String((place as any).id ?? (place as any).name ?? 'place')}-${index}`}
                    coordinate={{
                      latitude: place.location.lat,
                      longitude: place.location.lng,
                    }}
                    onPress={() => setSelectedPlace(place)}
                  />
                ))}
            </MapView>
          </View>
        )}

        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Nearby</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {nearbyPlaces.map((item, index) => (
              <TouchableOpacity
                key={`${String((item as any).id ?? (item as any).name ?? 'nearby')}-${index}`}
                style={styles.placeCard}
                onPress={() => handlePlaceSelect(item)}
              >
                <Card style={styles.card}>
                  <Text variant="h3" numberOfLines={1}>{item.name}</Text>
                  <Text variant="caption" color="secondary" style={styles.placeType}>
                    {item.type}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* State-wise park browsing (web parity requirement) */}
        <View style={styles.section}>
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="h3">Browse by state</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['ca', 'co', 'ut', 'az', 'wa'].map((sc) => (
                <TouchableOpacity key={sc} onPress={() => handleStateChange(sc)}>
                  <Text variant="caption" style={{ color: stateCode === sc ? colors.primary : colors.textTertiary, fontWeight: '600' }}>
                    {sc.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {loadingState ? (
            <Text variant="caption" color="secondary" style={{ paddingHorizontal: 20, marginTop: 10 }}>
              Loading parks…
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {stateParks.slice(0, 20).map((p, index) => (
                <TouchableOpacity
                  key={`${p.parkCode || p.name}-${index}`}
                  style={styles.placeCard}
                  onPress={() => handleStateParkSelect({ name: p.name, parkCode: p.parkCode })}
                >
                  <Card style={styles.card}>
                    <Text variant="h3" numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.placeType}>
                      NPS • {String(p.parkCode || '').toUpperCase()}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {places.length > 0 && (
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>Search Results</Text>
            {places.map((place, index) => (
              <TouchableOpacity
                key={`${String((place as any).id ?? (place as any).name ?? 'result')}-${index}`}
                onPress={() => handlePlaceSelect(place)}
              >
                <Card style={styles.resultCard}>
                  <Text variant="body">{place.name}</Text>
                  <Text variant="caption" color="secondary">{place.type}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  placeCard: {
    marginLeft: 20,
    width: 200,
  },
  card: {
    minHeight: 120,
  },
  placeType: {
    marginTop: 4,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
});
