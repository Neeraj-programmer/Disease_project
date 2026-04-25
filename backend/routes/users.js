const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

// GET /api/users/:id – get public user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -savedPosts');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Optional: Check if requester is the owner of the profile
    let isOwner = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userId === user._id.toString()) {
          isOwner = true;
        }
      } catch (err) {
        // Token invalid, ignore
      }
    }

    const postFilter = {
      author: user._id,
      moderationStatus: { $in: ['published', 'approved'] },
    };

    // If not owner, show only public posts
    if (!isOwner) {
      postFilter.isPrivate = false;
    }

    const posts = await Post.find(postFilter)
      .populate('author', 'name avatar isAnonymous isVerified trustLevel')
      .sort({ createdAt: -1 });

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
