const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    startTimeline: { type: String, default: '' },
    symptoms: [{ type: String }],
    treatments: [{ type: String }],
    results: { type: String, default: '' },
    mistakes: { type: String, default: '' },
    advice: { type: String, default: '' },
    tags: [{ type: String }],
    images: [{ type: String }],
    triggers: [{ type: String }],
    severityLevel: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'very-severe'],
      default: 'moderate',
    },

    // ── Structured Outcome (Required for trust) ──
    outcome: {
      type: String,
      enum: ['improved', 'no-change', 'worse', ''],
      default: '',
    },
    treatmentDuration: { type: String, default: '' },

    isAnonymous: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    reactions: {
      relatable: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      support: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    aiSummary: { type: String, default: '' },
    aiInsights: {
      detectedTriggers: [String],
      detectedTreatments: [String],
      detectedOutcomes: [String],
      detectedSymptoms: [String],
    },

    // ── Trust & Safety Fields ──
    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    moderationStatus: {
      type: String,
      enum: ['published', 'under-review', 'hidden', 'approved'],
      default: 'published',
    },
    moderationFlags: [
      {
        type: { type: String },
        reason: String,
        detectedAt: { type: Date, default: Date.now },
      },
    ],
    reportCount: { type: Number, default: 0 },
    isPromotional: { type: Boolean, default: false },
    hasMedicalClaims: { type: Boolean, default: false },
    hasContactInfo: { type: Boolean, default: false },

    // Treatment timeline entries
    timelineEntries: [
      {
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['flare-up', 'improving', 'stable', 'clear'], default: 'stable' },
        notes: { type: String, default: '' },
        severity: { type: Number, min: 1, max: 10, default: 5 },
      },
    ],
  },
  { timestamps: true }
);

// Text index for search
postSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  symptoms: 'text',
  treatments: 'text',
  advice: 'text',
});

module.exports = mongoose.model('Post', postSchema);
