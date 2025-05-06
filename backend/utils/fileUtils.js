const fs = require('fs');
const path = require('path');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(path.resolve(filePath), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
  }
}

module.exports = { readJSON, writeJSON };
