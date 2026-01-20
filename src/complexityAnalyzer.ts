/**
 * Analyzes prompt complexity to determine which LLM to use
 */

export type ComplexityLevel = 'simple' | 'complex';

export interface ComplexityAnalysis {
    level: ComplexityLevel;
    score: number; // 0-100
    reasons: string[];
}

/**
 * Analyzes prompt complexity based on multiple factors
 * @param prompt The prompt to analyze
 * @returns Complexity analysis with level and reasons
 */
export function analyzePromptComplexity(prompt: string): ComplexityAnalysis {
    const reasons: string[] = [];
    let score = 0;
    
    // Factor 1: Length (longer prompts are more complex)
    const wordCount = prompt.split(/\s+/).length;
    if (wordCount > 50) {
        score += 15;
        reasons.push('Long prompt with detailed requirements');
    } else if (wordCount > 25) {
        score += 8;
    }
    
    // Factor 2: Technical complexity indicators
    const technicalKeywords = [
        'architecture', 'design pattern', 'refactor', 'optimize',
        'scalable', 'performance', 'security', 'authentication', 'authorization',
        'database schema', 'microservice', 'distributed', 'concurrent', 'async',
        'state management', 'dependency injection', 'solid principles', 'clean code'
    ];
    
    // Architect/Design are high-complexity indicators
    if (prompt.toLowerCase().includes('design') || prompt.toLowerCase().includes('architect')) {
        score += 20;
        reasons.push('Architectural design request');
    }

    const technicalMatches = technicalKeywords.filter(kw => 
        prompt.toLowerCase().includes(kw)
    ).length;
    
    if (technicalMatches >= 3) {
        score += 25;
        reasons.push('Multiple technical concepts requiring deep analysis');
    } else if (technicalMatches >= 1) {
        score += 12;
        reasons.push('Technical concepts present');
    }
    
    // Factor 3: Multi-step or complex requirements
    const multiStepIndicators = [
        /\d+\.\s/g,  // Numbered lists
        /first.*then.*finally/i,
        /step\s+\d+/gi,
        /requirement.*requirement/gi,
        /both.*and/gi,
        /multiple/i
    ];
    
    const multiStepMatches = multiStepIndicators.filter(pattern => 
        prompt.match(pattern)
    ).length;
    
    if (multiStepMatches >= 2) {
        score += 20;
        reasons.push('Multi-step process requiring sequential thinking');
    } else if (multiStepMatches >= 1) {
        score += 10;
    }
    
    // Factor 4: Abstract or conceptual thinking required
    const thinkingKeywords = [
        'explain', 'why', 'how does', 'difference between', 'compare',
        'analyze', 'evaluate', 'design', 'architect', 'strategy',
        'best practice', 'trade-off', 'pros and cons', 'consider'
    ];
    
    const thinkingMatches = thinkingKeywords.filter(kw => 
        prompt.toLowerCase().includes(kw)
    ).length;
    
    if (thinkingMatches >= 2) {
        score += 20;
        reasons.push('Requires analytical or conceptual thinking');
    } else if (thinkingMatches >= 1) {
        score += 10;
    }
    
    // Factor 5: Code complexity indicators
    const complexCodeIndicators = [
        'complex logic', 'edge case', 'error handling', 'validation',
        'race condition', 'memory leak', 'optimization', 'big o',
        'time complexity', 'space complexity', 'recursion', 'dynamic programming'
    ];
    
    const codeComplexityMatches = complexCodeIndicators.filter(kw => 
        prompt.toLowerCase().includes(kw)
    ).length;
    
    if (codeComplexityMatches >= 2) {
        score += 15;
        reasons.push('Complex coding challenges requiring careful analysis');
    } else if (codeComplexityMatches >= 1) {
        score += 8;
    }
    
    // Factor 6: Simple task indicators (reduce score)
    const simpleIndicators = [
        'create a button', 'add a div', 'simple function', 'hello world',
        'basic', 'simple', 'quick', 'just', 'only', 'small'
    ];
    
    const simpleMatches = simpleIndicators.filter(kw => 
        prompt.toLowerCase().includes(kw)
    ).length;
    
    if (simpleMatches >= 2) {
        score = Math.max(0, score - 20);
        reasons.push('Simple task with straightforward requirements');
    } else if (simpleMatches >= 1) {
        score = Math.max(0, score - 10);
    }
    
    // Factor 7: Question vs statement (questions often need thinking)
    if (prompt.includes('?')) {
        const questionCount = (prompt.match(/\?/g) || []).length;
        if (questionCount >= 2) {
            score += 15;
            reasons.push('Multiple questions requiring detailed explanations');
        } else {
            score += 8;
        }
    }
    
    // Determine complexity level
    // Threshold: 40+ = complex, < 40 = simple
    const level: ComplexityLevel = score >= 40 ? 'complex' : 'simple';
    
    // Add default reason if none found
    if (reasons.length === 0) {
        if (level === 'simple') {
            reasons.push('Straightforward prompt with clear requirements');
        } else {
            reasons.push('Moderate complexity requiring detailed analysis');
        }
    }
    
    return {
        level,
        score: Math.min(100, score),
        reasons: reasons.slice(0, 3) // Top 3 reasons
    };
}

/**
 * Gets a user-friendly description of complexity
 */
export function getComplexityDescription(analysis: ComplexityAnalysis): string {
    if (analysis.level === 'complex') {
        return `🧠 Complex prompt (score: ${analysis.score}/100) - Using thinking mode for best results`;
    } else {
        return `⚡ Simple prompt (score: ${analysis.score}/100) - Using fast mode for quick response`;
    }
}
