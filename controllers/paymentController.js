const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay keys not configured");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// @desc    Create Razorpay Subscription (Monthly)
// @route   POST /api/payment/create-subscription
// @access  Private
const createSubscription = async (req, res) => {
    try {
        const razorpay = getRazorpayInstance();
        const planId = process.env.RAZORPAY_PLAN_ID; // Must be set in .env
        if (!planId) return res.status(500).json({ message: "Plan ID not configured" });

        const options = {
            plan_id: planId,
            customer_notify: 1,
            total_count: 120, // 10 years mostly
            notes: {
                userId: req.user._id.toString(),
            },
        };

        const subscription = await razorpay.subscriptions.create(options);
        res.json(subscription);
    } catch (error) {
        console.error("Razorpay Subscription Error:", JSON.stringify(error, null, 2));
        res.status(500).json({ message: error.error?.description || error.message || "Subscription creation failed" });
    }
};

// @desc    Create Razorpay Order (Pay-Per-Credit)
// @route   POST /api/payment/create-order
// @access  Private
const createOrder = async (req, res) => {
    try {
        const razorpay = getRazorpayInstance();
        const options = {
            amount: 5900, // ₹59 in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                type: 'credit' // Flag to identify credit purchase
            },
        };

        const order = await razorpay.orders.create(options);

        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Error:", error.message);
        res.status(500).json({ message: error.message || "Something went wrong" });
    }
};

// @desc    Handle Razorpay Webhook
// @route   POST /api/payment/webhook
// @access  Public
const handleWebhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ message: "Webhook secret missing" });

    // Razorpay sends the signature in 'x-razorpay-signature' header
    const shasum = crypto.createHmac('sha256', secret);
    // Use rawBody if available (safer), otherwise stringify body (risky if spacing differs)
    shasum.update(req.rawBody || JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest === req.headers['x-razorpay-signature']) {
        console.log('Webhook Verified');

        const event = req.body.event;
        const payload = req.body.payload;

        try {
            // SUBSCRIPTION EVENTS
            if (event === 'subscription.activated' || event === 'subscription.charged') {
                const subscription = payload.subscription.entity;
                const userId = subscription.notes?.userId;

                if (userId) {
                    const user = await User.findById(userId);
                    if (user) {
                        user.plan = 'premium';
                        user.subscriptionType = 'monthly';
                        user.isPremium = true;
                        user.subscriptionId = subscription.id;
                        user.subscriptionStatus = 'active';
                        // Credits are irrelevant if premium, but let's keep them logic clean
                        await user.save();
                        console.log(`User ${user.email} subscription active`);
                    }
                }
            }

            // ORDER EVENTS (PAY PER CREDIT)
            else if (event === 'payment.captured') {
                const payment = payload.payment.entity;
                // Check if this payment is for an order (not subscription invoice)
                // Subscriptions also trigger payment.captured but usually have method linked.
                // Best way: check notes.
                const userId = payment.notes?.userId;
                const type = payment.notes?.type;

                if (userId && type === 'credit') {
                    const user = await User.findById(userId);
                    if (user) {
                        user.aiCredits = (user.aiCredits || 0) + 1;
                        await user.save();
                        console.log(`User ${user.email} purchased 1 AI credit`);
                    }
                }
            }

            // SUBSCRIPTION CANCELLED
            if (event === 'subscription.cancelled') {
                const subscription = payload.subscription.entity;
                const userId = subscription.notes?.userId;
                if (userId) {
                    const user = await User.findById(userId);
                    if (user) {
                        user.plan = 'free';
                        user.subscriptionType = null;
                        user.isPremium = false;
                        user.subscriptionStatus = 'cancelled';
                        await user.save();
                        console.log(`User ${user.email} subscription cancelled`);
                    }
                }
            }

        } catch (err) {
            console.error("Webhook processing error:", err);
        }

        res.json({ status: 'ok' });
    } else {
        console.error("Invalid Razorpay Signature");
        res.status(400).json({ status: 'error' });
    }
};

// @desc    Cancel Subscription
// @route   POST /api/payment/cancel-subscription
// @access  Private
const cancelSubscription = async (req, res) => {
    try {
        const razorpay = getRazorpayInstance();
        const user = await User.findById(req.user.id);

        if (!user.subscriptionId) {
            return res.status(400).json({ message: "No active subscription found" });
        }

        // Cancel at end of cycle is usually better, but immediate options exist
        const response = await razorpay.subscriptions.cancel(user.subscriptionId);

        // Note: Actual user downgrade happens via webhook 'subscription.cancelled'
        // But we can update status to 'cancelled' locally to hide the button
        user.subscriptionStatus = 'cancelled_pending';
        await user.save();

        res.json({ message: "Subscription cancelled successfully", response });
    } catch (error) {
        console.error("Cancel Subscription Error:", error.message);
        res.status(500).json({ message: error.message || "Cancellation failed" });
    }
};

module.exports = {
    createOrder,
    createSubscription,
    cancelSubscription,
    handleWebhook
};
