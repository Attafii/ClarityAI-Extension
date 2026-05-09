module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: './',
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.spec.ts',
        '**/*.test.ts',
        '**/*.spec.ts'
    ],
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: {
                esModuleInterop: true,
                allowSyntheticDefaultImports: true
            }
        }]
    },
    transformIgnorePatterns: [
        'node_modules/(?!(ora|boxen|chalk|gradient-string)/)'
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/__tests__/**',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
        '!src/defaultConfig.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        },
        './src/autocorrect.ts': {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
        },
        './src/llmClient.ts': {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90
        },
        './src/privacyGuard.ts': {
            branches: 90,
            functions: 95,
            lines: 95,
            statements: 95
        },
        './src/contextInjection.ts': {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80
        },
        './src/complexityAnalyzer.ts': {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
        },
        './src/templates.ts': {
            branches: 70,
            functions: 75,
            lines: 75,
            statements: 75
        }
    },
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 10000,
    verbose: true,
    bail: false,
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^./cli/ui/spinner$': '<rootDir>/src/__tests__/__mocks__/spinner.ts',
        '^./cli/ui/boxes$': '<rootDir>/src/__tests__/__mocks__/boxes.ts',
        '^./cli/ui/header$': '<rootDir>/src/__tests__/__mocks__/header.ts'
    }
};
