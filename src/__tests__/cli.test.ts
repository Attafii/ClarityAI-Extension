import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { runCli } from '../cli';

function createTempWorkspace(): string {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clarity-cli-'));
    fs.writeFileSync(
        path.join(tempRoot, 'package.json'),
        JSON.stringify(
            {
                name: 'clarity-cli-test',
                version: '0.0.0',
                dependencies: {
                    next: '14.0.0',
                },
                devDependencies: {
                    typescript: '5.4.5',
                    jest: '29.7.0',
                },
                scripts: {
                    build: 'vite build',
                    test: 'jest',
                },
            },
            null,
            2
        ),
        'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020' } }, null, 2), 'utf8');
    fs.mkdirSync(path.join(tempRoot, 'src'), { recursive: true });
    fs.writeFileSync(
        path.join(tempRoot, 'src', 'app.ts'),
        'export function buildLoginFlow() {\n  return true;\n}\n',
        'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, '.clarityrules'), 'Avoid leaking secrets.\nKeep prompts concise.\n', 'utf8');
    return tempRoot;
}

function createIo() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    return {
        io: {
            stdout: (text: string) => stdout.push(text),
            stderr: (text: string) => stderr.push(text),
        },
        getStdout: () => stdout.join(''),
        getStderr: () => stderr.join(''),
    };
}

describe('CLI runtime', () => {
    let workspace: string;

    beforeEach(() => {
        workspace = createTempWorkspace();
    });

    afterEach(() => {
        fs.rmSync(workspace, { recursive: true, force: true });
    });

    it('enhances prompts and emits Copilot-ready output', async () => {
        const capture = createIo();
        const result = await runCli(['enhance', 'build a login form with validation', '--copilot'], {
            cwd: workspace,
            io: capture.io,
        });

        expect(result.exitCode).toBe(0);
        expect(result.success).toBe(true);
        expect(result.enhancedPrompt).toContain('Workspace context:');
        expect(capture.getStdout()).toContain('@copilot');
        expect(capture.getStdout()).toContain('build a login form with validation');
    });

    it('persists quota usage across separate runs', async () => {
        const firstRun = createIo();
        await runCli(['enhance', 'build a login form'], {
            cwd: workspace,
            io: firstRun.io,
        });

        const secondRun = createIo();
        const quotaResult = await runCli(['quota'], {
            cwd: workspace,
            io: secondRun.io,
        });

        expect(quotaResult.exitCode).toBe(0);
        expect(quotaResult.quota?.remainingToday).toBe(49);
        expect(secondRun.getStdout()).toContain('Remaining today: 49');
    });

    it('fills templates with variables from the CLI', async () => {
        const capture = createIo();
        const result = await runCli(['template', 'rest-api', 'resource=users', 'method=POST'], {
            cwd: workspace,
            io: capture.io,
        });

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain('Create a REST API endpoint for users');
        expect(result.output).toContain('HTTP Method: POST');
        expect(capture.getStdout()).toContain('Create a REST API endpoint for users');
    });

    it('saves prompts to the local vault and lists them later', async () => {
        const saveCapture = createIo();
        const saveResult = await runCli(
            ['vault', 'save', '--title', 'Login flow', '--prompt', 'build login', '--enhanced', 'build login better', '--tags', 'auth,forms'],
            {
                cwd: workspace,
                io: saveCapture.io,
            }
        );

        expect(saveResult.exitCode).toBe(0);
        expect(saveResult.vaultPrompt?.title).toBe('Login flow');

        const listCapture = createIo();
        const listResult = await runCli(['vault', 'list'], {
            cwd: workspace,
            io: listCapture.io,
        });

        expect(listResult.exitCode).toBe(0);
        expect(listCapture.getStdout()).toContain('Login flow');
    });
});
