import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

interface Incident {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
}

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await fetch('http://192.168.0.11:3000/api/incidents', {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // We'll implement token storage later
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched incidents:', data);
        setIncidents(data);
      } else {
        const error = await response.json();
        console.error('Failed to fetch incidents:', error);
        Alert.alert('Error', 'Failed to fetch incidents. Please try again.');
      }
    } catch (error: any) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error occurred. Please check your connection and try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#28a745';
      case 'resolved':
        return '#6c757d';
      case 'pending':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Incidents</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {incidents.map((incident) => (
          <TouchableOpacity
            key={incident.id}
            style={styles.incidentCard}
            onPress={() => router.push(`/admin/incidents/${incident.id}`)}
          >
            <View style={styles.incidentHeader}>
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={[
                styles.incidentStatus,
                { color: getStatusColor(incident.status) }
              ]}>
                {incident.status.toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.incidentDescription} numberOfLines={2}>
              {incident.description}
            </Text>
            
            <View style={styles.incidentFooter}>
              <Text style={styles.incidentType}>
                {incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
              </Text>
              <Text style={[
                styles.incidentSeverity,
                { color: getSeverityColor(incident.severity) }
              ]}>
                {incident.severity.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  incidentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  incidentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentType: {
    fontSize: 12,
    color: '#666',
  },
  incidentSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 