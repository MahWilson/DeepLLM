import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface AudioWaveformProps {
  isListening: boolean;
  audioLevel: number;
}

export default function AudioWaveform({ isListening, audioLevel }: AudioWaveformProps) {
  const bars = 5;
  const animations = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    if (isListening) {
      // Initialize animations if needed
      for (let i = 0; i < bars; i++) {
        if (!animations[i]) {
          animations[i] = new Animated.Value(0.3);
        }
      }
    } else {
      // Reset all bars
      for (let i = 0; i < bars; i++) {
        if (animations[i]) {
          animations[i].setValue(0.3);
        }
      }
    }
  }, [isListening]);

  useEffect(() => {
    if (isListening && audioLevel > 0) {
      // Update each bar's height based on audio level with some variation
      for (let i = 0; i < bars; i++) {
        const variation = 0.2 * Math.sin(Date.now() / 200 + i);
        const targetValue = Math.max(0.3, Math.min(1, audioLevel + variation));
        
        Animated.timing(animations[i], {
          toValue: targetValue,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [audioLevel, isListening]);

  return (
    <View style={styles.container}>
      {[...Array(bars)].map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              transform: [
                {
                  scaleY: animations[index] || 0.3,
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 60,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: 5,
  },
  bar: {
    width: 4,
    height: 20,
    backgroundColor: '#007AFF',
    marginHorizontal: 2,
    borderRadius: 2,
  },
}); 