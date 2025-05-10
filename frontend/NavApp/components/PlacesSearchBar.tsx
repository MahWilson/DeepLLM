import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '../config';

type Props = {
  onPlaceSelected: (latitude: number, longitude: number) => void;
  onNavigationStart?: () => void;
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

export default function PlacesSearchBar({ onPlaceSelected, onNavigationStart }: Props) {
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [etaInfo, setEtaInfo] = useState<ETAInfo | null>(null);
  const [isCalculatingETA, setIsCalculatingETA] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);

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
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#000000" style={styles.searchIcon} />
        <TextInput
            style={[styles.searchInput]}
            placeholder="Search venues near you"
            placeholderTextColor="#666666"
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
              <Ionicons name="close-circle" size={20} color="#000000" />
          </TouchableOpacity>
        )}
        </View>
      </View>

      {predictions.length > 0 && (
        <FlatList
          data={predictions}
          style={styles.resultsList}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handlePlaceSelect(item.place_id, item.structured_formatting?.main_text || item.description)}
            >
              <View style={styles.resultContent}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location" size={20} color="#4361EE" />
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.mainText}>
                {item.structured_formatting?.main_text || item.description}
              </Text>
                  {item.structured_formatting?.secondary_text && (
                    <Text style={styles.secondaryText}>
                      {item.structured_formatting.secondary_text}
              </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={showConfirmation}
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Destination</Text>
            <Text style={styles.modalText}>
              {selectedPlace?.name}
            </Text>
            {isCalculatingETA ? (
              <View style={styles.etaLoadingContainer}>
                <ActivityIndicator size="small" color="#4361EE" />
                <Text style={styles.etaLoadingText}>Calculating route...</Text>
              </View>
            ) : etaInfo ? (
              <View style={styles.etaContainer}>
                <View style={styles.etaRow}>
                  <Ionicons name="time-outline" size={20} color="#4361EE" />
                  <Text style={styles.etaText}>Estimated time: {etaInfo.duration}</Text>
                </View>
                <View style={styles.etaRow}>
                  <Ionicons name="navigate-outline" size={20} color="#4361EE" />
                  <Text style={styles.etaText}>Distance: {etaInfo.distance}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowConfirmation(false);
                  setEtaInfo(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
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
    top: 0,
    zIndex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    top: 30,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    color: '#000000',
  },
  clearButton: {
    padding: 4,
  },
  resultsList: {
    backgroundColor: '#FFFFFF',
    maxHeight: 300,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  secondaryText: {
    fontSize: 14,
    marginTop: 2,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
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
    color: '#000000',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
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
    backgroundColor: '#4361EE',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  etaContainer: {
    width: '100%',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F8FAFC',
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
    color: '#000000',
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
    color: '#666666',
  },
}); 