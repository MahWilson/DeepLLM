import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Platform, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { API_URL } from '../config';
import AudioWaveform from './AudioWaveform';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface VoiceCommandProps {
  onNavigate: (destination: string) => void;
  onReroute: (preference?: 'fastest' | 'shortest' | 'scenic') => void;
  onReport: (type: string, severity: string, location: string) => void;
  onRoadClosure?: (roadName: string, start: string, end: string) => void;
  onRoadOpening?: (roadName: string) => void;
  onTrafficCheck?: (location: string) => void;
  onAlternativeRoute: (location: string) => void;
  isAdmin?: boolean;
}

export default function VoiceCommand({ 
  onNavigate, 
  onReroute, 
  onReport,
  onRoadClosure,
  onRoadOpening,
  onTrafficCheck,
  onAlternativeRoute,
  isAdmin 
}: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isListeningRef = useRef(false);
  const router = useRouter();

  // Function to check for silence and stop recording if needed
  const checkForSilence = (currentLevel: number) => {
    const VISUALIZATION_THRESHOLD = 0.3; // 30% of the visualization height
    const SILENCE_DURATION = 2000; // 2 seconds

    // Debug logging for current state
    console.log('Current state:', {
      currentLevel,
      isListening: isListeningRef.current,
      hasRecording: !!recordingRef.current,
      hasTimeout: !!silenceTimeoutRef.current
    });

    // Check if the current level is below the visualization threshold
    if (currentLevel < VISUALIZATION_THRESHOLD) {
      if (!silenceTimeoutRef.current) {
        console.log('Starting timeout - Level below threshold:', currentLevel);
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('Timeout triggered - Stopping recording');
          if (recordingRef.current && isListeningRef.current) {
            stopListening();
          }
          silenceTimeoutRef.current = null;
        }, SILENCE_DURATION);
      }
    } else {
      if (silenceTimeoutRef.current) {
        console.log('Clearing timeout - Level above threshold:', currentLevel);
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  };

  const startListening = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering) {
            // Extremely aggressive noise filtering for air conditioner and background noise
            // Only show levels above -15dB (increased from -25dB)
            const NOISE_FLOOR = -15;
            // Very narrow range for normalization (-15dB to 0dB)
            const normalizedLevel = status.metering < NOISE_FLOOR 
              ? 0 
              : Math.max(0, Math.min(1, Math.pow((status.metering + 15) / 15, 3))); // Using cube for even more aggressive scaling
            
            setAudioLevel(normalizedLevel);
            checkForSilence(normalizedLevel);
          }
        },
        100 // Update every 100ms
      );
      
      // Update both state and refs
      setRecording(recording);
      recordingRef.current = recording;
      setIsListening(true);
      isListeningRef.current = true;

      // Add a maximum recording duration timeout
      const MAX_RECORDING_DURATION = 5000; // 5 seconds
      setTimeout(() => {
        if (recordingRef.current && isListeningRef.current) {
          console.log('Maximum recording duration reached, stopping recording');
          stopListening();
        }
      }, MAX_RECORDING_DURATION);

    } catch (err) {
      console.error('Failed to start recording:', err);
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.error('Error stopping recording:', e);
        }
      }
      setRecording(null);
      recordingRef.current = null;
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopListening = async () => {
    if (!recordingRef.current) return;

    try {
      console.log('Stopping recording...');
      setIsProcessing(true);
      
      // Clear any existing timeout
      if (silenceTimeoutRef.current) {
        console.log('Clearing timeout in stopListening');
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      // Update both state and refs
      setRecording(null);
      recordingRef.current = null;
      setIsListening(false);
      isListeningRef.current = false;
      setAudioLevel(0);

      if (uri) {
        console.log('Processing recording...');
        // Convert audio to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log('Audio blob details:', {
          size: blob.size,
          type: blob.type
        });
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
            console.log('Audio data details:', {
              base64Length: base64Audio.length,
              first100Chars: base64Audio.substring(0, 100),
              last100Chars: base64Audio.substring(base64Audio.length - 100)
            });
            try {
              // Get the authentication token
              const token = await AsyncStorage.getItem('token');
              console.log('Retrieved token:', token ? 'Token exists' : 'No token found');
              
              if (!token) {
                Alert.alert(
                  'Login Required',
                  'Please log in to use voice commands.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    },
                    {
                      text: 'Login',
                      onPress: () => {
                        router.replace('/auth/login');
                      }
                    }
                  ]
                );
                return;
              }

              // Send to backend for speech recognition
              console.log('Sending audio to backend with token...');
              const requestBody = {
                audio: base64Audio,
                encoding: 'MULAW',
                sampleRateHertz: 44100,
                languageCode: 'en-US',
              };
              console.log('Request body details:', {
                audioLength: base64Audio.length,
                encoding: requestBody.encoding,
                sampleRateHertz: requestBody.sampleRateHertz,
                audioPreview: base64Audio.substring(0, 50) + '...'
              });
              
              const result = await fetch(`${API_URL}/api/speech-to-text/speech-to-text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
              });

              console.log('Backend response status:', result.status);
              const responseData = await result.json();
              console.log('Backend response:', responseData);

              if (result.status === 403) {
                // Token is invalid or expired, clear it and redirect to login
                await AsyncStorage.removeItem('token');
                Alert.alert(
                  'Session Expired',
                  'Your session has expired. Please log in again.',
                  [
                    {
                      text: 'Login',
                      onPress: () => {
                        router.replace('/auth/login');
                      }
                    }
                  ]
                );
                return;
              }

              if (!result.ok) {
                throw new Error(responseData.details || responseData.error || 'Failed to process speech');
              }

              if (responseData.transcript) {
                console.log('Received transcription:', responseData.transcript);
                processCommand(responseData.transcript);
              } else {
                throw new Error('No speech detected');
              }
            } catch (error: any) {
              console.error('Speech recognition error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
              });
              Alert.alert(
                'Speech Recognition Error',
                `Error: ${error.message}\n\nPlease try again.`,
                [
                  {
                    text: 'OK',
                    style: 'cancel'
                  }
                ]
              );
            }
          } else {
            console.error('Failed to convert audio to base64');
            Alert.alert('Error', 'Failed to process audio recording');
          }
          setIsProcessing(false);
        };
      } else {
        console.error('No recording URI available');
        Alert.alert('Error', 'Failed to access recording');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process recording');
    }
  };

  const speakFeedback = async (text: string) => {
    try {
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Text-to-speech error:', error);
    }
  };

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();

    // Navigation command
    if (lowerCommand.startsWith('navigate to')) {
      // Extract destination by removing "navigate to" prefix
      const destination = command.replace(/^navigate to\s+/i, '').trim();
      console.log('Extracted destination:', destination);
      onNavigate(destination);
      speakFeedback(`Navigating to ${destination}`);
      return;
    }

    // Reroute commands with variations and preferences
    const rerouteCommands = [
      'find alternative route',
      'reroute',
      'show me another way',
      'find different route',
      'get alternative route',
      'show alternatives',
      'other route',
      'different way'
    ];

    // Check for route preferences
    const routePreferences = {
      fastest: ['fastest', 'quickest', 'speed', 'quick'],
      shortest: ['shortest', 'short', 'nearest', 'closest'],
      scenic: ['scenic', 'beautiful', 'nice', 'pretty']
    };

    for (const [preference, keywords] of Object.entries(routePreferences)) {
      for (const keyword of keywords) {
        for (const cmd of rerouteCommands) {
          if (lowerCommand.startsWith(`${cmd} ${keyword}`)) {
            onReroute(preference as 'fastest' | 'shortest' | 'scenic');
            speakFeedback(`Finding ${preference} alternative route to your destination`);
            return;
          }
        }
      }
    }

    // Default reroute without preference
    if (rerouteCommands.some(cmd => lowerCommand.startsWith(cmd))) {
      onReroute();
      speakFeedback('Finding alternative routes to your destination');
      return;
    }

    // Report command
    if (lowerCommand.startsWith('report')) {
      const parts = command.replace(/^report\s+/i, '').trim().split(' ');
      if (parts.length >= 2) {
        const type = parts[0];
        const severity = parts[1];
        onReport(type, severity, 'current_location');
        speakFeedback(`Reporting ${type} with ${severity} severity at your current location`);
        return;
      }
    }

    // Admin-only commands
    if (isAdmin) {
      // Road closure command
      if (lowerCommand.startsWith('close road') && onRoadClosure) {
        const parts = command.replace(/^close road\s+/i, '').trim().split(' from ');
        if (parts.length === 2) {
          const [roadName, range] = parts;
          const [start, end] = range.split(' to ');
          onRoadClosure(roadName.trim(), start.trim(), end.trim());
          speakFeedback(`Closing road ${roadName} from ${start} to ${end}`);
          return;
        }
      }

      // Road opening command
      if (lowerCommand.startsWith('open road') && onRoadOpening) {
        const roadName = command.replace(/^open road\s+/i, '').trim();
        onRoadOpening(roadName);
        speakFeedback(`Opening road ${roadName}`);
        return;
      }

      // Traffic check command
      if (lowerCommand.startsWith('check traffic at') && onTrafficCheck) {
        const location = command.replace(/^check traffic at\s+/i, '').trim();
        onTrafficCheck(location);
        speakFeedback(`Checking traffic at ${location}`);
        return;
      }
    }

    // Alternative route command
    if (lowerCommand.startsWith('find alternative to')) {
      const location = command.replace(/^find alternative to\s+/i, '').trim();
      onAlternativeRoute(location);
      speakFeedback(`Finding alternative route to ${location}`);
      return;
    }

    // If no command matches
    speakFeedback('Command not recognized. Please try again.');
    Alert.alert('Command not recognized', 'Please try again with a valid command');
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        console.log('Cleaning up timeout on unmount');
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isListening && styles.voiceButtonActive,
          isProcessing && styles.voiceButtonProcessing
        ]}
        onPress={isListening ? stopListening : startListening}
        disabled={isProcessing}
      >
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={32}
          color={isListening ? '#FF3B30' : '#007AFF'}
        />
        {isListening && <AudioWaveform isListening={isListening} audioLevel={audioLevel} />}
      </TouchableOpacity>
      {isProcessing && (
        <View style={styles.processingIndicator}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    right: 10,
    zIndex: 1,
  },
  voiceButton: {
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
  voiceButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  voiceButtonProcessing: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  processingIndicator: {
    position: 'absolute',
    top: -30,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 8,
  },
  processingText: {
    color: 'white',
    fontSize: 12,
  },
}); 