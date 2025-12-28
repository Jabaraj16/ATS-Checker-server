const express = require('express');
const router = express.Router();
const {
    analyzeResume,
    getHistory,
    getResult
} = require('../controllers/atsController');
const { protect } = require('../middleware/authMiddleware');

router.post('/analyze', protect, analyzeResume);
router.get('/history', protect, getHistory);
router.get('/:id', protect, getResult);

module.exports = router;
