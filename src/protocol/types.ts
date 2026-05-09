export interface DependencyNode {
  id: string;
  label: string;
  type: 'file' | 'module' | 'service' | 'api' | 'component';
  path?: string;
  description?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  label?: string;
  type: 'imports' | 'calls' | 'extends' | 'implements' | 'composes' | 'uses';
}

export interface SemanticMap {
  version: string;
  lastUpdated: string;
  projectName: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  flows: Flow[];
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  path: string[];
  steps: FlowStep[];
}

export interface FlowStep {
  order: number;
  node: string;
  action: string;
  reason: string;
}

export interface AestheticConfig {
  version: string;
  lastUpdated: string;
  colors: ColorPalette;
  typography: TypographyConfig;
  glassmorphism: GlassmorphismConfig;
  shadows: ShadowConfig;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface TypographyConfig {
  fontFamily: string;
  fontFamilyMono: string;
  fontSizes: Record<string, string>;
  fontWeights: Record<string, number>;
  lineHeights: Record<string, number>;
}

export interface GlassmorphismConfig {
  blur: string;
  opacity: number;
  saturation: number;
  gradient: string[];
  borderRadius: string;
}

export interface ShadowConfig {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  glow: string;
}

export interface ArchitecturalDecision {
  id: string;
  date: string;
  title: string;
  context: string;
  decision: string;
  consequences: string[];
  status: 'accepted' | 'deprecated' | 'superseded';
  supersededBy?: string;
}

export interface IntentDocument {
  version: string;
  lastUpdated: string;
  decisions: ArchitecturalDecision[];
}

export interface Constraint {
  id: string;
  rule: string;
  reason: string;
  severity: 'error' | 'warning' | 'info';
  pattern?: string;
  forbiddenLibs?: string[];
  antiPatterns?: string[];
}

export interface ConstraintsDocument {
  version: string;
  lastUpdated: string;
  constraints: Constraint[];
  rules: string[];
}

export interface CheckpointStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: string;
}

export interface CheckpointTask {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dependsOn: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Checkpoint {
  version: string;
  lastUpdated: string;
  currentGoal: string;
  goalDescription: string;
  steps: CheckpointStep[];
  pendingTasks: CheckpointTask[];
  completedTasks: CheckpointTask[];
  blockers: Blocker[];
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  createdAt: string;
  resolvedAt?: string;
}

export interface StackItem {
  name: string;
  version: string;
  type: 'runtime' | 'framework' | 'library' | 'tool' | 'language';
  purpose: string;
}

export interface StackDocument {
  version: string;
  lastUpdated: string;
  runtime: StackItem;
  framework?: StackItem;
  language: StackItem;
  dependencies: StackItem[];
  devDependencies: StackItem[];
  tools: StackItem[];
}