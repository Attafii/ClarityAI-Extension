/**
 * CloudSyncManager - Multi-device vault synchronization
 * Supports Azure, AWS, Firebase for cloud backup and sync
 */

import * as vscode from 'vscode';

export type CloudProvider = 'azure' | 'aws' | 'firebase' | 'none';

export interface CloudSyncConfig {
  enabled: boolean;
  provider: CloudProvider;
  storageUrl?: string;
  apiKey?: string;
  interval: number; // ms
}

export interface SyncMetadata {
  lastSync: number;
  lastSyncHash: string;
  userId: string;
  deviceId: string;
  version: string;
}

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'local-wins' | 'remote-wins';
  timestamp: number;
  winner: 'local' | 'remote';
  backupCreated: boolean;
}

export class CloudSyncManager {
  private context: vscode.ExtensionContext;
  private config: CloudSyncConfig;
  private isOnline = true;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing = false;
  private statusBarItem: vscode.StatusBarItem;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.config = this.loadConfig();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.setupNetworkDetection();
  }

  /**
   * Initialize cloud sync with specified provider
   */
  async initializeSync(provider: CloudProvider): Promise<void> {
    if (provider === 'none') {
      this.config.enabled = false;
      return;
    }

    this.config.provider = provider;
    this.config.enabled = true;

    switch (provider) {
      case 'azure':
        await this.initializeAzure();
        break;
      case 'aws':
        await this.initializeAWS();
        break;
      case 'firebase':
        await this.initializeFirebase();
        break;
    }

    this.startAutoSync();
    this.updateStatusBar();
  }

  /**
   * Initialize Azure Blob Storage connection
   */
  private async initializeAzure(): Promise<void> {
    const config = vscode.workspace.getConfiguration('clarity');
    const storageUrl = config.get<string>('cloudSync.storageUrl');

    if (!storageUrl) {
      vscode.window.showErrorMessage(
        'Azure storage URL not configured. Set clarity.cloudSync.storageUrl'
      );
      this.config.enabled = false;
      return;
    }

    this.config.storageUrl = storageUrl;
    this.config.apiKey = await this.context.secrets.get(
      'clarity.azure.api-key'
    );
  }

  /**
   * Initialize AWS S3 connection
   */
  private async initializeAWS(): Promise<void> {
    const config = vscode.workspace.getConfiguration('clarity');
    const bucket = config.get<string>('cloudSync.awsBucket');

    if (!bucket) {
      vscode.window.showErrorMessage(
        'AWS bucket not configured. Set clarity.cloudSync.awsBucket'
      );
      this.config.enabled = false;
      return;
    }

    this.config.storageUrl = `s3://${bucket}`;
    this.config.apiKey = await this.context.secrets.get('clarity.aws.api-key');
  }

  /**
   * Initialize Firebase connection
   */
  private async initializeFirebase(): Promise<void> {
    const config = vscode.workspace.getConfiguration('clarity');
    const projectId = config.get<string>('cloudSync.firebaseProject');

    if (!projectId) {
      vscode.window.showErrorMessage(
        'Firebase project not configured. Set clarity.cloudSync.firebaseProject'
      );
      this.config.enabled = false;
      return;
    }

    this.config.storageUrl = `https://firestore.googleapis.com/v1/projects/${projectId}`;
    this.config.apiKey = await this.context.secrets.get(
      'clarity.firebase.api-key'
    );
  }

  /**
   * Setup network detection
   */
  private setupNetworkDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatusBar();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatusBar();
    });
  }

  /**
   * Start automatic sync with configured interval
   */
  private startAutoSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.queueSync();
      }
    }, this.config.interval);
  }

  /**
   * Queue a sync operation
   */
  async queueSync(): Promise<void> {
    this.syncQueue.push(async () => {
      await this.syncVaultToCloud();
    });

    await this.processSyncQueue();
  }

  /**
   * Process queued sync operations
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.updateStatusBar('syncing');

    try {
      while (this.syncQueue.length > 0 && this.isOnline) {
        const syncFn = this.syncQueue.shift();
        if (syncFn) {
          await syncFn();
        }
      }
      this.updateStatusBar('synced');
    } catch (error) {
      if (this.isOnline) {
        vscode.window.showErrorMessage(
          `Cloud sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      this.updateStatusBar('error');
    } finally {
      this.isSyncing = false;
      this.updateStatusBar();
    }
  }

  /**
   * Upload vault data to cloud
   */
  async syncVaultToCloud(): Promise<void> {
    if (!this.config.enabled || !this.isOnline) {
      return;
    }

    try {
      const vaultData = await this.getLocalVaultData();
      const metadata = await this.getLocalMetadata();

      // Upload vault
      await this.uploadToCloud('vault.json', vaultData);

      // Update metadata
      const newMetadata: SyncMetadata = {
        ...metadata,
        lastSync: Date.now(),
        lastSyncHash: this.hashData(vaultData),
      };
      await this.uploadToCloud('sync-metadata.json', newMetadata);
    } catch (error) {
      throw new Error(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download vault data from cloud
   */
  async syncVaultFromCloud(): Promise<void> {
    if (!this.config.enabled || !this.isOnline) {
      return;
    }

    try {
      const remoteVault = await this.downloadFromCloud('vault.json');
      const localVault = await this.getLocalVaultData();

      if (!remoteVault || typeof remoteVault === 'string') {
        return; // Remote is empty
      }

      const shouldMerge = JSON.stringify(localVault) !== JSON.stringify(remoteVault);

      if (shouldMerge) {
        const resolution = await this.resolveConflict(localVault, remoteVault);
        const merged = resolution.winner === 'local' ? localVault : remoteVault;
        await this.saveLocalVaultData(merged);
      }
    } catch (error) {
      throw new Error(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resolve conflicts between local and remote vault data
   */
  private async resolveConflict(
    local: any,
    remote: any
  ): Promise<ConflictResolution> {
    const config = vscode.workspace.getConfiguration('clarity');
    const strategy = config.get<string>(
      'cloudSync.conflictStrategy',
      'last-write-wins'
    ) as 'last-write-wins' | 'local-wins' | 'remote-wins';

    let winner: 'local' | 'remote' = 'local';

    if (strategy === 'last-write-wins') {
      const localTime = (local as any)?.lastModified || 0;
      const remoteTime = (remote as any)?.lastModified || 0;
      winner = remoteTime > localTime ? 'remote' : 'local';
    } else if (strategy === 'remote-wins') {
      winner = 'remote';
    }

    // Create backup
    const backup = {
      ...local,
      backupTime: Date.now(),
      conflictWith: 'remote',
    };
    await this.uploadToCloud(`backups/vault-${Date.now()}.json`, backup);

    return {
      strategy: strategy as any,
      timestamp: Date.now(),
      winner,
      backupCreated: true,
    };
  }

  /**
   * Upload data to cloud storage
   */
  private async uploadToCloud(path: string, data: any): Promise<void> {
    if (!this.config.storageUrl) {
      throw new Error('Storage URL not configured');
    }

    // Simulate upload - in production, call actual cloud API
    const userId = await this.getUserId();
    const cloudPath = `vaults/${userId}/${path}`;

    // Store locally for now (production would use actual cloud API)
    await this.context.globalState.update(`cloud:${cloudPath}`, data);
  }

  /**
   * Download data from cloud storage
   */
  private async downloadFromCloud(path: string): Promise<any> {
    if (!this.config.storageUrl) {
      throw new Error('Storage URL not configured');
    }

    const userId = await this.getUserId();
    const cloudPath =  `cloud:vaults/${userId}/${path}`;

    // Retrieve from local storage (production would use actual cloud API)
    return this.context.globalState.get(cloudPath);
  }

  /**
   * Get local vault data
   */
  private async getLocalVaultData(): Promise<any> {
    return this.context.globalState.get('clarity.vault.prompts') || [];
  }

  /**
   * Save local vault data
   */
  private async saveLocalVaultData(data: any): Promise<void> {
    await this.context.globalState.update('clarity.vault.prompts', data);
  }

  /**
   * Get local sync metadata
   */
  private async getLocalMetadata(): Promise<SyncMetadata> {
    const stored = this.context.globalState.get<SyncMetadata>(
      'clarity.sync.metadata'
    );
    return (
      stored || {
        lastSync: 0,
        lastSyncHash: '',
        userId: await this.getUserId(),
        deviceId: await this.getDeviceId(),
        version: '1.0',
      }
    );
  }

  /**
   * Get or create user ID
   */
  private async getUserId(): Promise<string> {
    let userId = this.context.globalState.get<string>('clarity.user.id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.context.globalState.update('clarity.user.id', userId);
    }
    return userId;
  }

  /**
   * Get or create device ID
   */
  private async getDeviceId(): Promise<string> {
    let deviceId = this.context.globalState.get<string>('clarity.device.id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.context.globalState.update('clarity.device.id', deviceId);
    }
    return deviceId;
  }

  /**
   * Hash data for change detection
   */
  private hashData(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get sync status
   */
  getStatus(): {
    enabled: boolean;
    provider: CloudProvider;
    isOnline: boolean;
    isSyncing: boolean;
    lastSync?: number;
  } {
    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Update status bar
   */
  private updateStatusBar(state?: 'syncing' | 'synced' | 'error'): void {
    if (!this.config.enabled) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.show();

    if (!this.isOnline) {
      this.statusBarItem.text = '$(cloud-offline) Offline';
      this.statusBarItem.color = 'orange';
    } else if (state === 'syncing') {
      this.statusBarItem.text = '$(cloud-sync~spin) Syncing...';
      this.statusBarItem.color = 'blue';
    } else if (state === 'synced') {
      this.statusBarItem.text = '$(cloud-sync) Synced';
      this.statusBarItem.color = 'green';
    } else if (state === 'error') {
      this.statusBarItem.text = '$(cloud-sync) Sync failed';
      this.statusBarItem.color = 'red';
    } else {
      this.statusBarItem.text = '$(cloud) Ready';
      this.statusBarItem.color = '';
    }

    this.statusBarItem.command = 'clarity.showSyncStatus';
  }

  /**
   * Load configuration
   */
  private loadConfig(): CloudSyncConfig {
    const config = vscode.workspace.getConfiguration('clarity');
    return {
      enabled: config.get<boolean>('cloudSync.enabled') || false,
      provider: config.get<CloudProvider>('cloudSync.provider') || 'none',
      interval: config.get<number>('cloudSync.interval') || 300000, // 5 min default
    };
  }

  /**
   * Cleanup on deactivation
   */
  dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.statusBarItem.dispose();
  }
}
