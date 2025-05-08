const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const INCIDENTS_FILE = path.join(__dirname, '../data/incidents.json');

async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Handle specific file types
        if (filePath === USERS_FILE) {
            return parsed; // Return full data object for users file
        } else if (filePath === INCIDENTS_FILE) {
            return Array.isArray(parsed) ? parsed : [];
        }
        
        return parsed;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If file doesn't exist, return appropriate empty data structure
            if (filePath === USERS_FILE) {
                return { users: [] };
            } else if (filePath === INCIDENTS_FILE) {
                return [];
            }
            throw new Error('Unknown file type');
        }
        throw error;
    }
}

async function writeJSON(filePath, data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Write the file
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing to file:', error);
        throw error;
    }
}

module.exports = {
    readJSON,
    writeJSON,
    USERS_FILE,
    INCIDENTS_FILE
};
