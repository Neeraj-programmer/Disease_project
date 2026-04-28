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
// Ye function database se saari posts nikal kar frontend ko bhejta hai
exports.getPosts = async (req, res) => {
  try {
    // Frontend se filter karne ke options aa sakte hain (jaise kis tag ki post chahiye)
    const { tag, symptom, treatment, severity, search, page = 1, limit = 20 } = req.query;
    
    // Default filter: Sirf public posts dikhao jo block nahi hui hain
    const filter = {
      isPrivate: false,
      moderationStatus: { $in: ['published', 'approved'] },
    };

    // Agar frontend ne koi filter bheja hai, toh usko filter object me add karo
    if (tag) {
      filter.tags = { $in: tag.split(',') }; // Tag array me hona chahiye
    }
    if (symptom) {
      filter.symptoms = { $in: symptom.split(',') };
    }
    if (treatment) {
      filter.treatments = { $in: treatment.split(',') };
    }
    if (severity) {
      filter.severityLevel = severity;
    }
    if (search) {
      // Agar user ne search me kuch likha hai, toh database me text search karo
      filter.$text = { $search: search };
    }

    // Pagination (jaise Google me page 1, page 2 hota hai)
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Post.countDocuments(filter); // Total kitni posts hain
    
    // Database se posts laana, aur uske author ki thodi si detail bhi sath me laana (.populate)
    const posts = await Post.find(filter)
      .populate('author', 'name avatar isAnonymous isVerified trustLevel')
      .sort({ createdAt: -1 }) // Sabse nayi post sabse upar (descending order)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // .lean() data ko simple object me convert karta hai taaki hum usme naye fields add kar sakein

    // Har ek post ke liye check karo ki uspar kitne comments aaye hain
    for (const post of posts) {
      post.commentCount = await Comment.countDocuments({ post: post._id });
    }

    // Aakhri me data frontend ko bhej do
    res.json({ posts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    // Agar koi error aata hai toh 500 status code ke sath bhej do
    res.status(500).json({ error: err.message });
  }
};

// GET /api/posts/:id
// Kisi ek specific post ko dekhne ke liye (Post Detail Page)
exports.getPost = async (req, res) => {
  try {
    // URL me aayi ID se post ko dhoondho aur author ki details sath me laao
    const post = await Post.findById(req.params.id).populate('author', 'name avatar bio isAnonymous conditionDetails isVerified trustLevel');
    
    // Agar aisi koi post database me nahi hai
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Us post se jude hue saare comments bhi nikal lo database se
    const comments = await Comment.find({ post: post._id })
      .populate('author', 'name avatar isAnonymous')
      .sort({ createdAt: -1 }); // Naye comments upar
      
    // Post aur comments dono bhej do
    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/posts
// Nayi post create karne ka function
exports.createPost = async (req, res) => {
  try {
    // Agar admin ne email verification zaroori rakha hai, aur user verified nahi hai
    if (!req.user?.isEmailVerified && process.env.SMTP_HOST) {
      return res.status(403).json({ error: 'Email verification is required before posting.' });
    }

    // Agar kisi admin ne is user ko ban kiya hua hai
    if (req.user?.isBanned) {
      return res.status(403).json({ error: 'Your account is restricted from posting.' });
    }

    // Jo data frontend se aaya hai, usme likhne wale ka ID add kardo
    const postData = { ...req.body, author: req.userId };
    
    // Ye fields khali nahi ho sakte
    const requiredFields = ['title', 'description', 'outcome'];
    for (const field of requiredFields) {
      if (!postData[field] || !String(postData[field]).trim()) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Agar user ne images upload ki hain, toh unka path save karo
    if (req.files && req.files.length > 0) {
      postData.images = req.files.map((file) => file.path);
    }

    // ── SPAM CHECK ──
    // Check karo ki is user ne wahi same post pehle toh nahi ki thi?
    const duplicateCheck = await checkDuplicatePost(req.userId, postData.title, postData.description, Post);
    if (duplicateCheck.isDuplicate) {
      return res.status(429).json({ error: duplicateCheck.reason });
    }

    // ── MODERATION (SAFETY) CHECK ──
    // Post ka saara text ek sath jod lo
    const fullText = `${postData.title || ''} ${postData.description || ''} ${postData.results || ''} ${postData.advice || ''}`;
    
    // Content ko check karo ki usme kuch galat/fake doctor claim ya spam toh nahi hai
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

    // Database me post save karo
    const post = await Post.create(postData);

    // ── AI ANALYSIS ──
    // AI se us post ki ek choti summary aur aasan points banwao
    post.aiSummary = await ai.summarize(post.description);
    post.aiInsights = await ai.extractInsights(post);
    await post.save(); // AI ka result bhi database me save kardo

    // Increase author reputation for sharing
    const author = await User.findById(req.userId);
    if (author) {
      author.reputationPoints = (author.reputationPoints || 0) + 10;
      await author.save();
    }

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
      const newImages = req.files.map((f) => f.path);
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

// ── REACTIONS (Liking/Reacting to a post) ──

// POST /api/posts/:id/react
// Ye function allow karta hai users ko dusre ki posts par react karne ke liye
exports.reactToPost = async (req, res) => {
  try {
    const { type } = req.body; // 'relatable', 'support', 'helpful'
    
    // Check karo ki user ne in 3 ke alawa koi aur fake reaction toh nahi bheja
    if (type !== 'relatable' && type !== 'support' && type !== 'helpful') {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Post ko database me dhoondo
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.userId;
    // Pata karo ki kya is user ne pehle se is type ka reaction diya hua hai?
    const indexOfReaction = post.reactions[type].indexOf(userId);
    
    if (indexOfReaction > -1) {
      // Agar pehle se diya hua tha, toh iska matlab user reaction hata raha hai (Toggle Off / Unlike)
      post.reactions[type].splice(indexOfReaction, 1); 
    } else {
      // Agar pehle se reaction nahi diya tha, toh list me add kardo (Toggle On / Like)
      post.reactions[type].push(userId); 
      
      // Post likhne wale ko notification bhejo ki usko reaction mila hai
      if (post.author.toString() !== userId.toString()) { // Khud ki post pe react pe notification nahi jayega
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'reaction',
          post: post._id,
          message: `reacted with "${type}" on your post "${post.title}"`,
        });

        // Increase reputation and helpful count if it's a positive reaction
        if (type === 'helpful' || type === 'support') {
          const author = await User.findById(post.author);
          if (author) {
            author.postsHelpful = (author.postsHelpful || 0) + 1;
            author.reputationPoints = (author.reputationPoints || 0) + 5;
            await author.save();
          }
        }
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
