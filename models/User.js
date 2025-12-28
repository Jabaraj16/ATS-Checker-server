const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: false, // Changed for Google Auth
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allows null/undefined to be duplicated (for non-google users)
    },
    picture: String,
    isPremium: {
        type: Boolean,
        default: false,
    },
    aiUsageCount: {
        type: Number,
        default: 0,
    },
    aiUsageResetAt: {
        type: Date,
        default: Date.now,
    },
    plan: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free',
    },
    atsCreditsUsed: {
        type: Number,
        default: 0,
    },
    // New fields for Hybrid Model
    subscriptionType: {
        type: String, // 'monthly'
        default: null,
    },
    aiCredits: {
        type: Number,
        default: 0,
    },
    subscriptionId: String,
    subscriptionStatus: String,
    freeCreditUsed: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true,
});

// Middleware to hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
