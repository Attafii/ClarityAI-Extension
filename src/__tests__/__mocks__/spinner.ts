export interface MockOra {
  start: () => MockOra;
  succeed: () => MockOra;
  fail: () => MockOra;
  warn: () => MockOra;
  text: string;
  color: string;
}

export function createSpinner(text: string): MockOra {
  return { start: () => createSpinner(text), succeed: () => createSpinner(text), fail: () => createSpinner(text), warn: () => createSpinner(text), text, color: 'magenta' };
}

export function pulseSpinner(text: string): MockOra {
  return { start: () => pulseSpinner(text), succeed: () => pulseSpinner(text), fail: () => pulseSpinner(text), warn: () => pulseSpinner(text), text, color: 'cyan' };
}

export function logicDistillSpinner(text = 'Distilling logic'): MockOra {
  return { start: () => logicDistillSpinner(text), succeed: () => logicDistillSpinner(text), fail: () => logicDistillSpinner(text), warn: () => logicDistillSpinner(text), text, color: 'magenta' };
}

export function successSpin(text: string): MockOra {
  return { start: () => successSpin(text), succeed: () => successSpin(text), fail: () => successSpin(text), warn: () => successSpin(text), text, color: 'green' };
}

export function failSpin(text: string): MockOra {
  return { start: () => failSpin(text), succeed: () => failSpin(text), fail: () => failSpin(text), warn: () => failSpin(text), text, color: 'red' };
}

export function warnSpin(text: string): MockOra {
  return { start: () => warnSpin(text), succeed: () => warnSpin(text), fail: () => warnSpin(text), warn: () => warnSpin(text), text, color: 'yellow' };
}