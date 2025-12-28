const Tesseract = require('tesseract.js');

/**
 * Extracts text from an image file using Tesseract.js (OCR)
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromImage = async (filePath) => {
    try {
        console.log(`Starting OCR for: ${filePath}`);
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
            logger: m => console.log(`OCR Progress: ${m.status} (${(m.progress * 100).toFixed(0)}%)`),
        });

        console.log("OCR Completed.");
        return text;
    } catch (error) {
        console.error("OCR Error:", error);
        throw new Error("Failed to extract text from image.");
    }
};

module.exports = { extractTextFromImage };
