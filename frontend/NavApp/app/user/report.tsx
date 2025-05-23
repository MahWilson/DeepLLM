import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

type IncidentType = 'accident' | 'road_closure' | 'pothole' | 'obstruction' | 'police' | 'hazard' | 'blocked_lane' | 'flood' | 'road_work' | 'traffic_jam' | 'other';
type SeverityLevel = 'low' | 'medium' | 'high';

export default function ReportIncidentScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IncidentType>('other');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        router.replace('/auth/login');
        return;
      }

      console.log('Submitting incident with token:', token.substring(0, 10) + '...');
      const response = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          type,
          severity,
          location: {
            latitude: 51.5074, // Default to London coordinates
            longitude: -0.1278
          }
        }),
      });

      console.log('Incident response status:', response.status);
      const responseText = await response.text();
      console.log('Incident response text:', responseText);

      if (response.ok) {
        Alert.alert(
          'Success',
          'Incident reported successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/user');
              }
            }
          ]
        );
      } else {
        try {
          const error = JSON.parse(responseText);
          Alert.alert(
            'Error',
            error.message || 'Failed to report incident. Please try again.'
          );
        } catch (parseError) {
          Alert.alert(
            'Error',
            'Failed to report incident. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Error reporting incident:', error);
      Alert.alert(
        'Error',
        'Network error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const incidentTypes: IncidentType[] = [
    'accident',
    'road_closure',
    'pothole',
    'obstruction',
    'police',
    'hazard',
    'blocked_lane',
    'flood',
    'road_work',
    'traffic_jam',
    'other'
  ];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter incident title"
              value={title}
              onChangeText={setTitle}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the incident"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {incidentTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    type === t && styles.typeButtonActive
                  ]}
                  onPress={() => setType(t)}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === t && styles.typeButtonTextActive
                  ]}>
                    {t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Severity</Text>
            <View style={styles.buttonGroup}>
              {(['low', 'medium', 'high'] as SeverityLevel[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.severityButton,
                    severity === s && styles.severityButtonActive
                  ]}
                  onPress={() => setSeverity(s)}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.severityButtonText,
                    severity === s && styles.severityButtonTextActive
                  ]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  form: {
    width: '100%',
    paddingBottom: 40, // Add padding at the bottom for the submit button
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  severityButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  severityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  severityButtonText: {
    color: '#333',
    fontSize: 14,
  },
  severityButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 