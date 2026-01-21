/**
 * Privacy Guardrail - Scans for sensitive data in prompts
 */

export interface SecretDetection {
    found: boolean;
    type?: string;
    maskedPrompt: string;
    details: string[];
}

const SECRET_PATTERNS: Record<string, RegExp> = {
    'Generic API Key': /((key|api|token|secret|password|passwd|auth)[_-]?(key|api|token|secret|password|passwd|auth)?[\s]*[:=][\s]*["']?[0-9a-zA-Z]{16,}["']?)/gi,
    'AWS Access Key': /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    'AWS Secret Key': /aws[_-]?secret[_-]?key[\s]*[:=][\s]*["']?[0-9a-zA-Z/+=]{40}["']?/gi,
    'Stripe API Key': /sk_live_[0-9a-zA-Z]{24}/g,
    'GitHub Personal Access Token': /ghp_[0-9a-zA-Z]{36}/g,
    'GitHub OAuth Token': /gho_[0-9a-zA-Z]{36}/g,
    'Google API Key': /AIza[0-9A-Za-z\\-_]{35}/g,
    'Firebase API Key': /AIza[0-9A-Za-z\\-_]{35}/g,
    'JWT Token': /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
    'IPv4 Address': /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    'Email Address': /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    'Private Key (RSA/OpenSSH)': /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g
};

/**
 * Scans a prompt for secrets and returns a masked version if any are found
 */
export function scanForSecrets(prompt: string): SecretDetection {
    let maskedPrompt = prompt;
    const details: string[] = [];
    let found = false;

    for (const [type, pattern] of Object.entries(SECRET_PATTERNS)) {
        const matches = prompt.match(pattern);
        if (matches) {
            found = true;
            details.push(type);
            
            // Mask each match
            matches.forEach(match => {
                // Keep the prefix (like "api_key = ") but mask the value
                if (type === 'Generic API Key' || type === 'AWS Secret Key') {
                    const parts = match.split(/[:=]/);
                    if (parts.length > 1) {
                        const prefix = parts[0] + (match.includes(':') ? ':' : '=');
                        maskedPrompt = maskedPrompt.replace(match, `${prefix} [REDACTED ${type.toUpperCase()}]`);
                    } else {
                        maskedPrompt = maskedPrompt.replace(match, `[REDACTED ${type.toUpperCase()}]`);
                    }
                } else {
                    maskedPrompt = maskedPrompt.replace(match, `[REDACTED ${type.toUpperCase()}]`);
                }
            });
        }
    }

    return {
        found,
        type: details.length > 0 ? details[0] : undefined,
        maskedPrompt,
        details
    };
}
