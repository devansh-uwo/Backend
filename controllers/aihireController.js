import Conversation from "../models/Conversation.js";
import { genAIInstance as genAI, modelName } from "../config/vertex.js";
import mongoose from "mongoose";

// Use the standard model configured in vertex.js
/* ------------------ Generate Job Description ------------------ */
export const generateJobDescription = async (req, res) => {
    try {
        const {
            jobTitle,
            companyName,
            location,
            jobType = "Full-time", // Full-time, Part-time, Contract
            experienceLevel = "Mid-Level",
            skills = [],
            responsibilities = "",
            salaryRange = "",
            extraNotes = ""
        } = req.body;

        if (!jobTitle) {
            return res.status(400).json({
                success: false,
                error: "Job Title is required",
            });
        }

        const prompt = `
You are AIHIRE, a Senior Talent Partner at a top-tier tech firm.

Create a **Performance-Based Job Description** that attracts top 1% talent.

### ROLE DETAILS
- **Title:** ${jobTitle}
- **Company:** ${companyName || 'Our Company'}
- **Location:** ${location || 'Remote/Hybrid'}
- **Type:** ${jobType}
- **Level:** ${experienceLevel}
- **Compensation:** ${salaryRange || 'Competitive & Market Leading'}

### INPUTS
- **Core Skills:** ${skills.join(", ")}
- **Responsibilities:** ${responsibilities}
- **Context:** ${extraNotes}

### REQUIRED OUTPUT STRUCTURE
1.  **The Hook (Company Mission & Role Impact):** Why does this role matter? What is the "Dent in the Universe" this person will make?
2.  **What You'll Do (The Mission):** Don't just list tasks. Describe the key outcomes they will own.
3.  **The First 90 Days (Success Metrics):**
    *   **Day 30:** Learn X, Ship Y.
    *   **Day 60:** Own Z project.
    *   **Day 90:** Drive W metric.
4.  **Who You Are (Competencies):** Beyond skills, what behaviors define success? (e.g., "Relentlessly Resourceful", "Systems Thinker").
5.  **Requirements (The Foundation):** Essential tech stack and experience.
6.  **Why Us? (Benefits & Culture):** Sell the dream, the team, and the perks.

**TONE:** Inspiring, Challenge-Driven, and Professional. Avoid generic corporate jargon.
`;

        const hireModel = genAI.getGenerativeModel({
            model: modelName,
        });

        const result = await hireModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Empty response from AI model");
        }

        /* -------- SAVE TO CONVERSATION -------- */
        const saved = await Conversation.create({
            userId: mongoose.Types.ObjectId.isValid(req.user?.id) ? req.user.id : (mongoose.Types.ObjectId.isValid(req.user?._id) ? req.user._id : null),
            title: `JD: ${jobTitle}`,
            agentType: 'AIHIRE', // Agent Tag
            messages: [
                { role: 'user', content: `Generate Job Description for ${jobTitle}` },
                { role: 'assistant', content: text }
            ],
            sessionId: `aihire_jd_${Date.now()}`
        });

        res.json({
            success: true,
            data: {
                document: text,
                id: saved._id,
            },
        });
    } catch (err) {
        console.error("❌ AIHIRE JD Error Details:", err);
        res.status(500).json({
            success: false,
            error: "Internal Server Error during JD generation",
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

/* ------------------ Generate Offer Letter ------------------ */
export const generateOfferLetter = async (req, res) => {
    try {
        const fs = await import('fs');
        fs.appendFileSync('aihire_debug.log', `\n[${new Date().toISOString()}] Received request: POST /offer-letter\n`);

        const {
            candidateName = "Candidate",
            jobTitle = "Valued Employee",
            companyName = "Our Company",
            startDate = "TBD",
            salary = "TBD",
            managerName = "Hiring Manager",
            deadlineDate = "TBD",
            benefits = "Standard Benefits",
            extraNotes = ""
        } = req.body;

        const finalCandidateName = candidateName || "Candidate";
        const finalJobTitle = jobTitle || "Valued Employee";

        let prompt = "";

        if (extraNotes && extraNotes.length > 50) {
            // User provided a template or specific clauses
            prompt = `
You are AIHIRE, a professional HR Executive and Head of People Operations.

MISSION: You are given CUSTOM DETAILS or a FULL TEMPLATE from the user regarding an Offer Letter.

### CANDIDATE DATA TO INSERT
- **Candidate Name:** ${finalCandidateName}
- **Role Title:** ${finalJobTitle}
- **Salary:** ${salary}
- **Start Date:** ${startDate}
- **Manager:** ${managerName}
- **Benefits:** ${benefits}

### CUSTOM DETAILS / TEMPLATE GIVEN
"""
${extraNotes}
"""

EXECUTION STEPS:
1. Identify if the "CUSTOM DETAILS" provided above looks like a complete, formal, legal offer template with placeholders (e.g. [Candidate Name], [Date], {Salary}). 
   - If YES: Fill in the placeholders using the Candidate Data provided, keeping the layout intact. Replace any missing data with "TBD".
2. If the "CUSTOM DETAILS" provided is just a snippet (like a company address, a few notes, or core values), WRITE a complete, formal, high-quality professional Offer Letter from scratch, gracefully incorporating the provided details automatically into the correct places (like adding the address to the top of the letter).
3. Do NOT add any conversational text before or after the letter. Provide ONLY the final, polished document text.
`;
        } else {
            // Default High-Quality Template
            prompt = `
You are AIHIRE, a Head of People Operations.

Create a **Formal Executive Offer Letter**.
... (Standard Prompt) ...
            `;
        }

        const hireModel = genAI.getGenerativeModel({
            model: modelName,
        });

        const result = await hireModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Empty response from AI model");
        }

        /* -------- SAVE TO CONVERSATION -------- */
        const saved = await Conversation.create({
            userId: mongoose.Types.ObjectId.isValid(req.user?.id) ? req.user.id : (mongoose.Types.ObjectId.isValid(req.user?._id) ? req.user._id : null),
            title: `Offer: ${finalCandidateName} - ${finalJobTitle}`,
            agentType: 'AIHIRE',
            messages: [
                { role: 'user', content: `Generate Offer Letter for ${finalCandidateName}` },
                { role: 'assistant', content: text }
            ],
            sessionId: `aihire_offer_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        });

        res.json({
            success: true,
            data: {
                document: text,
                id: saved._id,
            },
        });
    } catch (err) {
        const fs = await import('fs');
        const logMsg = `\n[${new Date().toISOString()}] AIHIRE ERROR: ${err.message}\nStack: ${err.stack}\n`;
        fs.appendFileSync('aihire_debug.log', logMsg);

        console.error("❌ AIHIRE Offer Letter Error Details:", err);
        res.status(500).json({
            success: false,
            error: "Internal Server Error during offer generation",
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

/* ------------------ Generate Interview Questions ------------------ */
export const generateInterviewQuestions = async (req, res) => {
    try {
        const {
            jobTitle,
            skills = [],
            experienceLevel = "Mid-Level",
            roundType = "Technical", // Technical, HR, Behavioral, System Design
            questionCount = 10,
            extraNotes = ""
        } = req.body;

        if (!jobTitle) {
            return res.status(400).json({
                success: false,
                error: "Job Title is required",
            });
        }

        const prompt = `
You are AIHIRE, a Bar-Raiser Interviewer at a MAANG-level tech company.

Design a comprehensive **Interview Guide & Assessment Rubric** for a ${roundType} round.

### CONTEXT
- **Role:** ${jobTitle}
- **Level:** ${experienceLevel}
- **Focus:** ${skills.join(", ")}
- **Context:** ${extraNotes}

### INSTRUCTIONS
Create ${questionCount} high-readiness questions. For EACH question, you must provide a "Scorecard" to help the interviewer evaluate the answer.

### REQUIRED FORMAT (Repeated for each question)
**Q[Number]: [The Question]**
*Type: [Behavioral/Technical/System Design]*

*   **The Intent:** What signal are we trying to get? (e.g., "Tests ability to handle ambiguity")
*   **The "STAR" Setup:** (Situation, Task, Action, Result) - Guide the candidate to this structure.
*   **Assessment Rubric:**
    *   🔴 **Red Flag (No Hire):** [Examples of poor answers, superficial knowledge, blame-shifting]
    *   🟡 **Mixed (Leaning No):** [Vague, theoretical only, lack of ownership]
    *   🟢 **Strong (Hire):** [Specific examples, data-driven, clear ownership, trade-off analysis]
    *   🌟 **Bar Raiser (Strong Hire):** [Innovative approach, teaches the interviewer, high strategic thinking]

**TONE:** Rigorous, Insightful, and Structured.
`;

        const hireModel = genAI.getGenerativeModel({
            model: modelName,
        });

        const result = await hireModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Empty response from AI model");
        }

        /* -------- SAVE TO CONVERSATION -------- */
        const saved = await Conversation.create({
            userId: mongoose.Types.ObjectId.isValid(req.user?.id) ? req.user.id : (mongoose.Types.ObjectId.isValid(req.user?._id) ? req.user._id : null),
            title: `Interview Questions: ${jobTitle}`,
            agentType: 'AIHIRE',
            messages: [
                { role: 'user', content: `Generate ${questionCount} Interview Questions for ${jobTitle} (${roundType})` },
                { role: 'assistant', content: text }
            ],
            sessionId: `aihire_questions_${Date.now()}`
        });

        res.json({
            success: true,
            data: {
                document: text,
                id: saved._id,
            },
        });
    } catch (err) {
        console.error("❌ AIHIRE Interview Error Details:", err);
        res.status(500).json({
            success: false,
            error: "Internal Server Error during interview generation",
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

/* ------------------ FETCH HISTORY ------------------ */
export const getHistory = async (req, res) => {
    try {
        const query = { agentType: 'AIHIRE' };
        if (req.user) {
            query.userId = req.user.id;
        }

        const history = await Conversation.find(query).sort({ createdAt: -1 });
        console.log(`📋 Fetched ${history.length} AIHIRE documents`);
        res.json(history);
    } catch (err) {
        console.error("❌ Error fetching history:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

/* ------------------ DELETE HISTORY ------------------ */
export const deleteHistory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid document ID format"
            });
        }

        const query = { _id: id };
        if (req.user) {
            query.userId = req.user.id;
        }

        const deletedDoc = await Conversation.findOneAndDelete(query);

        if (!deletedDoc) {
            return res.status(404).json({
                success: false,
                error: "Document not found or access denied"
            });
        }

        res.status(200).json({
            success: true,
            message: "Document deleted successfully",
            deletedId: id
        });

    } catch (err) {
        console.error("❌ Delete error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete document",
            details: err.message
        });
    }
};

/* ------------------ Extract Template Text (Images / PDFs) ------------------ */
export const extractTemplateText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        const uploadedFile = req.file;

        const prompt = `
You are an expert OCR and context extraction AI.
Please read the provided document/image carefully. If it is an offer letter, template, or any HR related document:
1. Extract ALL text present verbatim.
2. Preserve the structure, paragraphs, headings, and formatting as closely as possible using Markdown.
3. If it looks like a template, keep its placeholders intact.
4. ONLY return the extracted text. Do not add conversational intro/outro.
        `;

        const hireModel = genAI.getGenerativeModel({
            model: modelName,
        });

        let text = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                const result = await hireModel.generateContent({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType: uploadedFile.mimetype,
                                        data: uploadedFile.buffer.toString("base64")
                                    }
                                }
                            ]
                        }
                    ],
                });

                text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
                break; // Break loop on success
            } catch (err) {
                if ((err.status === 429 || err.message?.includes('429') || err.message?.includes('Resource exhausted') || err.status === 'RESOURCE_EXHAUSTED') && retryCount < maxRetries - 1) {
                    console.log(`[AIHIRE EXTRACT] Rate limit hit (429). Retrying... (${retryCount + 1}/${maxRetries - 1})`);
                    retryCount++;
                    const waitTime = Math.pow(2, retryCount) * 2000; // 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw err; // Re-throw if not 429 or max retries reached
            }
        }

        if (!text) {
            throw new Error("Could not extract any text from the file.");
        }

        res.json({
            success: true,
            data: {
                text: text.trim()
            }
        });
    } catch (err) {
        console.error("extractTemplateText error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to extract text from template",
            details: err.message
        });
    }
};
