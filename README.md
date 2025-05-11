# Navigation App with Voice Commands

A full-stack navigation application with voice command capabilities, real-time traffic updates, and incident reporting features. Built with React Native (Expo), Node.js, and Google Maps API.

## Features

- 🗺️ Real-time navigation with turn-by-turn directions
- 🎤 Voice command support for navigation and incident reporting
- 🚨 Incident reporting system with severity levels
- 📱 Multi-role support (User, Admin, Delivery)
- 🚚 Delivery mode with route optimization
- 🔄 Alternative route suggestions
- 📊 Admin dashboard for incident management

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Google Maps API key
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DeepLLM
```

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:8081
```

4. Start the backend server:
```bash
npm start
```

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend/NavApp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `config.secret.ts` file in the frontend/NavApp directory:
```typescript
export const GOOGLE_MAPS_API_KEY = 'your_google_maps_api_key';
export const API_URL = 'http://your_backend_url:3000';
```

4. Update the Google Maps API key in `app.json`:
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "your_google_maps_api_key"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "your_google_maps_api_key"
        }
      }
    }
  }
}
```

5. Start the frontend development server:
```bash
npm start
```

### 4. Environment Variables

Create a `.env` file in the root directory:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
API_URL=your_backend_url
FRONTEND_URL=your_frontend_url
```

### 5. Required API Keys and Services

1. **Google Maps API**
   - Enable the following APIs in Google Cloud Console:
     - Maps SDK for Android
     - Maps SDK for iOS
     - Directions API
     - Places API
     - Geocoding API
     - Distance Matrix API

2. **MongoDB**
   - Create a MongoDB Atlas account or use a local MongoDB instance
   - Create a database and get the connection URI

## Project Structure

```
DeepLLM/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   └── index.js
├── frontend/
│   └── NavApp/
│       ├── app/
│       ├── components/
│       ├── config/
│       └── assets/
└── README.md
```

## Available Scripts

### Backend
- `npm start`: Start the backend server
- `npm run dev`: Start the backend server in development mode
- `npm test`: Run backend tests

### Frontend
- `npm start`: Start the Expo development server
- `npm run android`: Run on Android device/emulator
- `npm run ios`: Run on iOS simulator (macOS only)
- `npm run web`: Run in web browser

## Voice Commands

### User Commands
- "Navigate to [location]"
- "Report [incident type] with [severity] severity"
- "Find alternative route"
- "Stop navigation"

### Admin Commands
- "Close road [road name] from [start] to [end]"
- "Open road [road name]"
- "Check traffic at [location]"

### Delivery Commands
- "Add delivery stop at [location]"
- "Calculate optimized route"
- "Start delivery navigation"

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- Google Maps Platform
- Expo
- React Native
- MongoDB
