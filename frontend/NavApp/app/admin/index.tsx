import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

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
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidents: 0,
    activeIncidents: 0,
    totalUsers: 0,
    recentIncidents: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/incidents', {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // We'll implement token storage later
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalIncidents: data.length,
          activeIncidents: data.filter((incident: any) => incident.status === 'active').length,
          totalUsers: 0, // We'll implement this later
          recentIncidents: data.slice(0, 5).map((incident: any) => ({
            id: incident.id,
            title: incident.title,
            status: incident.status,
            severity: incident.severity,
          })),
        });
      } else {
        Alert.alert('Error', 'Failed to fetch dashboard data');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const handleLogout = () => {
    // We'll implement token removal later
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
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

        {/* Recent Incidents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Incidents</Text>
          {stats.recentIncidents.map((incident) => (
            <TouchableOpacity
              key={incident.id}
              style={styles.incidentCard}
              onPress={() => router.push(`/admin/incidents/${incident.id}`)}
            >
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <View style={styles.incidentDetails}>
                <Text style={[styles.incidentStatus, { color: incident.status === 'active' ? '#28a745' : '#6c757d' }]}>
                  {incident.status}
                </Text>
                <Text style={[styles.incidentSeverity, { color: incident.severity === 'high' ? '#dc3545' : '#ffc107' }]}>
                  {incident.severity}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/admin/users')}
          >
            <Text style={styles.actionButtonText}>Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/admin/incidents')}
          >
            <Text style={styles.actionButtonText}>View All Incidents</Text>
          </TouchableOpacity>
        </View>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  incidentCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  incidentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  incidentStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  incidentSeverity: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 