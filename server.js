const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder and db.json exist
function initDb() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: 'user_' + Date.now(),
          name: 'LATIKESH',
          email: 'latikesh@example.com',
          passwordHash: hashPassword('123456', 'demosalt123'),
          salt: 'demosalt123',
          createdAt: new Date().toISOString()
        }
      ],
      device: {
        temperature: 34.0,
        humidity: 50.0,
        ledState: 'OFF',
        lcdLine1: 'SMART DISPLAY',
        lcdLine2: 'MyData',
        lastSeen: 0
      },
      records: [
        {
          id: 'rec_1',
          temperature: 34.0,
          humidity: 50.0,
          time: '02:30 PM',
          date: '03-10-2026',
          timestamp: 1727946600000
        },
        {
          id: 'rec_2',
          temperature: 33.5,
          humidity: 52.0,
          time: '02:35 PM',
          date: '03-10-2026',
          timestamp: 1727946900000
        },
        {
          id: 'rec_3',
          temperature: 34.2,
          humidity: 49.0,
          time: '02:40 PM',
          date: '03-10-2026',
          timestamp: 1727947200000
        },
        {
          id: 'rec_4',
          temperature: 35.0,
          humidity: 48.0,
          time: '02:45 PM',
          date: '03-10-2026',
          timestamp: 1727947500000
        }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { users: [], device: {}, records: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// Password hashing helper
function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Asia/Kolkata (+5:30) Date and Time Formatter
function getKolkataDateTime(date = new Date()) {
  const optionsTime = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(date);

  const day = parts.find(p => p.type === 'day')?.value || '01';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const time = new Intl.DateTimeFormat('en-US', optionsTime).format(date);
  const dateStr = `${day}-${month}-${year}`;

  return { time, date: dateStr };
}

// Check ESP8266 Online Status (Threshold: 30 seconds since last heartbeat)
function isDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  return (Date.now() - lastSeen) < 30000;
}

// In-memory token storage for simple auth
const activeSessions = new Map();

function generateToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please login again.' });
  }
  req.userId = activeSessions.get(token).userId;
  next();
}

// ========================
// AUTH ROUTES
// ========================

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields (Name, Email, Password) are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered. Please login.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  const token = generateToken(newUser.id);
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const computedHash = hashPassword(password, user.salt);
  if (computedHash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// Current User Info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// ========================
// IOT & ESP8266 ROUTES
// ========================

// ESP8266 Heartbeat / Status Fetch
// ESP8266 calls this to get LED & LCD status and report online presence
app.get(['/api/esp/status', '/api/esp/poll', '/api/iot/status'], (req, res) => {
  const db = readDb();
  const isEsp = req.query.device === 'esp8266' || req.headers['user-agent']?.includes('ESP8266');

  if (isEsp) {
    db.device.lastSeen = Date.now();
    writeDb(db);
  }

  const online = isDeviceOnline(db.device.lastSeen);
  res.json({
    success: true,
    temperature: db.device.temperature,
    humidity: db.device.humidity,
    ledState: db.device.ledState || 'OFF',
    lcdLine1: db.device.lcdLine1 || 'SMART DISPLAY',
    lcdLine2: db.device.lcdLine2 || 'MyData',
    lastSeen: db.device.lastSeen,
    isOnline: online
  });
});

// ESP8266 Send Sensor Data (Temperature & Humidity)
// ESP8266 posts every 10 seconds: { temperature: 34.0, humidity: 50.0 }
// Also returns current LCD & LED settings so ESP8266 needs only 1 roundtrip!
app.post(['/api/esp/data', '/api/iot/data'], (req, res) => {
  const { temperature, humidity } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ error: 'temperature and humidity are required' });
  }

  const numTemp = parseFloat(temperature);
  const numHum = parseFloat(humidity);

  if (isNaN(numTemp) || isNaN(numHum)) {
    return res.status(400).json({ error: 'Invalid temperature or humidity values' });
  }

  const db = readDb();
  const now = new Date();
  const { time, date } = getKolkataDateTime(now);

  db.device.temperature = Number(numTemp.toFixed(1));
  db.device.humidity = Number(numHum.toFixed(1));
  db.device.lastSeen = Date.now();

  const newRecord = {
    id: 'rec_' + Date.now(),
    temperature: db.device.temperature,
    humidity: db.device.humidity,
    time,
    date,
    timestamp: now.getTime()
  };

  // Add to records (keep newest first, max 1000 records)
  db.records.unshift(newRecord);
  if (db.records.length > 1000) {
    db.records = db.records.slice(0, 1000);
  }

  writeDb(db);

  // Return current actuation states for ESP8266 LCD & LED
  res.json({
    success: true,
    message: 'Data recorded successfully',
    ledState: db.device.ledState || 'OFF',
    lcdLine1: db.device.lcdLine1 || 'SMART DISPLAY',
    lcdLine2: db.device.lcdLine2 || 'MyData',
    record: newRecord
  });
});

// Toggle or Set LED State (from Dashboard Tab 3)
app.post('/api/iot/led', (req, res) => {
  const { state } = req.body;
  const db = readDb();

  if (state === 'ON' || state === 'OFF') {
    db.device.ledState = state;
  } else {
    // Toggle if no explicit state provided
    db.device.ledState = db.device.ledState === 'ON' ? 'OFF' : 'ON';
  }

  writeDb(db);
  res.json({
    success: true,
    ledState: db.device.ledState,
    message: `LED turned ${db.device.ledState}`
  });
});

// Update LCD 16x2 Text (from Dashboard Tab 2)
app.post('/api/iot/lcd', (req, res) => {
  let { line1, line2 } = req.body;

  line1 = (line1 !== undefined ? String(line1) : 'SMART DISPLAY').trim().slice(0, 16);
  line2 = (line2 !== undefined ? String(line2) : 'MyData').trim().slice(0, 16);

  const db = readDb();
  db.device.lcdLine1 = line1;
  db.device.lcdLine2 = line2;

  writeDb(db);
  res.json({
    success: true,
    lcdLine1: line1,
    lcdLine2: line2,
    message: 'LCD message updated successfully'
  });
});

// Get Paginated Records for Section 2 Table
app.get('/api/iot/records', (req, res) => {
  const db = readDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const total = db.records.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const records = db.records.slice(startIndex, startIndex + limit);

  res.json({
    records,
    total,
    page,
    limit,
    totalPages
  });
});

// Delete Record by ID
app.delete('/api/iot/records/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const initialCount = db.records.length;
  db.records = db.records.filter(r => r.id !== id);

  if (db.records.length === initialCount) {
    return res.status(404).json({ error: 'Record not found' });
  }

  writeDb(db);
  res.json({ success: true, message: 'Record deleted successfully' });
});

// Mock Data Generator (Helpful for manual testing when ESP8266 is not connected)
app.post('/api/iot/mock-data', (req, res) => {
  const db = readDb();
  const randomTemp = (25 + Math.random() * 15).toFixed(1);
  const randomHum = (40 + Math.random() * 40).toFixed(1);

  const now = new Date();
  const { time, date } = getKolkataDateTime(now);

  db.device.temperature = parseFloat(randomTemp);
  db.device.humidity = parseFloat(randomHum);
  db.device.lastSeen = Date.now();

  const newRecord = {
    id: 'rec_' + Date.now(),
    temperature: db.device.temperature,
    humidity: db.device.humidity,
    time,
    date,
    timestamp: now.getTime()
  };

  db.records.unshift(newRecord);
  if (db.records.length > 1000) {
    db.records = db.records.slice(0, 1000);
  }

  writeDb(db);
  res.json({
    success: true,
    temperature: db.device.temperature,
    humidity: db.device.humidity,
    record: newRecord
  });
});

// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and Start Server
initDb();
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Simple IoT World Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📡 Ready for ESP8266 & Web Dashboard`);
  console.log(`=========================================`);
});
