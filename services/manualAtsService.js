const ROLE_KEYWORDS = require('../data/roleKeywords');

/**
 * Detects the most likely job role based on keyword density.
 * @param {string} text - The resume text.
 * @returns {string} - The detected role name.
 */
const detectRole = (text) => {
    const lowerText = text.toLowerCase();
    let bestRole = "General Software Engineer";
    let maxMatches = 0;

    for (const [role, data] of Object.entries(ROLE_KEYWORDS)) {
        const matches = data.keywords.filter(k => lowerText.includes(k.toLowerCase())).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            bestRole = role;
        }
    }
    return bestRole;
};

/**
 * Analyzes a resume using manual rule-based logic.
 * Returns the exact same structure as the AI service.
 * @param {string} resumeText - The text content of the resume.
 * @returns {Object} - structured analysis result.
 */
const analyzeResumeManual = (resumeText) => {
    const detectedRole = detectRole(resumeText);
    const roleData = ROLE_KEYWORDS[detectedRole];
    const lowerText = resumeText.toLowerCase();

    // Identify Skills
    const matchedSkills = roleData.keywords.filter(k => lowerText.includes(k.toLowerCase()));
    const missingSkills = roleData.keywords.filter(k => !lowerText.includes(k.toLowerCase()));

    // Calculate Score
    // Formula: (Matched / Total Relevant) * 100
    // We add a small buffer for "General" content length to avoid 0% for valid resumes that miss specific keywords
    let rawScore = (matchedSkills.length / roleData.keywords.length) * 100;

    // Adjust score based on text length (very short resumes get penalized)
    if (resumeText.length < 500) rawScore -= 20;
    if (resumeText.length > 5000) rawScore += 5; // Bonus for detailed content

    // Clamp score 0-100
    const finalScore = Math.min(Math.max(Math.round(rawScore), 10), 95);

    // Tips Generation
    const improvementTips = [];
    if (missingSkills.length > 0) {
        improvementTips.push(`Consider adding these missing skills: ${missingSkills.slice(0, 3).join(", ")}`);
    } else {
        improvementTips.push("Great job! You have all the core matching keywords.");
    }

    if (resumeText.length < 1000) {
        improvementTips.push("Your resume is quite short. Consider adding more details about your projects.");
    }

    return {
        detected_role: detectedRole,
        confidence_level: "Medium (Manual Fallback)",
        ats_score: finalScore,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        recommended_keywords: missingSkills.slice(0, 5),
        improvement_tips: improvementTips,
        analysis_notes: "Analysis performed by standard ATS keyword matching (AI Limit Reached or Unavailable)."
    };
};

module.exports = { analyzeResumeManual };
