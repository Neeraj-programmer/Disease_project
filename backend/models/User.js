const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    bio: { type: String, default: '' },
    conditionDetails: { type: String, default: '' },
    skinCondition: { type: String, default: 'psoriasis' },
    diagnosedYear: { type: Number },
    triggers: [{ type: String }],
    treatments: [{ type: String }],
    avatar: { type: String, default: '' },
    isAnonymous: { type: Boolean, default: false },
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // ── Trust & Safety Fields ──
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    phone: { type: String, default: '' },
    emailVerifyToken: { type: String },
    phoneOtp: { type: String },
    phoneOtpExpires: { type: Date },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },

    // ── Reputation System ──
    reputationPoints: { type: Number, default: 10 },
    trustLevel: {
      type: String,
      enum: ['new', 'member', 'trusted', 'expert'],
      default: 'new',
    },
    warningCount: { type: Number, default: 0 },
    postsReported: { type: Number, default: 0 },
    postsHelpful: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-calculate trust level from reputation
userSchema.pre('save', function (next) {
  if (this.reputationPoints >= 100) this.trustLevel = 'expert';
  else if (this.reputationPoints >= 50) this.trustLevel = 'trusted';
  else if (this.reputationPoints >= 20) this.trustLevel = 'member';
  else this.trustLevel = 'new';
  // Verified if email is verified
  this.isVerified = this.isEmailVerified;
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerifyToken;
  delete obj.phoneOtp;
  delete obj.phoneOtpExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
