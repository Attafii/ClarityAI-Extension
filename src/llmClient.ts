import { getConfig, validateApiKey, getApiKeyErrorMessage } from './config';
import { ConversationContext } from './autocorrect';

/**
 * Interface for ClarityAI API response (OpenAI-compatible)
 */
interface ClarityResponse {
    choices: Array<{
        message: {
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Extracts the clean enhanced prompt from LLM's response, removing explanatory text
 * @param llmResponse The full response from LLM API
 * @returns The clean enhanced prompt without commentary
 */
function extractEnhancedPrompt(llmResponse: string): string {
    let cleaned = llmResponse.trim();
    
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
        return llmResponse.trim();
    }
    
    return cleaned;
}

/**
 * Calls external API to improve a prompt with conversation context
 * @param prompt The prompt to improve
 * @param context Optional conversation context for better enhancement
 * @param modelOverride Optional model to use instead of default
 * @returns The improved prompt from the API
 */
export async function callExternalLLM(prompt: string, context?: ConversationContext, modelOverride?: string): Promise<string> {
    const config = getConfig();
    
    // Use override model if provided, otherwise use default
    const modelToUse = modelOverride || config.apiModel;
    
    console.log('🔑 API Configuration:', {
        mode: config.apiMode,
        baseUrl: config.apiBaseUrl,
        model: modelToUse,
        hasKey: !!config.apiKey
    });
    
    // Validate configuration
    if (!validateApiKey(config)) {
        throw new Error(getApiKeyErrorMessage(config));
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

    // Try primary model first
    let response: Response;
    let modelUsed = modelToUse;
    
    try {
        console.log(`🎯 Attempting with ${modelToUse}...`);
        response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [
                    {
                        role: 'system',
                        content: 'You are ClarityAI, an intelligent prompt enhancement system. Respond ONLY with the enhanced prompt, no explanations or meta-commentary. Use instruction-tuned mode for precise, structured responses.'
                    },
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ],
                temperature: 0.3,  // Low temperature for consistent, focused output
                top_p: 0.95,
                max_tokens: 8192,
                stream: false
            })
        });

        if (!response.ok) {
            // Only use fallback in ClarityAI mode and when not using an override
            if (config.apiMode === 'clarityai' && !modelOverride) {
                console.warn(`⚠️ Primary engine failed (${response.status}), falling back to secondary engine...`);
                modelUsed = 'meta/llama-3.3-70b-instruct';
                response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelUsed,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are ClarityAI, an intelligent prompt enhancement system. Respond ONLY with the enhanced prompt, no explanations or meta-commentary. Use instruction-tuned mode for precise, structured responses.'
                            },
                            {
                                role: 'user',
                                content: systemPrompt
                            }
                        ],
                        temperature: 0.3,
                        top_p: 0.95,
                        max_tokens: 4096,
                        stream: false
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API error (both models failed): ${response.status} - ${errorText}`);
                }
            } else {
                // In custom mode, just fail with the error
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
        }

        const data = await response.json() as ClarityResponse;
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from API');
        }

        const choice = data.choices[0];
        if (!choice.message || !choice.message.content) {
            throw new Error('Invalid response structure from API');
        }

        const improvedPrompt = choice.message.content.trim();
        
        // Basic validation to ensure we got a reasonable response
        if (improvedPrompt.length === 0) {
            throw new Error('Empty response from API');
        }
        
        console.log('📥 Raw API response received');
        
        // Clean the response to extract just the enhanced prompt
        const cleanedPrompt = extractEnhancedPrompt(improvedPrompt);
        
        console.log('🧹 Cleaned prompt generated');
        
        // If cleaning removed too much, return the raw response
        if (cleanedPrompt.length < 20 && improvedPrompt.length > 50) {
            console.warn('⚠️ Cleaning removed too much content, using raw response');
            return improvedPrompt;
        }
        
        console.log(`✅ API response received and cleaned (mode: ${config.apiMode})`);
        
        return cleanedPrompt;
        
    } catch (error) {
        console.error('Error calling external API (all models failed):', error);
        
        // Re-throw with more context
        if (error instanceof Error) {
            throw new Error(`Failed to improve prompt with ClarityAI: ${error.message}`);
        } else {
            throw new Error('Failed to improve prompt with ClarityAI: Unknown error');
        }
    }
}

/**
 * Tests if the external API is available and working
 * @returns Promise that resolves to true if API is available, false otherwise
 */
export async function testExternalLLM(): Promise<boolean> {
    try {
        const testPrompt = 'test prompt for validation';
        const result = await callExternalLLM(testPrompt);
        return result.length > 0;
    } catch (error) {
        console.error('External API test failed:', error);
        return false;
    }
}

/**
 * Gets information about the current configuration
 * @returns Configuration status and details
 */
export function getLLMStatus(): {
    isConfigured: boolean;
    provider: string;
    apiMode: string;
    hasApiKey: boolean;
} {
    const config = getConfig();
    
    let providerInfo = 'Unknown';
    if (config.apiMode === 'clarityai') {
        providerInfo = 'ClarityAI Engine (Optimized)';
    } else {
        providerInfo = 'Custom API Configuration';
    }
    
    return {
        isConfigured: validateApiKey(config),
        provider: providerInfo,
        apiMode: config.apiMode === 'clarityai' ? 'ClarityAI (Built-in)' : 'Custom API',
        hasApiKey: config.apiKey.trim() !== ''
    };
}
