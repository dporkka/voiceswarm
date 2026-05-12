import { createLogger } from '@aasop/observability';

const logger = createLogger('code-activity');

interface CodeExecutionInput {
  code: string;
  language: string;
  timeout?: number;
  files?: Record<string, string>;
}

interface TestInput {
  files: Array<{ path: string; content: string }>;
  testCommand?: string;
  framework?: string;
}

interface LintInput {
  files: Array<{ path: string; content: string }>;
  linter?: string;
  config?: Record<string, unknown>;
}

export async function executeCode(input: CodeExecutionInput): Promise<Record<string, unknown>> {
  logger.info({ language: input.language }, 'Executing code');

  const start = Date.now();

  try {
    // In production, this would use the sandbox manager
    await new Promise((r) => setTimeout(r, 300));

    const result = {
      status: 'success',
      exitCode: 0,
      stdout: `Executed ${input.language} code successfully`,
      stderr: '',
      duration: Date.now() - start,
      memoryUsage: 1024 * 1024,
    };

    logger.info({ language: input.language, duration: result.duration }, 'Code execution completed');
    return result;
  } catch (error) {
    logger.error({ language: input.language, error: (error as Error).message }, 'Code execution failed');
    return {
      status: 'error',
      exitCode: 1,
      stdout: '',
      stderr: (error as Error).message,
      duration: Date.now() - start,
    };
  }
}

export async function runTests(input: TestInput): Promise<Record<string, unknown>> {
  logger.info({ fileCount: input.files.length, framework: input.framework }, 'Running tests');

  const start = Date.now();

  try {
    // In production, this would execute in a sandbox
    await new Promise((r) => setTimeout(r, 500));

    const totalTests = Math.floor(Math.random() * 20) + 5;
    const passed = Math.floor(totalTests * 0.9);

    return {
      status: passed === totalTests ? 'passed' : 'failed',
      total: totalTests,
      passed,
      failed: totalTests - passed,
      duration: Date.now() - start,
      coverage: { lines: 85, functions: 80, branches: 75 },
      details: input.files.map((f) => ({ file: f.path, status: 'passed', tests: 3 })),
    };
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Test execution failed');
    return {
      status: 'error',
      error: (error as Error).message,
      duration: Date.now() - start,
    };
  }
}

export async function lintCode(input: LintInput): Promise<Record<string, unknown>> {
  logger.info({ fileCount: input.files.length, linter: input.linter }, 'Linting code');

  const start = Date.now();

  await new Promise((r) => setTimeout(r, 200));

  const issues = [];
  for (const file of input.files) {
    if (!file.content.includes('//')) {
      issues.push({ file: file.path, line: 1, severity: 'warning', message: 'Missing file header comment' });
    }
  }

  return {
    status: issues.length === 0 ? 'passed' : 'has_issues',
    totalFiles: input.files.length,
    issues,
    duration: Date.now() - start,
  };
}
