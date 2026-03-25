/**
 * Jest Setup File
 * Global test configuration and mocking
 */

// Create a simple logger mock
const createMockLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

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

// Make the mock logger available globally for tests
(globalThis as any).createMockLogger = createMockLogger;

// Setup other globals if needed
beforeEach(() => {
    jest.clearAllMocks();
});


