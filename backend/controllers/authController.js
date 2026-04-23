const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateVerificationToken = () => crypto.randomBytes(24).toString('hex');
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Configure email transporter
const createTransporter = () => {
  // Use configured SMTP or fallback to console logging
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, bio, conditionDetails, skinCondition, triggers, treatments } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const emailVerifyToken = generateVerificationToken();

    const user = await User.create({
      name,
      email,
      password,
      bio: bio || '',
      conditionDetails: conditionDetails || '',
      skinCondition: skinCondition || 'psoriasis',
      triggers: triggers || [],
      treatments: treatments || [],
      emailVerifyToken,
      // Auto-verify if no SMTP is configured, so users don't get locked out
      isEmailVerified: !process.env.SMTP_HOST,
    });

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${emailVerifyToken}`;
    
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"SkinSupport AI" <noreply@skinsupport.ai>',
        to: user.email,
        subject: 'Verify your email – SkinSupport AI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2dd4bf;">SkinSupport AI</h2>
            <p>Hi ${user.name},</p>
            <p>Welcome to SkinSupport AI! Please click the button below to verify your email address:</p>
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
            <p style="margin-top: 20px; color: #666;">If you didn't create an account, please ignore this email.</p>
          </div>
        `,
      });
    } else {
      console.log('📧 Email Verification Link (dev mode):', verifyUrl);
    }

    const token = generateToken(user._id);
    res.status(201).json({
      user,
      token,
      verification: {
        emailRequired: !!process.env.SMTP_HOST,
        verifyUrl: transporter ? undefined : verifyUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.isEmailVerified && process.env.SMTP_HOST) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        verificationRequired: true,
      });
    }

    const token = generateToken(user._id);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['name', 'bio', 'conditionDetails', 'skinCondition', 'triggers', 'treatments', 'isAnonymous', 'diagnosedYear', 'avatar'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Handle uploaded avatar
    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"SkinSupport AI" <noreply@skinsupport.ai>',
        to: user.email,
        subject: 'Password Reset – SkinSupport AI',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2dd4bf;">SkinSupport AI</h2>
            <p>Hi ${user.name},</p>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px; color: #666;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } else {
      // Log to console for development
      console.log('📧 Password Reset Email (dev mode):');
      console.log(`   To: ${user.email}`);
      console.log(`   Reset URL: ${resetUrl}`);
      console.log(`   Token: ${resetToken}`);
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const jwtToken = generateToken(user._id);
    res.json({ message: 'Password reset successful', user, token: jwtToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ emailVerifyToken: req.params.token });
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });
    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    await user.save();
    res.json({ message: 'Email verified successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/send-phone-otp
exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.phone = phone;
    user.phoneOtp = generateOtp();
    user.phoneOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Mock OTP delivery
    console.log(`📱 OTP for ${phone}: ${user.phoneOtp}`);
    res.json({ message: 'OTP sent to phone (mock)', otp: user.phoneOtp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/verify-phone-otp
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.phoneOtp || !user.phoneOtpExpires || user.phoneOtpExpires < Date.now()) {
      return res.status(400).json({ error: 'OTP expired. Request a new OTP.' });
    }
    if (String(otp) !== String(user.phoneOtp)) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    user.isPhoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();

    res.json({ message: 'Phone verified successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
