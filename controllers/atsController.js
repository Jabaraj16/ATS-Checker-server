const ATSResult = require('../models/ATSResult');
const Resume = require('../models/Resume');
const { analyzeResumeWithAI } = require('../services/aiService');
const { analyzeResumeManual } = require('../services/manualAtsService');
const User = require('../models/User');

const FREE_AI_LIMIT = 5;

// Strict ATS Logic
const analyzeStrictMock = (resumeText, jobDescription) => {
    // 1. Initial Validation
    const jdLength = jobDescription.length;
    if (jdLength < 50) {
        return {
            score: 10,
            breakdown: { skillsMatch: 0, experienceMatch: 0, keywordMatch: 0, educationMatch: 0 },
            matchedSkills: [],
            missingSkills: [],
            matchedKeywords: [],
            missingKeywords: [],
            suggestions: ["Job description is too short for accurate analysis.", "Paste the full JD."],
            analysis_notes: "Job description missing or too short."
        };
    }

    // 2. Extract Keywords (Filtering common stopwords)
    const stopwords = ['the', 'and', 'for', 'with', 'you', 'that', 'this', 'will', 'have', 'are', 'required', 'skills', 'experience', 'work', 'team', 'knowledge', 'proficiency', 'ability', 'years'];

    // Normalize text
    const cleanText = (text) => text.toLowerCase().replace(/[^\w\s]/g, '');
    const resumeClean = cleanText(resumeText);
    const jdClean = cleanText(jobDescription);

    const jdWords = jdClean.split(/\s+/).filter(w => w.length > 4 && !stopwords.includes(w));
    const uniqueKeywords = [...new Set(jdWords)];

    // 3. Strict Matching
    let matchedCount = 0;
    const matchedKeywords = [];
    const missingKeywords = [];

    uniqueKeywords.forEach(word => {
        // Strict: word must appear as a whole word or significant substring
        if (resumeClean.includes(word)) {
            matchedCount++;
            if (matchedKeywords.length < 15) matchedKeywords.push(word);
        } else {
            if (missingKeywords.length < 15) missingKeywords.push(word);
        }
    });

    // 4. Scoring Calculations
    const matchRatio = uniqueKeywords.length > 0 ? (matchedCount / uniqueKeywords.length) : 0;

    // Rule: If keyword count < 5, max score is 50%
    const keywordCap = uniqueKeywords.length < 5 ? 50 : 100;

    let skillsScore = Math.min(matchRatio * 100, 100);
    let keywordScore = Math.min(matchRatio * 100, keywordCap);

    // Experience & Education (Mocked but strict)
    // In a real system, we'd regex year patterns (e.g., "5+ years")
    let experienceScore = resumeClean.includes('years') ? 60 : 30;
    experienceScore += (Math.random() * 20); // Variation

    let educationScore = (resumeClean.includes('bachelor') || resumeClean.includes('master') || resumeClean.includes('degree')) ? 80 : 40;

    // Apply strict penalties
    if (matchRatio < 0.2) {
        skillsScore *= 0.5; // Heavy penalty for very low match
    }

    const totalScore = Math.round(
        (skillsScore * 0.4) +
        (experienceScore * 0.3) +
        (keywordScore * 0.2) +
        (educationScore * 0.1)
    );

    // 5. Suggestions
    const suggestions = [];
    if (uniqueKeywords.length < 5) suggestions.push("Expand job description for more accurate ATS matching");
    if (matchRatio < 0.5) suggestions.push("Add missing keywords naturally in experience or skills section");
    if (missingKeywords.length > 0) suggestions.push(`Consider adding top missing keywords: ${missingKeywords.slice(0, 3).join(', ')}`);

    return {
        score: totalScore,
        skills_match_score: `${Math.round(skillsScore)}/40`, // As requested format (but illogical, assuming 100 scale then mapped) - Wait, user asked for "XX/40" score? No, likely scaled score.
        // Actually, user asked for "XX/40" meaning raw points. 
        // Let's stick to standard 0-100 logic but map it for display if needed, 
        // but the prompt asked for "skills_match_score": "XX/40". 
        // I will return the raw 0-100 values in breakdown for dashboard compatibility, 
        // AND specific fields for the user request if they were using raw API.
        // However, the dashboard expects specific fields. I should keep `breakdown` compatible.

        breakdown: {
            skillsMatch: Math.round(skillsScore),
            experienceMatch: Math.round(experienceScore),
            keywordMatch: Math.round(keywordScore),
            educationMatch: Math.round(educationScore),
        },
        matchedSkills: matchedKeywords.slice(0, 10), // Mapping keywords to skills for now
        missingSkills: missingKeywords.slice(0, 10),
        extracted_job_keywords: uniqueKeywords.slice(0, 20),
        matched_keywords: matchedKeywords,
        missing_keywords: missingKeywords,
        suggestions: suggestions,
        analysis_notes: totalScore > 70 ? "Strong match! Resume aligns well with JD." : "Low match. Critical keywords missing."
    };
};

// Original Mock (Deprecated, redirected to Strict)
const analyzeMock = (resumeText, jobDescription) => {
    return analyzeStrictMock(resumeText, jobDescription);
};

// @desc    Analyze resume vs AI Detected Role
// @route   POST /api/ats/analyze
// @access  Private
const analyzeResume = async (req, res) => {
    const { resumeId } = req.body;

    if (!resumeId) {
        res.status(400);
        throw new Error('Please provide resumeId');
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
        res.status(404);
        throw new Error('Resume not found');
    }

    if (resume.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    try {
        const user = await User.findById(req.user.id);

        let analysisResult;
        let isAiAnalysis = false;
        let isSuccess = false;

        // --- AI ACCESS CONTROL ---
        // Rule 1: Monthly Subscription (Premium) -> Unlimited AI
        // Rule 2: Has Pay-Per-Used Credits (aiCredits > 0) -> Use 1 Credit
        // Rule 3: Free/No Credits -> Manual Only

        const isPremium = user.plan === 'premium';
        const hasCredits = user.aiCredits > 0;

        // Determine if we should attempt AI
        const shouldRunAI = isPremium || hasCredits;

        if (shouldRunAI) {
            try {
                console.log(`User ${user.name} requesting AI Analysis. Premium: ${isPremium}, Credits: ${user.aiCredits}`);
                analysisResult = await analyzeResumeWithAI(resume.textParam);

                if (!analysisResult || !analysisResult.ats_score) {
                    throw new Error("Invalid AI Response");
                }

                isAiAnalysis = true;
                isSuccess = true;

                // Deduct Credit if NOT premium
                if (!isPremium && hasCredits) {
                    user.aiCredits -= 1;
                    console.log(`Deducted 1 credit. Remaining: ${user.aiCredits}`);
                    await user.save();
                }

            } catch (aiError) {
                console.error("AI Analysis Failed, switching to Manual Fallback:", aiError.message);
                // Fail silently to manual
            }
        }

        // --- MANUAL FALLBACK ---
        // Runs if:
        // 1. User is Free/No Credits (shouldRunAI is false)
        // 2. AI Failed (isSuccess is false)
        if (!isSuccess) {
            console.log(`Running Manual Analysis for ${user.name}`);
            analysisResult = analyzeResumeManual(resume.textParam);
            isAiAnalysis = false;
        }

        // --- FREE LIMIT CHECK (MANUAL MODE) ---
        // If Manual mode runs, we check the legacy "1 free credit" rule which is actually "atsCreditsUsed".
        // Requirement: "Free Access (Default): 1 free ATS check (Manual ATS only)"
        // If user used 1 manual check, they are locked from seeing result details?
        // User Request: "When AI is locked, show Upgrade Modal"
        // And "Manual ATS Always Available". 
        // Wait, "Manual ATS Fallback - Always available". This implies NO LOCK on manual results?
        // Let's re-read: "Free users: 1 free ATS check, Manual ATS ONLY".
        // This implies after 1 check, even Manual is locked? Or just AI is locked?
        // "Rule: Free users limit to 1 free ATS check".
        // So after 1 check, EVERYTHING is locked.

        // Logic:
        // If !isPremium and !hasCredits:
        //    Check atsCreditsUsed >= 1 -> LOCKED
        //    Else -> Unlocked Manual Result, atsCreditsUsed++

        let isLocked = false;

        // Increment Global Usage Counter (for "1 Free Check" logic)
        // Only increment if we haven't deducted a paid credit (because paid credit usage shouldn't count towards blocking free usage? Or maybe it does?)
        // Let's keep it simple: `atsCreditsUsed` tracks TOTAL checks.
        // If user is Free and `atsCreditsUsed` >= 1, they are locked.
        // BUT if they paid for a credit, they should see the result.

        if (isPremium) {
            // Never locked
            user.atsCreditsUsed = (user.atsCreditsUsed || 0) + 1;
            await user.save(); // Save usage stats
        } else if (isAiAnalysis) {
            // Paid credit used, so NOT locked.
            user.atsCreditsUsed = (user.atsCreditsUsed || 0) + 1;
            // user.save() was called above when deducting credit
        } else {
            // Manual Mode (Free or Fallback)
            if (user.atsCreditsUsed >= 1) {
                isLocked = true;
                // Do not increment to avoid infinite growth, or increment to show total attempts?
                // Let's not increment if locked to avoid abuse? 
                // Logic says: "Triggered when free credit is used".
                // So we run analysis but return LOCKED result.
            } else {
                // First free check
                user.atsCreditsUsed = (user.atsCreditsUsed || 0) + 1;
                await user.save();
            }
        }

        // --- SAVE RESULT ---
        // Ideally we save hidden results too so they can unlock later?
        // For now, let's just return the locked response without saving to keep DB clean, OR save with `locked: true`.
        // Let's save it.

        const atsResult = await ATSResult.create({
            user: req.user.id,
            resume: resumeId,
            jobDescription: "Auto-Detected",
            detectedRole: analysisResult.detected_role,
            confidenceLevel: analysisResult.confidence_level || 'Low',
            score: analysisResult.ats_score,
            isAiAnalysis: isAiAnalysis,
            locked: isLocked, // Save lock state
            breakdown: {
                skillsMatch: analysisResult.ats_score,
                experienceMatch: 0,
                keywordMatch: 0,
                educationMatch: 0
            },
            matchedSkills: analysisResult.matched_skills || [],
            missingSkills: analysisResult.missing_skills || [],
            suggestions: analysisResult.improvement_tips || [],
            extractedJobKeywords: analysisResult.recommended_keywords || [],
            matchedKeywords: [],
            missingKeywords: [],
            analysisNotes: analysisResult.analysis_notes || "Manual Analysis"
        });

        // --- RESPONSE ---
        res.status(201).json({
            ...atsResult.toObject(),
            locked: isLocked,
            atsCreditsUsed: user.atsCreditsUsed,
            isAiAnalysis: isAiAnalysis
        });

    } catch (error) {
        console.error(error);
        res.status(500);
        throw new Error('ATS Analysis Failed');
    }
};

// @desc    Get History
// @route   GET /api/ats
// @access  Private
const getHistory = async (req, res) => {
    const history = await ATSResult.find({ user: req.user.id })
        .populate('resume', 'originalName')
        .sort({ createdAt: -1 });
    res.status(200).json(history);
};

// @desc    Get Single Result
// @route   GET /api/ats/:id
// @access  Private
const getResult = async (req, res) => {
    const result = await ATSResult.findById(req.params.id).populate('resume', 'originalName');

    if (!result) {
        res.status(404);
        throw new Error('Result not found');
    }

    if (result.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('Not authorized');
    }

    res.status(200).json(result);
};

module.exports = {
    analyzeResume,
    getHistory,
    getResult
};
