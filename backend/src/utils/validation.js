const validateIncident = (req, res, next) => {
  const { type, location, description, severity } = req.body;

  // Check required fields
  if (!type || !location || !severity) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['type', 'location', 'severity']
    });
  }

  // Validate type
  const validTypes = [
    'accident',
    'road_closure',
    'pothole',
    'obstruction',
    'police',
    'hazard',
    'blocked_lane',
    'flood',
    'road_work',
    'traffic_jam',
    'other'
  ];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: 'Invalid incident type',
      validTypes
    });
  }

  // Validate severity
  const validSeverities = ['low', 'medium', 'high'];
  if (!validSeverities.includes(severity)) {
    return res.status(400).json({
      error: 'Invalid severity level',
      validSeverities
    });
  }

  // Validate location format
  if (!location.latitude || !location.longitude) {
    return res.status(400).json({
      error: 'Invalid location format',
      required: ['latitude', 'longitude']
    });
  }

  next();
};

const validateRegistration = (req, res, next) => {
  const { email, password, name } = req.body;

  // Check required fields
  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password', 'name']
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long'
    });
  }

  // Validate name
  if (name.length < 2) {
    return res.status(400).json({
      error: 'Name must be at least 2 characters long'
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  // Check required fields
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['email', 'password']
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  next();
};

module.exports = {
  validateIncident,
  validateRegistration,
  validateLogin
}; 