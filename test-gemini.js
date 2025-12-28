require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // For listing models, we don't need a specific model yet.
        // Actually, the SDK doesn't have a direct 'listModels' helper exposed easily in the main class as per some versions,
        // but usually it's under the model manager or we can just try a generation.
        // Let's try the standard ones.

        console.log("Checking available models...");

        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro",
            "gemini-1.0-pro"
        ];

        for (const modelName of modelsToTry) {
            console.log(`\nTesting model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log(`✅ SUCCESS: ${modelName} is working.`);
                console.log(`Response: ${response.text()}`);
                return; // Found a working one
            } catch (error) {
                console.log(`❌ FAILED: ${modelName}`);
                console.log(`Error: ${error.message}`);
            }
        }

        console.log("\nNo standard models worked. Please check API Key and Region.");

    } catch (error) {
        console.error("Script Error:", error);
    }
}

listModels();
