import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProtocolManager } from '../protocol/manager';
import { splitIntoSnippets, rankSnippets, estimateTokens, distill, Snippet } from '../distiller';
import { createSpinner, successSpin, failSpin, warnSpin } from '../cli/ui/spinner';
import { createBox, createSuccessBox, createDimBox } from '../cli/ui/boxes';
import { THEME } from '../cli/ui/theme';

export interface ProtocolCommandOptions {
  cwd?: string;
  json?: boolean;
}

export async function runInit(options: ProtocolCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const spinner = createSpinner('Initializing Clarity Protocol...');

  try {
    const manager = new ProtocolManager(cwd);
    const success = manager.init();

    if (success) {
      spinner.succeed('Protocol initialized');

      const files = ['map.md', 'aesthetic.md', 'intent.md', 'constraints.md', 'checkpoint.md', 'stack.md'];
      const created = files.filter(f => manager.exists(f));

      console.log(createSuccessBox(`Created ${created.length} protocol files in .clarity/`));
      console.log(createDimBox('Run "clarity map" to analyze dependencies'));
      console.log(createDimBox('Run "clarity checkpoint" to set initial state'));
    } else {
      spinner.fail('Failed to initialize protocol');
    }
  } catch (error) {
    spinner.fail('Error initializing protocol');
    console.error(error);
  }
}

export async function runMap(options: ProtocolCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const spinner = createSpinner('Analyzing project structure...');

  try {
    const manager = new ProtocolManager(cwd);
    const mapFile = manager.getFilePath('map.md');

    const { nodes, edges } = await analyzeProjectStructure(cwd);

    const mapContent = generateMapContent(nodes, edges);

    manager.write('map.md', mapContent);

    spinner.succeed('Map updated');
    console.log(createBox(
      `Analyzed project structure:\n` +
      `- ${nodes.length} nodes identified\n` +
      `- ${edges.length} edges mapped`,
      { title: 'Dependency Map', borderColor: THEME.amethyst.primary }
    ));
  } catch (error) {
    spinner.fail('Failed to analyze project');
    console.error(error);
  }
}

export async function runCheckpoint(options: ProtocolCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const manager = new ProtocolManager(cwd);

  if (options.json) {
    const content = manager.read('checkpoint.md');
    console.log(JSON.stringify({ checkpoint: content }, null, 2));
    return;
  }

  const spinner = createSpinner('Syncing checkpoint...');

  try {
    const content = manager.read('checkpoint.md') || '';
    const updated = updateCheckpointContent(content);

    if (updated) {
      manager.write('checkpoint.md', updated);
      spinner.succeed('Checkpoint synced');
      console.log(createSuccessBox('State saved to checkpoint.md'));
    } else {
      spinner.warn('No changes to checkpoint');
    }
  } catch (error) {
    spinner.fail('Failed to sync checkpoint');
    console.error(error);
  }
}

export async function runDistill(prompt: string, options: ProtocolCommandOptions & { maxTokens?: number } = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const spinner = createSpinner('Distilling logic...');

  try {
    const snippets = await collectRelevantSnippets(cwd, prompt);
    const maxTokens = options.maxTokens || 100000;

    const result = distill(prompt, snippets, {
      maxTokens,
      minRelevanceScore: 20,
    });

    spinner.succeed('Logic distilled');

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(createBox(
      `Compression complete:\n` +
      `- Original: ${estimateTokens(prompt).tokens} tokens\n` +
      `- Compressed: ${estimateTokens(result.compressedText).tokens} tokens\n` +
      `- Saved: ${result.tokensSaved} tokens (${result.compressionRatio.toFixed(1)}%)`,
      { title: 'Distillation Result', borderColor: THEME.success }
    ));

    console.log('\n' + createDimBox(result.compressedText));
  } catch (error) {
    spinner.fail('Failed to distill');
    console.error(error);
  }
}

export async function runGenerate(blueprintName: string, variables: Record<string, string> = {}, options: ProtocolCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const spinner = createSpinner(`Loading blueprint: ${blueprintName}...`);

  try {
    const blueprintPath = path.join(cwd, 'blueprints', `${blueprintName}.md`);

    if (!fs.existsSync(blueprintPath)) {
      const searchResults = await searchBlueprints(cwd, blueprintName);
      if (searchResults.length === 0) {
        spinner.fail(`Blueprint not found: ${blueprintName}`);
        console.log(createBox(
          `Available blueprints:\n${searchResults.join('\n')}`,
          { title: 'Search Results', borderColor: THEME.warning }
        ));
        return;
      }
      console.log(createBox(
        `Blueprint "${blueprintName}" not found. Did you mean:\n${searchResults.map(r => `- ${r}`).join('\n')}`,
        { title: 'Not Found', borderColor: THEME.warning }
      ));
      return;
    }

    const content = fs.readFileSync(blueprintPath, 'utf8');
    const filled = fillBlueprint(content, variables);

    spinner.succeed(`Blueprint loaded: ${blueprintName}`);

    if (options.json) {
      console.log(JSON.stringify({ blueprint: blueprintName, filled }, null, 2));
      return;
    }

    console.log(createBox(filled, { title: blueprintName, borderColor: THEME.amethyst.primary }));
  } catch (error) {
    spinner.fail('Failed to load blueprint');
    console.error(error);
  }
}

export async function runBlueprints(options: ProtocolCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();

  const softwarePatterns = fs.existsSync(path.join(cwd, 'blueprints', 'software-patterns'))
    ? fs.readdirSync(path.join(cwd, 'blueprints', 'software-patterns')).filter(f => f.endsWith('.md'))
    : [];

  const agentWorkflows = fs.existsSync(path.join(cwd, 'blueprints', 'agent-workflows'))
    ? fs.readdirSync(path.join(cwd, 'blueprints', 'agent-workflows')).filter(f => f.endsWith('.md'))
    : [];

  const output = [
    '## ClarityAI Blueprints',
    '',
    '### Software Patterns',
    ...softwarePatterns.map(p => `- ${p.replace('.md', '')}`),
    '',
    '### Agent Workflows',
    ...agentWorkflows.map(p => `- ${p.replace('.md', '')}`),
    '',
    'Usage: clarity generate <blueprint-name> [key=value ...]',
  ].join('\n');

  console.log(createBox(output, { title: 'Available Blueprints', borderColor: THEME.amethyst.primary }));
}

async function analyzeProjectStructure(cwd: string): Promise<{ nodes: { id: string; label: string; type: string; path?: string }[]; edges: { from: string; to: string; type: string }[] }> {
  const nodes: { id: string; label: string; type: string; path?: string }[] = [];
  const edges: { from: string; to: string; type: string }[] = [];

  const srcDir = path.join(cwd, 'src');
  if (!fs.existsSync(srcDir)) {
    return { nodes, edges };
  }

  const processFile = (filePath: string, relativePath: string): void => {
    const ext = path.extname(filePath);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath, ext);

    nodes.push({
      id: name,
      label: name,
      type: getNodeType(name),
      path: relativePath,
    });

    const imports = content.match(/import\s+.*?from\s+['"](.*?)['"]/g) || [];
    for (const imp of imports) {
      const match = imp.match(/from\s+['"](.*?)['"]/);
      if (match) {
        const importedPath = match[1];
        if (!importedPath.startsWith('.') && !importedPath.startsWith('@')) {
          const importedName = path.basename(importedPath);
          edges.push({
            from: name,
            to: importedName,
            type: 'imports',
          });
        }
      }
    }
  };

  const walkDir = (dir: string, baseDir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        if (!['node_modules', 'out', '.git', '.clarity'].includes(entry.name)) {
          walkDir(fullPath, baseDir);
        }
      } else {
        processFile(fullPath, relative.replace(/\\/g, '/'));
      }
    }
  };

  walkDir(srcDir, cwd);

  return { nodes, edges };
}

function getNodeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('controller')) return 'controller';
  if (lower.includes('service')) return 'service';
  if (lower.includes('repository')) return 'repository';
  if (lower.includes('model')) return 'model';
  if (lower.includes('middleware')) return 'middleware';
  if (lower.includes('config')) return 'config';
  if (lower.includes('util') || lower.includes('helper')) return 'utility';
  if (lower.includes('test') || lower.includes('spec')) return 'test';
  return 'component';
}

function generateMapContent(
  nodes: { id: string; label: string; type: string; path?: string }[],
  edges: { from: string; to: string; type: string }[]
): string {
  const lines = [
    '# Semantic Architecture Map',
    '',
    `**Project**: ${path.basename(process.cwd())}`,
    `**Last Updated**: ${new Date().toISOString()}`,
    '**Version**: 1.0',
    '',
    '## Overview',
    '',
    `This map identifies ${nodes.length} nodes and ${edges.length} edges in the project structure.`,
    '',
    '## Nodes',
    '',
    '```',
    ...nodes.map(n => `[${n.id}] ${n.label} | ${n.type} | ${n.path || ''}`),
    '```',
    '',
    '## Edges',
    '',
    '```',
    ...edges.map(e => `[${e.from}] -> [${e.to}] | ${e.type}`),
    '```',
    '',
    '## Flows',
    '',
    '### Data Flow',
    '',
    '```mermaid',
    'graph TD',
    ...nodes.map(n => `    ${n.id}[${n.label}]`),
    '',
    ...edges.map(e => `    ${e.from} -->|${e.type}| ${e.to}`),
    '```',
    '',
    '## Notes',
    '',
    '- Run `clarity map` to update this map',
    '- Add semantic descriptions to flows as needed',
    '- Update after adding new services or changing dependencies',
  ];

  return lines.join('\n');
}

async function collectRelevantSnippets(cwd: string, prompt: string): Promise<Snippet[]> {
  const snippets: Snippet[] = [];

  const srcDir = path.join(cwd, 'src');
  if (!fs.existsSync(srcDir)) return snippets;

  const walkDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'out', '.git', '.clarity'].includes(entry.name)) {
          walkDir(fullPath);
        }
      } else {
        const ext = path.extname(fullPath);
        if (['.ts', '.tsx', '.js', '.jsx', '.md'].includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relative = path.relative(cwd, fullPath).replace(/\\/g, '/');
          const fileSnippets = splitIntoSnippets(content, relative);
          snippets.push(...fileSnippets);
        }
      }
    }
  };

  walkDir(srcDir);

  return snippets;
}

function updateCheckpointContent(content: string): string | null {
  const now = new Date().toISOString();
  const lines = content.split('\n');

  let inCompletedSection = false;
  let updated = false;

  const newLines = lines.map(line => {
    if (line.includes('## Completed') || line.includes('### Completed')) {
      inCompletedSection = true;
    }

    if (inCompletedSection && line.startsWith('- [ ]')) {
      updated = true;
      return line.replace('- [ ]', `- [x] ${now}`);
    }

    return line;
  });

  return updated ? newLines.join('\n') : null;
}

async function searchBlueprints(cwd: string, query: string): Promise<string[]> {
  const results: string[] = [];
  const dirs = ['software-patterns', 'agent-workflows'];

  for (const dir of dirs) {
    const dirPath = path.join(cwd, 'blueprints', dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      if (file.toLowerCase().includes(query.toLowerCase())) {
        results.push(file.replace('.md', ''));
      }
    }
  }

  return results;
}

function fillBlueprint(content: string, variables: Record<string, string>): string {
  let filled = content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    filled = filled.replace(regex, value);
  }

  filled = filled.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);

  return filled;
}