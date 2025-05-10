import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Dimensions, TextInput } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import MapView, { Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';

interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  totalUsers: number;
  recentIncidents: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
  }>;
  currentDevelopments: Array<{
    id: string;
    project: string;
    location: string;
    type: string;
    status: string;
    estimatedCompletion: string;
  }>;
  activeRoadClosures: Array<{
    id: string;
    roadName: string;
    startKm: string;
    endKm: string;
    startTime: string;
    endTime: string;
    isVisible: boolean;
  }>;
}

// Hardcoded data
const mockData = {
  totalIncidents: 156,
  activeIncidents: 23,
  totalUsers: 89,
  recentIncidents: [
    {
      id: '1',
      title: 'Major Traffic Jam on Main Street',
      status: 'active',
      severity: 'high'
    },
    {
      id: '2',
      title: 'Road Construction on Highway',
      status: 'active',
      severity: 'medium'
    },
    {
      id: '3',
      title: 'Pothole Reported',
      status: 'resolved',
      severity: 'low'
    },
    {
      id: '4',
      title: 'Accident on Bridge',
      status: 'active',
      severity: 'high'
    },
    {
      id: '5',
      title: 'Flooding in Downtown',
      status: 'active',
      severity: 'high'
    }
  ],
  currentDevelopments: [
    {
      id: '1',
      project: 'MRT Line 3 Circle Line',
      location: 'Kajang to Serdang',
      type: 'Railway Construction',
      status: 'In Progress',
      estimatedCompletion: 'Q4 2024'
    },
    {
      id: '2',
      project: 'SUKE Highway Extension',
      location: 'Cheras to Alam Damai',
      type: 'Highway Construction',
      status: 'In Progress',
      estimatedCompletion: 'Q2 2025'
    },
    {
      id: '3',
      project: 'LRT Line 3 Extension',
      location: 'Bandar Kinrara to Puchong',
      type: 'Railway Construction',
      status: 'Planning Phase',
      estimatedCompletion: 'Q1 2026'
    },
    {
      id: '4',
      project: 'Bukit Jalil Sports Complex Renovation',
      location: 'Bukit Jalil',
      type: 'Infrastructure Upgrade',
      status: 'In Progress',
      estimatedCompletion: 'Q3 2024'
    },
    {
      id: '5',
      project: 'Pudu Redevelopment Project',
      location: 'Pudu',
      type: 'Urban Development',
      status: 'In Progress',
      estimatedCompletion: 'Q4 2025'
    }
  ],
  activeRoadClosures: [
    {
      id: '1',
      roadName: 'Jalan Cheras',
      startKm: '12.5',
      endKm: '15.2',
      startTime: '08:00',
      endTime: '17:00',
      isVisible: true
    },
    {
      id: '2',
      roadName: 'LDP Highway',
      startKm: '5.0',
      endKm: '7.8',
      startTime: '22:00',
      endTime: '05:00',
      isVisible: true
    },
    {
      id: '3',
      roadName: 'MRR2',
      startKm: '8.3',
      endKm: '10.1',
      startTime: '09:00',
      endTime: '16:00',
      isVisible: true
    },
    {
      id: '4',
      roadName: 'Jalan Pudu',
      startKm: '2.5',
      endKm: '4.8',
      startTime: '10:00',
      endTime: '15:00',
      isVisible: false
    },
    {
      id: '5',
      roadName: 'Jalan Kinrara',
      startKm: '3.2',
      endKm: '5.5',
      startTime: '11:00',
      endTime: '14:00',
      isVisible: false
    },
    {
      id: '6',
      roadName: 'Jalan Serdang',
      startKm: '6.8',
      endKm: '9.2',
      startTime: '13:00',
      endTime: '18:00',
      isVisible: false
    }
  ]
};

// Chart data
const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [20, 45, 28, 80, 99, 43],
      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      strokeWidth: 2
    }
  ]
};

// Heatmap data for multiple locations
const heatmapData = [
  // Pudu - High concentration (Red)
  { latitude: 3.1417, longitude: 101.6972, weight: 1.0 },
  { latitude: 3.1425, longitude: 101.6972, weight: 0.95 },
  { latitude: 3.1409, longitude: 101.6972, weight: 0.95 },
  { latitude: 3.1417, longitude: 101.6980, weight: 0.95 },
  { latitude: 3.1417, longitude: 101.6964, weight: 0.95 },
  { latitude: 3.1433, longitude: 101.6972, weight: 0.90 },
  { latitude: 3.1401, longitude: 101.6972, weight: 0.90 },
  { latitude: 3.1417, longitude: 101.6988, weight: 0.90 },
  { latitude: 3.1417, longitude: 101.6956, weight: 0.90 },

  // Cheras - Medium-High concentration (Orange-Red)
  { latitude: 3.0833, longitude: 101.7333, weight: 0.85 },
  { latitude: 3.0849, longitude: 101.7333, weight: 0.80 },
  { latitude: 3.0817, longitude: 101.7333, weight: 0.80 },
  { latitude: 3.0833, longitude: 101.7349, weight: 0.80 },
  { latitude: 3.0833, longitude: 101.7317, weight: 0.80 },
  { latitude: 3.0865, longitude: 101.7333, weight: 0.75 },
  { latitude: 3.0801, longitude: 101.7333, weight: 0.75 },
  { latitude: 3.0833, longitude: 101.7365, weight: 0.75 },
  { latitude: 3.0833, longitude: 101.7301, weight: 0.75 },

  // Puchong - Medium concentration (Orange)
  { latitude: 3.0167, longitude: 101.6167, weight: 0.70 },
  { latitude: 3.0183, longitude: 101.6167, weight: 0.65 },
  { latitude: 3.0151, longitude: 101.6167, weight: 0.65 },
  { latitude: 3.0167, longitude: 101.6183, weight: 0.65 },
  { latitude: 3.0167, longitude: 101.6151, weight: 0.65 },
  { latitude: 3.0199, longitude: 101.6167, weight: 0.60 },
  { latitude: 3.0135, longitude: 101.6167, weight: 0.60 },
  { latitude: 3.0167, longitude: 101.6199, weight: 0.60 },
  { latitude: 3.0167, longitude: 101.6135, weight: 0.60 },

  // Kajang - Medium-Low concentration (Yellow-Orange)
  { latitude: 2.9833, longitude: 101.7833, weight: 0.55 },
  { latitude: 2.9849, longitude: 101.7833, weight: 0.50 },
  { latitude: 2.9817, longitude: 101.7833, weight: 0.50 },
  { latitude: 2.9833, longitude: 101.7849, weight: 0.50 },
  { latitude: 2.9833, longitude: 101.7817, weight: 0.50 },
  { latitude: 2.9865, longitude: 101.7833, weight: 0.45 },
  { latitude: 2.9801, longitude: 101.7833, weight: 0.45 },
  { latitude: 2.9833, longitude: 101.7865, weight: 0.45 },
  { latitude: 2.9833, longitude: 101.7801, weight: 0.45 },

  // Kuchai Lama - Low concentration (Yellow)
  { latitude: 3.0833, longitude: 101.6833, weight: 0.40 },
  { latitude: 3.0849, longitude: 101.6833, weight: 0.35 },
  { latitude: 3.0817, longitude: 101.6833, weight: 0.35 },
  { latitude: 3.0833, longitude: 101.6849, weight: 0.35 },
  { latitude: 3.0833, longitude: 101.6817, weight: 0.35 },
  { latitude: 3.0865, longitude: 101.6833, weight: 0.30 },
  { latitude: 3.0801, longitude: 101.6833, weight: 0.30 },
  { latitude: 3.0833, longitude: 101.6865, weight: 0.30 },
  { latitude: 3.0833, longitude: 101.6801, weight: 0.30 },

  // Seri Kembangan - Medium concentration (Orange)
  { latitude: 3.0167, longitude: 101.7167, weight: 0.70 },
  { latitude: 3.0183, longitude: 101.7167, weight: 0.65 },
  { latitude: 3.0151, longitude: 101.7167, weight: 0.65 },
  { latitude: 3.0167, longitude: 101.7183, weight: 0.65 },
  { latitude: 3.0167, longitude: 101.7151, weight: 0.65 },
  { latitude: 3.0199, longitude: 101.7167, weight: 0.60 },
  { latitude: 3.0135, longitude: 101.7167, weight: 0.60 },
  { latitude: 3.0167, longitude: 101.7199, weight: 0.60 },
  { latitude: 3.0167, longitude: 101.7135, weight: 0.60 },

  // Bandar Kinrara - Medium-Low concentration (Yellow-Orange) - 200% larger
  { latitude: 3.0333, longitude: 101.6333, weight: 0.55 },
  { latitude: 3.0349, longitude: 101.6333, weight: 0.50 },
  { latitude: 3.0317, longitude: 101.6333, weight: 0.50 },
  { latitude: 3.0333, longitude: 101.6349, weight: 0.50 },
  { latitude: 3.0333, longitude: 101.6317, weight: 0.50 },
  { latitude: 3.0365, longitude: 101.6333, weight: 0.45 },
  { latitude: 3.0301, longitude: 101.6333, weight: 0.45 },
  { latitude: 3.0333, longitude: 101.6365, weight: 0.45 },
  { latitude: 3.0333, longitude: 101.6301, weight: 0.45 },
  // Additional points for 200% coverage
  { latitude: 3.0381, longitude: 101.6333, weight: 0.40 },
  { latitude: 3.0285, longitude: 101.6333, weight: 0.40 },
  { latitude: 3.0333, longitude: 101.6381, weight: 0.40 },
  { latitude: 3.0333, longitude: 101.6285, weight: 0.40 },
  { latitude: 3.0397, longitude: 101.6333, weight: 0.35 },
  { latitude: 3.0269, longitude: 101.6333, weight: 0.35 },
  { latitude: 3.0333, longitude: 101.6397, weight: 0.35 },
  { latitude: 3.0333, longitude: 101.6269, weight: 0.35 },
  { latitude: 3.0413, longitude: 101.6333, weight: 0.30 },
  { latitude: 3.0253, longitude: 101.6333, weight: 0.30 },
  { latitude: 3.0333, longitude: 101.6413, weight: 0.30 },
  { latitude: 3.0333, longitude: 101.6253, weight: 0.30 },

  // Serdang - Medium concentration (Orange) - 200% larger
  { latitude: 3.0167, longitude: 101.7167, weight: 0.70 },
  { latitude: 3.0183, longitude: 101.7167, weight: 0.65 },
  { latitude: 3.0151, longitude: 101.7167, weight: 0.65 },
  { latitude: 3.0167, longitude: 101.7183, weight: 0.65 },
  { latitude: 3.0167, longitude: 101.7151, weight: 0.65 },
  { latitude: 3.0199, longitude: 101.7167, weight: 0.60 },
  { latitude: 3.0135, longitude: 101.7167, weight: 0.60 },
  { latitude: 3.0167, longitude: 101.7199, weight: 0.60 },
  { latitude: 3.0167, longitude: 101.7135, weight: 0.60 },
  // Additional points for 200% coverage
  { latitude: 3.0215, longitude: 101.7167, weight: 0.55 },
  { latitude: 3.0119, longitude: 101.7167, weight: 0.55 },
  { latitude: 3.0167, longitude: 101.7215, weight: 0.55 },
  { latitude: 3.0167, longitude: 101.7119, weight: 0.55 },
  { latitude: 3.0231, longitude: 101.7167, weight: 0.50 },
  { latitude: 3.0103, longitude: 101.7167, weight: 0.50 },
  { latitude: 3.0167, longitude: 101.7231, weight: 0.50 },
  { latitude: 3.0167, longitude: 101.7103, weight: 0.50 },
  { latitude: 3.0247, longitude: 101.7167, weight: 0.45 },
  { latitude: 3.0087, longitude: 101.7167, weight: 0.45 },
  { latitude: 3.0167, longitude: 101.7247, weight: 0.45 },
  { latitude: 3.0167, longitude: 101.7087, weight: 0.45 },

  // Balakong - Medium-High concentration (Orange-Red)
  { latitude: 3.0333, longitude: 101.7500, weight: 0.80 },
  { latitude: 3.0349, longitude: 101.7500, weight: 0.75 },
  { latitude: 3.0317, longitude: 101.7500, weight: 0.75 },
  { latitude: 3.0333, longitude: 101.7516, weight: 0.75 },
  { latitude: 3.0333, longitude: 101.7484, weight: 0.75 },
  { latitude: 3.0365, longitude: 101.7500, weight: 0.70 },
  { latitude: 3.0301, longitude: 101.7500, weight: 0.70 },
  { latitude: 3.0333, longitude: 101.7532, weight: 0.70 },
  { latitude: 3.0333, longitude: 101.7468, weight: 0.70 },
  // Additional points for wider coverage
  { latitude: 3.0381, longitude: 101.7500, weight: 0.65 },
  { latitude: 3.0285, longitude: 101.7500, weight: 0.65 },
  { latitude: 3.0333, longitude: 101.7548, weight: 0.65 },
  { latitude: 3.0333, longitude: 101.7452, weight: 0.65 },

  // Alam Damai - Medium concentration (Orange)
  { latitude: 3.0833, longitude: 101.7167, weight: 0.70 },
  { latitude: 3.0849, longitude: 101.7167, weight: 0.65 },
  { latitude: 3.0817, longitude: 101.7167, weight: 0.65 },
  { latitude: 3.0833, longitude: 101.7183, weight: 0.65 },
  { latitude: 3.0833, longitude: 101.7151, weight: 0.65 },
  { latitude: 3.0865, longitude: 101.7167, weight: 0.60 },
  { latitude: 3.0801, longitude: 101.7167, weight: 0.60 },
  { latitude: 3.0833, longitude: 101.7199, weight: 0.60 },
  { latitude: 3.0833, longitude: 101.7135, weight: 0.60 },
  // Additional points for wider coverage
  { latitude: 3.0881, longitude: 101.7167, weight: 0.55 },
  { latitude: 3.0785, longitude: 101.7167, weight: 0.55 },
  { latitude: 3.0833, longitude: 101.7215, weight: 0.55 },
  { latitude: 3.0833, longitude: 101.7119, weight: 0.55 },

  // Pavilion Bukit Jalil - High concentration (Red)
  { latitude: 3.0667, longitude: 101.6833, weight: 0.95 },
  { latitude: 3.0683, longitude: 101.6833, weight: 0.90 },
  { latitude: 3.0651, longitude: 101.6833, weight: 0.90 },
  { latitude: 3.0667, longitude: 101.6849, weight: 0.90 },
  { latitude: 3.0667, longitude: 101.6817, weight: 0.90 },
  { latitude: 3.0699, longitude: 101.6833, weight: 0.85 },
  { latitude: 3.0635, longitude: 101.6833, weight: 0.85 },
  { latitude: 3.0667, longitude: 101.6865, weight: 0.85 },
  { latitude: 3.0667, longitude: 101.6801, weight: 0.85 },
  // Additional points for wider coverage
  { latitude: 3.0715, longitude: 101.6833, weight: 0.80 },
  { latitude: 3.0619, longitude: 101.6833, weight: 0.80 },
  { latitude: 3.0667, longitude: 101.6881, weight: 0.80 },
  { latitude: 3.0667, longitude: 101.6785, weight: 0.80 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 156,
    activeIncidents: 23,
    totalUsers: 89,
    recentIncidents: mockData.recentIncidents,
    currentDevelopments: mockData.currentDevelopments,
    activeRoadClosures: [
      {
        id: '1',
        roadName: 'Jalan Cheras',
        startKm: '12.5',
        endKm: '15.2',
        startTime: '08:00',
        endTime: '17:00',
        isVisible: true
      },
      {
        id: '2',
        roadName: 'LDP Highway',
        startKm: '5.0',
        endKm: '7.8',
        startTime: '22:00',
        endTime: '05:00',
        isVisible: true
      },
      {
        id: '3',
        roadName: 'MRR2',
        startKm: '8.3',
        endKm: '10.1',
        startTime: '09:00',
        endTime: '16:00',
        isVisible: true
      },
      {
        id: '4',
        roadName: 'Jalan Pudu',
        startKm: '2.5',
        endKm: '4.8',
        startTime: '10:00',
        endTime: '15:00',
        isVisible: false
      },
      {
        id: '5',
        roadName: 'Jalan Kinrara',
        startKm: '3.2',
        endKm: '5.5',
        startTime: '11:00',
        endTime: '14:00',
        isVisible: false
      },
      {
        id: '6',
        roadName: 'Jalan Serdang',
        startKm: '6.8',
        endKm: '9.2',
        startTime: '13:00',
        endTime: '18:00',
        isVisible: false
      }
    ]
  });
  const [roadName, setRoadName] = useState('');
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('userRole');

      if (!token || role !== 'admin') {
        Alert.alert('Access Denied', 'You do not have permission to access this page.');
        router.replace('/user');
        return;
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access.');
      router.replace('/user');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userRole');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleRoadClosure = () => {
    if (!roadName || !startKm || !endKm || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    Alert.alert(
      'Confirm Road Closure',
      `Close ${roadName} from KM ${startKm} to KM ${endKm}\nFrom ${startTime} to ${endTime}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => {
            setStats(prev => {
              // Create a new array with the updated closures
              const updatedClosures = [...prev.activeRoadClosures];
              
              // Find the first invisible road
              const invisibleIndex = updatedClosures.findIndex(closure => !closure.isVisible);
              
              if (invisibleIndex !== -1) {
                // Replace the invisible road with the new closure
                updatedClosures[invisibleIndex] = {
                  id: Date.now().toString(),
                  roadName,
                  startKm,
                  endKm,
                  startTime,
                  endTime,
                  isVisible: true
                };
              } else {
                // If no invisible roads, add to the end
                updatedClosures.push({
                  id: Date.now().toString(),
                  roadName,
                  startKm,
                  endKm,
                  startTime,
                  endTime,
                  isVisible: true
                });
              }

              return {
                ...prev,
                activeRoadClosures: updatedClosures
              };
            });
            
            // Clear inputs
            setRoadName('');
            setStartKm('');
            setEndKm('');
            setStartTime('');
            setEndTime('');
            Alert.alert('Success', 'Road closure has been recorded');
          }
        }
      ]
    );
  };

  const handleOpenRoad = (id: string) => {
    Alert.alert(
      'Confirm Road Opening',
      'Are you sure you want to open this road?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => {
            setStats(prev => {
              // Create a new array with the updated closures
              const updatedClosures = [...prev.activeRoadClosures];
              
              // Find the index of the road being opened
              const currentIndex = updatedClosures.findIndex(closure => closure.id === id);
              
              // Mark the current road as not visible
              updatedClosures[currentIndex] = {
                ...updatedClosures[currentIndex],
                isVisible: false
              };

              // Find the next invisible road
              const nextInvisibleIndex = updatedClosures.findIndex(
                closure => !closure.isVisible && closure.id !== id
              );

              // If we found an invisible road, make it visible
              if (nextInvisibleIndex !== -1) {
                updatedClosures[nextInvisibleIndex] = {
                  ...updatedClosures[nextInvisibleIndex],
                  isVisible: true
                };
              }

              return {
                ...prev,
                activeRoadClosures: updatedClosures
              };
            });
            Alert.alert('Success', 'Road has been opened');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalIncidents}</Text>
            <Text style={styles.statLabel}>Total Incidents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activeIncidents}</Text>
            <Text style={styles.statLabel}>Active Incidents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
        </View>

        {/* Road Closure Tool */}
        <View style={styles.roadClosureContainer}>
          <Text style={styles.sectionTitle}>Road Closure Tool</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Road Name"
              value={roadName}
              onChangeText={setRoadName}
            />
            <View style={styles.kmContainer}>
              <TextInput
                style={[styles.input, styles.kmInput]}
                placeholder="From KM"
                value={startKm}
                onChangeText={setStartKm}
                keyboardType="numeric"
              />
              <Text style={styles.kmText}>to</Text>
              <TextInput
                style={[styles.input, styles.kmInput]}
                placeholder="To KM"
                value={endKm}
                onChangeText={setEndKm}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.timeContainer}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="From HR (24h)"
                value={startTime}
                onChangeText={setStartTime}
                keyboardType="numeric"
              />
              <Text style={styles.timeText}>to</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="To HR (24h)"
                value={endTime}
                onChangeText={setEndTime}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleRoadClosure}
            >
              <Text style={styles.closeButtonText}>Close Road</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Road Closures */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Road Closures</Text>
          {stats.activeRoadClosures
            .filter(closure => closure.isVisible)
            .map((closure) => (
              <View key={closure.id} style={styles.closureCard}>
                <View style={styles.closureHeader}>
                  <Text style={styles.closureTitle}>{closure.roadName}</Text>
                  <TouchableOpacity 
                    style={styles.openButton}
                    onPress={() => handleOpenRoad(closure.id)}
                  >
                    <Text style={styles.openButtonText}>Open Road</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.closureDetails}>
                  KM {closure.startKm} to KM {closure.endKm}
                </Text>
                <Text style={styles.closureTime}>
                  Time: {closure.startTime} - {closure.endTime}
                </Text>
              </View>
            ))}
          {stats.activeRoadClosures.filter(closure => closure.isVisible).length === 0 && (
            <Text style={styles.noClosuresText}>No active road closures</Text>
          )}
        </View>

        {/* Incidents Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Incidents Over Time</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* KL Area Heatmap */}
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>KL Area Incident Heatmap</Text>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: 3.0833,
              longitude: 101.7000,
              latitudeDelta: 0.35,
              longitudeDelta: 0.35,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Heatmap
              points={heatmapData}
              radius={45}
              opacity={0.9}
              gradient={{
                colors: ['#ffff00', '#ffa500', '#ff0000'],
                startPoints: [0.2, 0.5, 0.8],
                colorMapSize: 4000
              }}
            />
          </MapView>
        </View>

        {/* Recent Incidents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Incidents</Text>
          {stats.recentIncidents.map((incident) => (
            <View key={incident.id} style={styles.incidentCard}>
              <View style={styles.incidentHeader}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={[
                  styles.incidentStatus,
                  { color: incident.status === 'active' ? '#28a745' : '#dc3545' }
                ]}>
                  {incident.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.incidentSeverity}>
                Severity: {incident.severity}
              </Text>
            </View>
          ))}
        </View>

        {/* Current Developments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Developments</Text>
          {stats.currentDevelopments.map((development) => (
            <View key={development.id} style={styles.developmentCard}>
              <View style={styles.developmentHeader}>
                <Text style={styles.developmentTitle}>{development.project}</Text>
                <Text style={[
                  styles.developmentStatus,
                  { color: development.status === 'In Progress' ? '#28a745' : '#ffa500' }
                ]}>
                  {development.status}
                </Text>
              </View>
              <Text style={styles.developmentLocation}>Location: {development.location}</Text>
              <Text style={styles.developmentType}>Type: {development.type}</Text>
              <Text style={styles.developmentCompletion}>
                Estimated Completion: {development.estimatedCompletion}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  logoutButton: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  incidentCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  incidentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  incidentSeverity: {
    fontSize: 14,
    color: '#666',
  },
  roadClosureContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  kmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kmInput: {
    flex: 1,
  },
  kmText: {
    fontSize: 16,
    color: '#666',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeInput: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  developmentCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 15,
  },
  developmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  developmentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  developmentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  developmentLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  developmentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  developmentCompletion: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  closureCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  closureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  closureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  openButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closureDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  closureTime: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noClosuresText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
}); 