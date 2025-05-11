import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import PlacesSearchBar from '@/components/PlacesSearchBar';
import { Ionicons } from '@expo/vector-icons';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCnbC98Iv2mVPCQZRr86DsrsafMsm8sQSI';

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name?: string; address?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMode, setNavigationMode] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userHeading, setUserHeading] = useState(0);
  const locationSubscription = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Enable location permissions in settings.');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (error) {
        console.error('Location error:', error);
        Alert.alert('Error', 'Failed to get location');
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (location && destination && navigationMode) {
      fetchRoute(location.coords.latitude, location.coords.longitude, destination.latitude, destination.longitude);
    }
  }, [location, destination, navigationMode]);

  const fetchRoute = async (lat: number, lng: number, destLat: number, destLng: number) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${destLat},${destLng}&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.status !== 'OK' || !response.data.routes?.[0]?.overview_polyline?.points) {
        throw new Error(`Directions API error: ${response.data.status}`);
      }

      const points = response.data.routes[0].overview_polyline.points;
      const decodedPath = decodePolyline(points);
      setRouteCoordinates(decodedPath);
      // Store steps for navigation overlay
      setSteps(response.data.routes[0].legs[0].steps || []);
      setCurrentStepIndex(0);
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Route Error', 'Could not get route. Try another location.');
    }
  };

  const decodePolyline = (encoded: string) => {
    let path = [], index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let byte, shift = 0, result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;
      path.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return path;
  };

  // Start navigation mode and watch user location
  const startNavigation = async () => {
    setNavigationMode(true);
    if (locationSubscription.current) {
      if (typeof locationSubscription.current.remove === 'function') {
        locationSubscription.current.remove();
      }
      locationSubscription.current = null;
    }
    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
      (loc) => {
        setLocation(loc);
        setUserHeading(loc.coords.heading || 0);
        // Optionally: update currentStepIndex based on proximity to next step
        if (steps.length > 0 && currentStepIndex < steps.length) {
          const step = steps[currentStepIndex];
          const { end_location } = step;
          const distance = getDistance(
            loc.coords.latitude,
            loc.coords.longitude,
            end_location.lat,
            end_location.lng
          );
          if (distance < 30 && currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
          }
        }
        // Center map on user
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    );
  };

  // Stop navigation mode
  const stopNavigation = () => {
    setNavigationMode(false);
    if (locationSubscription.current) {
      if (typeof locationSubscription.current.remove === 'function') {
        locationSubscription.current.remove();
      }
      locationSubscription.current = null;
    }
    setCurrentStepIndex(0);
    setSteps([]);
    setRouteCoordinates([]);
    setDestination(null);
  };

  // Haversine formula for distance between two lat/lng points (in meters)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    function toRad(x: number) { return x * Math.PI / 180; }
    const R = 6378137; // Earth's mean radius in meter
    const dLat = toRad(lat2 - lat1);
    const dLong = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  };

  if (isLoading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 0,
          longitude: location?.coords.longitude || 0,
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
        {location && navigationMode && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={userHeading}
          >
            <Ionicons name="navigate" size={40} color="#007AFF" style={{ transform: [{ rotate: `${userHeading}deg` }] }} />
          </Marker>
        )}
        {/* Default User Marker when not navigating */}
        {location && !navigationMode && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Your Location"
          />
        )}
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
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
      <PlacesSearchBar
        onPlaceSelected={(lat, lng) => {
          setDestination({
            latitude: lat,
            longitude: lng,
          });
          startNavigation();
        }}
      />
      {navigationMode && (
        <View style={styles.navigationOverlay}>
          <View style={styles.navigationHeader}>
            <Text style={styles.navTitle}>Navigation</Text>
          <TouchableOpacity
              style={styles.stopButton}
              onPress={stopNavigation}
          >
              <Ionicons name="close-circle" size={24} color="#666" />
              <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
          </View>
          {steps[currentStepIndex] && (
            <>
              <Text style={styles.navInstruction}>
                {steps[currentStepIndex].html_instructions.replace(/<[^>]*>/g, '')}
              </Text>
              <Text style={styles.navDistance}>
                {steps[currentStepIndex].distance.text}
              </Text>
              {currentStepIndex < steps.length - 1 && (
                <Text style={styles.navNext}>
                  Next: {steps[currentStepIndex + 1].html_instructions.replace(/<[^>]*>/g, '')}
                </Text>
              )}
            </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    zIndex: 10,
    elevation: 10,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  navInstruction: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222',
  },
  navDistance: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  navNext: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  stopButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
