// backend/routes/swaps.js
const express = require('express');
const { auth } = require('../middleware/auth');
const SwapRequest = require('../models/SwapRequest');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  const { receiverId, skillOffered, skillWanted, message } = req.body;
  const swap = new SwapRequest({ requester: req.user._id, receiver: receiverId, skillOffered, skillWanted, message });
  await swap.save();
  await swap.populate('requester receiver', 'name email');
  res.status(201).json(swap);
});

router.get('/', auth, async (req, res) => {
  const swaps = await SwapRequest.find({
    $or: [{ requester: req.user._id }, { receiver: req.user._id }]
  }).populate('requester receiver', 'name email').sort({ createdAt: -1 });
  res.json(swaps);
});

router.put('/:id', auth, async (req, res) => {
  const swap = await SwapRequest.findById(req.params.id);
  if (!swap) return res.status(404).json({ message: 'Not found' });
  const { status } = req.body;
  if (![swap.requester.toString(), swap.receiver.toString()].includes(req.user._id.toString()))
    return res.status(403).json({ message: 'Not authorized' });
  swap.status = status;
  swap.updatedAt = new Date();
  await swap.save();
  await swap.populate('requester receiver', 'name email');
  res.json(swap);
});

router.delete('/:id', auth, async (req, res) => {
  const swap = await SwapRequest.findById(req.params.id);
  if (!swap) return res.status(404).json({ message: 'Not found' });
  if (swap.requester.toString() !== req.user._id.toString())
    return res.status(403).json({ message: 'Not authorized' });
  if (swap.status !== 'pending') return res.status(400).json({ message: 'Cannot delete' });
  await swap.remove();
  res.json({ message: 'Deleted' });
});

module.exports = router;
