import { GOOGLE_MAPS_API_KEY as SECRET_KEY, API_URL as SECRET_URL } from './config.secret';

// API URL configuration
export const API_URL = SECRET_URL;

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = SECRET_KEY;

// Add a console log to debug
console.log('Google Maps API Key:', GOOGLE_MAPS_API_KEY); 