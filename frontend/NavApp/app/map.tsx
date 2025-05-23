import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, Platform, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import SearchBar from '../components/SearchBar';
import { GOOGLE_MAPS_API_KEY } from '../config';
import { StatusBar } from 'expo-status-bar';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name?: string; address?: string } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Enable location permissions in settings.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);

        // Start watching location
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
          },
          (newLocation) => {
            setUserLocation(newLocation);
            setUserHeading(newLocation.coords.heading || 0);
          }
        );
        setLocationSubscription(subscription);
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Failed to get location.');
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  const handlePlaceSelected = (latitude: number, longitude: number, placeDetails?: { name: string; address: string }) => {
    setDestination({ 
      latitude, 
      longitude, 
      name: placeDetails?.name,
      address: placeDetails?.address 
    });
    // Clear previous route
    setRouteCoordinates([]);
  };

  const handleClearDestination = () => {
      setDestination(null);
    setRouteCoordinates([]);
  };

  const handleRouteUpdate = (coordinates: Array<{ latitude: number; longitude: number }>) => {
    setRouteCoordinates(coordinates);
  };

  const handleNavigationStart = async () => {
    if (!destination || !userLocation) return;

    try {
      // Get route coordinates from Google Directions API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.coords.latitude},${userLocation.coords.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const coordinates = decodePolyline(points);
        setRouteCoordinates(coordinates);
      }

      // Open navigation in native app
      const url = Platform.select({
        ios: `maps://app?daddr=${destination.latitude},${destination.longitude}&saddr=${userLocation.coords.latitude},${userLocation.coords.longitude}`,
        android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
      });

      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
      } else {
          Alert.alert('Error', 'Could not open navigation app.');
        }
      }
    } catch (error) {
      console.error('Error starting navigation:', error);
      Alert.alert('Error', 'Failed to start navigation.');
    }
  };

  // Helper function to decode Google's polyline format
  const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        let b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result >= 0x20);

      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return poly;
  };

  const handleProfile = () => {
    if (isLoggedIn) {
      router.push('/user/profile');
    } else {
      router.push('/auth/login');
    }
  };

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
        style={styles.map}
        initialRegion={{
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={false}
        showsMyLocationButton
        showsCompass
        showsScale
        showsTraffic
        showsBuildings
        showsIndoors
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        zoomEnabled={true}
      >
        {/* Custom Arrow Marker for User Location */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={userHeading}
          >
            <Ionicons name="navigate" size={40} color="#007AFF" style={{ transform: [{ rotate: `${userHeading}deg` }] }} />
          </Marker>
        )}
        {destination && (
          <Marker
            coordinate={destination}
            title={destination.name || "Destination"}
            description={destination.address}
            pinColor="red"
          />
        )}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={3}
            strokeColor="#0066FF"
          />
        )}
      </MapView>

      <View style={[styles.searchContainer, { top: topPosition }]}>
      <SearchBar 
          onPlaceSelected={handlePlaceSelected}
          mode="places"
          placeholder="Search for a place..."
      />
      </View>
      
      {/* Profile Button */}
      <TouchableOpacity 
        style={[styles.profileButton, { top: topPosition }]}
        onPress={handleProfile}
      >
        <Ionicons 
          name={isLoggedIn ? "person-circle" : "log-in"} 
          size={24} 
          color="#fff" 
        />
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
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1,
  },
  profileButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  profileButtonText: {
    color: '#fff',
    marginLeft: 5,
  },
  reportButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  reportButtonText: {
    color: '#fff',
    marginLeft: 5,
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
  },
}); 