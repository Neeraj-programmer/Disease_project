const Notification = require('../models/Notification');

// GET /api/notifications – get all notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .populate('sender', 'name avatar')
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: req.userId, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/read-all – mark all as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/:id/read – mark one as read
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/notifications – clear all notifications
exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.userId });
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
