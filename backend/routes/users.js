// backend/routes/users.js
const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { search, skill } = req.query;
  const q = { isPublic: true, isBanned: false, _id: { $ne: req.user._id } };
  if (skill) q.skillsOffered = { $regex: skill, $options: 'i' };
  if (search) q.$or = [
    { name: { $regex: search, $options: 'i' } },
    { skillsOffered: { $regex: search, $options: 'i' } }
  ];
  const users = await User.find(q).select('-password -email');
  res.json(users);
});

router.get('/me', auth, async (req, res) => {
  const me = await User.findById(req.user._id).select('-password');
  res.json(me);
});

router.put('/me', auth, async (req, res) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
  res.json(user);
});

module.exports = router;
