import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, Platform, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import SearchBar from '../components/SearchBar';
import { API_URL } from '../config';
import { StatusBar } from 'expo-status-bar';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    checkLoginStatus();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to use this app.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'Failed to get location.');
      }
    })();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  const handleProfile = () => {
    if (isLoggedIn) {
      router.push('/user');
    } else {
      router.push('/auth/login');
    }
  };

  const handleSearch = async (query: string) => {
    console.log('Search query:', query);
    if (!query.trim()) {
      setDestination(null);
      return;
    }

    try {
      setIsSearching(true);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_API_KEY}`;
      console.log('Search URL:', url);
      
      const response = await fetch(url);
      console.log('Search response status:', response.status);
      
      const data = await response.json();
      console.log('Search response data:', data);

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const name = data.results[0].formatted_address;
        console.log('Found location:', location, 'name:', name);
        
        setDestination({
          latitude: location.lat,
          longitude: location.lng,
          name,
        });

        // Animate map to the destination
        mapRef.current?.animateToRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        console.log('No results found');
        Alert.alert('Not Found', 'No results found for this location.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for location.');
    } finally {
      setIsSearching(false);
    }
  };

  const mapRef = React.useRef<MapView>(null);

  // Calculate top position to avoid notch/camera
  const topPosition = Platform.select({
    ios: insets.top + 10,
    android: insets.top + 10,
    default: 10,
  });

  if (!userLocation) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        <Marker
          coordinate={userLocation}
          title="You are here"
        />
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.name}
            pinColor="green"
          />
        )}
      </MapView>

      <SearchBar 
        onSearch={handleSearch} 
        isLoading={isSearching}
      />
      
      {/* Profile Button */}
      <TouchableOpacity 
        style={[styles.profileButton, { top: topPosition }]}
        onPress={handleProfile}
      >
        <Text style={styles.profileButtonText}>
          {isLoggedIn ? "Profile" : "Login"}
        </Text>
      </TouchableOpacity>

      {/* Report Incident Button */}
      {isLoggedIn && (
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => router.push('/user/report')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.reportButtonText}>Report Incident</Text>
        </TouchableOpacity>
      )}

      {/* Search Results */}
      {destination && !isSearching && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsTitle}>{destination.name}</Text>
          <TouchableOpacity 
            style={styles.directionsButton}
            onPress={() => {
              const url = Platform.select({
                ios: `maps://app?daddr=${destination.latitude},${destination.longitude}`,
                android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
              });
              if (url) {
                Linking.openURL(url);
              }
            }}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  profileButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  searchResults: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
}); 