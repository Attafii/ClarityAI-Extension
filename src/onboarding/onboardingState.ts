/**
 * Onboarding State Management
 * Handles persistence of onboarding progress and user preferences
 */

import * as vscode from 'vscode';

export interface OnboardingState {
    completed: boolean;
    skipped: boolean;
    currentStep: number;
    completedAt?: string;
    skippedAt?: string;
    preferences?: {
        enableAnalytics?: boolean;
        showTips?: boolean;
        enableContextInjection?: boolean;
        defaultPersona?: string;
    };
}

const ONBOARDING_STATE_KEY = 'clarity:onboarding:state';

/**
 * Get current onboarding state
 */
export function getOnboardingState(globalState: vscode.Memento): OnboardingState {
    const stored = globalState.get<Partial<OnboardingState>>(ONBOARDING_STATE_KEY, {});

    return {
        completed: stored.completed ?? false,
        skipped: stored.skipped ?? false,
        currentStep: stored.currentStep ?? 0,
        completedAt: stored.completedAt,
        skippedAt: stored.skippedAt,
        preferences: stored.preferences ?? {
            enableAnalytics: true,
            showTips: true,
            enableContextInjection: true,
            defaultPersona: 'none'
        }
    };
}

/**
 * Set onboarding state
 */
export function setOnboardingState(globalState: vscode.Memento, state: OnboardingState): Thenable<void> {
    return globalState.update(ONBOARDING_STATE_KEY, state);
}

/**
 * Check if onboarding should be shown
 */
export function shouldShowOnboarding(globalState: vscode.Memento): boolean {
    const state = getOnboardingState(globalState);
    return !state.completed && !state.skipped;
}

/**
 * Reset onboarding state (for testing or manual restart)
 */
export function resetOnboardingState(globalState: vscode.Memento): Thenable<void> {
    return globalState.update(ONBOARDING_STATE_KEY, {
        completed: false,
        skipped: false,
        currentStep: 0,
        preferences: {
            enableAnalytics: true,
            showTips: true,
            enableContextInjection: true,
            defaultPersona: 'none'
        }
    });
}

/**
 * Update user preferences from onboarding
 */
export function updateOnboardingPreferences(
    globalState: vscode.Memento,
    preferences: Record<string, any>
): Thenable<void> {
    const state = getOnboardingState(globalState);
    state.preferences = {
        ...state.preferences,
        ...preferences
    };
    return setOnboardingState(globalState, state);
}

/**
 * Get onboarding preferences
 */
export function getOnboardingPreferences(globalState: vscode.Memento) {
    const state = getOnboardingState(globalState);
    return state.preferences || {
        enableAnalytics: true,
        showTips: true,
        enableContextInjection: true,
        defaultPersona: 'none'
    };
}
