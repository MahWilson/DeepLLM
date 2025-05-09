import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, GOOGLE_MAPS_API_KEY } from '../../config';
import { Ionicons } from '@expo/vector-icons';
import MapViewComponent from '../../components/MapViewComponent';
import SearchBar from '../../components/SearchBar';
import * as Location from 'expo-location';

interface UserData {
  name: string;
  email: string;
  role: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  type: string;
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function UserDashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const params = useLocalSearchParams();

  useEffect(() => {
    fetchUserProfile();
    fetchIncidents();
    getLocation();
  }, [params.refresh]);

  const getLocation = async () => {
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
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
        } else {
          Alert.alert('Error', 'Failed to fetch user profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setIncidents([]);
        return;
      }

      const response = await fetch(`${API_URL}/api/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIncidents(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch incidents:', response.status);
        setIncidents([]);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setIncidents([]);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setDestination(null);
      return;
    }

    try {
      setIsSearching(true);
      console.log('Searching for:', query);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_API_KEY}`;
      
      console.log('Search URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Search response:', data);

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const name = data.results[0].formatted_address;
        
        setDestination({
          latitude: location.lat,
          longitude: location.lng,
          name,
        });
      } else {
        console.log('No results found in response:', data);
        Alert.alert('Not Found', 'No results found for this location.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for location.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/auth/login');
  };

  if (isLoading || !userLocation) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <MapViewComponent
        userLocation={userLocation}
        destination={destination}
        routeCoordinates={[]}
        incidents={incidents}
      />

      <SearchBar 
        onSearch={handleSearch} 
        isLoading={isSearching}
      />

      {/* Profile Button */}
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={async () => {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            router.push('/profile');
          } else {
            router.push('/auth/login');
          }
        }}
      >
        <Ionicons 
          name="person-circle" 
          size={24} 
          color="#fff" 
        />
        <Text style={styles.profileButtonText}>Profile</Text>
      </TouchableOpacity>

      {/* Report Incident Button */}
      <TouchableOpacity 
        style={styles.reportButton}
        onPress={() => router.push('/user/report')}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.reportButtonText}>Report Incident</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileButton: {
    position: 'absolute',
    top: 135,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportButton: {
    position: 'absolute',
    bottom: 45,
    right: 75,
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