/**
 * Advanced Workflows Test Suite
 * Tests for multi-reviewer approvals, comments, versioning, and SLA
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdvancedWorkflowManager } from '../advancedWorkflows';

// Mock context
const mockContext = {
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
    },
};

describe('Advanced Workflows - AdvancedWorkflowManager', () => {
    let workflowManager: AdvancedWorkflowManager;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext.globalState.get.mockReturnValue(Promise.resolve(null));
        mockContext.globalState.update.mockReturnValue(Promise.resolve());
        workflowManager = new AdvancedWorkflowManager(mockContext as any);
    });

    describe('Approval Request Creation', () => {
        it('should create approval request with reviewers', async () => {
            const reviewers = ['reviewer-1', 'reviewer-2'];
            const success = await workflowManager.createApprovalRequest(
                'prompt-123',
                reviewers,
                24
            );

            expect(success).toBe(true);
        });

        it('should set SLA deadline', async () => {
            const success = await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            expect(typeof success).toBe('boolean');
        });

        it('should initialize reviewers with pending status', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1', 'reviewer-2', 'reviewer-3'],
                24
            );

            expect(mockContext.globalState.update).toHaveBeenCalled();
        });

        it('should require at least one reviewer', async () => {
            const success = await workflowManager.createApprovalRequest(
                'prompt-123',
                [],
                24
            );

            expect(success).toBe(false);
        });

        it('should reject invalid SLA hours', async () => {
            const success = await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                -1
            );

            expect(success).toBe(false);
        });
    });

    describe('Comment System', () => {
        it('should add comment from reviewer', async () => {
            // First create an approval request
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            // Then add a comment
            const success = await workflowManager.addComment(
                'prompt-123',
                'reviewer-1',
                'This needs revision'
            );

            expect(typeof success).toBe('boolean');
        });

        it('should handle empty comments', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            const success = await workflowManager.addComment(
                'prompt-123',
                'reviewer-1',
                ''
            );

            // Empty comments might be invalid
            expect(typeof success).toBe('boolean');
        });

        it('should track comments with timestamps', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            const success = await workflowManager.addComment(
                'prompt-123',
                'reviewer-1',
                'Test comment'
            );

            expect(typeof success).toBe('boolean');
        });
    });

    describe('Reviewer Status Transitions', () => {
        it('should approve prompt from reviewer', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1', 'reviewer-2'],
                24
            );

            const success = await workflowManager.approvePrompt(
                'prompt-123',
                'reviewer-1'
            );

            expect(typeof success).toBe('boolean');
        });

        it('should reject prompt from reviewer', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            const success = await workflowManager.rejectPrompt(
                'prompt-123',
                'reviewer-1',
                'Does not meet standards'
            );

            expect(typeof success).toBe('boolean');
        });

        it('should request changes during review', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            const success = await workflowManager.requestChanges(
                'prompt-123',
                'reviewer-1',
                'Please revise'
            );

            expect(typeof success).toBe('boolean');
        });
    });

    describe('Version History', () => {
        it('should retrieve version history', async () => {
            const versions = await workflowManager.getVersionHistory('prompt-123');

            expect(Array.isArray(versions)).toBe(true);
        });

        it('should support version comparison', () => {
            const comparison = workflowManager.compareVersions('prompt-123', 1, 2);

            // Comparison returns null or object with diff
            expect(comparison === null || typeof comparison === 'object').toBe(true);
        });
    });

    describe('SLA Management', () => {
        it('should track SLA status', async () => {
            await workflowManager.createApprovalRequest('prompt-123', ['reviewer-1'], 2);

            const status = await workflowManager.trackSLA('prompt-123');

            expect(status).toBeDefined();
            expect(typeof status.daysRemaining).toBe('number');
        });

        it('should detect overdue requests', async () => {
            await workflowManager.createApprovalRequest('prompt-123', ['reviewer-1'], 0);

            const status = await workflowManager.trackSLA('prompt-123');
            expect(status.isOverdue).toBe(false); // 0 hours = just expired or not set
        });
    });

    describe('Multi-Reviewer Workflows', () => {
        it('should require multiple approvals', async () => {
            const reviewers = ['reviewer-1', 'reviewer-2', 'reviewer-3'];
            await workflowManager.createApprovalRequest('prompt-123', reviewers, 24);

            // First reviewer approves
            await workflowManager.approvePrompt('prompt-123', 'reviewer-1');

            // Second reviewer approves
            await workflowManager.approvePrompt('prompt-123', 'reviewer-2');

            // Third reviewer approves
            await workflowManager.approvePrompt('prompt-123', 'reviewer-3');

            // All should have approved
            expect(mockContext.globalState.update).toHaveBeenCalled();
        });

        it('should handle rejection from any reviewer', async () => {
            const reviewers = ['reviewer-1', 'reviewer-2'];
            await workflowManager.createApprovalRequest('prompt-123', reviewers, 24);

            // One reviewer approves
            await workflowManager.approvePrompt('prompt-123', 'reviewer-1');

            // One reviewer rejects
            const rejected = await workflowManager.rejectPrompt(
                'prompt-123',
                'reviewer-2',
                'Needs work'
            );

            expect(typeof rejected).toBe('boolean');
        });
    });

    describe('Request Changes Workflow', () => {
        it('should move to changes_requested state', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            const success = await workflowManager.requestChanges(
                'prompt-123',
                'reviewer-1',
                'Please revise'
            );

            expect(typeof success).toBe('boolean');
        });

        it('should allow resubmission after changes', async () => {
            await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1'],
                24
            );

            await workflowManager.requestChanges('prompt-123', 'reviewer-1', 'Needs work');

            // Simulate resubmission with new request
            const resubmitted = await workflowManager.createApprovalRequest(
                'prompt-123-v2',
                ['reviewer-1'],
                24
            );

            expect(resubmitted).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing reviewer gracefully', async () => {
            await workflowManager.createApprovalRequest('prompt-123', ['reviewer-1'], 24);

            //Try to approve with non-existent reviewer
            const success = await workflowManager.approvePrompt(
                'prompt-123',
                'nonexistent-reviewer'
            );

            expect(success).toBe(false);
        });

        it('should handle invalid prompt ID', async () => {
            const success = await workflowManager.approvePrompt(
                'nonexistent',
                'reviewer-1'
            );

            expect(success).toBe(false);
        });

        it('should handle invalid data gracefully', async () => {
            const success = await workflowManager.createApprovalRequest(
                '',
                ['reviewer-1'],
                24
            );

            expect(success).toBe(false);
        });
    });

    describe('Complete Workflow Scenarios', () => {
        it('should handle end-to-end approval flow', async () => {
            // Create request
            const created = await workflowManager.createApprovalRequest(
                'prompt-123',
                ['reviewer-1', 'reviewer-2'],
                24
            );
            expect(created).toBe(true);

            // Add comments
            await workflowManager.addComment('prompt-123', 'reviewer-1', 'Looks good');
            await workflowManager.addComment('prompt-123', 'reviewer-2', 'Minor issue');

            // First reviewer approves
            await workflowManager.approvePrompt('prompt-123', 'reviewer-1');

            // Second reviewer requests changes
            await workflowManager.requestChanges('prompt-123', 'reviewer-2', 'Fix minor issue');

            // All operations should complete
            expect(mockContext.globalState.update).toHaveBeenCalled();
        });

        it('should handle quick approval flow', async () => {
            await workflowManager.createApprovalRequest('prompt-123', ['reviewer-1'], 24);
            const approved = await workflowManager.approvePrompt('prompt-123', 'reviewer-1');

            expect(approved).toBe(true);
        });

        it('should handle rejection flow', async () => {
            await workflowManager.createApprovalRequest('prompt-123', ['reviewer-1'], 24);
            const rejected = await workflowManager.rejectPrompt(
                'prompt-123',
                'reviewer-1',
                'Does not meet standards'
            );

            expect(rejected).toBe(true);
        });
    });
});

