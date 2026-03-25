/**
 * Jest Setup File
 * Global test configuration and mocking
 */

// Mock VS Code API
jest.mock('vscode', () => ({
    ExtensionContext: jest.fn(),
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showQuickPick: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
        workspaceFolders: undefined,
    },
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn(),
    },
    EventEmitter: jest.fn(),
}), { virtual: true });

// Setup other globals if needed
beforeEach(() => {
    jest.clearAllMocks();
});
