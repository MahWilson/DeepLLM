// components/MapViewComponent.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

type Props = {
  userLocation: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number } | null;
  routeCoordinates: { latitude: number; longitude: number }[];
  incidents?: Array<{
    id: string;
    title: string;
    description: string;
    location: {
      latitude: number;
      longitude: number;
    };
  }>;
};

export default function MapViewComponent({
  userLocation,
  destination,
  routeCoordinates,
  incidents = [],
}: Props) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation
      showsMyLocationButton
    >
      <Marker coordinate={userLocation} title="You are here" />
      {destination && (
        <Marker coordinate={destination} title="Destination" pinColor="green" />
      )}
      {routeCoordinates.length > 0 && (
        <Polyline coordinates={routeCoordinates} strokeColor="blue" strokeWidth={4} />
      )}
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          coordinate={incident.location}
          title={incident.title}
          description={incident.description}
          pinColor="red"
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
}); 