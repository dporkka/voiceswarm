import { createLogger } from '@aasop/observability';
import type { DockerClient } from './docker.js';
import type { SandboxConfig, ExecutionResult, ExecOpts } from './manager.js';

const logger = createLogger('sandbox');

export class Sandbox {
  private isRunning: boolean;

  constructor(
    readonly id: string,
    readonly containerId: string,
    private docker: DockerClient,
    private config: SandboxConfig
  ) {
    this.isRunning = true;
  }

  async configure(config: SandboxConfig): Promise<void> {
    if (config.workingDir) {
      await this.execute('mkdir', { args: ['-p', config.workingDir] });
    }
  }

  async execute(command: string, opts: ExecOpts & { args?: string[] } = {}): Promise<ExecutionResult> {
    if (!this.isRunning) {
      throw new Error(`Sandbox ${this.id} is not running`);
    }

    const start = Date.now();
    const fullCommand = opts.args ? `${command} ${opts.args.join(' ')}` : command;

    logger.info({ sandboxId: this.id, command: fullCommand }, 'Executing command in sandbox');

    try {
      const result = await this.docker.execInContainer(this.containerId, command, {
        ...opts,
        timeout: opts.timeout ?? this.config.timeoutMs ?? 30000,
      });

      const duration = Date.now() - start;
      logger.info(
        { sandboxId: this.id, exitCode: result.exitCode, duration },
        'Command execution completed'
      );

      return {
        ...result,
        duration,
      };
    } catch (error) {
      logger.error(
        { sandboxId: this.id, command, error: (error as Error).message },
        'Command execution failed'
      );
      throw error;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error(`Sandbox ${this.id} is not running`);
    }

    await this.docker.writeFile(this.containerId, filePath, content);
    logger.debug({ sandboxId: this.id, path: filePath }, 'File written to sandbox');
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.isRunning) {
      throw new Error(`Sandbox ${this.id} is not running`);
    }

    const content = await this.docker.readFile(this.containerId, filePath);
    logger.debug({ sandboxId: this.id, path: filePath, size: content.length }, 'File read from sandbox');
    return content;
  }

  async getLogs(): Promise<string[]> {
    const logs = await this.docker.getContainerLogs(this.containerId);
    return logs.split('\n').filter(Boolean);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.docker.stopContainer(this.containerId, 10);
      this.isRunning = false;
      logger.info({ sandboxId: this.id }, 'Sandbox stopped');
    } catch (error) {
      logger.error({ sandboxId: this.id, error: (error as Error).message }, 'Failed to stop sandbox');
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.docker.restartContainer(this.containerId);
    this.isRunning = true;
    logger.info({ sandboxId: this.id }, 'Sandbox restarted');
  }

  getStatus(): 'running' | 'stopped' {
    return this.isRunning ? 'running' : 'stopped';
  }
}
