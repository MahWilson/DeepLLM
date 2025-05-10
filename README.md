# DeepLLM
Code Repository for Team LLM for the ELLM Startup Initiative 2025

# NavApp

A navigation application with voice commands, delivery optimization, and real-time traffic updates.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Google Maps API Key
- Google Speech API Key

### Frontend Setup (NavApp)

1. Navigate to the frontend directory:
```bash
cd frontend/NavApp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the `frontend/NavApp` directory with the following variables:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
API_URL=your_backend_api_url_here
```

4. Create a `config.secret.ts` file in the `frontend/NavApp` directory:
```typescript
export const GOOGLE_MAPS_API_KEY = 'your_google_maps_api_key_here';
export const API_URL = 'your_backend_api_url_here';
```

5. Start the development server:
```bash
npm start
# or
yarn start
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=3000
JWT_SECRET=your_jwt_secret_here
GOOGLE_SPEECH_API_KEY=your_google_speech_api_key_here
FRONTEND_URL=http://localhost:19006
```

4. Start the backend server:
```bash
npm start
# or
yarn start
```

## API Keys Setup

### Google Maps API Key
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Distance Matrix API
4. Create credentials (API key)
5. Add the API key to your `.env` and `config.secret.ts` files

### Google Speech API Key
1. In the Google Cloud Console
2. Enable the Cloud Speech-to-Text API
3. Create credentials (API key)
4. Add the API key to your backend `.env` file

## Development Notes

- The frontend runs on Expo, which provides a development environment for React Native
- The backend is a Node.js/Express server
- Both `.env` and `config.secret.ts` files are git-ignored for security
- Make sure to keep your API keys secure and never commit them to version control

## Troubleshooting

If you encounter any issues:

1. Make sure all environment variables are properly set
2. Check that all required APIs are enabled in Google Cloud Console
3. Verify that the backend server is running and accessible
4. Check the console for any error messages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
