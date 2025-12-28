const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();



app.use(cors());
// Only parse JSON if NOT webhook (Webhook route in paymentRoutes handles its own parsing via express.raw)
// OR: Since we mounted /api/payment/webhook with express.raw in the route file itself?
// Wait, if I mount /api/payment ABOVE app.use(express.json()), then paymentRoutes will be hit first.
// Inside paymentRoutes, the webhook matches `router.post('/webhook', express.raw(...) ...)`
// This seems correct. But standard routes like `create-checkout-session` inside `paymentRoutes` expect JSON.
// If I mount it before `express.json()`, then `create-checkout-session` body might be undefined unless I add `express.json()` specifically to it?
// SIMPLER APPROACH:
// Keep global `express.json()` BUT use verify function to keep raw body?
// OR: Mount webhook specifically here first.

// Webhook Route (Must be before JSON parser)
// We need to define exact path if we assume paymentRoutes has other json routes
// Actually, `paymentRoutes.js` has generic `/` routes relative to `/api/payment`.
// Let's do this: 
// 1. Mount webhook route specifically here using the raw middleware.
// 2. Mount other payment routes separately or let them pass through.

// ACTUALLY, simpler:
// Move `app.use(express.json())` to AFTER route mounting? No, most routes need it.
// Standard practice: Use `express.json({ verify: ... })` to save rawBody.
// Let's use that approach to avoid routing order headaches.

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: false }));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/resumes', require('./routes/resumeRoutes'));
app.use('/api/ats', require('./routes/atsRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes')); // Mounted here


// Basic route
app.get('/', (req, res) => {
    res.send('ATS Checker API is running');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode ? res.statusCode : 500;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
