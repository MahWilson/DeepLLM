const express = require('express');
const router = express.Router();
const { readJSON, writeJSON, INCIDENTS_FILE } = require('../utils/fileUtils');
const { validateIncident } = require('../utils/validation');

// GET all incidents
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/incidents - Attempting to read incidents');
    const incidents = await readJSON(INCIDENTS_FILE);
    console.log('GET /api/incidents - Successfully read incidents:', incidents);
    
    // Ensure we always return an array
    if (!Array.isArray(incidents)) {
      console.error('Incidents is not an array:', incidents);
      return res.json([]);
    }
    
    res.json(incidents);
  } catch (error) {
    console.error('GET /api/incidents - Error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// POST new incident
router.post('/', validateIncident, async (req, res) => {
  try {
    console.log('POST /api/incidents - Received new incident:', req.body);
    let incidents = await readJSON(INCIDENTS_FILE);
    
    // Ensure incidents is an array
    if (!Array.isArray(incidents)) {
      console.log('Initializing incidents as empty array');
      incidents = [];
    }
    
    const newIncident = {
      ...req.body,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    console.log('POST /api/incidents - Created new incident:', newIncident);
    incidents.push(newIncident);
    await writeJSON(INCIDENTS_FILE, incidents);
    console.log('POST /api/incidents - Successfully wrote to file');
    res.status(201).json({ success: true, incident: newIncident });
  } catch (error) {
    console.error('POST /api/incidents - Error:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// GET incident by ID
router.get('/:id', (req, res) => {
  try {
    const incidents = readJSON(INCIDENTS_FILE);
    const incident = incidents.find(inc => inc.id === parseInt(req.params.id));
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// PATCH update incident status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'resolved', 'investigating'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const incidents = readJSON(INCIDENTS_FILE);
    const incidentIndex = incidents.findIndex(inc => inc.id === parseInt(req.params.id));
    
    if (incidentIndex === -1) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    incidents[incidentIndex].status = status;
    writeJSON(INCIDENTS_FILE, incidents);
    res.json({ success: true, incident: incidents[incidentIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update incident status' });
  }
});

// DELETE incident
router.delete('/:id', (req, res) => {
  try {
    const incidents = readJSON(INCIDENTS_FILE);
    const filteredIncidents = incidents.filter(inc => inc.id !== parseInt(req.params.id));
    
    if (filteredIncidents.length === incidents.length) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    writeJSON(INCIDENTS_FILE, filteredIncidents);
    res.json({ success: true, message: 'Incident deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});

// GET incidents by type
router.get('/type/:type', (req, res) => {
  try {
    const incidents = readJSON(INCIDENTS_FILE);
    const filteredIncidents = incidents.filter(inc => inc.type === req.params.type);
    res.json(filteredIncidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents by type' });
  }
});

// GET incidents by severity
router.get('/severity/:severity', (req, res) => {
  try {
    const incidents = readJSON(INCIDENTS_FILE);
    const filteredIncidents = incidents.filter(inc => inc.severity === req.params.severity);
    res.json(filteredIncidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents by severity' });
  }
});

// GET incidents by date range
router.get('/date-range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Date range request:', { startDate, endDate });
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const incidents = readJSON(INCIDENTS_FILE);
    console.log('All incidents:', incidents);
    
    if (!Array.isArray(incidents)) {
      console.error('Incidents is not an array:', incidents);
      return res.json([]); // Return empty array instead of error
    }

    const filteredIncidents = incidents.filter(inc => {
      try {
        const incidentDate = new Date(inc.timestamp);
        const start = new Date(startDate);
        const end = new Date(endDate);
        console.log('Comparing dates:', {
          incidentDate: incidentDate.toISOString(),
          start: start.toISOString(),
          end: end.toISOString()
        });
        return incidentDate >= start && incidentDate <= end;
      } catch (error) {
        console.error('Error comparing dates:', error);
        return false;
      }
    });

    console.log('Filtered incidents:', filteredIncidents);
    res.json(filteredIncidents || []); // Ensure we always return an array
  } catch (error) {
    console.error('Date range error:', error);
    res.json([]); // Return empty array on error instead of error response
  }
});

module.exports = router;
