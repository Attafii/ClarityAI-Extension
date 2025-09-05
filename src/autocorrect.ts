import { callExternalLLM } from './llmClient';

/**
 * Common typos and their corrections
 * This is a basic set - can be expanded based on common developer mistakes
 */
const COMMON_TYPOS: Record<string, string> = {
    // Programming-related typos
    'functoin': 'function',
    'fucntion': 'function',
    'funtion': 'function',
    'retrun': 'return',
    'lenght': 'length',
    'heigth': 'height',
    'widht': 'width',
    'calulate': 'calculate',
    'caluclate': 'calculate',
    'calcualte': 'calculate',
    'varaible': 'variable',
    'variabl': 'variable',
    'variabel': 'variable',
    'classs': 'class',
    'metod': 'method',
    'methdo': 'method',
    'aray': 'array',
    'arry': 'array',
    'objct': 'object',
    'objet': 'object',
    'stirng': 'string',
    'strnig': 'string',
    'strign': 'string',
    'bolean': 'boolean',
    'boolen': 'boolean',
    'interger': 'integer',
    'integr': 'integer',
    
    // Common English typos
    'plese': 'please',
    'pleae': 'please',
    'pleas': 'please',
    'writ': 'write',
    'wriet': 'write',
    'wirte': 'write',
    'taht': 'that',
    'tath': 'that',
    'thta': 'that',
    'tha': 'that',
    'fo': 'for',
    'fro': 'for',
    'ofr': 'for',
    'an': 'and',
    'nad': 'and',
    'adn': 'and',
    'teh': 'the',
    'hte': 'the',
    'het': 'the',
    'whit': 'with',
    'wiht': 'with',
    'wtih': 'with',
    'wich': 'which',
    'whcih': 'which',
    'hwere': 'where',
    'wher': 'where',
    'whre': 'where',
    'wehn': 'when',
    'whn': 'when',
    'waht': 'what',
    'hwat': 'what',
    'wha': 'what',
    'sript': 'script',
    'scirpt': 'script',
    'srcipt': 'script',
    'opnes': 'opens',
    'opne': 'open',
    'oepn': 'open',
    'fibonnaci': 'fibonacci',
    'fibonaci': 'fibonacci',
    'fiboncci': 'fibonacci',
    'url': 'URL'
};

/**
 * Grammar patterns and their corrections
 */
const GRAMMAR_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((match: string, ...args: any[]) => string) }> = [
    // Fix common grammar issues
    { pattern: /\ba\s+([aeiouAEIOU])/g, replacement: 'an $1' },
    { pattern: /\ban\s+([^aeiouAEIOU])/g, replacement: 'a $1' },
    { pattern: /\bi\s+/g, replacement: 'I ' },
    { pattern: /\s+i\s+/g, replacement: ' I ' },
    { pattern: /\s+i$/g, replacement: ' I' },
    
    // Fix double spaces
    { pattern: /\s{2,}/g, replacement: ' ' },
    
    // Fix common punctuation issues
    { pattern: /\s+\./g, replacement: '.' },
    { pattern: /\s+,/g, replacement: ',' },
    { pattern: /\s+\?/g, replacement: '?' },
    { pattern: /\s+!/g, replacement: '!' }
];

/**
 * Interface for structured prompt components
 */
export interface StructuredPrompt {
    role?: string;
    task: string;
    constraints?: string;
    examples?: string;
    outputFormat?: string;
    tone?: string;
    inferredMissingDetails?: string[];
}

/**
 * Improves a prompt by applying local autocorrect and optionally external LLM
 * Uses a structured approach with universal prompt formula
 * @param prompt The original user prompt
 * @param useExternalLLM Whether to use external LLM for additional improvements
 * @returns The improved prompt
 */
export async function improvePrompt(prompt: string, useExternalLLM: boolean = false): Promise<string> {
    let improvedPrompt = prompt;
    
    // Step 1: Apply basic local corrections (typos and grammar)
    improvedPrompt = applyLocalCorrections(improvedPrompt);
    
    // Step 2: If external LLM is enabled, use Gemini 2.0 Flash for intelligent enhancement
    if (useExternalLLM) {
        try {
            console.log('🤖 Sending prompt to Gemini 2.0 Flash for intelligent enhancement...');
            const geminiEnhanced = await callExternalLLM(improvedPrompt);
            if (geminiEnhanced && geminiEnhanced.trim() !== '') {
                console.log('✅ Received enhanced prompt from Gemini');
                return geminiEnhanced.trim();
            }
        } catch (error) {
            console.warn('⚠️ Gemini API failed, falling back to local corrections:', error);
            // Continue with local processing below
        }
    }
    
    // Step 3: Fallback - return with basic corrections only
    return improvedPrompt.trim();
}

/**
 * Main function that parses and classifies any user input into structured format
 * @param prompt The user's input prompt (can be vague)
 * @param useExternalLLM Whether to use Gemini API for inference
 * @returns Structured prompt object
 */
export async function parseAndClassifyPrompt(prompt: string, useExternalLLM: boolean = false): Promise<StructuredPrompt> {
    // Step 1: Apply local analysis to extract what we can
    const localAnalysis = analyzePromptComponents(prompt);
    
    // Step 2: If external LLM is enabled, use it to infer missing details
    let enrichedAnalysis = localAnalysis;
    if (useExternalLLM) {
        try {
            enrichedAnalysis = await enrichWithGemini(prompt, localAnalysis);
        } catch (error) {
            console.warn('Gemini enrichment failed, using local analysis only:', error);
        }
    }
    
    // Step 3: Apply defaults for missing critical components
    const finalStructure = applyDefaultsForMissingComponents(enrichedAnalysis);
    
    return finalStructure;
}

/**
 * Uses Gemini API to enrich the prompt analysis and infer missing details
 * @param originalPrompt The user's original prompt
 * @param localAnalysis The local analysis results
 * @returns Enhanced structured prompt
 */
async function enrichWithGemini(originalPrompt: string, localAnalysis: any): Promise<StructuredPrompt> {
    const enrichmentPrompt = `You are an expert prompt analyzer. Your job is to parse any user input (no matter how vague) and classify it into a structured format.

Parse this user input: "${originalPrompt}"

Current local analysis:
- Role: ${localAnalysis.role || 'Not detected'}
- Task: ${localAnalysis.task || 'Not detected'}
- Constraints: ${localAnalysis.constraints || 'Not detected'}
- Output Format: ${localAnalysis.outputFormat || 'Not detected'}
- Tone: ${localAnalysis.tone || 'Not detected'}

Instructions:
1. **Parse & Classify** the input into:
   - [Role / Persona] – Who should I act as (e.g., software engineer, designer, teacher)
   - [Task / Goal] – Main objective from the request
   - [Constraints / Rules] – Explicit or implied rules, technologies, limitations
   - [Examples (optional)] – Any examples, references, or analogies mentioned
   - [Output Format] – Expected output type (code, text, diagram, JSON, etc.)
   - [Tone / Style] – Style based on intent (professional, beginner-friendly, concise)

2. **Infer missing details** - If the prompt is vague (like "make a website"), suggest reasonable defaults:
   - For "website" → suggest "basic HTML/CSS website" 
   - For "app" → suggest the most common type
   - For unclear role → infer from the task context

3. **Return ONLY a JSON object** in this exact format:
{
  "role": "detected or inferred role",
  "task": "main task or goal", 
  "constraints": "rules and limitations",
  "examples": "examples if any, or null",
  "outputFormat": "expected output format",
  "tone": "style and tone",
  "inferredMissingDetails": ["list", "of", "details", "you", "inferred"]
}

Return only the JSON, no explanations.`;

    try {
        const response = await callExternalLLM(enrichmentPrompt);
        
        // Try to parse JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate the structure
            if (parsed.task) {
                return {
                    role: parsed.role || localAnalysis.role,
                    task: parsed.task,
                    constraints: parsed.constraints || localAnalysis.constraints,
                    examples: parsed.examples || localAnalysis.examples,
                    outputFormat: parsed.outputFormat || localAnalysis.outputFormat,
                    tone: parsed.tone || localAnalysis.tone,
                    inferredMissingDetails: parsed.inferredMissingDetails || []
                };
            }
        }
        
        // If JSON parsing fails, fall back to local analysis
        console.warn('Failed to parse Gemini JSON response, using local analysis');
        return localAnalysis;
        
    } catch (error) {
        console.error('Gemini enrichment error:', error);
        return localAnalysis;
    }
}

/**
 * Applies reasonable defaults for missing critical components
 * @param analysis The analyzed prompt components
 * @returns Complete structured prompt with defaults
 */
function applyDefaultsForMissingComponents(analysis: any): StructuredPrompt {
    const result: StructuredPrompt = {
        task: analysis.task || 'Help me with my request',
        role: analysis.role,
        constraints: analysis.constraints,
        examples: analysis.examples,
        outputFormat: analysis.outputFormat,
        tone: analysis.tone,
        inferredMissingDetails: analysis.inferredMissingDetails || []
    };
    
    // Apply intelligent defaults based on task content
    if (result.task && !result.role) {
        result.role = inferRoleFromTask(result.task);
        if (result.role) {
            result.inferredMissingDetails?.push(`Inferred role: ${result.role}`);
        }
    }
    
    if (result.task && !result.outputFormat) {
        result.outputFormat = inferOutputFormatFromTask(result.task);
        if (result.outputFormat) {
            result.inferredMissingDetails?.push(`Inferred output format: ${result.outputFormat}`);
        }
    }
    
    if (!result.tone) {
        result.tone = 'Professional and helpful';
        result.inferredMissingDetails?.push('Applied default tone: Professional and helpful');
    }
    
    return result;
}

/**
 * Infers role from task content when not explicitly specified
 */
function inferRoleFromTask(task: string): string | undefined {
    const taskLower = task.toLowerCase();
    
    // Website/Web development
    if (/website|web|html|css|frontend|webpage/i.test(taskLower)) {
        return 'An experienced full-stack web developer';
    }
    
    // Programming tasks
    if (/code|program|script|function|class|debug|implement/i.test(taskLower)) {
        return 'A skilled software developer';
    }
    
    // Data tasks
    if (/data|analyze|chart|graph|statistics|csv|excel/i.test(taskLower)) {
        return 'A data analyst';
    }
    
    // Design tasks
    if (/design|ui|ux|layout|color|style/i.test(taskLower)) {
        return 'A UI/UX designer';
    }
    
    // Writing tasks
    if (/write|document|explain|describe|essay|article/i.test(taskLower)) {
        return 'A technical writer';
    }
    
    return undefined;
}

/**
 * Infers output format from task content when not explicitly specified
 */
function inferOutputFormatFromTask(task: string): string | undefined {
    const taskLower = task.toLowerCase();
    
    if (/website|web|html/i.test(taskLower)) {
        return 'Complete Next.js code in separate code blocks';
    }
    
    if (/code|program|script|function/i.test(taskLower)) {
        return 'Clean, well-commented code in a markdown code block';
    }
    
    if (/step|guide|tutorial|how to/i.test(taskLower)) {
        return 'Step-by-step numbered list with explanations';
    }
    
    if (/list|options|choices/i.test(taskLower)) {
        return 'Bulleted list format';
    }
    
    if (/explain|describe|what is/i.test(taskLower)) {
        return 'Clear explanation with examples';
    }
    
    return undefined;
}

/**
 * Formats a structured prompt object back into readable text
 * @param structured The structured prompt components
 * @returns Formatted text representation
 */
function formatStructuredPrompt(structured: StructuredPrompt): string {
    let formatted = '';
    
    if (structured.role) {
        formatted += `[Role / Persona] ${structured.role}\n\n`;
    }
    
    formatted += `[Task / Goal] ${structured.task}\n\n`;
    
    if (structured.constraints) {
        formatted += `[Constraints / Rules] ${structured.constraints}\n\n`;
    }
    
    if (structured.examples) {
        formatted += `[Examples] ${structured.examples}\n\n`;
    } else {
        formatted += `[Examples (optional)] N/A\n\n`;
    }
    
    if (structured.outputFormat) {
        formatted += `[Output Format] ${structured.outputFormat}\n\n`;
    }
    
    if (structured.tone) {
        formatted += `[Tone / Style] ${structured.tone}`;
    }
    
    // Add inferred details as a note if any exist
    if (structured.inferredMissingDetails && structured.inferredMissingDetails.length > 0) {
        formatted += `\n\n---\n*Note: ${structured.inferredMissingDetails.join(', ')}*`;
    }
    
    return formatted.trim();
}

/**
 * Applies structured improvement using the universal prompt formula:
 * [Role/Persona] [Task/Goal] [Constraints/Rules] [Examples] [Output Format] [Tone/Style]
 * @param text The text to improve structurally
 * @returns Structured prompt
 */
function applyStructuredImprovement(text: string): string {
    const originalText = text.trim();
    
    // If the text is already well-structured or very short, return as-is
    if (originalText.length < 10 || isAlreadyStructured(originalText)) {
        return originalText;
    }
    
    // Analyze the prompt and extract components
    const components = analyzePromptComponents(originalText);
    
    // If we can't identify clear components, return the original with basic improvements
    if (!components.task) {
        return originalText;
    }
    
    // Build structured prompt
    let structuredPrompt = '';
    
    if (components.role) {
        structuredPrompt += `[Role / Persona] ${components.role}\n\n`;
    }
    
    if (components.task) {
        structuredPrompt += `[Task / Goal] ${components.task}\n\n`;
    }
    
    if (components.constraints) {
        structuredPrompt += `[Constraints / Rules]\n`;
        // Split constraints by periods and format as bullet points
        const constraintLines = components.constraints.split('.').filter(line => line.trim());
        if (constraintLines.length > 1) {
            constraintLines.forEach(line => {
                if (line.trim()) {
                    structuredPrompt += `- ${line.trim()}.\n`;
                }
            });
        } else {
            structuredPrompt += `- ${components.constraints}\n`;
        }
        structuredPrompt += '\n';
    }
    
    if (components.examples) {
        structuredPrompt += `[Examples (optional)] ${components.examples}\n\n`;
    } else {
        structuredPrompt += `[Examples (optional)] N/A\n\n`;
    }
    
    if (components.outputFormat) {
        structuredPrompt += `[Output Format] ${components.outputFormat}\n\n`;
    }
    
    if (components.tone) {
        structuredPrompt += `[Tone / Style] ${components.tone}`;
    }
    
    // If structured version is too long or doesn't add value, return original
    if (structuredPrompt.length > originalText.length * 2.5) {
        return originalText;
    }
    
    return structuredPrompt.trim() || originalText;
}

/**
 * Checks if the prompt is already well-structured
 */
function isAlreadyStructured(text: string): boolean {
    const structurePatterns = [
        /\[Role[^\]]*\]/i,
        /\[Task[^\]]*\]/i,
        /\[Goal[^\]]*\]/i,
        /\[Persona[^\]]*\]/i
    ];
    
    return structurePatterns.some(pattern => pattern.test(text));
}

/**
 * Analyzes prompt to identify components for structuring
 */
function analyzePromptComponents(text: string): {
    role?: string;
    task?: string;
    constraints?: string;
    examples?: string;
    outputFormat?: string;
    tone?: string;
} {
    const components: any = {};
    const lowercaseText = text.toLowerCase();
    
    // Detect task/goal keywords
    const taskKeywords = [
        'write', 'create', 'build', 'develop', 'make', 'generate', 'design',
        'implement', 'code', 'debug', 'fix', 'help', 'explain', 'show',
        'find', 'search', 'calculate', 'compute', 'analyze', 'review'
    ];
    
    const hasTaskKeyword = taskKeywords.some(keyword => 
        lowercaseText.includes(keyword)
    );
    
    if (hasTaskKeyword) {
        // Extract the main task
        components.task = extractMainTask(text);
        
        // Detect role/persona hints
        components.role = detectRole(lowercaseText);
        
        // Detect output format requirements
        components.outputFormat = detectOutputFormat(lowercaseText);
        
        // Detect constraints
        components.constraints = detectConstraints(lowercaseText);
        
        // Detect tone/style
        components.tone = detectTone(lowercaseText);
    }
    
    return components;
}

/**
 * Extracts the main task from the prompt
 */
function extractMainTask(text: string): string {
    const cleaned = text.trim();
    if (cleaned.length === 0) return '';
    
    // Handle specific website creation requests
    if (/create.*website/i.test(cleaned)) {
        return 'Create a modern, responsive website for me';
    }
    
    // Capitalize first letter and ensure proper sentence structure
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + 
           (cleaned.endsWith('.') ? '' : '.');
}

/**
 * Detects role/persona from context clues
 */
function detectRole(lowercaseText: string): string | undefined {
    const rolePatterns = [
        // Frontend & Web Development
        { pattern: /(website|web|html|css|frontend|webpage)/i, role: 'You are an experienced full-stack web developer' },
        { pattern: /(function|javascript|typescript|js|ts)/i, role: 'A skilled JavaScript/TypeScript developer' },
        { pattern: /(react|vue|angular|next\.js|nextjs)/i, role: 'A frontend React developer' },
        { pattern: /(css|style|design|tailwindcss)/i, role: 'A UI/UX designer and CSS expert' },
        
        // Backend & Infrastructure
        { pattern: /(node|express|koa|fastify)/i, role: 'A backend Node.js developer' },
        { pattern: /(java|spring|jvm|kotlin)/i, role: 'An experienced Java backend engineer' },
        { pattern: /(c#|dotnet|asp\.net|\.net)/i, role: 'A C#/.NET developer' },
        { pattern: /(php|laravel|symfony)/i, role: 'A PHP backend developer' },
        { pattern: /(ruby|rails)/i, role: 'A Ruby on Rails developer' },
        { pattern: /(go|golang)/i, role: 'A Go backend developer' },
        { pattern: /(docker|kubernetes|k8s|container)/i, role: 'A DevOps and containerization expert' },
        { pattern: /(aws|azure|gcp|cloud)/i, role: 'A cloud computing engineer' },
        
        // Data & AI
        { pattern: /(machine learning|ml|ai|neural|tensorflow|pytorch)/i, role: 'A machine learning engineer' },
        { pattern: /(data science|pandas|numpy|matplotlib|scikit|analysis)/i, role: 'A data scientist' },
        { pattern: /(nlp|language model|text processing)/i, role: 'An NLP engineer' },
        { pattern: /(vision|image|opencv)/i, role: 'A computer vision engineer' },
        { pattern: /(statistics|probability|regression|analytics)/i, role: 'A statistics and data analytics expert' },
        
        // Systems & Embedded
        { pattern: /(c\+\+|cpp|c program|arduino|stm32|embedded)/i, role: 'An embedded systems developer' },
        { pattern: /(rust|systems programming|memory safety)/i, role: 'A Rust systems programmer' },
        { pattern: /(os|kernel|driver|low-level)/i, role: 'An operating systems engineer' },
        
        // Mobile Development
        { pattern: /(android|kotlin|java android|apk)/i, role: 'An Android app developer' },
        { pattern: /(ios|swift|objective-c)/i, role: 'An iOS app developer' },
        { pattern: /(flutter|dart)/i, role: 'A Flutter mobile developer' },
        { pattern: /(react native)/i, role: 'A React Native mobile developer' },
        
        // Security
        { pattern: /(cybersecurity|pentest|xss|sql injection|exploit)/i, role: 'A cybersecurity specialist' },
        { pattern: /(auth|authentication|oauth|jwt|encryption|hash)/i, role: 'A security engineer' },
        
        // Database & Data
        { pattern: /(sql|database|query)/i, role: 'A database expert' },
        { pattern: /(python|py)/i, role: 'An experienced Python developer' },
        
        // Other Specialized Roles
        { pattern: /(devops|ci\/cd|pipeline|automation)/i, role: 'A DevOps engineer' },
        { pattern: /(shell|bash|linux|unix|command line)/i, role: 'A Linux and shell scripting expert' },
        { pattern: /(regex|pattern matching)/i, role: 'A regular expressions expert' },
        { pattern: /(excel|spreadsheet|vba)/i, role: 'An Excel/VBA automation specialist' },
        { pattern: /(game|unity|unreal|godot)/i, role: 'A game developer' },
        
        // General Development
        { pattern: /(debug|error|fix|problem)/i, role: 'A debugging specialist' },
        { pattern: /(api|rest|endpoint)/i, role: 'A backend API developer' },
        { pattern: /(test|testing|unit test)/i, role: 'A software testing expert' }
    ];
    
    for (const { pattern, role } of rolePatterns) {
        if (pattern.test(lowercaseText)) {
            return role;
        }
    }
    
    return undefined;
}

/**
 * Detects output format requirements
 */
function detectOutputFormat(lowercaseText: string): string | undefined {
    const formatPatterns = [
        // Web Development
        { pattern: /(website|web|html)/i, format: 'Provide the complete code in Markdown code blocks, with separate blocks for HTML, CSS, and JavaScript' },
        
        // Backend & API
        { pattern: /(api|rest|endpoint)/i, format: 'Provide code examples with proper API structure and documentation' },
        { pattern: /(node|express)/i, format: 'Provide Node.js code in markdown code blocks with proper module structure' },
        { pattern: /(java|spring)/i, format: 'Provide Java code with proper class structure and annotations' },
        { pattern: /(python|django|flask)/i, format: 'Provide Python code following PEP 8 formatting in code blocks' },
        
        // Mobile Development
        { pattern: /(android|kotlin)/i, format: 'Provide Android code with proper activity/fragment structure' },
        { pattern: /(ios|swift)/i, format: 'Provide Swift code with proper view controller structure' },
        { pattern: /(flutter|dart)/i, format: 'Provide Flutter code with proper widget structure' },
        
        // Data & AI
        { pattern: /(machine learning|ml|data science)/i, format: 'Provide code with data analysis steps and visualizations' },
        { pattern: /(sql|database)/i, format: 'Provide SQL queries with proper formatting and comments' },
        
        // DevOps & Infrastructure
        { pattern: /(docker|kubernetes)/i, format: 'Provide configuration files with proper YAML/Dockerfile structure' },
        { pattern: /(shell|bash)/i, format: 'Provide shell scripts with proper shebang and comments' },
        
        // Output & Formatting Constraints
        { pattern: /(json)/i, format: 'Return the response in JSON format' },
        { pattern: /(xml)/i, format: 'Return the response in XML format' },
        { pattern: /(csv)/i, format: 'Return the response in CSV format' },
        { pattern: /(yaml|yml)/i, format: 'Return the response in YAML format' },
        { pattern: /(markdown|md)/i, format: 'Respond in Markdown format with proper headers and formatting' },
        { pattern: /(code block|snippet)/i, format: 'Return the solution in a fenced code block' },
        
        // General Formats
        { pattern: /code block|codeblock|```/i, format: 'Provide the solution in a markdown code block' },
        { pattern: /(step by step|steps)/i, format: 'Provide a step-by-step explanation' },
        { pattern: /(example|examples)/i, format: 'Include practical examples' },
        { pattern: /(list|bullet)/i, format: 'Present as a numbered or bulleted list' }
    ];
    
    for (const { pattern, format } of formatPatterns) {
        if (pattern.test(lowercaseText)) {
            return format;
        }
    }
    
    return undefined;
}

/**
 * Detects constraints from the prompt
 */
function detectConstraints(lowercaseText: string): string | undefined {
    const constraintPatterns = [
        // Web Development
        { pattern: /(website|web|html)/i, constraint: 'Use HTML, CSS, and JavaScript only (no external frameworks unless specified). Ensure the site is mobile-friendly. Keep the design clean and professional' },
        
        // Backend Technologies
        { pattern: /(node|express)/i, constraint: 'Use Node.js and Express.js best practices. Include proper error handling and async/await patterns' },
        { pattern: /(java|spring)/i, constraint: 'Follow Java best practices and Spring Boot conventions. Use proper dependency injection' },
        { pattern: /(c#|dotnet)/i, constraint: 'Follow C#/.NET coding standards and use appropriate design patterns' },
        { pattern: /(python|django|flask)/i, constraint: 'Use Pythonic code following PEP 8 standards. Include proper error handling' },
        { pattern: /(php|laravel)/i, constraint: 'Follow PHP PSR standards and Laravel best practices' },
        { pattern: /(ruby|rails)/i, constraint: 'Follow Ruby conventions and Rails best practices' },
        { pattern: /(go|golang)/i, constraint: 'Use Go best practices with proper error handling and concurrent patterns' },
        
        // Mobile Development
        { pattern: /(android|kotlin)/i, constraint: 'Follow Android development best practices and Material Design guidelines' },
        { pattern: /(ios|swift)/i, constraint: 'Follow iOS Human Interface Guidelines and Swift best practices' },
        { pattern: /(flutter|dart)/i, constraint: 'Use Flutter best practices and follow Dart style guidelines' },
        { pattern: /(react native)/i, constraint: 'Follow React Native best practices and cross-platform compatibility' },
        
        // DevOps & Infrastructure
        { pattern: /(docker|kubernetes)/i, constraint: 'Follow containerization best practices and security guidelines' },
        { pattern: /(aws|azure|gcp|cloud)/i, constraint: 'Follow cloud best practices for scalability, security, and cost optimization' },
        { pattern: /(devops|ci\/cd)/i, constraint: 'Implement proper CI/CD practices with automated testing and deployment' },
        
        // Data & AI
        { pattern: /(machine learning|ml|ai)/i, constraint: 'Use appropriate ML frameworks and follow data science best practices' },
        { pattern: /(data science|pandas|numpy)/i, constraint: 'Use proper data analysis techniques and statistical methods' },
        
        // Security
        { pattern: /(security|auth|encryption)/i, constraint: 'Follow security best practices and implement proper authentication/authorization' },
        { pattern: /(cybersecurity|pentest)/i, constraint: 'Follow ethical hacking guidelines and security testing protocols' },
        
        // Code & Dependency Constraints
        { pattern: /(vanilla|plain|native)/i, constraint: 'Use only vanilla language features, no frameworks or libraries' },
        { pattern: /(standard library|stdlib)/i, constraint: 'Use only the standard library, no third-party dependencies' },
        { pattern: /(one file|single file)/i, constraint: 'Put everything into a single file' },
        { pattern: /(no comments|without comments)/i, constraint: 'Do not include comments in the code' },
        { pattern: /(with comments|explain code)/i, constraint: 'Add inline comments explaining each step' },
        
        // Complexity & Readability
        { pattern: /(beginner|basic|simple)/i, constraint: 'Keep it simple and beginner-friendly' },
        { pattern: /(advanced|complex|optimized)/i, constraint: 'Provide an advanced, optimized implementation' },
        { pattern: /(readable|clean|maintainable)/i, constraint: 'Ensure the code is clean, readable, and maintainable' },
        
        // Performance & Resources
        { pattern: /(efficient|performance|fast|optimize)/i, constraint: 'Focus on performance and efficiency' },
        { pattern: /(memory|lightweight|low resources)/i, constraint: 'Minimize memory and resource usage' },
        { pattern: /(scalable|large scale|big data)/i, constraint: 'Design for scalability and handling large datasets' },
        
        // Testing & Validation
        { pattern: /(unit test|test case|testing)/i, constraint: 'Include unit tests for the solution' },
        { pattern: /(validate|check input|error handling)/i, constraint: 'Add error handling and input validation' },
        
        // Security & Privacy
        { pattern: /(secure|encryption|hash|jwt|auth|authentication)/i, constraint: 'Ensure the solution is secure with proper encryption/authentication' },
        { pattern: /(sanitize|xss|sql injection)/i, constraint: 'Prevent injection attacks and sanitize inputs' },
        
        // Environment & Platform
        { pattern: /(browser|frontend|client side)/i, constraint: 'Run in the browser, client-side only' },
        { pattern: /(server|backend|cli|command line)/i, constraint: 'Target server-side / command line usage' },
        { pattern: /(cross platform|portable)/i, constraint: 'Ensure it works across platforms (Windows, macOS, Linux)' },
        
        // Licensing / Practical
        { pattern: /(open source|free)/i, constraint: 'Use only open-source or free tools' },
        { pattern: /(commercial|enterprise)/i, constraint: 'Make it suitable for production/enterprise use' },
        
        // General Constraints (keep at end for fallback)
        { pattern: /no (library|libraries|external|dependencies)/i, constraint: 'Use only built-in features, no external libraries' },
        { pattern: /(modern|latest|es6|es2020)/i, constraint: 'Use modern JavaScript/TypeScript features' }
    ];
    
    for (const { pattern, constraint } of constraintPatterns) {
        if (pattern.test(lowercaseText)) {
            return constraint;
        }
    }
    
    return undefined;
}

/**
 * Detects tone/style preferences
 */
function detectTone(lowercaseText: string): string | undefined {
    const tonePatterns = [
        // Level of Detail
        { pattern: /(step by step|tutorial|guide)/i, tone: 'Explain step by step, like a tutorial' },
        { pattern: /(summary|overview|outline)/i, tone: 'Give a high-level summary, not deep details' },
        
        // Audience Level
        { pattern: /(beginner|easy|simple)/i, tone: 'Beginner-friendly, with plain language' },
        { pattern: /(advanced|expert|deep dive)/i, tone: 'Advanced, technical, and in-depth' },
        
        // Style of Communication
        { pattern: /(casual|friendly|fun)/i, tone: 'Use a casual, approachable style' },
        { pattern: /(formal|academic|research)/i, tone: 'Formal and academic tone' },
        { pattern: /(story|analogy|example)/i, tone: 'Explain with analogies or examples' },
        
        // Action/Delivery Style
        { pattern: /(instruction|steps|how to)/i, tone: 'Give clear instructions in list form' },
        { pattern: /(code only|just code|no explanation)/i, tone: 'Provide only the code, no explanations' },
        { pattern: /(commented|explain code)/i, tone: 'Add comments and inline explanations inside the code' },
        
        // Use Case–Specific
        { pattern: /(production|enterprise|scalable)/i, tone: 'Professional, robust, production-ready style' },
        { pattern: /(prototype|demo|quick test)/i, tone: 'Fast, lightweight, prototype style' },
        
        // Original patterns (keep for backward compatibility)
        { pattern: /(detailed|detail|thorough)/i, tone: 'Provide detailed explanations' },
        { pattern: /(quick|brief|short)/i, tone: 'Keep it concise and to the point' },
        { pattern: /(explain|explanation|understand)/i, tone: 'Include clear explanations' },
        { pattern: /(professional)/i, tone: 'Professional, production-ready approach' },
        { pattern: /(website|web|for me)/i, tone: 'Clear, concise, and beginner-friendly' }
    ];
    
    for (const { pattern, tone } of tonePatterns) {
        if (pattern.test(lowercaseText)) {
            return tone;
        }
    }
    
    return undefined;
}

/**
 * Applies local corrections including typo fixes and basic grammar improvements
 * @param text The text to correct
 * @returns The corrected text
 */
function applyLocalCorrections(text: string): string {
    let corrected = text;
    
    // Step 1: Fix common typos (case-insensitive)
    corrected = fixTypos(corrected);
    
    // Step 2: Apply grammar patterns
    corrected = applyGrammarPatterns(corrected);
    
    // Step 3: Clean up whitespace
    corrected = cleanupWhitespace(corrected);
    
    return corrected;
}

/**
 * Fixes common typos in the text
 * @param text The text to fix
 * @returns Text with typos corrected
 */
function fixTypos(text: string): string {
    let corrected = text;
    
    // Apply typo corrections word by word, preserving case
    for (const [typo, correction] of Object.entries(COMMON_TYPOS)) {
        // Create regex for case-insensitive word boundary matching
        const regex = new RegExp(`\\b${escapeRegex(typo)}\\b`, 'gi');
        
        corrected = corrected.replace(regex, (match) => {
            // Preserve original case pattern
            if (match === match.toUpperCase()) {
                return correction.toUpperCase();
            } else if (match[0] === match[0].toUpperCase()) {
                return correction.charAt(0).toUpperCase() + correction.slice(1).toLowerCase();
            } else {
                return correction.toLowerCase();
            }
        });
    }
    
    return corrected;
}

/**
 * Applies grammar correction patterns
 * @param text The text to correct
 * @returns Text with grammar corrections applied
 */
function applyGrammarPatterns(text: string): string {
    let corrected = text;
    
    for (const { pattern, replacement } of GRAMMAR_PATTERNS) {
        if (typeof replacement === 'string') {
            corrected = corrected.replace(pattern, replacement);
        } else {
            corrected = corrected.replace(pattern, replacement);
        }
    }
    
    // Apply sentence capitalization separately
    corrected = corrected.replace(/(^|\. )([a-z])/g, (_match, prefix, letter) => prefix + letter.toUpperCase());
    
    return corrected;
}

/**
 * Cleans up whitespace and formatting issues
 * @param text The text to clean
 * @returns Cleaned text
 */
function cleanupWhitespace(text: string): string {
    return text
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\s*\n\s*/g, '\n') // Clean up line breaks
        .replace(/^\s+|\s+$/gm, ''); // Trim each line
}

/**
 * Escapes special regex characters in a string
 * @param string The string to escape
 * @returns Escaped string safe for regex
 */
function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Analyzes the improvements made to a prompt
 * @param original The original prompt
 * @param improved The improved prompt
 * @returns Analysis of changes made
 */
export function analyzeImprovements(original: string, improved: string): {
    hasChanges: boolean;
    typosFixed: number;
    grammarImprovements: number;
    originalLength: number;
    improvedLength: number;
} {
    const hasChanges = original !== improved;
    
    // Simple heuristic to count improvements
    const originalWords = original.toLowerCase().split(/\s+/);
    const improvedWords = improved.toLowerCase().split(/\s+/);
    
    let typosFixed = 0;
    let grammarImprovements = 0;
    
    // Count typos that were fixed
    for (const [typo] of Object.entries(COMMON_TYPOS)) {
        const originalCount = (original.toLowerCase().match(new RegExp(`\\b${escapeRegex(typo)}\\b`, 'g')) || []).length;
        const improvedCount = (improved.toLowerCase().match(new RegExp(`\\b${escapeRegex(typo)}\\b`, 'g')) || []).length;
        typosFixed += originalCount - improvedCount;
    }
    
    // Estimate grammar improvements (simplified)
    grammarImprovements = Math.abs(originalWords.length - improvedWords.length);
    
    return {
        hasChanges,
        typosFixed,
        grammarImprovements,
        originalLength: original.length,
        improvedLength: improved.length
    };
}