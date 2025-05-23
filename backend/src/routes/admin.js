const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/fileUtils');

const TRAFFIC_FILE = './data/traffic.json';
const INCIDENTS_FILE = './data/incidents.json';

// POST: Close road
router.post('/close-road', (req, res) => {
  const { roadName, divert } = req.body;
  const traffic = readJSON(TRAFFIC_FILE);
  traffic[roadName] = divert ? 'closed' : 'open';
  writeJSON(TRAFFIC_FILE, traffic);
  res.json({ success: true });
});

// GET: Incident analytics
router.get('/analytics', (req, res) => {
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

module.exports = router;
