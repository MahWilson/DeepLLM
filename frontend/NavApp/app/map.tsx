import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, Platform } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import SearchBar from '../components/SearchBar';
import { API_URL } from '../config';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCnbC98Iv2mVPCQZRr86DsrsafMsm8sQSI';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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

  if (!userLocation) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
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

      <SearchBar onSearch={handleSearch} />
      
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