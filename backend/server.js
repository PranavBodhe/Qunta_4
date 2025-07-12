const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillswap', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: { type: String },
  profilePhoto: { type: String },
  skillsOffered: [{ type: String }],
  skillsWanted: [{ type: String }],
  availability: { type: String },
  isPublic: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Swap Request Schema
const swapRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillOffered: { type: String, required: true },
  skillWanted: { type: String, required: true },
  message: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Rating Schema
const ratingSchema = new mongoose.Schema({
  swap: { type: mongoose.Schema.Types.ObjectId, ref: 'SwapRequest', required: true },
  rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rated: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Admin Message Schema
const adminMessageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const SwapRequest = mongoose.model('SwapRequest', swapRequestSchema);
const Rating = mongoose.model('Rating', ratingSchema);
const AdminMessage = mongoose.model('AdminMessage', adminMessageSchema);

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id);
    
    if (!user || user.isBanned) {
      return res.status(401).json({ message: 'User not found or banned' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    });
  } catch (error) {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// Routes

// Auth Routes
app.post('/api/auth/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.isBanned) {
      return res.status(400).json({ message: 'Invalid credentials or account banned' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile Routes
app.get('/api/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    const { name, location, profilePhoto, skillsOffered, skillsWanted, availability, isPublic } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, location, profilePhoto, skillsOffered, skillsWanted, availability, isPublic },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Users Routes
app.get('/api/users', auth, async (req, res) => {
  try {
    const { skill, search } = req.query;
    let query = { isPublic: true, isBanned: false, _id: { $ne: req.user._id } };
    
    if (skill) {
      query.skillsOffered = { $in: [new RegExp(skill, 'i')] };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { skillsOffered: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const users = await User.find(query).select('-password -email');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email');
    if (!user || (!user.isPublic && user._id.toString() !== req.user._id.toString())) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Swap Request Routes
app.post('/api/swaps', auth, async (req, res) => {
  try {
    const { receiverId, skillOffered, skillWanted, message } = req.body;
    
    const swapRequest = new SwapRequest({
      requester: req.user._id,
      receiver: receiverId,
      skillOffered,
      skillWanted,
      message
    });
    
    await swapRequest.save();
    await swapRequest.populate('requester receiver', 'name email');
    res.status(201).json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/swaps', auth, async (req, res) => {
  try {
    const swaps = await SwapRequest.find({
      $or: [{ requester: req.user._id }, { receiver: req.user._id }]
    }).populate('requester receiver', 'name email').sort({ createdAt: -1 });
    
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/swaps/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const swap = await SwapRequest.findById(req.params.id);
    
    if (!swap) {
      return res.status(404).json({ message: 'Swap request not found' });
    }
    
    if (swap.receiver.toString() !== req.user._id.toString() && swap.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    swap.status = status;
    swap.updatedAt = new Date();
    await swap.save();
    
    await swap.populate('requester receiver', 'name email');
    res.json(swap);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/swaps/:id', auth, async (req, res) => {
  try {
    const swap = await SwapRequest.findById(req.params.id);
    
    if (!swap) {
      return res.status(404).json({ message: 'Swap request not found' });
    }
    
    if (swap.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (swap.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete non-pending swap request' });
    }
    
    await SwapRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Swap request deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Rating Routes
app.post('/api/ratings', auth, async (req, res) => {
  try {
    const { swapId, ratedUserId, rating, feedback } = req.body;
    
    const swap = await SwapRequest.findById(swapId);
    if (!swap || swap.status !== 'completed') {
      return res.status(400).json({ message: 'Invalid swap for rating' });
    }
    
    const existingRating = await Rating.findOne({ swap: swapId, rater: req.user._id });
    if (existingRating) {
      return res.status(400).json({ message: 'Already rated this swap' });
    }
    
    const newRating = new Rating({
      swap: swapId,
      rater: req.user._id,
      rated: ratedUserId,
      rating,
      feedback
    });
    
    await newRating.save();
    
    // Update user's average rating
    const user = await User.findById(ratedUserId);
    user.totalRatings += 1;
    user.rating = ((user.rating * (user.totalRatings - 1)) + rating) / user.totalRatings;
    await user.save();
    
    res.status(201).json(newRating);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Routes
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/users/:id/unban', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/swaps', adminAuth, async (req, res) => {
  try {
    const swaps = await SwapRequest.find({}).populate('requester receiver', 'name email').sort({ createdAt: -1 });
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/messages', adminAuth, async (req, res) => {
  try {
    const { title, message } = req.body;
    const adminMessage = new AdminMessage({ title, message });
    await adminMessage.save();
    res.status(201).json(adminMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/messages', async (req, res) => {
  try {
    const messages = await AdminMessage.find({}).sort({ createdAt: -1 }).limit(10);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSwaps = await SwapRequest.countDocuments();
    const pendingSwaps = await SwapRequest.countDocuments({ status: 'pending' });
    const completedSwaps = await SwapRequest.countDocuments({ status: 'completed' });
    const totalRatings = await Rating.countDocuments();
    
    res.json({
      totalUsers,
      totalSwaps,
      pendingSwaps,
      completedSwaps,
      totalRatings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});