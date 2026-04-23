const router = require('express').Router();
const auth = require('../middleware/auth');
const { getNotifications, markAllRead, markRead, clearAll } = require('../controllers/notificationController');

router.get('/', auth, getNotifications);
router.put('/read-all', auth, markAllRead);
router.put('/:id/read', auth, markRead);
router.delete('/', auth, clearAll);

module.exports = router;
