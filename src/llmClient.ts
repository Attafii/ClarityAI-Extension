import { getConfig, validateApiKey } from './config';
import { ConversationContext } from './autocorrect';

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
    let cleaned = geminiResponse.trim();
    
    // Try to find content after common intro phrases
    const introPatterns = [
        /Here's the enhanced prompt:\s*/i,
        /Enhanced prompt:\s*/i,
        /Here's a better version:\s*/i,
        /Here's the improved prompt:\s*/i,
        /Improved prompt:\s*/i,
        /Here's the structured prompt:\s*/i,
        /Structured prompt:\s*/i,
        /ENHANCED PROMPT:\s*/i
    ];
    
    // Try each pattern and use the first match
    for (const pattern of introPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index !== undefined) {
            cleaned = cleaned.substring(match.index + match[0].length).trim();
            break;
        }
    }
    
    // Remove simple leading explanations (only first sentence)
    const simpleExplanations = [
        /^(Okay|Sure|I've analyzed|I understand|Let me enhance).*?[.!]\s+/i
    ];
    
    for (const pattern of simpleExplanations) {
        cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove quotes if the entire response is wrapped in them
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    
    cleaned = cleaned.trim();
    
    // Safeguard: If cleaning removed too much, return original
    if (cleaned.length < 20) {
        console.warn('⚠️ Cleaning resulted in too short text, returning original');
        return geminiResponse.trim();
    }
    
    return cleaned;
}

/**
 * Calls external LLM (Google Gemini) to improve a prompt with conversation context
 * @param prompt The prompt to improve
 * @param context Optional conversation context for better enhancement
 * @returns The improved prompt from the LLM
 */
export async function callExternalLLM(prompt: string, context?: ConversationContext): Promise<string> {
    const config = getConfig();
    
    console.log('🔑 API Key status:', {
        hasKey: !!config.geminiApiKey,
        keyLength: config.geminiApiKey?.length,
        keyPrefix: config.geminiApiKey?.substring(0, 10) + '...'
    });
    
    // Validate configuration
    if (!validateApiKey(config)) {
        throw new Error('Gemini API key is not configured. Please set clarity.geminiApiKey in settings.');
    }
    
    // Build context information for enhanced prompting
    let contextInfo = '';
    if (context) {
        const parts = [];
        
        if (context.todos.length > 0) {
            parts.push(`PREVIOUS TODOS/TASKS:\n${context.todos.slice(0, 5).join('\n')}`);
        }
        
        if (context.projectContext.length > 0) {
            parts.push(`PROJECT CONTEXT:\n${context.projectContext.join('\n')}`);
        }
        
        if (context.lastActions.length > 0) {
            parts.push(`RECENT ACTIONS:\n${context.lastActions.slice(0, 3).join('\n')}`);
        }
        
        if (context.previousMessages.length > 0) {
            parts.push(`RECENT CONVERSATION:\n${context.previousMessages.slice(-2).join('\n')}`);
        }
        
        if (parts.length > 0) {
            contextInfo = `\n\nCONVERSATION CONTEXT:\n${parts.join('\n\n')}\n\nUSE THIS CONTEXT to make the enhanced prompt more relevant and specific to the ongoing work.`;
        }
    }
    
    // Construct the system prompt for intelligent prompt enhancement
    const systemPrompt = `You are ClarityAI, an intelligent prompt enhancement system that analyzes user input and creates better, more structured prompts with conversation awareness.

YOUR TASK: Take the user's input and enhance it by:
1. DETECTING the field/domain (web dev, AI, cloud, security, etc.)
2. ACTING as an expert in that field
3. CREATING a better, more structured and detailed prompt
4. CONSIDERING conversation context and previous todos/tasks for relevance

ENHANCEMENT PROCESS:
- Analyze what the user is really asking for
- Consider the conversation context and previous work
- Identify missing context or details that would improve results
- Add relevant technical constraints and best practices
- Structure the prompt for clarity and completeness
- Keep the user's original intent but make it more specific and actionable
- Reference previous todos/tasks when relevant

EXAMPLES:
Input: "make a website"
Enhanced: "Create a modern, responsive website with the following requirements: HTML5 semantic structure, CSS Grid/Flexbox for layout, mobile-first responsive design, accessibility features (ARIA labels, semantic HTML), and clean JavaScript for interactions. Include a navigation menu, hero section, content areas, and footer. Optimize for performance and SEO."

Input: "help me debug this function"
Enhanced: "Act as a senior software engineer and help me debug this function. Please: 1) Analyze the code for logical errors, syntax issues, and potential runtime problems, 2) Explain what the function is supposed to do vs what it's actually doing, 3) Provide the corrected version with clear comments explaining the fixes, 4) Suggest improvements for code quality, performance, and best practices."

Input: "explain machine learning"
Enhanced: "As an AI/ML expert, provide a comprehensive explanation of machine learning that covers: 1) Core concepts and types (supervised, unsupervised, reinforcement learning), 2) How algorithms learn from data, 3) Common algorithms and their use cases, 4) Real-world applications and examples, 5) Getting started resources for beginners. Use clear analogies and avoid overly technical jargon."

${contextInfo}

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
        
        console.log('📥 Raw API response:', improvedPrompt.substring(0, 200));
        
        // Clean the response to extract just the enhanced prompt
        const cleanedPrompt = extractEnhancedPrompt(improvedPrompt);
        
        console.log('🧹 Cleaned prompt:', cleanedPrompt.substring(0, 200));
        
        // If cleaning removed too much, return the raw response
        if (cleanedPrompt.length < 20 && improvedPrompt.length > 50) {
            console.warn('⚠️ Cleaning removed too much content, using raw response');
            return improvedPrompt;
        }
        
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
