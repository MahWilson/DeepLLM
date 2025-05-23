const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/auth');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('Verifying token with secret:', getJwtSecret() ? 'Secret exists' : 'Secret missing');
    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (err) {
            console.error('Token verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken; 