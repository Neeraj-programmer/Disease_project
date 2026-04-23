const Report = require('../models/Report');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

const AUTO_HIDE_THRESHOLD = 3; // Auto-hide post after this many reports

// POST /api/reports – report a post
exports.reportPost = async (req, res) => {
  try {
    const { postId, reason, details } = req.body;

    if (!postId || !reason) {
      return res.status(400).json({ error: 'Post ID and reason are required' });
    }

    // Check if already reported by this user
    const existing = await Report.findOne({ reporter: req.userId, post: postId });
    if (existing) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Create report
    const report = await Report.create({
      reporter: req.userId,
      post: postId,
      reason,
      details: details || '',
    });

    // Increment report count on post
    post.reportCount = (post.reportCount || 0) + 1;

    // Auto-hide if threshold reached
    if (post.reportCount >= AUTO_HIDE_THRESHOLD) {
      post.moderationStatus = 'under-review';
      post.moderationFlags.push({
        type: 'auto-flagged',
        reason: `Auto-flagged: ${post.reportCount} reports received`,
      });
    }
    await post.save();

    // Reduce reporter reputation of post author
    const author = await User.findById(post.author);
    if (author) {
      author.postsReported = (author.postsReported || 0) + 1;
      author.reputationPoints = Math.max(0, author.reputationPoints - 2);
      await author.save();
    }

    // Notify post author
    await Notification.create({
      recipient: post.author,
      sender: req.userId,
      type: 'ai_insight',
      post: postId,
      message: 'Your post has been reported and is under review.',
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/post/:postId – get reports for a post (admin)
exports.getPostReports = async (req, res) => {
  try {
    const reports = await Report.find({ post: req.params.postId })
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/flagged – list flagged posts (admin)
exports.getFlaggedPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      $or: [
        { moderationStatus: { $in: ['under-review', 'hidden'] } },
        { reportCount: { $gte: 1 } },
      ],
    })
      .populate('author', 'name email trustLevel reputationPoints isBanned')
      .sort({ reportCount: -1, updatedAt: -1 });

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/reports/moderation/post/:postId – approve/hide/delete post (admin)
exports.reviewPostModeration = async (req, res) => {
  try {
    const { action, note } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (action === 'approve') {
      post.moderationStatus = 'approved';
      post.moderationFlags = [];
      post.reportCount = 0;
    } else if (action === 'hide') {
      post.moderationStatus = 'hidden';
    } else if (action === 'delete') {
      await post.deleteOne();
      return res.json({ message: 'Post deleted' });
    } else {
      return res.status(400).json({ error: 'Invalid moderation action' });
    }

    await post.save();
    res.json({ message: `Post ${action}d successfully`, post, note: note || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/admin/users – list risky users (admin)
exports.getUserTrustScores = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email trustLevel reputationPoints postsReported warningCount isBanned banReason isVerified isEmailVerified isPhoneVerified')
      .sort({ reputationPoints: 1, warningCount: -1 })
      .limit(200);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/reports/admin/users/:userId/ban – ban/unban user (admin)
exports.toggleBanUser = async (req, res) => {
  try {
    const { ban, reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isBanned = !!ban;
    user.banReason = ban ? reason || 'Policy violation' : '';
    if (ban) user.warningCount += 1;
    await user.save();

    res.json({ message: ban ? 'User banned' : 'User unbanned', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
