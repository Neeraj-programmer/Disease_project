const Post = require('../models/Post');

// GET /api/analytics/triggers – community trigger analytics
exports.getTriggerAnalytics = async (req, res) => {
  try {
    const triggerAgg = await Post.aggregate([
      { $match: { isPrivate: false } },
      { $unwind: '$triggers' },
      {
        $group: {
          _id: '$triggers',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({ triggers: triggerAgg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/symptoms
exports.getSymptomAnalytics = async (req, res) => {
  try {
    const symptomAgg = await Post.aggregate([
      { $match: { isPrivate: false } },
      { $unwind: '$symptoms' },
      {
        $group: {
          _id: '$symptoms',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({ symptoms: symptomAgg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/treatments
exports.getTreatmentAnalytics = async (req, res) => {
  try {
    const treatmentAgg = await Post.aggregate([
      { $match: { isPrivate: false } },
      { $unwind: '$treatments' },
      {
        $group: {
          _id: '$treatments',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({ treatments: treatmentAgg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/severity
exports.getSeverityAnalytics = async (req, res) => {
  try {
    const severityAgg = await Post.aggregate([
      { $match: { isPrivate: false } },
      {
        $group: {
          _id: '$severityLevel',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ severity: severityAgg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/overview
exports.getOverview = async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments({ isPrivate: false });
    const totalUsers = (await Post.distinct('author', { isPrivate: false })).length;

    // Posts over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const postsOverTime = await Post.aggregate([
      { $match: { isPrivate: false, createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const postsThisMonth = await Post.countDocuments({
      isPrivate: false,
      moderationStatus: { $in: ['published', 'approved'] },
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    });

    const outcomeDistribution = await Post.aggregate([
      { $match: { isPrivate: false, moderationStatus: { $in: ['published', 'approved'] }, outcome: { $ne: '' } } },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const treatmentOutcomeInsights = await Post.aggregate([
      { $match: { isPrivate: false, moderationStatus: { $in: ['published', 'approved'] }, outcome: { $in: ['improved', 'no-change', 'worse'] } } },
      { $unwind: '$treatments' },
      {
        $group: {
          _id: '$treatments',
          total: { $sum: 1 },
          improved: { $sum: { $cond: [{ $eq: ['$outcome', 'improved'] }, 1, 0] } },
        },
      },
      { $match: { total: { $gte: 1 } } },
      {
        $project: {
          _id: 1,
          total: 1,
          improved: 1,
          improvedRate: {
            $round: [{ $multiply: [{ $divide: ['$improved', '$total'] }, 100] }, 0],
          },
        },
      },
      { $sort: { improvedRate: -1, total: -1 } },
      { $limit: 8 },
    ]);

    const triggerCounts = await Post.aggregate([
      { $match: { isPrivate: false, moderationStatus: { $in: ['published', 'approved'] } } },
      { $unwind: '$triggers' },
      { $group: { _id: '$triggers', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const severityMap = { 'mild': 1, 'moderate': 2, 'severe': 3, 'very-severe': 4 };
    const revSeverityMap = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very Severe' };

    const severityAvgAgg = await Post.aggregate([
      { $match: { isPrivate: false, severityLevel: { $in: ['mild', 'moderate', 'severe', 'very-severe'] } } },
      {
        $group: {
          _id: null,
          avg: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$severityLevel', 'mild'] }, then: 1 },
                  { case: { $eq: ['$severityLevel', 'moderate'] }, then: 2 },
                  { case: { $eq: ['$severityLevel', 'severe'] }, then: 3 },
                  { case: { $eq: ['$severityLevel', 'very-severe'] }, then: 4 },
                ],
                default: 2,
              },
            },
          },
        },
      },
    ]);

    const avgVal = severityAvgAgg[0]?.avg || 0;
    const avgSeverityLabel = revSeverityMap[Math.round(avgVal)] || '—';

    res.json({
      totalPosts,
      totalUsers,
      postsThisMonth,
      postsOverTime,
      outcomeDistribution,
      treatmentOutcomeInsights,
      avgSeverity: avgSeverityLabel,
      topTrigger: triggerCounts[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
