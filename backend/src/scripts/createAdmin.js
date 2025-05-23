const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

async function createAdminUser() {
  try {
    // Read current users
    const data = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    
    // Check if admin already exists
    const adminExists = data.users.some(user => user.email === 'admin@example.com');
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const adminUser = {
      id: Date.now(),
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    // Add admin to users array
    data.users.push(adminUser);

    // Write back to file
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser(); 