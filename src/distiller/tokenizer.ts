export interface TokenEstimate {
  tokens: number;
  chars: number;
  words: number;
}

export interface Snippet {
  id: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  relevanceScore: number;
  importance: 'high' | 'medium' | 'low';
}

export interface DistillationResult {
  originalText: string;
  compressedText: string;
  tokensSaved: number;
  compressionRatio: number;
  includedSnippets: Snippet[];
  excludedReason?: string;
}

export interface DistillationOptions {
  maxTokens: number;
  minRelevanceScore?: number;
  prioritizeImports?: boolean;
  includeComments?: boolean;
}

const CHARS_PER_TOKEN = 4;
const WORDS_PER_TOKEN = 0.75;

export function estimateTokens(text: string): TokenEstimate {
  const chars = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const tokens = Math.ceil(chars / CHARS_PER_TOKEN);

  return { tokens, chars, words };
}

export function fitsBudget(text: string, maxTokens: number): boolean {
  return estimateTokens(text).tokens <= maxTokens;
}

export function splitIntoSnippets(content: string, filePath: string): Snippet[] {
  const lines = content.split('\n');
  const snippets: Snippet[] = [];

  let currentSnippet = '';
  let startLine = 1;
  let lineCount = 0;
  const maxLinesPerSnippet = 50;

  for (let i = 0; i < lines.length; i++) {
    currentSnippet += lines[i] + '\n';
    lineCount++;

    if (lineCount >= maxLinesPerSnippet || i === lines.length - 1) {
      snippets.push({
        id: `${filePath}:${startLine}`,
        content: currentSnippet.trim(),
        filePath,
        startLine,
        endLine: i + 1,
        relevanceScore: 0,
        importance: 'medium',
      });

      currentSnippet = '';
      startLine = i + 2;
      lineCount = 0;
    }
  }

  return snippets;
}

export function scoreRelevance(snippet: Snippet, keywords: string[]): number {
  if (keywords.length === 0) return 50;

  const content = snippet.content.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (content.includes(keyword.toLowerCase())) {
      score += 20;
    }
  }

  if (snippet.content.includes('export') || snippet.content.includes('import')) {
    score += 10;
  }

  if (snippet.content.includes('class ') || snippet.content.includes('function ') || snippet.content.includes('const ')) {
    score += 15;
  }

  return Math.min(100, score);
}

export function rankSnippets(snippets: Snippet[], keywords: string[]): Snippet[] {
  const scored = snippets.map(s => ({
    ...s,
    relevanceScore: scoreRelevance(s, keywords),
  }));

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function selectSnippets(
  snippets: Snippet[],
  maxTokens: number,
  minRelevance = 20
): Snippet[] {
  const selected: Snippet[] = [];
  let totalTokens = 0;

  for (const snippet of snippets) {
    if (snippet.relevanceScore < minRelevance) continue;

    const snippetTokens = estimateTokens(snippet.content).tokens;
    if (totalTokens + snippetTokens > maxTokens) continue;

    selected.push(snippet);
    totalTokens += snippetTokens;
  }

  return selected;
}

export function assembleContext(selectedSnippets: Snippet[], prompt: string): string {
  const sections: string[] = [];

  sections.push('## Task Context');
  sections.push(prompt);
  sections.push('');

  if (selectedSnippets.length > 0) {
    sections.push('## Relevant Code Snippets');
    sections.push('');

    const groupedByFile = new Map<string, Snippet[]>();
    for (const snippet of selectedSnippets) {
      const existing = groupedByFile.get(snippet.filePath) || [];
      existing.push(snippet);
      groupedByFile.set(snippet.filePath, existing);
    }

    for (const [filePath, fileSnippets] of groupedByFile) {
      sections.push(`### ${filePath}`);
      for (const snippet of fileSnippets) {
        sections.push(`Lines ${snippet.startLine}-${snippet.endLine} (relevance: ${snippet.relevanceScore}):`);
        sections.push('```');
        sections.push(snippet.content);
        sections.push('```');
        sections.push('');
      }
    }
  }

  return sections.join('\n');
}

export function distill(
  prompt: string,
  codeSnippets: Snippet[],
  options: DistillationOptions
): DistillationResult {
  const originalEstimate = estimateTokens(prompt);
  const maxTokens = options.maxTokens - originalEstimate.tokens - 100;

  if (maxTokens <= 0) {
    return {
      originalText: prompt,
      compressedText: prompt,
      tokensSaved: 0,
      compressionRatio: 1,
      includedSnippets: [],
      excludedReason: 'Budget too small for snippets',
    };
  }

  const ranked = rankSnippets(codeSnippets, extractKeywords(prompt));
  const selected = selectSnippets(ranked, maxTokens, options.minRelevanceScore);
  const compressedText = assembleContext(selected, prompt);

  const compressedEstimate = estimateTokens(compressedText);
  const tokensSaved = originalEstimate.tokens - compressedEstimate.tokens;

  return {
    originalText: prompt,
    compressedText,
    tokensSaved: Math.max(0, tokensSaved),
    compressionRatio: tokensSaved > 0 ? (tokensSaved / originalEstimate.tokens) * 100 : 0,
    includedSnippets: selected,
  };
}

function extractKeywords(prompt: string): string[] {
  const keywords: string[] = [];
  const words = prompt.toLowerCase().split(/\s+/);

  const important = [
    'function', 'class', 'component', 'api', 'service', 'repository',
    'controller', 'model', 'database', 'auth', 'validation', 'error',
    'test', 'config', 'middleware', 'route', 'handler', 'query',
  ];

  for (const word of words) {
    if (important.includes(word) && word.length > 3) {
      keywords.push(word);
    }
  }

  return [...new Set(keywords)];
}