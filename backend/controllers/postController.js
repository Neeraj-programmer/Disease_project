const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ai = require('../services/aiService');
const {
  moderateContent,
  checkDuplicatePost,
  extractDoctorNames,
} = require('../services/moderationService');

// ── POST CRUD ──

// GET /api/posts – list all public posts
exports.getPosts = async (req, res) => {
  try {
    const { tag, symptom, treatment, severity, search, page = 1, limit = 20 } = req.query;
    const filter = {
      isPrivate: false,
      moderationStatus: { $in: ['published', 'approved'] },
    };

    if (tag) filter.tags = { $in: tag.split(',') };
    if (symptom) filter.symptoms = { $in: symptom.split(',') };
    if (treatment) filter.treatments = { $in: treatment.split(',') };
    if (severity) filter.severityLevel = severity;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .populate('author', 'name avatar isAnonymous isVerified trustLevel')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ posts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/posts/:id
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name avatar bio isAnonymous conditionDetails isVerified trustLevel');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comments = await Comment.find({ post: post._id })
      .populate('author', 'name avatar isAnonymous')
      .sort({ createdAt: -1 });
    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/posts
exports.createPost = async (req, res) => {
  try {
    if (!req.user?.isEmailVerified && process.env.SMTP_HOST) {
      return res.status(403).json({ error: 'Email verification is required before posting.' });
    }

    if (req.user?.isBanned) {
      return res.status(403).json({ error: 'Your account is restricted from posting.' });
    }

    const postData = { ...req.body, author: req.userId };
    const requiredFields = ['title', 'description', 'outcome'];

    for (const field of requiredFields) {
      if (!postData[field] || !String(postData[field]).trim()) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      postData.images = req.files.map((f) => `/uploads/${f.filename}`);
    }

    // Prevent repeated similar posts from same user
    const duplicateCheck = await checkDuplicatePost(req.userId, postData.title, postData.description, Post);
    if (duplicateCheck.isDuplicate) {
      return res.status(429).json({ error: duplicateCheck.reason });
    }

    const fullText = `${postData.title || ''} ${postData.description || ''} ${postData.results || ''} ${postData.advice || ''}`;
    const moderation = moderateContent(fullText);
    postData.trustScore = moderation.trustScore;
    postData.moderationFlags = moderation.flags;
    postData.moderationStatus = moderation.moderationStatus;
    postData.isPromotional = moderation.isPromotional;
    postData.hasMedicalClaims = moderation.hasMedicalClaims;
    postData.hasContactInfo = moderation.hasContactInfo;

    // Detect repeated doctor mentions across recent posts
    const doctorNames = extractDoctorNames(fullText);
    if (doctorNames.length > 0) {
      const recentPosts = await Post.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).select('title description');

      const repeatedMentions = doctorNames.filter((name) => {
        let count = 0;
        for (const recent of recentPosts) {
          const text = `${recent.title} ${recent.description}`.toLowerCase();
          if (text.includes(name)) count += 1;
        }
        return count >= 2;
      });

      if (repeatedMentions.length > 0) {
        postData.moderationFlags.push({
          type: 'repeated-doctor-mention',
          reason: `Repeated doctor mentions detected: ${repeatedMentions.join(', ')}`,
        });
        postData.moderationStatus = 'under-review';
        postData.trustScore = Math.max(0, postData.trustScore - 20);
      }
    }

    const post = await Post.create(postData);

    // Run AI analysis
    post.aiSummary = await ai.summarize(post.description);
    post.aiInsights = await ai.extractInsights(post);
    await post.save();

    const populated = await post.populate('author', 'name avatar isAnonymous isVerified trustLevel');
    res.status(201).json({
      post: populated,
      moderation: {
        trustScore: post.trustScore,
        moderationStatus: post.moderationStatus,
        flags: post.moderationFlags,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const allowedFields = ['title', 'description', 'startTimeline', 'symptoms', 'treatments', 'results', 'mistakes', 'advice', 'tags', 'triggers', 'severityLevel', 'isAnonymous', 'isPrivate', 'timelineEntries', 'outcome', 'treatmentDuration'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => `/uploads/${f.filename}`);
      post.images = [...(post.images || []), ...newImages];
    }

    // Re-run AI analysis
    const moderation = moderateContent(`${post.title || ''} ${post.description || ''} ${post.results || ''} ${post.advice || ''}`);
    post.trustScore = moderation.trustScore;
    post.moderationFlags = moderation.flags;
    post.moderationStatus = moderation.moderationStatus;
    post.isPromotional = moderation.isPromotional;
    post.hasMedicalClaims = moderation.hasMedicalClaims;
    post.hasContactInfo = moderation.hasContactInfo;

    post.aiSummary = await ai.summarize(post.description);
    post.aiInsights = await ai.extractInsights(post);
    await post.save();

    const populated = await post.populate('author', 'name avatar isAnonymous isVerified trustLevel');
    res.json({ post: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── REACTIONS ──

// POST /api/posts/:id/react
exports.reactToPost = async (req, res) => {
  try {
    const { type } = req.body; // 'relatable', 'support', 'helpful'
    if (!['relatable', 'support', 'helpful'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.userId;
    const index = post.reactions[type].indexOf(userId);
    if (index > -1) {
      post.reactions[type].splice(index, 1); // toggle off
    } else {
      post.reactions[type].push(userId); // toggle on
      // Send notification to post author
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'reaction',
          post: post._id,
          message: `reacted with "${type}" on your post "${post.title}"`,
        });
      }
    }
    await post.save();
    res.json({ reactions: post.reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── COMMENTS ──

// POST /api/posts/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    const comment = await Comment.create({
      post: req.params.id,
      author: req.userId,
      content,
      isAnonymous: isAnonymous || false,
    });

    // Notify post author
    const post = await Post.findById(req.params.id);
    if (post && post.author.toString() !== req.userId.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.userId,
        type: 'comment',
        post: post._id,
        message: `commented on your post "${post.title}"`,
      });
    }

    const populated = await comment.populate('author', 'name avatar isAnonymous');
    res.status(201).json({ comment: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/posts/:postId/comments/:commentId
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── SAVE / BOOKMARK ──

// POST /api/posts/:id/save
exports.savePost = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const postId = req.params.id;
    const index = user.savedPosts.indexOf(postId);
    if (index > -1) {
      user.savedPosts.splice(index, 1);
    } else {
      user.savedPosts.push(postId);
    }
    await user.save();
    res.json({ savedPosts: user.savedPosts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/posts/saved
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'savedPosts',
      populate: { path: 'author', select: 'name avatar isAnonymous isVerified trustLevel' },
    });
    res.json({ posts: user.savedPosts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── AI ENDPOINTS ──

// POST /api/posts/:id/summarize
exports.summarizePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.aiSummary = await ai.summarize(post.description);
    post.aiInsights = await ai.extractInsights(post);
    await post.save();
    res.json({ summary: post.aiSummary, insights: post.aiInsights, gemini: ai.isGeminiAvailable() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/posts/similar-users
exports.getSimilarUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const matchCriteria = [];
    if (currentUser.triggers?.length) matchCriteria.push({ triggers: { $in: currentUser.triggers } });
    if (currentUser.treatments?.length) matchCriteria.push({ treatments: { $in: currentUser.treatments } });
    if (currentUser.skinCondition) matchCriteria.push({ skinCondition: currentUser.skinCondition });

    const filter = { _id: { $ne: req.userId } };
    if (matchCriteria.length) filter.$or = matchCriteria;

    const users = await User.find(filter).select('name bio skinCondition triggers treatments avatar').limit(10);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
