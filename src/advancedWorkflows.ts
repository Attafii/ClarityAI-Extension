/**
 * AdvancedWorkflowManager - Multi-step approval workflows with comments
 */

import * as vscode from 'vscode';

export interface ReviewerStatus {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment?: string;
  timestamp?: number;
}

export interface PromptVersion {
  number: number;
  content: string;
  author: string;
  timestamp: number;
  approver?: string;
  changesSummary?: string;
}

export interface PromptComment {
  id: string;
  reviewer: string;
  text: string;
  timestamp: number;
  resolved: boolean;
}

export class AdvancedWorkflowManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Create approval request with multiple reviewers
   */
  async createApprovalRequest(
    promptId: string,
    reviewerIds: string[],
    slaHours?: number
  ): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt) {
        return false;
      }

      prompt.requiredApprovals = reviewerIds.length;
      prompt.reviewers = reviewerIds.map((id) => ({
        id,
        name: this.getReviewerName(id),
        status: 'pending' as const,
        timestamp: undefined,
      }));
      prompt.sla = slaHours ? Date.now() + slaHours * 3600000 : undefined;
      prompt.submittedAt = Date.now();
      prompt.status = 'pending_review';

      // Initialize version history
      if (!prompt.versions) {
        prompt.versions = [
          {
            number: 1,
            content: prompt.prompt,
            author: prompt.author,
            timestamp: Date.now(),
          },
        ];
      }

      if (!prompt.comments) {
        prompt.comments = [];
      }

      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add comment from reviewer
   */
  async addComment(
    promptId: string,
    reviewerId: string,
    text: string
  ): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.comments) {
        return false;
      }

      const comment: PromptComment = {
        id: `comment-${Date.now()}`,
        reviewer: reviewerId,
        text,
        timestamp: Date.now(),
        resolved: false,
      };

      prompt.comments.push(comment);
      if (prompt.status === 'pending_review') {
        prompt.status = 'review_in_progress';
      }

      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Approve prompt from reviewer
   */
  async approvePrompt(promptId: string, reviewerId: string): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.reviewers) {
        return false;
      }

      const reviewer = prompt.reviewers.find((r: ReviewerStatus) => r.id === reviewerId);
      if (!reviewer) {
        return false;
      }

      reviewer.status = 'approved';
      reviewer.timestamp = Date.now();

      // Check if all reviewers have approved
      const allApproved = prompt.reviewers.every(
        (r: ReviewerStatus) => r.status === 'approved'
      );

      if (allApproved) {
        prompt.status = 'approved';
        prompt.approvedBy = reviewerId;
        prompt.approvedAt = Date.now();
      }

      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reject prompt from reviewer
   */
  async rejectPrompt(
    promptId: string,
    reviewerId: string,
    feedback: string
  ): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.reviewers) {
        return false;
      }

      const reviewer = prompt.reviewers.find((r: ReviewerStatus) => r.id === reviewerId);
      if (!reviewer) {
        return false;
      }

      reviewer.status = 'rejected';
      reviewer.comment = feedback;
      reviewer.timestamp = Date.now();

      prompt.status = 'rejected';
      prompt.rejectedBy = reviewerId;
      prompt.rejectedAt = Date.now();

      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request changes during review
   */
  async requestChanges(
    promptId: string,
    reviewerId: string,
    feedback: string
  ): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.reviewers) {
        return false;
      }

      const reviewer = prompt.reviewers.find((r: ReviewerStatus) => r.id === reviewerId);
      if (!reviewer) {
        return false;
      }

      reviewer.status = 'changes_requested';
      reviewer.comment = feedback;
      reviewer.timestamp = Date.now();

      prompt.status = 'requested_changes';

      // Add comment with the feedback
      if (prompt.comments) {
        prompt.comments.push({
          id: `comment-${Date.now()}`,
          reviewer: reviewerId,
          text: `Changes requested: ${feedback}`,
          timestamp: Date.now(),
          resolved: false,
        });
      }

      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get version history for prompt
   */
  async getVersionHistory(promptId: string): Promise<PromptVersion[]> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);
      return prompt?.versions || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Create new version when prompt is updated
   */
  async createNewVersion(
    promptId: string,
    newContent: string,
    author: string,
    changesSummary?: string
  ): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt) {
        return false;
      }

      if (!prompt.versions) {
        prompt.versions = [];
      }

      const newVersion: PromptVersion = {
        number: (prompt.versions.length || 0) + 1,
        content: newContent,
        author,
        timestamp: Date.now(),
        changesSummary,
      };

      prompt.versions.push(newVersion);
      prompt.prompt = newContent;

      // Reset review status
      if (prompt.status === 'requested_changes') {
        prompt.status = 'submitted';
        // Reset reviewer statuses for new review
        if (prompt.reviewers) {
          prompt.reviewers.forEach((r: ReviewerStatus) => {
            if (r.status === 'changes_requested') {
              r.status = 'pending';
            }
          });
        }
      }

      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    promptId: string,
    versionA: number,
    versionB: number
  ): Promise<{ before: string; after: string; diff: string } | null> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.versions) {
        return null;
      }

      const verA = prompt.versions.find((v: PromptVersion) => v.number === versionA);
      const verB = prompt.versions.find((v: PromptVersion) => v.number === versionB);

      if (!verA || !verB) {
        return null;
      }

      // Simple diff - in production, use a proper diff library
      const before = verA.content;
      const after = verB.content;
      const diff = this.simpleTextDiff(before, after);

      return { before, after, diff };
    } catch (error) {
      return null;
    }
  }

  /**
   * Track SLA - get days until approval deadline
   */
  async trackSLA(promptId: string): Promise<{
    daysRemaining: number;
    isOverdue: boolean;
    deadline: number | undefined;
  }> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.sla) {
        return { daysRemaining: -1, isOverdue: false, deadline: undefined };
      }

      const now = Date.now();
      const msRemaining = prompt.sla - now;
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const isOverdue = msRemaining < 0;

      return {
        daysRemaining: Math.max(0, daysRemaining),
        isOverdue,
        deadline: prompt.sla,
      };
    } catch (error) {
      return { daysRemaining: -1, isOverdue: false, deadline: undefined };
    }
  }

  /**
   * Get reviewer status
   */
  async getReviewerStatus(promptId: string): Promise<ReviewerStatus[]> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);
      return prompt?.reviewers || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all comments on prompt
   */
  async getComments(promptId: string): Promise<PromptComment[]> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);
      return prompt?.comments || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Resolve comment thread
   */
  async resolveComment(promptId: string, commentId: string): Promise<boolean> {
    try {
      const vault = await this.getVault();
      const prompt = vault.find((p: any) => p.id === promptId);

      if (!prompt || !prompt.comments) {
        return false;
      }

      const comment = prompt.comments.find((c: PromptComment) => c.id === commentId);
      if (!comment) {
        return false;
      }

      comment.resolved = true;
      await this.saveVault(vault);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get vault data
   */
  private async getVault(): Promise<any[]> {
    return (await this.context.globalState.get('clarity.vault.prompts')) || [];
  }

  /**
   * Save vault data
   */
  private async saveVault(vault: any[]): Promise<void> {
    await this.context.globalState.update('clarity.vault.prompts', vault);
  }

  /**
   * Get reviewer name
   */
  private getReviewerName(id: string): string {
    // In production, would fetch from team config
    return id.split('-').pop() || 'Reviewer';
  }

  /**
   * Simple text diff
   */
  private simpleTextDiff(before: string, after: string): string {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');

    let diff = '';
    const maxLines = Math.max(beforeLines.length, afterLines.length);

    for (let i = 0; i < maxLines; i++) {
      const b = beforeLines[i] || '';
      const a = afterLines[i] || '';

      if (b !== a) {
        if (b) diff += `- ${b}\n`;
        if (a) diff += `+ ${a}\n`;
      }
    }

    return diff || 'No changes';
  }
}
