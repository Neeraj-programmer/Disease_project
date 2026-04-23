const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getTriggerAnalytics,
  getSymptomAnalytics,
  getTreatmentAnalytics,
  getSeverityAnalytics,
  getOverview,
} = require('../controllers/analyticsController');

router.get('/triggers', getTriggerAnalytics);
router.get('/symptoms', getSymptomAnalytics);
router.get('/treatments', getTreatmentAnalytics);
router.get('/severity', getSeverityAnalytics);
router.get('/overview', getOverview);

module.exports = router;
