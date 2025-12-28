const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, createSubscription, cancelSubscription, handleWebhook } = require('../controllers/paymentController');

router.post('/create-order', protect, createOrder);
router.post('/create-subscription', protect, createSubscription);
router.post('/cancel-subscription', protect, cancelSubscription);
// Webhook route - needs special parsing in server.js
router.post('/webhook', handleWebhook);

module.exports = router;
