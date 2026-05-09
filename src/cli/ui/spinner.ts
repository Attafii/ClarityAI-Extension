import ora, { Ora } from 'ora';
import { THEME } from './theme';

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'magenta',
  }).start();
}

export function pulseSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  }).start();
}

export function logicDistillSpinner(text = 'Distilling logic'): Ora {
  return ora({
    text,
    color: 'magenta',
  }).start();
}

export function successSpin(text: string): Ora {
  return ora({
    text,
    color: 'green',
  }).succeed();
}

export function failSpin(text: string): Ora {
  return ora({
    text,
    color: 'red',
  }).fail();
}

export function warnSpin(text: string): Ora {
  return ora({
    text,
    color: 'yellow',
  }).warn();
}