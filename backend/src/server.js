const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Get the absolute path to the .env file
const envPath = path.resolve(__dirname, '..', '.env');
console.log('Looking for .env file at:', envPath);

// Check if .env file exists
if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env file not found at:', envPath);
    console.error('Please create a .env file in the backend directory with the following variables:');
    console.error('JWT_SECRET=your-secret-key-here');
    console.error('PORT=3000');
    console.error('GOOGLE_SPEECH_API_KEY=your-google-api-key-here');
    process.exit(1);
}

// Read and log the .env file contents (excluding actual values)
const envContents = fs.readFileSync(envPath, 'utf8');
console.log('Found .env file. Variables present:', envContents.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0])
    .join(', '));

// Load environment variables
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

// Verify required environment variables
const requiredEnvVars = ['JWT_SECRET', 'GOOGLE_SPEECH_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    console.error('Please ensure these variables are set in your .env file');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Log environment variables (excluding sensitive data)
console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET ? 'Configured' : 'Not configured',
    GOOGLE_SPEECH_API_KEY: process.env.GOOGLE_SPEECH_API_KEY ? 'Configured' : 'Not configured'
});

// Import routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const adminRoutes = require('./routes/admin');
const speechRoutes = require('./routes/speechRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase payload limit for audio data
app.use(morgan('dev'));

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/speech-to-text', speechRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code
    });
    res.status(500).json({ 
        message: 'Something went wrong!',
        details: err.message,
        code: err.code
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 