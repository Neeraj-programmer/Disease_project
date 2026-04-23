const router = require('express').Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/profile', auth, upload.single('avatar'), updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/send-phone-otp', auth, sendPhoneOtp);
router.post('/verify-phone-otp', auth, verifyPhoneOtp);

module.exports = router;
