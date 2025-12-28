const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyzes a resume using Google Gemini to detect role, score it, and suggest keywords.
 * @param {string} resumeText - The text content of the resume
 * @returns {Promise<Object>} - Structured JSON analysis
 */
const analyzeResumeWithAI = async (resumeText) => {
    try {
        // Updated to use 'gemini-2.0-flash' as verified by available models list
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        You are an expert ATS (Applicant Tracking System) Analyzer.
        Your task is to analyze the following resume text and provide a strict JSON output.
        
        RESUME TEXT:
        "${resumeText.substring(0, 20000)}"

        REQUIREMENTS:
        1. Detect the most likely "Target Job Role" based on the skills and experience (e.g., "MERN Stack Developer", "Data Analyst").
        2. Calculate an ATS Score (0-100) based on how well the resume fits that detected role.
        3. Identify matching skills present in the resume.
        4. Identify MISSING critical skills/keywords for that specific role.
        5. Provide specific improvement tips.

        OUTPUT FORMAT (STRICT JSON RESPONSE ONLY, NO MARKDOWN, NO CODE BLOCKS):
        {
            "detected_role": "string",
            "confidence_level": "High/Medium/Low",
            "ats_score": number,
            "matched_skills": ["skill1", "skill2"],
            "missing_skills": ["skill1", "skill2"],
            "recommended_keywords": ["keyword1", "keyword2"],
            "improvement_tips": ["tip1", "tip2"],
            "analysis_notes": "Brief summary"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if Gemini adds them
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);

    } catch (error) {
        console.error("Gemini AI Analysis Error:", error);

        // Fallback or Error Response
        return {
            detected_role: "Unknown (AI Error)",
            confidence_level: "Low",
            ats_score: 0,
            matched_skills: [],
            missing_skills: [],
            recommended_keywords: [],
            improvement_tips: ["Check GEMINI_API_KEY in backend", "Ensure API quota is available"],
            analysis_notes: "AI Service failed. Check server logs."
        };
    }
};

module.exports = { analyzeResumeWithAI };
