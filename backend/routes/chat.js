const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  getChatUsers,
  checkChatSafety,
} = require('../controllers/chatController');

router.get('/conversations', auth, getConversations);
router.get('/messages/:userId', auth, getMessages);
router.get('/users', auth, getChatUsers);
router.post('/moderate', auth, checkChatSafety);

module.exports = router;
