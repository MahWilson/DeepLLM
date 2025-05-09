// components/PlacesSearchBar.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

type Props = {
  onPlaceSelected: (latitude: number, longitude: number) => void;
  onNavigationStart?: () => void;
  placeholder?: string;
};

type PlaceResult = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
};

type ETAInfo = {
  duration: string;
  distance: string;
};

export default function PlacesSearchBar({ 
  onPlaceSelected, 
  onNavigationStart,
  placeholder = "Search venues near you"
}: Props) {
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [etaInfo, setEtaInfo] = useState<ETAInfo | null>(null);
  const [isCalculatingETA, setIsCalculatingETA] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    getUserCountry();
  }, []);

  const getUserCountry = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission not granted');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.results[0]?.address_components) {
        const countryComponent = response.data.results[0].address_components.find(
          (component: any) => component.types.includes('country')
        );
        if (countryComponent) {
          setUserCountry(countryComponent.short_name);
        }
      }
    } catch (error) {
      console.error('Error getting user country:', error);
    }
  };

  const searchPlaces = async (text: string) => {
    try {
      if (text.length < 2) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        text
      )}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment`;

      if (userCountry) {
        url += `&components=country:${userCountry}`;
      }

      const response = await axios.get(url);

      if (response.data.predictions) {
        setPredictions(response.data.predictions);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
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

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.rows[0]?.elements[0]) {
        const { duration, distance } = response.data.rows[0].elements[0];
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

  const handlePlaceSelect = async (placeId: string, placeName: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.result?.geometry?.location) {
        const { lat, lng } = response.data.result.geometry.location;
        setSelectedPlace({ lat, lng, name: placeName });
        setShowConfirmation(true);
        setSearchText('');
        setPredictions([]);
        calculateETA(lat, lng);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDestination = () => {
    if (selectedPlace) {
      onPlaceSelected(selectedPlace.lat, selectedPlace.lng);
      setShowConfirmation(false);
      setSelectedPlace(null);
      if (onNavigationStart) {
        onNavigationStart();
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text + '80'}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            searchPlaces(text);
          }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setPredictions([]);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {predictions.length > 0 && (
        <FlatList
          data={predictions}
          style={[styles.resultsList, { backgroundColor: colors.background }]}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handlePlaceSelect(item.place_id, item.description)}
            >
              <Text style={[styles.resultText, { color: colors.text }]}>
                {item.structured_formatting?.main_text || item.description}
              </Text>
              <Text style={[styles.resultSubtext, { color: colors.text + '80' }]}>
                {item.structured_formatting?.secondary_text || ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    padding: 10,
    borderRadius: 8,
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
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  resultsList: {
    maxHeight: 300,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 16,
    marginBottom: 4,
  },
  resultSubtext: {
    fontSize: 14,
  },
  loadingContainer: {
    position: 'absolute',
    right: 30,
    top: 20,
  },
}); 