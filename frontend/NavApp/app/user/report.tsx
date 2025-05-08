import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const response = await fetch('http://192.168.0.11:3000/api/incidents', {
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
        try {
          const data = JSON.parse(responseText);
          console.log('Incident reported successfully:', data);
          Alert.alert('Success', 'Incident reported successfully', [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back and refresh the dashboard
                router.replace({
                  pathname: '/user',
                  params: { refresh: Date.now() }
                });
              }
            }
          ]);
        } catch (parseError) {
          console.error('Failed to parse incident response:', parseError);
          Alert.alert('Error', 'Invalid response from server');
        }
      } else {
        try {
          const data = JSON.parse(responseText);
          console.error('Failed to report incident:', data);
          if (response.status === 401) {
            // Token is invalid or expired
            await AsyncStorage.removeItem('token');
            router.replace('/auth/login');
          } else {
            Alert.alert('Error', data.message || 'Failed to report incident');
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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report Incident</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief description of the incident"
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detailed description of the incident"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.optionsContainer}>
            {([
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
            ] as IncidentType[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  type === option && styles.optionButtonSelected,
                ]}
                onPress={() => setType(option)}
              >
                <Text style={[
                  styles.optionText,
                  type === option && styles.optionTextSelected,
                ]}>
                  {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Severity</Text>
          <View style={styles.optionsContainer}>
            {(['low', 'medium', 'high'] as SeverityLevel[]).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  severity === level && styles.optionButtonSelected,
                ]}
                onPress={() => setSeverity(level)}
              >
                <Text style={[
                  styles.optionText,
                  severity === level && styles.optionTextSelected,
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Submitting...' : 'Submit Report'}
            </Text>
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
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    color: '#007AFF',
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
}); 