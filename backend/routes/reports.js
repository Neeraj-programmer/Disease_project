const router = require('express').Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  reportPost,
  getPostReports,
  getFlaggedPosts,
  reviewPostModeration,
  getUserTrustScores,
  toggleBanUser,
} = require('../controllers/reportController');

router.post('/', auth, reportPost);
router.get('/post/:postId', auth, adminAuth, getPostReports);
router.get('/flagged', auth, adminAuth, getFlaggedPosts);
router.put('/moderation/post/:postId', auth, adminAuth, reviewPostModeration);
router.get('/admin/users', auth, adminAuth, getUserTrustScores);
router.put('/admin/users/:userId/ban', auth, adminAuth, toggleBanUser);

module.exports = router;
