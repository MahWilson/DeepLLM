import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, Platform } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapViewComponent from '../components/MapViewComponent';
import PlacesSearchBar from '../components/PlacesSearchBar';
import { API_URL } from '../config';

const MapScreen = () => {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

        // Fetch incidents
        const response = await fetch(`${API_URL}/api/incidents`);
        if (response.ok) {
          const data = await response.json();
          setIncidents(data);
        }
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'Failed to get location or fetch incidents.');
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

  const handlePlaceSelected = (latitude: number, longitude: number) => {
    setDestination({ latitude, longitude });
    // TODO: Implement route calculation
    setRouteCoordinates([]);
  };

  const handleProfile = () => {
    if (isLoggedIn) {
      router.push('/user');
    } else {
      router.push('/auth/login');
    }
  };

  if (!userLocation) {
    return null; // Or a loading screen
  }

  return (
    <View style={styles.container}>
      <MapViewComponent
        userLocation={userLocation}
        destination={destination}
        routeCoordinates={routeCoordinates}
        incidents={incidents}
      />
      <PlacesSearchBar
        onPlaceSelected={handlePlaceSelected}
        placeholder="Search for a destination"
      />
      
      {/* Profile Button */}
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={handleProfile}
      >
        <Ionicons 
          name={isLoggedIn ? "person-circle" : "log-in"} 
          size={24} 
          color="#007AFF" 
        />
        <Text style={styles.profileText}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
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
});

export default MapScreen; 