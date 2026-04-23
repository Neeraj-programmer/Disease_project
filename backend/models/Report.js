const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    reason: {
      type: String,
      enum: ['fake', 'spam', 'promotion', 'misleading', 'harassment', 'contact-info', 'other'],
      required: true,
    },
    details: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNote: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent duplicate reports from same user on same post
reportSchema.index({ reporter: 1, post: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
