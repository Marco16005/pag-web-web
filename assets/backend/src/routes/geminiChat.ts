import express, { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';

const router: Router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SITE_OVERVIEW_CONTEXT = `
Campus Chaos is a web-based game project.
The main features and sections of the website include:
- Homepage (index.html): Displays a welcome message, a carousel of game images, and general information about the game.
- About Us (about-us.html): Provides details about the development team, the project's mission, and contact information.
- Login/Registration (login.html, register.html): Allows users to create new accounts or sign in to existing ones.
- User Profile (profile.html): Registered users can view and manage their profile information, game statistics, and potentially update their password.
- Leaderboard: A section (likely dynamically generated or on a specific page) to display top player scores and rankings.
- The game itself is the core interactive element, where users play "Campus Chaos".
The chat widget is available on all pages to assist users.
`.trim();

interface GeminiRequestPayload {
    contents: {
        parts: {
            text: string;
        }[];
    }[];
}

interface GeminiResponsePart { 
    text: string;
}

interface SafetyRating {
    category: string;
    probability: string; 
}

interface GeminiResponseCandidate {
    content: {
        parts: GeminiResponsePart[];
        role: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: SafetyRating[]; 
}

interface PromptFeedback {
    blockReason?: string;
    safetyRatings?: SafetyRating[]; 
}

interface GeminiAPIResponse {
    candidates?: GeminiResponseCandidate[];
    promptFeedback?: PromptFeedback; 
    error?: {
        code: number;
        message: string;
        status: string;
    }
}


router.post('/chat-gemini', async (
    req: Request<{}, {}, { message: string; pageContext?: string }>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const userMessage = req.body.message;
    const pageContext = req.body.pageContext; 

    if (!GEMINI_API_KEY) {
        console.error('Gemini API key is not configured.');
        res.status(500).json({ error: 'AI service is not configured correctly. Missing API Key.' });
        return;
    }

    if (!userMessage) {
        res.status(400).json({ error: 'No message provided.' });
        return;
    }

    // Get the current date
    const today = new Date();
    const currentDateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Construct the message for the AI, including general site overview and specific page context
    const instructionToAI = `You are the Campus Chaos AI assistant.
Your primary goal is to provide a direct, concise, and factual answer to the user's question.
STRICTLY ADHERE TO THE FOLLOWING:
1.  Do NOT include any conversational fluff, introductory/closing phrases (e.g., "Sure, I can help", "Okay, here's the information", "I hope this helps").
2.  Do NOT explain your reasoning process or how you arrived at the answer.
3.  Provide ONLY the direct answer to the user's question.
4.  Wrap your final, direct answer within <answer_text_only> XML-like tags. For example: <answer_text_only>The game is available on Windows.</answer_text_only>
If you cannot answer or if the question violates policy, respond with a brief, policy-compliant statement within the <answer_text_only> tags (e.g., <answer_text_only>I cannot answer that question due to content policy.</answer_text_only>).
Failure to use these tags correctly or including any text outside these tags will be considered a deviation from instructions.
`;

   let contextForAI = `General Site Overview: "${SITE_OVERVIEW_CONTEXT}".\n`;
    contextForAI += `Current Date Context: Today is ${currentDateString}.\n`;
    if (pageContext && pageContext.trim() !== "") {
        contextForAI += `Current Page Context: The user is currently viewing a page with the following information: "${pageContext}".\n`;
    }
    
    const messageForAI = instructionToAI + contextForAI + `User question: "${userMessage}"`;

    const payload: GeminiRequestPayload = {
        contents: [
            {
                parts: [
                    {
                        text: messageForAI 
                    }
                ]
            }
        ]
    };

    try {
        const response = await axios.post<GeminiAPIResponse>(GEMINI_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
            const rawAiText = response.data.candidates[0].content.parts[0].text;
            const match = rawAiText.match(/<answer_text_only>([\s\S]*?)<\/answer_text_only>/);
            
            let processedReply = rawAiText;

            if (match && match[1] && match[1].trim() !== "") {
                processedReply = match[1].trim();
            } else {
                console.warn(`AI response did not use <answer_text_only> tags correctly or content was empty. User question: "${userMessage}". Raw AI response: "${rawAiText}"`);
            }
            res.json({ reply: processedReply });
        } else if (response.data.promptFeedback && response.data.promptFeedback.blockReason) {
            console.warn('Gemini prompt blocked:', response.data.promptFeedback.blockReason);
            const blockReason = response.data.promptFeedback.blockReason;
            const safetyRatings = response.data.promptFeedback.safetyRatings?.map((r: SafetyRating) => `${r.category} was ${r.probability}`).join(', ') || 'No specific ratings.';
            // Provide a more user-friendly message about content policy
            let userFriendlyMessage = `I cannot respond to that due to content policy (Reason: ${blockReason}).`;
            if (blockReason === "SAFETY" && safetyRatings) {
                userFriendlyMessage = `I cannot respond to that as it may violate safety guidelines. (Details: ${safetyRatings})`;
            } else if (blockReason === "OTHER") {
                 userFriendlyMessage = `I cannot respond to that due to content restrictions.`;
            }
            res.status(400).json({ reply: userFriendlyMessage });
        }
        else {
            console.error('No candidates found in Gemini response or unexpected response structure:', response.data);
            res.status(500).json({ reply: "Sorry, I couldn't get a proper response from the AI." });
        }

    } catch (error: any) {
        console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.error) {
            const errData = error.response.data.error;
            res.status(errData.code || 500).json({ reply: `AI Error: ${errData.message}` });
        } else {
            res.status(500).json({ reply: 'An error occurred while communicating with the AI service.' });
        }
    }
});

export default router;