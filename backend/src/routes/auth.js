const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readJSON, writeJSON, USERS_FILE } = require('../utils/fileUtils');
const { getJwtSecret, jwtOptions } = require('../config/auth');

// Register new user
router.post('/register', async (req, res) => {
    console.log('Register request received:', req.body);
    try {
        const { name, email, password } = req.body;

        // Read existing users
        const data = await readJSON(USERS_FILE);
        console.log('Current users:', data.users);
        
        // Check if user already exists
        if (data.users.find(user => user.email === email)) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = {
            id: Date.now(),
            name,
            email,
            password: hashedPassword,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        // Add user to array
        data.users.push(newUser);
        await writeJSON(USERS_FILE, data);
        console.log('New user created:', { ...newUser, password: '[HIDDEN]' });

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, role: newUser.role },
            getJwtSecret(),
            jwtOptions
        );

        // Return user data (excluding password)
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        // Read users
        const data = await readJSON(USERS_FILE);
        
        // Find user
        const user = data.users.find(u => u.email === email);
        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('Login successful, generating token...');
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            getJwtSecret(),
            jwtOptions
        );

        // Return user data (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        console.log('Login successful for user:', userWithoutPassword.email);
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        console.log('Profile request - User ID from token:', req.user.userId);
        const data = await readJSON(USERS_FILE);
        console.log('Profile request - Available users:', data.users.map(u => ({ id: u.id, email: u.email })));
        
        // Convert both IDs to strings for comparison
        const user = data.users.find(u => String(u.id) === String(req.user.userId));
        
        if (!user) {
            console.error('Profile request - User not found:', req.user.userId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Only return necessary user information
        const safeUserData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };
        
        console.log('Profile request - Returning safe user data:', safeUserData);
        res.json(safeUserData);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

module.exports = router; 