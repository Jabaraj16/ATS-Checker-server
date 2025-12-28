const mongoose = require('mongoose');

const resumeSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    fileName: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true
    },
    textParam: {
        type: String, // Extracted text
    },
    filePath: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
