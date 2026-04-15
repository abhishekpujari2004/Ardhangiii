const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/marriage-bureau';

mongoose.set('strictQuery', true);

const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
  autoIndex: true
};

let isConnecting = false;
let retryCount = 0;
const maxRetries = 5;

const connectWithRetry = async () => {
  if (isConnecting) return;
  isConnecting = true;

  try {
    await mongoose.connect(MONGODB_URI, mongoOptions);
    retryCount = 0;
    console.log('MongoDB connected successfully');
  } catch (err) {
    retryCount += 1;
    console.error(`MongoDB connection error (attempt ${retryCount}/${maxRetries}):`, err.message);

    if (retryCount < maxRetries) {
      const retryDelay = Math.min(5000 * retryCount, 30000);
      console.log(`Retrying MongoDB connection in ${retryDelay / 1000} seconds...`);
      setTimeout(() => {
        isConnecting = false;
        connectWithRetry();
      }, retryDelay);
    } else {
      console.error('Max MongoDB connection retries reached. Please check your connection string and MongoDB server.');
      process.exit(1);
    }
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('connected', () => {
  console.log('MongoDB event: connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB event: error', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB event: disconnected');
  if (!isConnecting && retryCount < maxRetries) {
    console.log('Attempting to reconnect...');
    connectWithRetry();
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB event: reconnected');
});

connectWithRetry();

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.disconnect();
  process.exit(0);
});

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  birthdate: {
    type: Date,
    required: true
  },
  religion: {
    type: String,
    required: true
  },
  community: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  mobile: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Routes

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { name, gender, birthdate, religion, community, country, city, email, mobile, password, confirmPassword } = req.body;

    // Validation
    if (!name || !gender || !birthdate || !religion || !community || !country || !city || !email || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or mobile already exists' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      gender,
      birthdate,
      religion,
      community,
      country,
      city,
      email,
      mobile,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;

    if (!emailOrMobile || !password) {
      return res.status(400).json({ error: 'Email/Mobile and password are required' });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [
        { email: emailOrMobile },
        { mobile: emailOrMobile }
      ]
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Login successful
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        city: user.city,
        religion: user.religion
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get all users (members)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, {
      name: 1,
      gender: 1,
      city: 1,
      religion: 1,
      community: 1,
      country: 1,
      email: 1
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Submit Feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const feedback = new Feedback({
      name,
      email,
      message
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Server error submitting feedback' });
  }
});

// Serve static HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/members', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'members.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

app.get('/feedback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feedback.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer(PORT);
