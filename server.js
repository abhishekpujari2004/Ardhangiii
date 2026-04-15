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

// User Schema (Extended with survey fields)
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
  // Survey Fields
  surveyCompleted: {
    type: Boolean,
    default: false
  },
  height: String,
  diet: {
    type: [String],
    enum: ['Veg', 'Non-Veg', 'Eggetarian', 'Vegan', 'Occasionally NV', 'Jain']
  },
  qualification: String,
  collegeName: String,
  income: String,
  hobbies: [String],
  profession: String,
  workDetails: {
    sector: String,
    type: String // Private, Gov, Defense, Business, No work
  },
  agePreference: {
    min: Number,
    max: Number
  },
  religionPreference: [String],
  locationPreference: [String],
  interests: [String],
  lifestyle: {
    smoking: String, // Yes, No, Occasionally
    drinking: String, // Yes, No, Occasionally
    caste: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Survey Schema (Alternative: separate model)
const surveySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  height: String,
  diet: [String],
  qualification: String,
  collegeName: String,
  income: String,
  hobbies: [String],
  profession: String,
  workDetails: {
    sector: String,
    type: String
  },
  agePreference: {
    min: Number,
    max: Number
  },
  religionPreference: [String],
  locationPreference: [String],
  interests: [String],
  lifestyle: {
    smoking: String,
    drinking: String,
    caste: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Like Schema
const likeSchema = new mongoose.Schema({
  likerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Match Schema
const matchSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'matched', 'rejected'],
    default: 'pending'
  },
  compatibility: {
    type: Number,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
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
const Survey = mongoose.model('Survey', surveySchema);
const Like = mongoose.model('Like', likeSchema);
const Match = mongoose.model('Match', matchSchema);
const Message = mongoose.model('Message', messageSchema);
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

// ============ SURVEY ENDPOINTS ============

// Submit Survey
app.post('/api/survey', async (req, res) => {
  try {
    const { userId, height, diet, qualification, collegeName, income, hobbies, profession, workDetails, agePreference, religionPreference, locationPreference, interests, lifestyle } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let survey = await Survey.findOne({ userId });

    if (survey) {
      // Update existing survey
      survey = Object.assign(survey, {
        height,
        diet,
        qualification,
        collegeName,
        income,
        hobbies,
        profession,
        workDetails,
        agePreference,
        religionPreference,
        locationPreference,
        interests,
        lifestyle,
        updatedAt: new Date()
      });
    } else {
      // Create new survey
      survey = new Survey({
        userId,
        height,
        diet,
        qualification,
        collegeName,
        income,
        hobbies,
        profession,
        workDetails,
        agePreference,
        religionPreference,
        locationPreference,
        interests,
        lifestyle
      });
    }

    await survey.save();

    // Mark user survey as completed
    await User.findByIdAndUpdate(userId, { surveyCompleted: true });

    res.status(201).json({ message: 'Survey submitted successfully', survey });
  } catch (error) {
    console.error('Survey error:', error);
    res.status(500).json({ error: 'Server error submitting survey' });
  }
});

// Get Survey by User ID
app.get('/api/survey/:userId', async (req, res) => {
  try {
    const survey = await Survey.findOne({ userId: req.params.userId });
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    res.json({ survey });
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ error: 'Server error fetching survey' });
  }
});

// ============ MATCHING ENDPOINTS ============

// Calculate compatibility score
const calculateCompatibility = (survey1, survey2) => {
  let score = 0;
  let factors = 0;

  // Age compatibility
  if (survey1 && survey2 && survey1.agePreference && survey2.agePreference) {
    const user1Age = new Date().getFullYear() - new Date(survey1.birthdate).getFullYear();
    const user2Age = new Date().getFullYear() - new Date(survey2.birthdate).getFullYear();
    
    if (user1Age >= survey2.agePreference.min && user1Age <= survey2.agePreference.max) {
      score += 20;
    }
    factors += 20;
  }

  // Religion compatibility
  if (survey1?.religionPreference?.includes(survey2?.religion)) {
    score += 20;
  }
  factors += 20;

  // Location compatibility
  if (survey1?.locationPreference?.includes(survey2?.city)) {
    score += 20;
  }
  factors += 20;

  // Interests similarity
  if (survey1?.interests && survey2?.interests) {
    const commonInterests = survey1.interests.filter(i => survey2.interests.includes(i));
    const similarity = (commonInterests.length / Math.max(survey1.interests.length, survey2.interests.length)) * 20;
    score += similarity;
  }
  factors += 20;

  // Lifestyle compatibility
  if (survey1?.lifestyle && survey2?.lifestyle) {
    if (survey1.lifestyle.smoking === survey2.lifestyle.smoking) score += 10;
    if (survey1.lifestyle.drinking === survey2.lifestyle.drinking) score += 10;
  }
  factors += 20;

  return Math.round((score / factors) * 100);
};

// Get Matched Profiles for User
app.get('/api/matches/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    const userSurvey = await Survey.findOne({ userId });

    if (!user || !userSurvey) {
      return res.status(404).json({ error: 'User or survey not found' });
    }

    // Get users who are opposite gender
    const potentialMatches = await User.find({
      _id: { $ne: userId },
      gender: user.gender === 'Male' ? 'Female' : 'Male'
    });

    // Calculate compatibility
    const matches = await Promise.all(
      potentialMatches.map(async (candidate) => {
        const candidateSurvey = await Survey.findOne({ userId: candidate._id });
        if (!candidateSurvey) return null;

        const compatibility = calculateCompatibility(userSurvey, candidateSurvey);
        
        // Check if already liked
        const liked = await Like.findOne({
          likerId: userId,
          likedId: candidate._id
        });

        return {
          user: candidate,
          compatibility,
          liked: !!liked
        };
      })
    );

    // Filter out nulls and sort by compatibility
    const sortedMatches = matches
      .filter(m => m !== null)
      .sort((a, b) => b.compatibility - a.compatibility);

    res.json({ matches: sortedMatches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Server error fetching matches' });
  }
});

// ============ LIKE ENDPOINTS ============

// Like a user
app.post('/api/like', async (req, res) => {
  try {
    const { likerId, likedId } = req.body;

    if (!likerId || !likedId) {
      return res.status(400).json({ error: 'Liker and liked user IDs are required' });
    }

    if (likerId === likedId) {
      return res.status(400).json({ error: 'Cannot like yourself' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({ likerId, likedId });
    if (existingLike) {
      return res.status(400).json({ error: 'Already liked this user' });
    }

    const like = new Like({ likerId, likedId });
    await like.save();

    // Check for mutual like (Match)
    const mutualLike = await Like.findOne({ likerId: likedId, likedId: likerId });
    if (mutualLike) {
      // Create match
      const match = new Match({
        user1: likerId,
        user2: likedId,
        status: 'matched',
        compatibility: 100
      });
      await match.save();

      res.json({
        message: 'Matched! You can now chat',
        matched: true,
        matchId: match._id
      });
    } else {
      res.json({
        message: 'Like sent successfully',
        matched: false
      });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Server error processing like' });
  }
});

// Unlike a user
app.post('/api/unlike', async (req, res) => {
  try {
    const { likerId, likedId } = req.body;

    if (!likerId || !likedId) {
      return res.status(400).json({ error: 'Liker and liked user IDs are required' });
    }

    await Like.deleteOne({ likerId, likedId });
    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    console.error('Unlike error:', error);
    res.status(500).json({ error: 'Server error removing like' });
  }
});

// ============ CHAT ENDPOINTS ============

// Get matches for user (for chat)
app.get('/api/user-matches/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const matches = await Match.find({
      $or: [
        { user1: userId, status: 'matched' },
        { user2: userId, status: 'matched' }
      ]
    })
      .populate('user1')
      .populate('user2');

    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Server error fetching matches' });
  }
});

// Send message
app.post('/api/message', async (req, res) => {
  try {
    const { senderId, receiverId, matchId, message } = req.body;

    if (!senderId || !receiverId || !matchId || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const msg = new Message({
      senderId,
      receiverId,
      matchId,
      message
    });

    await msg.save();
    res.status(201).json({ message: 'Message sent successfully', msg });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error sending message' });
  }
});

// Get chat history
app.get('/api/messages/:matchId', async (req, res) => {
  try {
    const messages = await Message.find({ matchId: req.params.matchId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name')
      .populate('receiverId', 'name');

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// Mark messages as read
app.post('/api/messages-read', async (req, res) => {
  try {
    const { matchId, receiverId } = req.body;

    await Message.updateMany(
      { matchId, receiverId, read: false },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error updating messages' });
  }
});

// Serve static HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/survey', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/members', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'members.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
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
