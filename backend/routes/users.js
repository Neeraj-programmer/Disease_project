const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');

// GET /api/users/:id – get public user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -savedPosts');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = await Post.find({
      author: user._id,
      isPrivate: false,
      moderationStatus: { $in: ['published', 'approved'] },
    })
      .populate('author', 'name avatar isAnonymous isVerified trustLevel')
      .sort({ createdAt: -1 });

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
