const fs = require('fs');
const pdf = require('pdf-parse');
const Resume = require('../models/Resume');
const path = require('path');
const { extractTextFromImage } = require('../services/ocrService');

// @desc    Upload a resume
// @route   POST /api/resumes
// @access  Private
// @desc    Upload a resume
// @route   POST /api/resumes
// @access  Private
const uploadResume = async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a PDF or Image file');
    }

    try {
        console.log('File uploaded:', req.file); // Debug log

        let extractedText = '';
        const mimeType = req.file.mimetype;

        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(req.file.path);
            console.log('Parsing PDF...');

            // 1. Safe Parsing: Suppress internal pdf.js warnings (like 'loca' table)
            const originalWarn = console.warn;
            console.warn = (...args) => {
                if (args[0] && typeof args[0] === 'string' && args[0].includes('FormatError')) {
                    return; // Suppress harmless font warnings
                }
                originalWarn.apply(console, args);
            };

            try {
                const data = await pdf(dataBuffer);
                extractedText = data.text.trim();
                console.log(`PDF parsed. Length: ${extractedText.length} chars`);
            } catch (pdfError) {
                console.error('PDF Parse Error:', pdfError);
                extractedText = "";
            } finally {
                console.warn = originalWarn; // Restore console.warn
            }

            // 2. OCR Fallback Logic
            if (extractedText.length < 50) {
                console.log("PDF text is empty or too short. Likely a scanned PDF. Triggering OCR Fallback...");
                // Note: Tesseract.js works on images. For PDFs, we'd typically convert to IMG first.
                // For now, we set a flag or handle gracefully.
                // In a full production env, usage of 'pdf2pic' would happen here.
                extractedText = await extractTextFromImage(req.file.path).catch(() => "Scanned PDF detected. Text extraction failed.");
            }

        } else if (mimeType.startsWith('image/')) {
            console.log('Processing Image with OCR...');
            try {
                extractedText = await extractTextFromImage(req.file.path);
                console.log('OCR completed successfully');
            } catch (ocrError) {
                console.error('OCR Error:', ocrError);
                extractedText = "Could not extract text from Image.";
            }
        } else {
            extractedText = "Unsupported file type for text extraction.";
        }

        const resume = await Resume.create({
            user: req.user.id,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            filePath: req.file.path,
            textParam: extractedText,
        });
        console.log('Resume saved to DB'); // Debug log

        res.status(201).json(resume);
    } catch (error) {
        console.error('Upload Controller Error:', error);
        res.status(500).json({
            message: 'Error processing file',
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
};

// @desc    Get user resumes
// @route   GET /api/resumes
// @access  Private
const getResumes = async (req, res) => {
    const resumes = await Resume.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(resumes);
};

// @desc    Get single resume
// @route   GET /api/resumes/:id
// @access  Private
const getResume = async (req, res) => {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
        res.status(404);
        throw new Error('Resume not found');
    }

    if (resume.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    res.status(200).json(resume);
};

// @desc    Delete resume
// @route   DELETE /api/resumes/:id
// @access  Private
const deleteResume = async (req, res) => {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
        res.status(404);
        throw new Error('Resume not found');
    }

    if (resume.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    // Delete file from filesystem
    try {
        if (fs.existsSync(resume.filePath)) {
            fs.unlinkSync(resume.filePath);
        }
    } catch (err) {
        console.error("File delete error", err);
    }

    await resume.deleteOne();

    res.status(200).json({ id: req.params.id });
};

module.exports = {
    uploadResume,
    getResumes,
    getResume,
    deleteResume,
};
