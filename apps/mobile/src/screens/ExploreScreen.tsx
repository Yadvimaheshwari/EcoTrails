import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../config/api';

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

  useEffect(() => {
    loadNearbyPlaces();
  }, []);

  const loadNearbyPlaces = async () => {
    // Mock location for now
    const mockLocation = { lat: 37.7749, lng: -122.4194 };
    setUserLocation(mockLocation);
    
    try {
      const response = await api.get('/api/v1/places/nearby', {
        params: { lat: mockLocation.lat, lng: mockLocation.lng, radius: 5000, limit: 10 },
      });
      setNearbyPlaces(response.data.places || []);
    } catch (error: any) {
      console.error('Failed to load nearby places:', error);
      // Set empty array on error to prevent crashes
      setNearbyPlaces([]);
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
    // Navigate to a place detail screen or show trails for this place
    // For now, we'll navigate to TrailDetail but we need to get trails first
    try {
      // Get place details which includes trails
      const response = await api.get(`/api/v1/places/${place.id}`);
      const trails = response.data.trails || [];
      if (trails.length > 0) {
        navigation.navigate('TrailDetail', { trailId: trails[0].id, placeId: place.id });
      } else {
        // If no trails, just show the place
        navigation.navigate('PlaceDetail', { placeId: place.id });
      }
    } catch (error) {
      console.error('Error loading park trails:', error);
      // Fallback: navigate to place detail
      navigation.navigate('PlaceDetail', { placeId: place.id });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h2">Where are you exploring today?</Text>
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
    </SafeAreaView>
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
