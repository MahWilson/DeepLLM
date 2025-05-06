const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../utils/fileUtils');

const INCIDENTS_FILE = './data/incidents.json';

// GET all incidents
router.get('/', (req, res) => {
  const incidents = readJSON(INCIDENTS_FILE);
  res.json(incidents);
});

// POST new incident
router.post('/', (req, res) => {
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

module.exports = router;
