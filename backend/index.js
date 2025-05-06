const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const INCIDENTS_FILE = path.join(__dirname, 'data', 'incidents.json');
const TRAFFIC_FILE = path.join(__dirname, 'data', 'traffic.json');

// Utility functions
const readJSON = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const writeJSON = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// API: Get all incidents
app.get('/api/incidents', (req, res) => {
  const incidents = readJSON(INCIDENTS_FILE);
  res.json(incidents);
});

// API: Post a new incident
app.post('/api/incidents', (req, res) => {
  const incidents = readJSON(INCIDENTS_FILE);
  const newIncident = {
    ...req.body,
    id: Date.now(),
    timestamp: new Date().toISOString()
  };
  incidents.push(newIncident);
  writeJSON(INCIDENTS_FILE, incidents);
  res.status(201).json({ success: true, incident: newIncident });
});

// API: Get traffic density
app.get('/api/traffic-density', (req, res) => {
  const traffic = readJSON(TRAFFIC_FILE);
  res.json(traffic);
});

// API: Close a road (admin)
app.post('/api/admin/close-road', (req, res) => {
  const { roadName, divert } = req.body;
  const traffic = readJSON(TRAFFIC_FILE);
  traffic[roadName] = divert ? 'closed' : 'open';
  writeJSON(TRAFFIC_FILE, traffic);
  res.json({ success: true });
});

// API: Reroute (simulation)
app.post('/api/reroute', (req, res) => {
  const { origin, destination } = req.body;
  const traffic = readJSON(TRAFFIC_FILE);
  const closedRoads = Object.keys(traffic).filter(road => traffic[road] === 'closed');

  const reroute = closedRoads.length > 0
    ? ['Alternate Street', 'Safe Avenue']
    : ['Main Street'];

  res.json({ origin, destination, route: reroute });
});

// API: Analytics (admin)
app.get('/api/admin/analytics', (req, res) => {
  const incidents = readJSON(INCIDENTS_FILE);
  const summary = {
    totalIncidents: incidents.length,
    byType: {}
  };
  incidents.forEach(inc => {
    summary.byType[inc.type] = (summary.byType[inc.type] || 0) + 1;
  });
  res.json(summary);
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
