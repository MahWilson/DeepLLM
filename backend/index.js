const express = require('express');
const path = require('path');
const cors = require('cors');
const incidentRoutes = require('./routes/incidents');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());
app.use(cors());

// Mount routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/admin', adminRoutes);

// Optional test route
app.get('/', (req, res) => {
  res.send('DeepLLM Backend API is running.');
});

// 404 fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
