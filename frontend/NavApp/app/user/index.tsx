import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, Platform, ActivityIndicator, Linking, Modal, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import SearchBar from '../../components/SearchBar';
import VoiceCommand from '../../components/VoiceCommand';
import { GOOGLE_MAPS_API_KEY, API_URL } from '../../config';
import { StatusBar } from 'expo-status-bar';

interface RouteInfo {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  steps: Array<{
    instruction: string;
    distance: string;
  }>;
  distance: string;
  duration: string;
  durationInTraffic: string;
  trafficDelay: number;
  hasTraffic: boolean;
  color: string;
  distanceValue: number;
  durationValue: number;
  waypoints?: Array<{
    location: { latitude: number; longitude: number };
    name: string;
    address: string;
    order: number;
  }>;
  nextStopDistance: string;
  nextStopDuration: string;
  nextStopDurationInTraffic: string;
}

export default function UserMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number; name?: string; address?: string } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState<{ instruction: string; distance: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSeverityModal, setShowSeverityModal] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Array<{ type: string; severity: string; latitude: number; longitude: number }>>([]);
  const [routeSteps, setRouteSteps] = useState<Array<{ instruction: string; distance: string }>>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [activeRoadClosures, setActiveRoadClosures] = useState<Array<{ roadName: string; start: string; end: string; timestamp: string; isVisible: boolean }>>([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteInfo[]>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    type: string;
    severity?: string;
    location?: { latitude: number; longitude: number };
    roadName?: string;
    start?: string;
    end?: string;
    message?: string;
  } | null>(null);
  const [isRouteSelectionMode, setIsRouteSelectionMode] = useState(false);
  const [deliveryStops, setDeliveryStops] = useState<Array<{
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  }>>([]);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteInfo | null>(null);
  const [returnToOrigin, setReturnToOrigin] = useState(true);
  const mapRef = useRef<MapView>(null);

  const predeterminedLocations = [
    { name: 'Bukit Bintang', latitude: 3.1457, longitude: 101.7120 },
    { name: 'Pudu', latitude: 3.1422, longitude: 101.7000 },
    { name: 'Cheras', latitude: 3.0833, longitude: 101.7333 },
    { name: 'Seri Kembangan', latitude: 3.0167, longitude: 101.7167 },
    { name: 'Bandar Kinrara', latitude: 3.0500, longitude: 101.6500 },
    { name: 'Serdang', latitude: 3.0000, longitude: 101.7000 },
    { name: 'Balakong', latitude: 3.0333, longitude: 101.7500 },
    { name: 'Alam Damai', latitude: 3.0667, longitude: 101.7333 },
    { name: 'Pavilion Bukit Jalil', latitude: 3.0667, longitude: 101.6833 }
  ];

  useEffect(() => {
    checkLoginStatus();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Enable location permissions in settings.');
          return;
        }

        // Get initial location with high accuracy
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        console.log('Initial location:', location.coords);
        setUserLocation(location);

        // Start watching location with high accuracy
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 5000,
          },
          (newLocation) => {
            console.log('Location update:', newLocation.coords);
            setUserLocation(newLocation);
            setUserHeading(newLocation.coords.heading || 0);
            
            if (isNavigating && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                latitudeDelta: 0.005, // Changed from 0.01 to 0.005 to match navigation zoom
                longitudeDelta: 0.005, // Changed from 0.01 to 0.005 to match navigation zoom
              });
            }
          }
        );
        setLocationSubscription(subscription);
      } catch (error) {
        console.error('Error in setup:', error);
        Alert.alert('Error', 'Failed to initialize location services.');
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isNavigating]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('userRole');
      console.log('Checking login status, token exists:', !!token);
      console.log('User role:', role);
      setIsLoggedIn(!!token);
      setUserRole(role);
    } catch (error) {
      console.error('Error checking login status:', error);
    }
  };

  const handlePlaceSelected = async (latitude: number, longitude: number, placeDetails?: { name: string; address: string }) => {
    try {
      console.log('Selected place:', { latitude, longitude, placeDetails });
      console.log('Current user location:', userLocation?.coords);
      
      if (!userLocation) {
        console.log('No user location available');
        return;
      }

      setDestination({ 
        latitude, 
        longitude, 
        name: placeDetails?.name,
        address: placeDetails?.address 
      });

      console.log('Fetching route from:', {
        origin: `${userLocation.coords.latitude},${userLocation.coords.longitude}`,
        destination: `${latitude},${longitude}`
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.coords.latitude},${userLocation.coords.longitude}&destination=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      console.log('Directions API response:', data);

      if (data.status === 'OK' && data.routes?.[0]?.overview_polyline?.points) {
        const points = data.routes[0].overview_polyline.points;
        const decodedPath = decodePolyline(points);
        console.log('Decoded route points:', decodedPath);
        setRouteCoordinates(decodedPath);

        // Store the route steps for navigation
        if (data.routes[0].legs[0].steps) {
          const steps = data.routes[0].legs[0].steps.map((step: any) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
            distance: step.distance.text
          }));
          setRouteSteps(steps);
        }
        
        // Center map on route
        if (mapRef.current && decodedPath.length > 0) {
          const minLat = Math.min(...decodedPath.map(p => p.latitude));
          const maxLat = Math.max(...decodedPath.map(p => p.latitude));
          const minLng = Math.min(...decodedPath.map(p => p.longitude));
          const maxLng = Math.max(...decodedPath.map(p => p.longitude));
          
          mapRef.current.animateToRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: (maxLat - minLat) * 1.5,
            longitudeDelta: (maxLng - minLng) * 1.5,
          });
        }
      } else {
        console.error('No route found:', data.status);
        setErrorMsg('No route found. Please try another location.');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setErrorMsg('Failed to fetch route. Please try again.');
    }
  };

  const handleClearDestination = () => {
    setDestination(null);
    setRouteCoordinates([]);
    setIsNavigating(false);
    setCurrentStep(null);
  };

  const handleNavigationStart = () => {
    if (!destination || !userLocation || !routeSteps || routeSteps.length === 0) return;
    setIsNavigating(true);
    
    // Set first navigation step
    setCurrentStep(routeSteps[0]);
    
    // Center map on user location with increased zoom
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.005, // Changed from 0.01 to 0.005 (50% reduction)
        longitudeDelta: 0.005, // Changed from 0.01 to 0.005 (50% reduction)
      });
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setCurrentStep(null);
  };

  const handleProfile = async () => {
    try {
      if (isLoggedIn) {
        router.push('/profile');
          } else {
        router.push('/auth/login');
          }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to profile. Please try again.');
        }
  };

  const handleAdminDashboard = () => {
    router.push('/admin/dashboard');
  };

  const handleReportIncident = () => {
    setShowReportModal(true);
  };

  const handleIncidentTypeSelect = (type: string) => {
    setSelectedIncidentType(type);
    setShowReportModal(false);
    setShowLocationModal(true);
  };

  const handleLocationSelect = (location: { latitude: number; longitude: number; name: string }) => {
    setSelectedLocation(location);
    setShowLocationModal(false);
    setShowSeverityModal(true);
  };

  const handleSeveritySelect = async (severity: string) => {
    if (!selectedLocation || !selectedIncidentType) return;

    try {
      console.log('Checking token before report...');
      const token = await AsyncStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Is logged in state:', isLoggedIn);

      if (!token) {
        Alert.alert(
          'Login Required',
          'Please log in to report incidents.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setShowSeverityModal(false);
                setSelectedIncidentType(null);
                setSelectedLocation(null);
              }
            },
            {
              text: 'Login',
              onPress: () => {
                setShowSeverityModal(false);
                setSelectedIncidentType(null);
                setSelectedLocation(null);
                router.replace('/auth/login');
              }
            }
          ]
        );
        return;
      }

      console.log('Submitting incident report...');
      const response = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedIncidentType,
          severity,
          location: {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude
          }
        }),
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        // Add incident to local state
        setIncidents(prev => [...prev, {
          type: selectedIncidentType,
          severity,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude
        }]);
        
        // Show success modal with details
        setSuccessDetails({
          type: selectedIncidentType,
          severity,
          location: {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude
          }
        });
        setShowSuccessModal(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setSuccessDetails(null);
        }, 3000);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        Alert.alert('Error', 'Failed to report incident. Please try again.');
      }
    } catch (error) {
      console.error('Error reporting incident:', error);
      Alert.alert('Error', 'Failed to report incident. Please try again.');
    }

    setShowSeverityModal(false);
    setSelectedIncidentType(null);
    setSelectedLocation(null);
  };

  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Helper function to decode Google's polyline format
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

  // Calculate top position
  const topPosition = 10; // Fixed position from top

  const handleVoiceNavigate = async (destination: string) => {
    try {
      // Use Google Places API to search for the location
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const place = data.results[0];
        // Set destination and start navigation immediately
        setDestination({
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          name: place.name,
          address: place.formatted_address
        });
        
        // Get route coordinates
        const routeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation?.coords.latitude},${userLocation?.coords.longitude}&destination=${place.geometry.location.lat},${place.geometry.location.lng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const routeData = await routeResponse.json();

        if (routeData.status === 'OK' && routeData.routes?.[0]?.overview_polyline?.points) {
          const points = routeData.routes[0].overview_polyline.points;
          const decodedPath = decodePolyline(points);
          setRouteCoordinates(decodedPath);

          // Store the route steps for navigation
          if (routeData.routes[0].legs[0].steps) {
            const steps = routeData.routes[0].legs[0].steps.map((step: any) => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text
            }));
            setRouteSteps(steps);
          }

          // Start navigation
          setIsNavigating(true);
          setCurrentStep(routeSteps[0]);

          // Center map on user location with increased zoom
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: userLocation?.coords.latitude || 0,
              longitude: userLocation?.coords.longitude || 0,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          }
        }
      } else {
        Alert.alert('Error', `Could not find location: ${destination}`);
      }
    } catch (error) {
      console.error('Error searching for location:', error);
      Alert.alert('Error', 'Failed to search for location. Please try again.');
    }
  };

  const getRouteColor = (route: any, index: number) => {
    // Define a set of distinct colors for routes
    const colors = ['#007AFF', '#800080', '#4CD964', '#FFD700'];
    return colors[index % colors.length];
  };

  const getRouteInfoWindowPosition = (coordinates: Array<{ latitude: number; longitude: number }>) => {
    if (coordinates.length === 0) return { latitude: 0, longitude: 0 };
    
    // Get the middle point of the route
    const midIndex = Math.floor(coordinates.length / 2);
    const midPoint = coordinates[midIndex];
    
    // Add a small offset to position the window beside the route
    return {
      latitude: midPoint.latitude + 0.001,
      longitude: midPoint.longitude + 0.001
    };
  };

  const handleVoiceReroute = async (preference?: 'fastest' | 'shortest' | 'scenic') => {
    if (!destination || !userLocation) {
      Alert.alert('Error', 'No destination set for rerouting');
      return;
    }

    try {
      // Request alternative routes using Google Directions API with traffic info
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.coords.latitude},${userLocation.coords.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status === 'OK' && data.routes.length > 1) {
        // Process all alternative routes with traffic info
        const routes = data.routes.map((route: any, index: number) => {
          const leg = route.legs[0];
          const hasTraffic = leg.duration_in_traffic && leg.duration_in_traffic.value > leg.duration.value;
          const trafficDelay = hasTraffic ? Math.round((leg.duration_in_traffic.value - leg.duration.value) / 60) : 0;
          const routeColor = getRouteColor(route, index);
          
          return {
            coordinates: decodePolyline(route.overview_polyline.points),
            steps: leg.steps.map((step: any) => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text
            })),
            distance: leg.distance.text,
            duration: leg.duration.text,
            durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
            trafficDelay,
            hasTraffic,
            color: routeColor,
            distanceValue: leg.distance.value,
            durationValue: leg.duration.value
          };
        });

        // Sort routes based on preference
        if (preference) {
          routes.sort((a: RouteInfo, b: RouteInfo) => {
            switch (preference) {
              case 'fastest':
                return a.durationValue - b.durationValue;
              case 'shortest':
                return a.distanceValue - b.distanceValue;
              case 'scenic':
                return b.steps.length - a.steps.length;
              default:
                return 0;
            }
          });
        }

        setAlternativeRoutes(routes);
        setCurrentRouteIndex(0);
        setIsRouteSelectionMode(true);

        // Center map to show all routes
        if (mapRef.current && routes.length > 0) {
          const allCoordinates = routes.flatMap((route: RouteInfo) => route.coordinates);
          const minLat = Math.min(...allCoordinates.map((p: { latitude: number; longitude: number }) => p.latitude));
          const maxLat = Math.max(...allCoordinates.map((p: { latitude: number; longitude: number }) => p.latitude));
          const minLng = Math.min(...allCoordinates.map((p: { latitude: number; longitude: number }) => p.longitude));
          const maxLng = Math.max(...allCoordinates.map((p: { latitude: number; longitude: number }) => p.longitude));
          
          mapRef.current.animateToRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: (maxLat - minLat) * 1.5,
            longitudeDelta: (maxLng - minLng) * 1.5,
          });
        }
      } else {
        Alert.alert('Error', 'No alternative routes available');
      }
    } catch (error) {
      console.error('Error finding alternative routes:', error);
      Alert.alert('Error', 'Failed to find alternative routes');
    }
  };

  const handleRouteSelect = (index: number) => {
    const route = alternativeRoutes[index];
    const trafficInfo = route.hasTraffic 
      ? `\nTraffic delay: +${route.trafficDelay} minutes`
      : '\nNo traffic delays';
    
    Alert.alert(
      'Confirm Route Change',
      `Selected Route:
Distance: ${route.distance}
Duration: ${route.durationInTraffic}${trafficInfo}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Use This Route',
          onPress: () => {
            setCurrentRouteIndex(index);
            setRouteCoordinates(route.coordinates);
            setRouteSteps(route.steps);
            setIsRouteSelectionMode(false);
            setIsNavigating(true);
            setCurrentStep(route.steps[0]);
            
            // Center map on user location with increased zoom
            if (mapRef.current && userLocation) {
              mapRef.current.animateToRegion({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              });
            }
          }
        }
      ]
    );
  };

  const handleVoiceReport = async (type: string, severity: string, location: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to report incidents');
        return;
      }

      if (!userLocation) {
        Alert.alert('Error', 'Unable to get your current location. Please try again.');
        return;
      }

      // Normalize severity to lowercase and remove any punctuation
      const normalizedSeverity = severity.toLowerCase().replace(/[.,!?]/g, '').trim();
      
      // Create a title from the type
      const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Incident`;
      
      console.log('Submitting incident report with data:', {
        title,
        type,
        severity: normalizedSeverity,
        location: {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude
        }
      });

      // Submit the incident report
      const response = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: `Reported via voice command: ${type} with ${normalizedSeverity} severity`,
          type,
          severity: normalizedSeverity,
          location: {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude
          }
        }),
      });

      console.log('Incident report response status:', response.status);
      const responseText = await response.text();
      console.log('Incident report response:', responseText);

      if (response.ok) {
        // Add incident to local state
        setIncidents(prev => [...prev, {
          type,
          severity: normalizedSeverity,
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude
        }]);
        
        // Show success modal with details
        setSuccessDetails({
          type,
          severity: normalizedSeverity,
          location: {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude
          }
        });
        setShowSuccessModal(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setSuccessDetails(null);
        }, 3000);
      } else {
        let errorMessage = 'Failed to report incident. Please try again.';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.message || errorMessage;
        } catch (e) {
          console.error('Error parsing response:', e);
        }
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error reporting incident:', error);
      Alert.alert(
        'Error',
        'Failed to report incident. Please try again.'
      );
    }
  };

  const handleRoadClosure = (roadName: string, start: string, end: string) => {
    // Add road closure to the active closures
    const newClosure = {
      roadName,
      start,
      end,
      timestamp: new Date().toISOString(),
      isVisible: true
    };
    setActiveRoadClosures(prev => [...prev, newClosure]);

    // Show success modal
    setSuccessDetails({
      type: 'road_closure',
      roadName,
      start,
      end,
      message: `Road ${roadName} has been closed from ${start} to ${end}`
    });
    setShowSuccessModal(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
      setSuccessDetails(null);
    }, 3000);
  };

  const handleRoadOpening = (roadName: string) => {
    // Remove road closure from active closures
    setActiveRoadClosures(prev => 
      prev.filter(closure => closure.roadName !== roadName)
    );

    // Show success modal
    setSuccessDetails({
      type: 'road_opening',
      roadName,
      message: `Road ${roadName} has been reopened`
    });
    setShowSuccessModal(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
      setSuccessDetails(null);
    }, 3000);
  };

  const handleTrafficCheck = (location: string) => {
    // Show success modal
    setSuccessDetails({
      type: 'traffic_check',
      message: `Traffic check initiated at ${location}`
    });
    setShowSuccessModal(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
      setSuccessDetails(null);
    }, 3000);
  };

  const handleAlternativeRoute = (location: string) => {
    // Simulate finding alternative route
    Alert.alert(
      'Alternative Route',
      `Finding alternative route to ${location}...`,
      [{ text: 'OK' }]
    );
  };

  const handleAddDeliveryStop = (latitude: number, longitude: number, placeDetails?: { name: string; address: string }) => {
    if (placeDetails) {
      setDeliveryStops(prev => [...prev, {
        latitude,
        longitude,
        name: placeDetails.name,
        address: placeDetails.address
      }]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateTSPRoute = (stops: Array<{ latitude: number; longitude: number }>) => {
    const n = stops.length;
    const distances: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // Calculate distance matrix
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          distances[i][j] = calculateDistance(
            stops[i].latitude,
            stops[i].longitude,
            stops[j].latitude,
            stops[j].longitude
          );
        }
      }
    }

    // Nearest neighbor with 2-opt improvement
    let bestRoute = Array.from({ length: n }, (_, i) => i);
    let bestDistance = Infinity;

    // Try different starting points
    for (let start = 0; start < n; start++) {
      let currentRoute = [start];
      let unvisited = Array.from({ length: n }, (_, i) => i).filter(i => i !== start);
      
      // Build route
      while (unvisited.length > 0) {
        let current = currentRoute[currentRoute.length - 1];
        let nearest = unvisited[0];
        let minDist = distances[current][nearest];
        
        for (let i = 1; i < unvisited.length; i++) {
          const dist = distances[current][unvisited[i]];
          if (dist < minDist) {
            minDist = dist;
            nearest = unvisited[i];
          }
        }
        
        currentRoute.push(nearest);
        unvisited = unvisited.filter(i => i !== nearest);
      }

      // 2-opt improvement
      let improved = true;
      while (improved) {
        improved = false;
        for (let i = 0; i < n - 1; i++) {
          for (let j = i + 1; j < n; j++) {
            const currentDist = 
              distances[currentRoute[i]][currentRoute[i + 1]] +
              distances[currentRoute[j]][currentRoute[(j + 1) % n]];
            const newDist = 
              distances[currentRoute[i]][currentRoute[j]] +
              distances[currentRoute[i + 1]][currentRoute[(j + 1) % n]];
            
            if (newDist < currentDist) {
              // Reverse the segment
              const segment = currentRoute.slice(i + 1, j + 1).reverse();
              currentRoute.splice(i + 1, j - i, ...segment);
              improved = true;
            }
          }
        }
      }

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < n; i++) {
        totalDistance += distances[currentRoute[i]][currentRoute[(i + 1) % n]];
      }

      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestRoute = [...currentRoute];
      }
    }

    return bestRoute;
  };

  const calculateOptimizedRoute = async () => {
    if (!userLocation || deliveryStops.length === 0) return;

    try {
      // Prepare waypoints for Google's optimization
      const waypoints = deliveryStops.map(stop => 
        `${stop.latitude},${stop.longitude}`
      ).join('|');

      // Set destination based on returnToOrigin preference
      const destination = returnToOrigin 
        ? `${userLocation.coords.latitude},${userLocation.coords.longitude}`
        : `${deliveryStops[deliveryStops.length - 1].latitude},${deliveryStops[deliveryStops.length - 1].longitude}`;

      // Get optimized route using Google's API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.coords.latitude},${userLocation.coords.longitude}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.routes[0]) {
        const route = data.routes[0];
        let optimizedOrder: Array<{
          location: { latitude: number; longitude: number };
          name: string;
          address: string;
          order: number;
        }> = [];

        // Get coordinates from the overview polyline
        const allCoordinates = decodePolyline(route.overview_polyline.points);

        // Process waypoints and calculate totals
        let totalDistance = 0;
        let totalDuration = 0;
        let totalDurationInTraffic = 0;

        // Get next stop info from first leg
        const firstLeg = route.legs[0];
        const nextStopDistance = firstLeg.distance.value;
        const nextStopDuration = firstLeg.duration.value;
        const nextStopDurationInTraffic = firstLeg.duration_in_traffic?.value || firstLeg.duration.value;

        route.legs.forEach((leg: any, index: number) => {
          // Only include this leg in totals if it's not the return trip or if returnToOrigin is true
          if (index < route.legs.length - 1 || returnToOrigin) {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
            totalDurationInTraffic += leg.duration_in_traffic?.value || leg.duration.value;
          }

          if (index < route.legs.length - 1) { // Skip the last leg (return to origin)
            const waypointIndex = data.routes[0].waypoint_order[index];
            const stop = deliveryStops[waypointIndex];
            optimizedOrder.push({
              location: {
                latitude: stop.latitude,
                longitude: stop.longitude
              },
              name: stop.name,
              address: stop.address,
              order: index + 1
            });
          }
        });

        // Convert distances to kilometers with 1 decimal place
        const totalDistanceInKm = (totalDistance / 1000).toFixed(1);
        const nextStopDistanceInKm = (nextStopDistance / 1000).toFixed(1);

        // Create optimized route object
        const optimizedRoute: RouteInfo = {
          coordinates: allCoordinates,
          steps: route.legs[0].steps.map((step: any) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.text
          })),
          distance: `${totalDistanceInKm} km`,
          duration: `${Math.round(totalDuration / 60)} min`,
          durationInTraffic: `${Math.round(totalDurationInTraffic / 60)} min`,
          trafficDelay: 0,
          hasTraffic: false,
          color: '#800080',
          distanceValue: totalDistance,
          durationValue: totalDuration,
          waypoints: optimizedOrder,
          nextStopDistance: `${nextStopDistanceInKm} km`,
          nextStopDuration: `${Math.round(nextStopDuration / 60)} min`,
          nextStopDurationInTraffic: `${Math.round(nextStopDurationInTraffic / 60)} min`
        };

        setOptimizedRoute(optimizedRoute);
        setRouteSteps(optimizedRoute.steps);
        setIsNavigating(true);
        setCurrentStep(optimizedRoute.steps[0]);
        setIsDeliveryMode(true);
        setAlternativeRoutes([]);
        setIsRouteSelectionMode(false);

        // Center map on user location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      }
    } catch (error) {
      console.error('Error calculating optimized route:', error);
      Alert.alert('Error', 'Failed to calculate optimized route');
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
      <StatusBar style="auto" />
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        initialRegion={{
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsTraffic={true}
        showsBuildings={true}
        followsUserLocation={true}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerContainer}>
              <View style={[
                styles.userMarker,
                { transform: [{ rotate: `${userLocation.coords.heading || 0}deg` }] }
              ]}>
                <Ionicons name="navigate" size={24} color="#0066FF" />
              </View>
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            pinColor="red"
          />
        )}

        {/* Route Polylines */}
        {isDeliveryMode ? (
          // Show only delivery route in delivery mode
          optimizedRoute && (
            <Polyline
              coordinates={optimizedRoute.coordinates}
              strokeWidth={6}
              strokeColor="#800080"
              zIndex={1}
            />
          )
        ) : (
          // Show regular navigation routes
          isRouteSelectionMode ? (
            alternativeRoutes.map((route, index) => (
              <React.Fragment key={index}>
                <Polyline
                  coordinates={route.coordinates}
                  strokeWidth={index === currentRouteIndex ? 8 : 6}
                  strokeColor={route.color}
                  zIndex={index === currentRouteIndex ? 2 : 1}
                  onPress={() => handleRouteSelect(index)}
                  tappable={true}
                />
                <Marker
                  coordinate={getRouteInfoWindowPosition(route.coordinates)}
                  anchor={{ x: 0, y: 0 }}
                  zIndex={3}
                >
                  <View style={[styles.routeInfoWindow, { borderColor: route.color }]}>
                    <Text style={styles.routeInfoTitle}>Route {index + 1}</Text>
                    <Text style={styles.routeInfoText}>Distance: {route.distance}</Text>
                    <Text style={styles.routeInfoText}>ETA: {route.durationInTraffic}</Text>
                    {route.hasTraffic && (
                      <Text style={[styles.routeInfoText, styles.trafficWarning]}>
                        +{route.trafficDelay} min delay
                      </Text>
                    )}
                  </View>
                </Marker>
              </React.Fragment>
            ))
          ) : routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={6}
              strokeColor={alternativeRoutes[currentRouteIndex]?.color || '#007AFF'}
              zIndex={1}
            />
          )
        )}

        {/* Incident Markers */}
        {incidents.map((incident, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: incident.latitude,
              longitude: incident.longitude,
            }}
          >
            <View style={styles.incidentMarkerContainer}>
              <Ionicons name="warning" size={24} color="#FFD700" />
            </View>
          </Marker>
        ))}

        {/* Delivery Stops Markers */}
        {deliveryStops.map((stop, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: stop.latitude,
              longitude: stop.longitude,
            }}
          >
            <View style={styles.deliveryStopMarker}>
              <Text style={styles.deliveryStopNumber}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.searchContainer, { top: topPosition - 20, left: 30, width: '80%' }]}>
        <SearchBar
          onPlaceSelected={(latitude, longitude, placeDetails) => {
            if (isDeliveryMode) {
              handleAddDeliveryStop(latitude, longitude, placeDetails);
            } else {
              handlePlaceSelected(latitude, longitude, placeDetails);
            }
          }}
          mode="places"
          placeholder={isDeliveryMode ? "Search for delivery stop..." : "Search for a place..."}
        />
      </View>

      {/* Turn-by-Turn Navigation Guide */}
      {isNavigating && currentStep && !isDeliveryMode && (
        <View style={[styles.navigationGuide, { top: topPosition + 115 }]}>
          <View style={styles.navigationStepContainer}>
            <Ionicons name="navigate" size={24} color="#007AFF" />
            <View style={styles.navigationStepTextContainer}>
              <Text style={styles.navigationStepText}>{currentStep.instruction}</Text>
              <Text style={styles.navigationDistanceText}>{currentStep.distance}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Admin Dashboard Button */}
      {isLoggedIn && userRole === 'admin' && (
        <TouchableOpacity 
          style={[styles.adminButton, { top: topPosition + 85 }]}
          onPress={handleAdminDashboard}
        >
          <Ionicons name="stats-chart" size={32} color="#007AFF" />
        </TouchableOpacity>
      )}

      {/* Profile Button */}
      <TouchableOpacity 
        style={[styles.profileButton, { top: topPosition + 35 }]}
        onPress={handleProfile}
      >
        <Ionicons name="person-circle" size={32} color="#007AFF" />
      </TouchableOpacity>

      {destination && !isNavigating && (
        <View style={styles.placeDetailsContainer}>
          <View style={styles.placeDetailsContent}>
            <Text style={styles.placeName}>{destination.name || 'Selected Location'}</Text>
            <Text style={styles.placeAddress}>{destination.address || 'No address available'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearDestination}
          >
            <Ionicons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Hide Start Navigation button in delivery mode */}
      {destination && !isNavigating && !isDeliveryMode && (
        <TouchableOpacity 
          style={styles.navigationButton}
          onPress={handleNavigationStart}
        >
          <Ionicons name="navigate" size={24} color="#fff" />
          <Text style={styles.navigationButtonText}>Start Navigation</Text>
        </TouchableOpacity>
      )}

      {/* Report Incident Button */}
      <TouchableOpacity 
        style={styles.reportButton}
        onPress={handleReportIncident}
      >
        <Ionicons name="warning" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Delivery Mode Controls */}
      {!isDeliveryMode && (
        <View style={styles.deliveryControls}>
          <TouchableOpacity
            style={styles.deliveryButton}
            onPress={() => setIsDeliveryMode(true)}
          >
            <Ionicons name="cube" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Delivery Mode Active */}
      {isDeliveryMode && !isNavigating && (
        <View style={styles.deliveryModeActive}>
          <View style={styles.deliveryModeHeader}>
            <Text style={styles.deliveryModeTitle}>Delivery Stops ({deliveryStops.length})</Text>
            <TouchableOpacity 
              onPress={() => {
                setIsDeliveryMode(false);
                setDeliveryStops([]);
                setOptimizedRoute(null);
              }}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {optimizedRoute && (
            <View style={styles.routeSummary}>
              <View style={styles.summaryItem}>
                <Ionicons name="navigate-outline" size={20} color="#fff" />
                <Text style={styles.summaryText}>Total: {optimizedRoute.distance}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={20} color="#fff" />
                <Text style={styles.summaryText}>Time: {optimizedRoute.duration}</Text>
              </View>
            </View>
          )}
          <ScrollView style={styles.deliveryStopsList}>
            {deliveryStops.length === 0 ? (
              <View style={styles.emptyDeliveryStops}>
                <Ionicons name="search" size={24} color="#fff" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Use the search bar above to add delivery stops</Text>
              </View>
            ) : (
              deliveryStops.map((stop, index) => (
                <View key={index} style={styles.deliveryStopItem}>
                  <View style={styles.deliveryStopHeader}>
                    <Text style={styles.deliveryStopNumber}>Stop {index + 1}</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setDeliveryStops(prev => prev.filter((_, i) => i !== index));
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.deliveryStopName}>{stop.name}</Text>
                  <Text style={styles.deliveryStopAddress}>{stop.address}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.deliveryOptions}>
            <TouchableOpacity
              style={[styles.returnToggle, returnToOrigin && styles.returnToggleActive]}
              onPress={() => setReturnToOrigin(!returnToOrigin)}
            >
              <Ionicons 
                name={returnToOrigin ? "checkbox" : "square-outline"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.returnToggleText}>Return to Origin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optimizeButton, deliveryStops.length === 0 && styles.optimizeButtonDisabled]}
              onPress={calculateOptimizedRoute}
              disabled={deliveryStops.length === 0}
            >
              <Text style={styles.optimizeButtonText}>Calculate Optimized Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Navigation with Delivery Info */}
      {isNavigating && optimizedRoute && (
        <View style={styles.navigationOverlay}>
          <View style={styles.navigationHeader}>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>
                Stop {optimizedRoute.waypoints?.[0]?.order || 1} of {deliveryStops.length}
              </Text>
              <Text style={styles.stopName}>
                {optimizedRoute.waypoints?.[0]?.name || "Current Stop"}
              </Text>
              <View style={styles.etaContainer}>
                <View style={styles.etaColumn}>
                  <View style={styles.etaItem}>
                    <Ionicons name="time-outline" size={16} color="#fff" />
                    <Text style={styles.etaText}>
                      ETA: {optimizedRoute.nextStopDurationInTraffic}
                    </Text>
                  </View>
                  <View style={styles.etaItem}>
                    <Ionicons name="navigate-outline" size={16} color="#fff" />
                    <Text style={styles.etaText}>
                      Next: {optimizedRoute.nextStopDistance}
                    </Text>
                  </View>
                </View>
                <View style={styles.totalColumn}>
                  <View style={styles.etaItem}>
                    <Ionicons name="time-outline" size={16} color="#fff" />
                    <Text style={styles.etaText}>
                      Time: {optimizedRoute.duration}
                    </Text>
                  </View>
                  <View style={styles.etaItem}>
                    <Ionicons name="analytics-outline" size={16} color="#fff" />
                    <Text style={styles.etaText}>
                      Total: {optimizedRoute.distance}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleStopNavigation}>
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <ScrollView style={styles.locationList}>
              {predeterminedLocations.map((location) => (
                <TouchableOpacity
                  key={location.name}
                  style={styles.locationButton}
                  onPress={() => handleLocationSelect(location)}
                >
                  <Text style={styles.locationButtonText}>{location.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Incident Type Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Incident Type</Text>
            <View style={styles.incidentTypeGrid}>
              {[
                { label: 'Accident', value: 'accident' },
                { label: 'Road Closure', value: 'road_closure' },
                { label: 'Pothole', value: 'pothole' },
                { label: 'Obstruction', value: 'obstruction' },
                { label: 'Police', value: 'police' },
                { label: 'Hazard', value: 'hazard' },
                { label: 'Blocked Lane', value: 'blocked_lane' },
                { label: 'Flood', value: 'flood' },
                { label: 'Road Work', value: 'road_work' },
                { label: 'Traffic Jam', value: 'traffic_jam' },
                { label: 'Other', value: 'other' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.incidentTypeButton}
                  onPress={() => handleIncidentTypeSelect(type.value)}
                >
                  <Text style={styles.incidentTypeText}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Severity Modal */}
      <Modal
        visible={showSeverityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSeverityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Severity</Text>
            <View style={styles.severityButtons}>
              {[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' }
              ].map((severity) => (
                <TouchableOpacity
                  key={severity.value}
                  style={[
                    styles.severityButton,
                    severity.value === 'high' && styles.highSeverityButton,
                    severity.value === 'medium' && styles.mediumSeverityButton,
                    severity.value === 'low' && styles.lowSeverityButton,
                  ]}
                  onPress={() => handleSeveritySelect(severity.value)}
                >
                  <Text style={styles.severityButtonText}>{severity.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
        <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSeverityModal(false)}
        >
              <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Voice Command Button */}
      <VoiceCommand
        onNavigate={handleVoiceNavigate}
        onReroute={handleVoiceReroute}
        onReport={handleVoiceReport}
        onRoadClosure={handleRoadClosure}
        onRoadOpening={handleRoadOpening}
        onTrafficCheck={handleTrafficCheck}
        onAlternativeRoute={handleAlternativeRoute}
        isAdmin={userRole === 'admin'}
      />

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <Ionicons 
              name={successDetails?.type === 'road_closure' ? 'close-circle' : 
                    successDetails?.type === 'road_opening' ? 'checkmark-circle' :
                    successDetails?.type === 'traffic_check' ? 'stats-chart' : 'checkmark-circle'} 
              size={48} 
              color="#4CD964" 
              style={styles.successIcon} 
            />
            <Text style={styles.successTitle}>
              {successDetails?.type === 'road_closure' ? 'Road Closure Successful' :
               successDetails?.type === 'road_opening' ? 'Road Opening Successful' :
               successDetails?.type === 'traffic_check' ? 'Traffic Check Initiated' :
               'Incident Reported Successfully!'}
            </Text>
            {successDetails && (
              <View style={styles.successDetails}>
                {successDetails.type === 'road_closure' && (
                  <>
                    <Text style={styles.successDetailText}>Road: {successDetails.roadName}</Text>
                    <Text style={styles.successDetailText}>From: {successDetails.start}</Text>
                    <Text style={styles.successDetailText}>To: {successDetails.end}</Text>
                  </>
                )}
                {successDetails.type === 'road_opening' && (
                  <Text style={styles.successDetailText}>Road: {successDetails.roadName}</Text>
                )}
                {successDetails.type === 'traffic_check' && (
                  <Text style={styles.successDetailText}>{successDetails.message}</Text>
                )}
                {successDetails.type === 'incident' && (
                  <>
                    <Text style={styles.successDetailText}>Type: {successDetails.type}</Text>
                    <Text style={styles.successDetailText}>Severity: {successDetails.severity}</Text>
                    <Text style={styles.successDetailText}>
                      Location: {successDetails.location?.latitude.toFixed(4)}, {successDetails.location?.longitude.toFixed(4)}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Route Selection Mode Indicator */}
      {isRouteSelectionMode && (
        <View style={styles.routeSelectionIndicator}>
          <Text style={styles.routeSelectionText}>
            Tap a route to select it
          </Text>
          <TouchableOpacity
            style={styles.cancelRouteSelectionButton}
            onPress={() => {
              setIsRouteSelectionMode(false);
              setAlternativeRoutes([]);
            }}
          >
            <Text style={styles.cancelRouteSelectionText}>Cancel</Text>
          </TouchableOpacity>
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
    zIndex: 1,
  },
  navigationButton: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 70,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 70,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destinationInfo: {
    flex: 1,
    marginRight: 10,
  },
  destinationName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  etaColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  totalColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  etaText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  userMarkerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarker: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  reportButton: {
    position: 'absolute',
    bottom: 110,
    right: 10,
    backgroundColor: '#FF3B30',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  incidentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  incidentTypeButton: {
    width: '48%',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  incidentTypeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  severityButtons: {
    marginBottom: 20,
  },
  severityButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  lowSeverityButton: {
    backgroundColor: '#4CD964',
  },
  mediumSeverityButton: {
    backgroundColor: '#FF9500',
  },
  highSeverityButton: {
    backgroundColor: '#FF3B30',
  },
  severityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  incidentMarkerContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  placeDetailsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 70,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
  },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  placeDetailsContent: {
    flex: 1,
    marginRight: 10,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  placeAddress: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  clearButton: {
    padding: 4,
  },
  navigationGuide: {
    position: 'absolute',
    left: 30,
    right: 30,
    backgroundColor: 'rgba(128, 128, 128, 0.8)',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  navigationStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationStepTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  navigationStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  navigationDistanceText: {
    fontSize: 14,
    color: '#e0e0e0',
  },
  adminButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  locationList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#4CD964',
  },
  successDetails: {
    width: '100%',
    marginTop: 8,
  },
  successDetailText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  routeSelectionIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 3,
  },
  routeSelectionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  cancelRouteSelectionButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelRouteSelectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  routeInfoWindow: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeInfoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  routeInfoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  trafficWarning: {
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 4,
  },
  deliveryControls: {
    position: 'absolute',
    bottom: 250,
    right: 10,
    zIndex: 1,
  },
  deliveryButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deliveryModeActive: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 80,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1,
  },
  deliveryModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryModeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  deliveryStopsList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  deliveryStopItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  deliveryStopName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deliveryStopAddress: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  optimizeButton: {
    backgroundColor: '#4CD964',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deliveryStopMarker: {
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  deliveryStopNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stopName: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 8,
  },
  deliveryStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optimizeButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  deliveryOptions: {
    marginTop: 10,
  },
  returnToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  returnToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  returnToggleText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  routeSummary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  emptyDeliveryStops: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 10,
    opacity: 0.8,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
}); 