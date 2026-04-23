const Message = require('../models/Message');
const User = require('../models/User');
const { moderateChat } = require('../services/moderationService');

// GET /api/chat/conversations – list users the current user has chatted with
exports.getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all distinct users this user has chatted with
    const sent = await Message.distinct('receiver', { sender: userId });
    const received = await Message.distinct('sender', { receiver: userId });
    const partnerIds = [...new Set([...sent.map(String), ...received.map(String)])];

    const partners = await User.find({ _id: { $in: partnerIds } }).select('name avatar bio isAnonymous');

    // Get last message and unread count for each partner
    const conversations = await Promise.all(
      partners.map(async (partner) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: userId, receiver: partner._id },
            { sender: partner._id, receiver: userId },
          ],
        }).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          sender: partner._id,
          receiver: userId,
          read: false,
        });

        return {
          partner,
          lastMessage,
          unreadCount,
        };
      })
    );

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || 0;
      const bTime = b.lastMessage?.createdAt || 0;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/chat/messages/:userId – get messages between current user and another user
exports.getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const partnerId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: partnerId },
        { sender: partnerId, receiver: userId },
      ],
    })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages as read
    await Message.updateMany(
      { sender: partnerId, receiver: userId, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/chat/users – list all users available for chat
exports.getChatUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('name avatar bio skinCondition isAnonymous')
      .limit(50);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/chat/moderate
exports.checkChatSafety = async (req, res) => {
  try {
    const { content } = req.body;
    const result = moderateChat(content || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
