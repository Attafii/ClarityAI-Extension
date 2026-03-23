/**
 * Team Vault Approval Workflow
 * Handles saving prompts to vault and team approval process
 */

import * as vscode from 'vscode';
import { ClarityLogger } from './logger';
import { ErrorTracker } from './errorTracking';

/**
 * Represents a prompt in the team vault
 */
export interface VaultPrompt {
    id: string;
    title: string;
    prompt: string;
    enhancedPrompt: string;
    author: string;
    createdAt: string;
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
    approvedBy?: string;
    approvalDate?: string;
    rejectionReason?: string;
    tags: string[];
    usage: number;
}

/**
 * Team member with approval permissions
 */
export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'reviewer' | 'contributor';
    canApprove: boolean;
}

/**
 * Team vault configuration
 */
export interface VaultConfig {
    teamName: string;
    teamId: string;
    members: TeamMember[];
    requireApproval: boolean;
    autoApproveAfterRewrites: boolean;
}

export class TeamVaultManager {
    private context: vscode.ExtensionContext;
    private logger: ClarityLogger;
    private errorTracker: ErrorTracker | null;
    private vaultKey = 'clarity.vault.prompts';
    private configKey = 'clarity.vault.config';
    private currentUser: TeamMember | null = null;

    constructor(context: vscode.ExtensionContext, logger: ClarityLogger, errorTracker?: ErrorTracker) {
        this.context = context;
        this.logger = logger;
        this.errorTracker = errorTracker || null;
    }

    /**
     * Initialize vault for team
     */
    async initializeTeamVault(config: VaultConfig): Promise<void> {
        try {
            await this.context.globalState.update(this.configKey, config);
            this.logger.info('vault', 'Team vault initialized', {
                team: config.teamName,
                members: config.members.length,
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('vault', 'Failed to initialize team vault', err);
            if (this.errorTracker) {
                this.errorTracker.captureException(err, {
                    feature: 'vault_initialization',
                    severity: 'high',
                    environment: 'production',
                });
            }
        }
    }

    /**
     * Get vault configuration
     */
    getVaultConfig(): VaultConfig | null {
        return this.context.globalState.get(this.configKey) as VaultConfig | null;
    }

    /**
     * Set current user for approval workflows
     */
    setCurrentUser(user: TeamMember): void {
        this.currentUser = user;
        this.logger.debug('vault', 'Current user set for vault', { user: user.name });
    }

    /**
     * Save prompt to vault (personal draft)
     */
    async saveToDraft(
        title: string,
        prompt: string,
        enhancedPrompt: string,
        tags: string[] = []
    ): Promise<VaultPrompt | null> {
        try {
            const vaultPrompt: VaultPrompt = {
                id: this.generateId(),
                title,
                prompt,
                enhancedPrompt,
                author: this.currentUser?.name || 'Unknown',
                createdAt: new Date().toISOString(),
                status: 'draft',
                tags,
                usage: 0,
            };

            const vault = this.getVault();
            vault.push(vaultPrompt);
            await this.context.globalState.update(this.vaultKey, vault);

            this.logger.info('vault', 'Prompt saved to draft', {
                promptId: vaultPrompt.id,
                author: vaultPrompt.author,
            });

            return vaultPrompt;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('vault', 'Failed to save prompt to draft', err);
            if (this.errorTracker) {
                this.errorTracker.captureException(err, {
                    feature: 'vault_save_draft',
                    severity: 'medium',
                    environment: 'production',
                });
            }
            return null;
        }
    }

    /**
     * Submit prompt for team approval
     */
    async submitForApproval(
        promptId: string,
        additionalNotes?: string
    ): Promise<boolean> {
        try {
            const vault = this.getVault();
            const prompt = vault.find((p) => p.id === promptId);

            if (!prompt) {
                this.logger.warn('vault', 'Prompt not found for approval submission', {
                    promptId,
                });
                return false;
            }

            prompt.status = 'pending_approval';

            await this.context.globalState.update(this.vaultKey, vault);

            this.logger.info('vault', 'Prompt submitted for approval', {
                promptId,
                author: prompt.author,
                notes: additionalNotes?.length || 0,
            });

            // Notify team members with approval permissions
            await this.notifyReviewers(prompt, additionalNotes);

            return true;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('vault', 'Failed to submit prompt for approval', err, {
                promptId,
            });
            if (this.errorTracker) {
                this.errorTracker.captureException(err, {
                    feature: 'vault_approval_submit',
                    severity: 'medium',
                    environment: 'production',
                });
            }
            return false;
        }
    }

    /**
     * Approve prompt (by reviewer)
     */
    async approvePrompt(promptId: string): Promise<boolean> {
        try {
            if (!this.currentUser?.canApprove) {
                this.logger.warn('vault', 'User does not have approval permissions', {
                    userId: this.currentUser?.id,
                });
                return false;
            }

            const vault = this.getVault();
            const prompt = vault.find((p) => p.id === promptId);

            if (!prompt) {
                return false;
            }

            prompt.status = 'approved';
            prompt.approvedBy = this.currentUser.name;
            prompt.approvalDate = new Date().toISOString();

            await this.context.globalState.update(this.vaultKey, vault);

            this.logger.info('vault', 'Prompt approved', {
                promptId,
                approvedBy: this.currentUser.name,
                author: prompt.author,
            });

            return true;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('vault', 'Failed to approve prompt', err);
            if (this.errorTracker) {
                this.errorTracker.captureException(err, {
                    feature: 'vault_approval',
                    severity: 'medium',
                    environment: 'production',
                });
            }
            return false;
        }
    }

    /**
     * Reject prompt with reason
     */
    async rejectPrompt(promptId: string, reason: string): Promise<boolean> {
        try {
            if (!this.currentUser?.canApprove) {
                return false;
            }

            const vault = this.getVault();
            const prompt = vault.find((p) => p.id === promptId);

            if (!prompt) {
                return false;
            }

            prompt.status = 'rejected';
            prompt.rejectionReason = reason;

            await this.context.globalState.update(this.vaultKey, vault);

            this.logger.info('vault', 'Prompt rejected', {
                promptId,
                rejectedBy: this.currentUser.name,
                reason: reason.substring(0, 50),
            });

            return true;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error('vault', 'Failed to reject prompt', err);
            if (this.errorTracker) {
                this.errorTracker.captureException(err, {
                    feature: 'vault_rejection',
                    severity: 'medium',
                    environment: 'production',
                });
            }
            return false;
        }
    }

    /**
     * Get all prompts with optional filtering
     */
    getPrompts(status?: VaultPrompt['status'], authorId?: string): VaultPrompt[] {
        let prompts = this.getVault();

        if (status) {
            prompts = prompts.filter((p) => p.status === status);
        }

        if (authorId) {
            prompts = prompts.filter((p) => p.author === authorId);
        }

        return prompts;
    }

    /**
     * Get pending approvals for current reviewer
     */
    getPendingApprovals(): VaultPrompt[] {
        if (!this.currentUser?.canApprove) {
            return [];
        }
        return this.getPrompts('pending_approval');
    }

    /**
     * Get approved prompts available to team
     */
    getApprovedPrompts(): VaultPrompt[] {
        return this.getPrompts('approved');
    }

    /**
     * Increment usage counter for prompt
     */
    async recordUsage(promptId: string): Promise<void> {
        try {
            const vault = this.getVault();
            const prompt = vault.find((p) => p.id === promptId);

            if (prompt) {
                prompt.usage++;
                await this.context.globalState.update(this.vaultKey, vault);
            }
        } catch (error) {
            // Silently fail on usage tracking
            if (this.errorTracker) {
                this.errorTracker.captureEvent('vault_usage_tracking_failed', {
                    promptId,
                });
            }
        }
    }

    /**
     * Notify reviewers of pending approval
     */
    private async notifyReviewers(prompt: VaultPrompt, notes?: string): Promise<void> {
        const config = this.getVaultConfig();
        if (!config) {
            return;
        }

        const reviewers = config.members.filter((m) => m.canApprove);

        if (reviewers.length === 0) {
            return;
        }

        // In a real implementation, this would send notifications via email/webhook
        // For now, we just log it
        this.logger.debug('vault', 'Notifying reviewers of pending approval', {
            promptTitle: prompt.title,
            reviewerCount: reviewers.length,
            reviewers: reviewers.map((r) => r.name).join(', '),
        });
    }

    /**
     * Export vault to JSON (for backup/sharing)
     */
    exportVault(onlyApproved: boolean = false): VaultPrompt[] {
        let prompts = this.getVault();

        if (onlyApproved) {
            prompts = prompts.filter((p) => p.status === 'approved');
        }

        return prompts;
    }

    /**
     * Get vault statistics
     */
    getStatistics() {
        const vault = this.getVault();

        return {
            total: vault.length,
            draft: vault.filter((p) => p.status === 'draft').length,
            pending: vault.filter((p) => p.status === 'pending_approval').length,
            approved: vault.filter((p) => p.status === 'approved').length,
            rejected: vault.filter((p) => p.status === 'rejected').length,
            totalUsage: vault.reduce((sum, p) => sum + p.usage, 0),
            mostUsed: vault.reduce(
                (max, p) => (p.usage > (max?.usage || 0) ? p : max),
                null as VaultPrompt | null
            ),
        };
    }

    /**
     * Get internal vault array
     */
    private getVault(): VaultPrompt[] {
        return (
            (this.context.globalState.get(this.vaultKey) as VaultPrompt[]) ||
            []
        );
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
