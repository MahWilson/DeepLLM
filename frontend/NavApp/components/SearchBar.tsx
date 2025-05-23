import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Platform, Modal, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '../config';

type Props = {
  // Basic search props
  onSearch?: (query: string) => void;
  // Place search props
  onPlaceSelected?: (latitude: number, longitude: number, placeDetails: { name: string; address: string }) => void;
  onNavigationStart?: () => void;
  // Common props
  placeholder?: string;
  mode?: 'basic' | 'places';
  isLoading?: boolean;
};

type SearchResult = {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

type ETAInfo = {
  duration: string;
  distance: string;
};

export default function SearchBar({ 
  onSearch,
  onPlaceSelected,
  onNavigationStart,
  placeholder = "Search...",
  mode = 'basic',
  isLoading = false
}: Props) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [etaInfo, setEtaInfo] = useState<ETAInfo | null>(null);
  const [isCalculatingETA, setIsCalculatingETA] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const searchPlaces = async (text: string) => {
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      console.log('Searching for:', text);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          text
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      console.log('Search response:', JSON.stringify(data));

      if (data.results && data.results.length > 0) {
        const firstResult = data.results[0];
        const { lat, lng } = firstResult.geometry.location;
        // Call onPlaceSelected with coordinates and place details
        onPlaceSelected?.(lat, lng, {
          name: firstResult.formatted_address.split(',')[0],
          address: firstResult.formatted_address
        });
        // Clear the search text
        setSearchText('');
      }
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const calculateETA = async (destinationLat: number, destinationLng: number) => {
    try {
      setIsCalculatingETA(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission not granted');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destination = `${destinationLat},${destinationLng}`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.rows[0]?.elements[0]) {
        const { duration, distance } = data.rows[0].elements[0];
        setEtaInfo({
          duration: duration.text,
          distance: distance.text,
        });
      }
    } catch (error) {
      console.error('Error calculating ETA:', error);
    } finally {
      setIsCalculatingETA(false);
    }
  };

  const handlePlaceSelect = async (place: SearchResult) => {
    console.log('Place selected:', place);
    const { lat, lng } = place.geometry.location;
    setSelectedPlace({ lat, lng, name: place.formatted_address });
    setSearchText('');
    setSearchResults([]);
    calculateETA(lat, lng);
  };

  const handleConfirmDestination = () => {
    if (selectedPlace) {
      onPlaceSelected?.(selectedPlace.lat, selectedPlace.lng, {
        name: selectedPlace.name,
        address: selectedPlace.name
      });
      setSelectedPlace(null);
      setEtaInfo(null);
      if (onNavigationStart) {
        onNavigationStart();
      }
    }
  };

  const handleSearch = () => {
    if (!searchText.trim()) return;

    if (mode === 'basic') {
      onSearch?.(searchText.trim());
    } else if (mode === 'places') {
      console.log('Searching places for:', searchText.trim());
      searchPlaces(searchText.trim());
    }
  };

  // Calculate top position to avoid notch/camera
  const topPosition = Platform.select({
    ios: insets.top + 10,
    android: insets.top + 10,
    default: 10,
  });

  return (
    <View style={[styles.container, { top: topPosition }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text + '80'}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {(isLoading || isSearching) && (
          <ActivityIndicator size="small" color={colors.tint} style={styles.loadingIndicator} />
        )}
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              if (mode === 'basic') {
                onSearch?.('');
              }
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={colors.text} />
                </TouchableOpacity>
            )}
        <TouchableOpacity
          onPress={handleSearch}
          style={[styles.searchButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {mode === 'places' && searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          {searchResults.map((result) => (
            <TouchableOpacity
              key={result.place_id}
              style={styles.resultItem}
              onPress={() => handlePlaceSelect(result)}
            >
              <Text style={styles.resultText}>{result.formatted_address}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedPlace !== null}
        onRequestClose={() => setSelectedPlace(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Destination</Text>
            <Text style={[styles.modalText, { color: colors.text }]}>
              {selectedPlace?.name}
            </Text>
            {isCalculatingETA ? (
              <View style={styles.etaLoadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.etaLoadingText, { color: colors.text + '80' }]}>
                  Calculating route...
                </Text>
              </View>
            ) : etaInfo ? (
              <View style={[styles.etaContainer, { backgroundColor: colors.card }]}>
                <View style={styles.etaRow}>
                  <Ionicons name="time-outline" size={20} color={colors.tint} />
                  <Text style={[styles.etaText, { color: colors.text }]}>
                    Estimated time: {etaInfo.duration}
                  </Text>
                </View>
                <View style={styles.etaRow}>
                  <Ionicons name="navigate-outline" size={20} color={colors.tint} />
                  <Text style={[styles.etaText, { color: colors.text }]}>
                    Distance: {etaInfo.distance}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.card }]}
                onPress={() => {
                  setSelectedPlace(null);
                  setEtaInfo(null);
                }}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.tint }]}
                onPress={handleConfirmDestination}
              >
                <Text style={[styles.buttonText, styles.confirmButtonText]}>Go Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'absolute',
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  resultsContainer: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    maxHeight: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1001,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultText: {
    fontSize: 16,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  etaContainer: {
    width: '100%',
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  etaText: {
    marginLeft: 8,
    fontSize: 14,
  },
  etaLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  etaLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
}); 