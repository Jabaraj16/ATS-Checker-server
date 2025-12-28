const mongoose = require('mongoose');

const atsResultSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Resume',
    },
    jobDescription: {
        type: String,
        required: false, // Changed for AI Auto-Detection
    },
    detectedRole: String,
    confidenceLevel: String,
    score: {
        type: Number,
        required: true,
    },
    breakdown: {
        skillsMatch: Number,
        experienceMatch: Number,
        keywordMatch: Number,
        educationMatch: Number,
    },
    matchedSkills: [String],
    missingSkills: [String],
    suggestions: [String],
    extractedJobKeywords: [String],
    matchedKeywords: [String],
    missingKeywords: [String],
    analysisNotes: String,
}, {
    timestamps: true,
});

const ATSResult = mongoose.model('ATSResult', atsResultSchema);

module.exports = ATSResult;
