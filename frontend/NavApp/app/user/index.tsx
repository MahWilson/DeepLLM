import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  name: string;
  email: string;
  role: string;
}

interface Incident {
  id: number;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  timestamp: string;
}

export default function UserDashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const params = useLocalSearchParams();

  useEffect(() => {
    fetchUserProfile();
    fetchIncidents();
  }, [params.refresh]);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        router.replace('/auth/login');
        return;
      }

      console.log('Fetching profile with token:', token.substring(0, 10) + '...');
      const response = await fetch('http://192.168.0.11:3000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Profile response status:', response.status);
      const responseText = await response.text();
      console.log('Profile response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('Fetched user profile:', data);
          setUserData(data);
        } catch (parseError) {
          console.error('Failed to parse profile response:', parseError);
          Alert.alert('Error', 'Invalid response from server');
        }
      } else {
        try {
          const error = JSON.parse(responseText);
          console.error('Failed to fetch user profile:', error);
          if (response.status === 401) {
            // Token is invalid or expired
            await AsyncStorage.removeItem('token');
            router.replace('/auth/login');
          } else {
            Alert.alert('Error', 'Failed to fetch user profile. Please try again.');
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          Alert.alert('Error', 'Server returned an invalid response');
        }
      }
    } catch (error: any) {
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
        console.error('No token found');
        return;
      }

      const response = await fetch('http://192.168.0.11:3000/api/incidents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched incidents:', data);
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/auth/login');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const activeIncidents = Array.isArray(incidents) ? incidents.filter(inc => inc.status === 'active').length : 0;
  const totalIncidents = Array.isArray(incidents) ? incidents.length : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {userData?.name || 'User'}!
          </Text>
          <Text style={styles.emailText}>{userData?.email}</Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalIncidents}</Text>
            <Text style={styles.statLabel}>Reported Incidents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeIncidents}</Text>
            <Text style={styles.statLabel}>Active Incidents</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => router.push('/user/report')}
        >
          <Text style={styles.reportButtonText}>Report New Incident</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  reportButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 