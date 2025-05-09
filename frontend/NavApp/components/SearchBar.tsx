import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, placeholder = 'Search location...', isLoading = false }: Props) {
  const [searchText, setSearchText] = useState('');
  const insets = useSafeAreaInsets();

  const handleSearch = () => {
    if (searchText.trim()) {
      onSearch(searchText.trim());
    }
  };

  const handleClear = () => {
    setSearchText('');
    onSearch('');
  };

  // Calculate top position to avoid notch/camera
  const topPosition = Platform.select({
    ios: insets.top + 10,
    android: insets.top + 10,
    default: 10,
  });

  return (
    <View style={[styles.container, { top: topPosition }]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        {searchText.length > 0 && (
          <View style={styles.buttonContainer}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIndicator} />
            ) : (
              <>
                <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                  <Ionicons name="search" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
    height: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: 4,
    marginRight: 4,
  },
  clearButton: {
    padding: 4,
  },
  loadingIndicator: {
    marginRight: 8,
  },
}); 