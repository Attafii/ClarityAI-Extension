const workspaceConfiguration = {
    get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    update: jest.fn(async () => undefined),
};

const vscodeMock = {
    window: {
        activeTextEditor: undefined,
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            dispose: jest.fn(),
        })),
        createWebviewPanel: jest.fn(() => ({
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
            },
            dispose: jest.fn(),
        })),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showQuickPick: jest.fn(),
    },
    workspace: {
        workspaceFolders: undefined,
        getConfiguration: jest.fn(() => workspaceConfiguration),
        getWorkspaceFolder: jest.fn(() => undefined),
        findFiles: jest.fn(async () => []),
        asRelativePath: jest.fn((value: any) => value?.fsPath || String(value)),
        fs: {
            readFile: jest.fn(async () => Buffer.from('')),
        },
    },
    env: {
        openExternal: jest.fn(),
        clipboard: {
            writeText: jest.fn(),
        },
    },
    Uri: {
        parse: jest.fn((value: string) => ({ fsPath: value })),
        joinPath: jest.fn((base: any, ...paths: string[]) => ({
            fsPath: [base?.fsPath || base, ...paths].filter(Boolean).join('/'),
        })),
    },
    ViewColumn: {
        One: 1,
    },
    ConfigurationTarget: {
        Global: 1,
    },
    chat: {
        createChatParticipant: jest.fn(),
    },
    commands: {
        executeCommand: jest.fn(),
    },
};

jest.mock('vscode', () => vscodeMock, { virtual: true });

jest.mock('../cli/ui/spinner', () => ({
    createSpinner: jest.fn(() => ({ start: () => ({ succeed: () => {}, fail: () => {}, warn: () => {} }), succeed: () => {}, fail: () => {}, warn: () => {} })),
    pulseSpinner: jest.fn(() => ({ start: () => {}, succeed: () => {}, fail: () => {}, warn: () => {} })),
    logicDistillSpinner: jest.fn(() => ({ start: () => {}, succeed: () => {}, fail: () => {}, warn: () => {} })),
    successSpin: jest.fn(() => ({ start: () => {}, succeed: () => {}, fail: () => {}, warn: () => {} })),
    failSpin: jest.fn(() => ({ start: () => {}, succeed: () => {}, fail: () => {}, warn: () => {} })),
    warnSpin: jest.fn(() => ({ start: () => {}, succeed: () => {}, fail: () => {}, warn: () => {} })),
}));

jest.mock('../cli/ui/boxes', () => ({
    createBox: jest.fn((content: string, options?: { title?: string }) => options?.title ? `${options.title}: ${content}` : content),
    createSection: jest.fn((title: string, content: string) => `${title}: ${content}`),
    createInfoBox: jest.fn((content: string) => `INFO: ${content}`),
    createSuccessBox: jest.fn((content: string) => `SUCCESS: ${content}`),
    createWarningBox: jest.fn((content: string) => `WARNING: ${content}`),
    createErrorBox: jest.fn((content: string) => `ERROR: ${content}`),
    createDimBox: jest.fn((content: string) => `BOX: ${content}`),
}));

jest.mock('../cli/ui/header', () => ({
    ASCII_LOGO: 'MOCK_LOGO',
    printHeader: jest.fn(() => 'MOCK_LOGO'),
    printVersion: jest.fn((version: string) => `v${version}`),
    printTagline: jest.fn(() => 'Mock tagline'),
}));
