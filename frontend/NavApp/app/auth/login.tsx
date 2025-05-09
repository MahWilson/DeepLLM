import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login for:', email);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', { ...data, token: data.token ? '[HIDDEN]' : null });

      if (response.ok) {
        // Store token in AsyncStorage
        await AsyncStorage.setItem('token', data.token);
        
        Alert.alert(
          'Success',
          'Login successful!',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('Navigating to:', data.user.role === 'admin' ? '/admin' : '/user');
                // Navigate based on user role
                if (data.user.role === 'admin') {
                  router.replace('/admin');
                } else {
                  router.replace('/user');
                }
              }
            }
          ]
        );
      } else {
        console.log('Login failed:', data.message);
        Alert.alert(
          'Login Failed',
          data.message || 'Invalid email or password',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setPassword(''); // Clear password field
              }
            },
            {
              text: 'Register',
              onPress: () => router.push('/auth/register'),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Login error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      Alert.alert(
        'Error',
        'Network error occurred. Please try again.',
        [
          {
            text: 'Try Again',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/user')}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/auth/register')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, isLoading && styles.linkTextDisabled]}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  form: {
    width: '100%',
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
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  linkTextDisabled: {
    opacity: 0.5,
  },
}); 