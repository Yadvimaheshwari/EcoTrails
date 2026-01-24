/**
 * Trail Selection Screen
 * Comprehensive US National and State Parks - One-stop shop for hikers
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { US_PARKS, Park, getAllStates, searchParks, getParksByState, getParksByType } from '../data/parks';

const TrailSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<Park['type'] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter parks based on search, state, and type
  const filteredParks = useMemo(() => {
    let parks = US_PARKS;

    // Apply search filter
    if (searchQuery.trim()) {
      parks = searchParks(searchQuery);
    }

    // Apply state filter
    if (selectedState) {
      parks = parks.filter(park =>
        park.state === selectedState || (park.states && park.states.includes(selectedState))
      );
    }

    // Apply type filter
    if (selectedType) {
      parks = parks.filter(park => park.type === selectedType);
    }

    return parks;
  }, [searchQuery, selectedState, selectedType]);

  const handleSelectPark = async (park: Park) => {
    setLoading(park.id);
    try {
      // Create session - device_id is optional (for future EcoDroid integration)
      const sessionResponse = await axios.post(
        `${API_BASE_URL}/api/v1/sessions`,
        {
          park_name: park.name,
          // device_id is optional - will be null if no device
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const sessionId = sessionResponse.data.session_id;

      // Navigate to active hike
      navigation.navigate('ActiveHike', {
        sessionId,
        parkName: park.name,
        deviceId: null, // No EcoDroid device yet - app works without it
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start hike. Please check your connection.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedState(null);
    setSelectedType(null);
  };

  const states = getAllStates();
  const parkTypes: Park['type'][] = ['National Park', 'National Forest', 'State Park', 'National Monument', 'National Recreation Area', 'Wilderness Area'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>US Parks & Forests</Text>
        <Text style={styles.subtitle}>{filteredParks.length} parks available</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search parks, states, or features..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8B82"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>🔍 Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* State Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>State:</Text>
            <FlatList
              horizontal
              data={['All', ...states]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedState === item || (item === 'All' && !selectedState) ? styles.filterChipActive : null
                  ]}
                  onPress={() => setSelectedState(item === 'All' ? null : item)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedState === item || (item === 'All' && !selectedState) ? styles.filterChipTextActive : null
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {/* Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Type:</Text>
            <FlatList
              horizontal
              data={['All', ...parkTypes]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedType === item || (item === 'All' && !selectedType) ? styles.filterChipActive : null
                  ]}
                  onPress={() => setSelectedType(item === 'All' ? null : item as Park['type'])}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedType === item || (item === 'All' && !selectedType) ? styles.filterChipTextActive : null
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {(selectedState || selectedType || searchQuery) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Parks List */}
      <FlatList
        data={filteredParks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.parkCard}
            onPress={() => handleSelectPark(item)}
            disabled={!!loading}
          >
            {loading === item.id && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#2D4739" />
              </View>
            )}
            <Text style={styles.parkIcon}>{item.icon}</Text>
            <View style={styles.parkInfo}>
              <View style={styles.parkHeader}>
                <Text style={styles.parkName}>{item.name}</Text>
                <Text style={styles.parkType}>{item.type}</Text>
              </View>
              <Text style={styles.parkLocation}>{item.state}{item.states && item.states.length > 1 ? `, ${item.states.filter(s => s !== item.state).join(', ')}` : ''}</Text>
              {item.features && item.features.length > 0 && (
                <View style={styles.featuresContainer}>
                  {item.features.slice(0, 3).map((feature, idx) => (
                    <View key={idx} style={styles.featureTag}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No parks found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D4739',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8B82',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#2D4739',
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  filterButton: {
    backgroundColor: '#2D4739',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8DE',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#F9F9F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  filterChipActive: {
    backgroundColor: '#2D4739',
    borderColor: '#2D4739',
  },
  filterChipText: {
    fontSize: 12,
    color: '#8E8B82',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearFiltersText: {
    color: '#2D4739',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listContent: {
    padding: 20,
  },
  parkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  parkIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  parkInfo: {
    flex: 1,
  },
  parkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  parkName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    marginRight: 8,
  },
  parkType: {
    fontSize: 11,
    color: '#8E8B82',
    backgroundColor: '#F9F9F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: 'uppercase',
  },
  parkLocation: {
    fontSize: 14,
    color: '#8E8B82',
    marginBottom: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: '#E2E8DE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 11,
    color: '#2D4739',
  },
  arrow: {
    fontSize: 24,
    color: '#2D4739',
    opacity: 0.3,
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D4739',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8B82',
  },
});

export default TrailSelectionScreen;
