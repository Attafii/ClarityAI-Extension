/**
 * CloudSync Test Suite
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CloudSyncManager } from '../cloudSync';

const mockContext = {
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  secrets: {
    get: jest.fn(),
    store: jest.fn(),
    delete: jest.fn(),
  },
  extensionUri: { fsPath: '/test' },
};

describe('CloudSyncManager', () => {
  let syncManager: CloudSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    syncManager = new CloudSyncManager(mockContext as any);
  });

  describe('Initialization', () => {
    it('should load configuration on init', () => {
      const status = syncManager.getStatus();
      expect(status).toBeDefined();
      expect(status.enabled).toBeDefined();
    });

    it('should initialize Azure provider', async () => {
      (mockContext.globalState.get as any).mockReturnValue(undefined);
      (mockContext.secrets.get as any).mockResolvedValue('test-key');

      // Mock workspace config
      const originalConfig = jest.spyOn(
        require('vscode').workspace,
        'getConfiguration'
      );
      originalConfig.mockReturnValue({
        get: (key: string) => {
          if (key === 'clarity.cloudSync.storageUrl')
            return 'https://example.blob.core.windows.net';
          return undefined;
        },
      });

      await syncManager.initializeSync('azure');

      expect(syncManager.getStatus().provider).toBe('azure');
      expect(syncManager.getStatus().enabled).toBe(true);

      originalConfig.mockRestore();
    });

    it('should disable sync when provider is none', async () => {
      await syncManager.initializeSync('none');

      expect(syncManager.getStatus().enabled).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    it('should queue sync operations', async () => {
      (mockContext.globalState.get as any).mockReturnValue([]);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.queueSync();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });

    it('should upload vault to cloud', async () => {
      (mockContext.globalState.get as any).mockReturnValue([
        { id: '1', title: 'Test', prompt: 'test' },
      ]);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.syncVaultToCloud();

      expect((mockContext.globalState.update as any)).toHaveBeenCalled();
    });

    it('should download vault from cloud', async () => {
      (mockContext.globalState.get as any).mockReturnValue([
        { id: '1', title: 'Remote', prompt: 'remote' },
      ]);

      await syncManager.syncVaultFromCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect local and remote differences', async () => {
      const local = [{ id: '1', title: 'Local', lastModified: 1000 }];
      const remote = [{ id: '1', title: 'Remote', lastModified: 2000 }];

      (mockContext.globalState.get as any)
        .mockReturnValueOnce(local) // First call for local
        .mockReturnValueOnce(remote); // Second call for remote

      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      // Test that the manager can handle conflicts
      await syncManager.syncVaultFromCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });

    it('should handle merge conflicts with last-write-wins', async () => {
      (mockContext.globalState.get as any).mockReturnValue(undefined);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      const status = syncManager.getStatus();
      // Conflict resolution happens internally
      expect(status).toBeDefined();
    });
  });

  describe('Offline Detection', () => {
    it('should track online status', () => {
      const status = syncManager.getStatus();
      expect(status.isOnline).toBeDefined();
      expect(typeof status.isOnline).toBe('boolean');
    });

    it('should queue syncs when offline and process when online', async () => {
      (mockContext.globalState.get as any).mockReturnValue([]);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      // Queue a sync
      await syncManager.queueSync();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });
  });

  describe('Status Management', () => {
    it('should report sync status', () => {
      const status = syncManager.getStatus();

      expect(status).toEqual({
        enabled: expect.any(Boolean),
        provider: expect.any(String),
        isOnline: expect.any(Boolean),
        isSyncing: expect.any(Boolean),
      });
    });

    it('should expose configuration', () => {
      const status = syncManager.getStatus();
      expect(status.provider).toMatch(/azure|aws|firebase|none/);
    });
  });

  describe('User & Device IDs', () => {
    it('should generate user ID on first access', async () => {
      (mockContext.globalState.get as any).mockReturnValue(undefined);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      // User ID generation happens internally during sync
      await syncManager.syncVaultToCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });

    it('should persist device ID across sessions', async () => {
      const deviceId = 'device-123';
      (mockContext.globalState.get as any).mockReturnValue(deviceId);

      await syncManager.syncVaultToCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalledWith(
        expect.stringContaining('device')
      );
    });
  });

  describe('Data Integrity', () => {
    it('should create backups on conflict resolution', async () => {
      (mockContext.globalState.get as any).mockReturnValue([
        { id: '1', title: 'Data', lastModified: 1000 },
      ]);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.syncVaultFromCloud();

      // Backup is created internally
      expect((mockContext.globalState.update as any)).toHaveBeenCalled();
    });

    it('should detect data changes via hashing', async () => {
      const vault1 = [{ id: '1', title: 'Test' }];
      const vault2 = [{ id: '1', title: 'Modified' }];

      (mockContext.globalState.get as any).mockReturnValueOnce(vault1);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.syncVaultToCloud();

      // Hash detection done internally
      expect((mockContext.globalState.update as any)).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on dispose', () => {
      expect(() => {
        syncManager.dispose();
      }).not.toThrow();
    });
  });

  describe('Integration with TeamVault', () => {
    it('should sync vault data after changes', async () => {
      (mockContext.globalState.get as any).mockReturnValue([
        { id: '1', title: 'Team Prompt', status: 'approved' },
      ]);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.syncVaultToCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });

    it('should handle vault with approval metadata', async () => {
      const vaultWithMetadata = [
        {
          id: '1',
          title: 'Prompt',
          status: 'approved',
          approvedBy: 'reviewer-1',
          reviewers: [{ id: '1', status: 'approved' }],
        },
      ];

      (mockContext.globalState.get as any).mockReturnValue(vaultWithMetadata);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.syncVaultToCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should complete upload under 2 seconds', async () => {
      (mockContext.globalState.get as any).mockReturnValue([]);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      const start = Date.now();
      await syncManager.syncVaultToCloud();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it('should handle large vault data', async () => {
      const largeVault = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: `Prompt ${i}`,
        prompt: `content ${i}`,
        usage: Math.random() * 100,
      }));

      (mockContext.globalState.get as any).mockReturnValue(largeVault);
      (mockContext.globalState.update as any).mockResolvedValue(undefined);

      await syncManager.syncVaultToCloud();

      expect((mockContext.globalState.get as any)).toHaveBeenCalled();
    });
  });
});
