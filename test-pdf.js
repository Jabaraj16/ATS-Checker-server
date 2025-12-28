const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const testParse = async () => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            console.log('Uploads dir not found');
            return;
        }

        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'));
        if (files.length === 0) {
            console.log('No pdfs found to test');
            return;
        }

        const file = files[0];
        console.log(`Testing parse on: ${file}`);

        const dataBuffer = fs.readFileSync(path.join(uploadDir, file));
        const data = await pdf(dataBuffer);

        console.log('Success! extracted text length:', data.text.length);
    } catch (error) {
        console.error('Test Failed:', error);
    }
};

testParse();
