export interface BoxOptions {
  title?: string;
  padding?: number;
  borderColor?: string;
  dimBorder?: boolean;
  align?: 'left' | 'center';
}

export function createBox(content: string, options: BoxOptions = {}): string {
  const title = options.title ? `${options.title}: ` : '';
  return `${title}${content}`;
}

export function createSection(title: string, content: string): string {
  return createBox(content, { title, padding: 1 });
}

export function createInfoBox(content: string): string {
  return createBox(content, { borderColor: 'blue', dimBorder: true });
}

export function createSuccessBox(content: string): string {
  return createBox(content, { borderColor: 'green', dimBorder: false });
}

export function createWarningBox(content: string): string {
  return createBox(content, { borderColor: 'yellow', dimBorder: false });
}

export function createErrorBox(content: string): string {
  return createBox(content, { borderColor: 'red', dimBorder: false });
}

export function createDimBox(content: string): string {
  return createBox(content, { borderColor: 'gray', dimBorder: true });
}