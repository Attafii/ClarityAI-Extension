import { getConfig, validateApiKey } from './config';

/**
 * Interface for Gemini API response
 */
interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
}

/**
 * Extracts the clean enhanced prompt from Gemini's response, removing explanatory text
 * @param geminiResponse The full response from Gemini API
 * @returns The clean enhanced prompt without commentary
 */
function extractEnhancedPrompt(geminiResponse: string): string {
    // Common patterns that Gemini uses to introduce enhanced prompts
    const introPatterns = [
        /Here's the enhanced prompt:\s*/i,
        /Enhanced prompt:\s*/i,
        /Here's a better version:\s*/i,
        /Here's the improved prompt:\s*/i,
        /Improved prompt:\s*/i,
        /Here's the structured prompt:\s*/i,
        /Structured prompt:\s*/i,
        /Here's a more detailed version:\s*/i,
        /Better prompt:\s*/i,
        /Optimized prompt:\s*/i,
        /Here's the enhanced version:\s*/i,
        /^.*?Here's.*?:\s*/i,
        /^.*?enhanced.*?:\s*/i,
        /^.*?improved.*?:\s*/i
    ];
    
    let cleaned = geminiResponse.trim();
    
    // Remove common introductory phrases
    for (const pattern of introPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove leading explanatory text (everything before the actual prompt)
    // Look for patterns like "Okay, I've analyzed..." or "I understand..."
    const explanationPatterns = [
        /^(Okay,|Sure,|I've|I understand|Let me|Here's what I|I'll|I can|This prompt).*?[.!]\s*/i,
        /^.*?analyzed.*?[.!]\s*/i,
        /^.*?created.*?[.!]\s*/i,
        /^.*?enhanced.*?[.!]\s*/i,
        /^.*?improved.*?[.!]\s*/i
    ];
    
    for (const pattern of explanationPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove quotes if the entire response is wrapped in them
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    
    // Remove any remaining leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // If the cleaned version is too short or empty, return the original (fallback)
    if (cleaned.length < 10) {
        return geminiResponse.trim();
    }
    
    return cleaned;
}

/**
 * Calls external LLM (Google Gemini) to improve a prompt
 * @param prompt The prompt to improve
 * @returns The improved prompt from the LLM
 */
export async function callExternalLLM(prompt: string): Promise<string> {
    const config = getConfig();
    
    // Validate configuration
    if (!validateApiKey(config)) {
        throw new Error('Gemini API key is not configured. Please set clarity.geminiApiKey in settings.');
    }
    
    // Construct the system prompt for intelligent prompt enhancement
    const systemPrompt = `You are Clarity, an intelligent prompt enhancement system that analyzes user input and creates better, more structured prompts.

YOUR TASK: Take the user's input and enhance it by:
1. DETECTING the field/domain (web dev, AI, cloud, security, etc.)
2. ACTING as an expert in that field
3. CREATING a better, more structured and detailed prompt

ENHANCEMENT PROCESS:
- Analyze what the user is really asking for
- Identify missing context or details that would improve results
- Add relevant technical constraints and best practices
- Structure the prompt for clarity and completeness
- Keep the user's original intent but make it more specific and actionable

EXAMPLES:
Input: "make a website"
Enhanced: "Create a modern, responsive website with the following requirements: HTML5 semantic structure, CSS Grid/Flexbox for layout, mobile-first responsive design, accessibility features (ARIA labels, semantic HTML), and clean JavaScript for interactions. Include a navigation menu, hero section, content areas, and footer. Optimize for performance and SEO."

Input: "help me debug this function"
Enhanced: "Act as a senior software engineer and help me debug this function. Please: 1) Analyze the code for logical errors, syntax issues, and potential runtime problems, 2) Explain what the function is supposed to do vs what it's actually doing, 3) Provide the corrected version with clear comments explaining the fixes, 4) Suggest improvements for code quality, performance, and best practices."

Input: "explain machine learning"
Enhanced: "As an AI/ML expert, provide a comprehensive explanation of machine learning that covers: 1) Core concepts and types (supervised, unsupervised, reinforcement learning), 2) How algorithms learn from data, 3) Common algorithms and their use cases, 4) Real-world applications and examples, 5) Getting started resources for beginners. Use clear analogies and avoid overly technical jargon."

USER INPUT: "${prompt}"

ENHANCED PROMPT:`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as GeminiResponse;
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from Gemini API');
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('Invalid response structure from Gemini API');
        }

        const improvedPrompt = candidate.content.parts[0].text.trim();
        
        // Basic validation to ensure we got a reasonable response
        if (improvedPrompt.length === 0) {
            throw new Error('Empty response from Gemini API');
        }
        
        // Clean the response to extract just the enhanced prompt
        const cleanedPrompt = extractEnhancedPrompt(improvedPrompt);
        
        console.log('✅ Gemini API response received and cleaned');
        
        return cleanedPrompt;
        
    } catch (error) {
        console.error('Error calling external LLM:', error);
        
        // Re-throw with more context
        if (error instanceof Error) {
            throw new Error(`Failed to improve prompt with external LLM: ${error.message}`);
        } else {
            throw new Error('Failed to improve prompt with external LLM: Unknown error');
        }
    }
}

/**
 * Tests if the external LLM is available and working
 * @returns Promise that resolves to true if LLM is available, false otherwise
 */
export async function testExternalLLM(): Promise<boolean> {
    try {
        const testPrompt = 'test prompt for validation';
        const result = await callExternalLLM(testPrompt);
        return result.length > 0;
    } catch (error) {
        console.error('External LLM test failed:', error);
        return false;
    }
}

/**
 * Gets information about the current LLM configuration
 * @returns Configuration status and details
 */
export function getLLMStatus(): {
    isConfigured: boolean;
    provider: string;
    hasApiKey: boolean;
} {
    const config = getConfig();
    
    return {
        isConfigured: validateApiKey(config),
        provider: 'Google Gemini',
        hasApiKey: config.geminiApiKey.trim() !== ''
    };
}
