import Docker from 'dockerode';
import { createLogger } from '@aasop/observability';
import type { SecurityProfile } from './security.js';

const logger = createLogger('docker');

interface CreateContainerOptions {
  id: string;
  image: string;
  command?: string[];
  env?: Record<string, string>;
  memoryLimit?: string;
  cpuLimit?: string;
  networkEnabled?: boolean;
  volumeMounts?: Array<{ host: string; container: string; mode: 'ro' | 'rw' }>;
  workingDir?: string;
  labels?: Record<string, string>;
  securityProfile?: SecurityProfile;
}

interface RemoveContainerOptions {
  force?: boolean;
  volumes?: boolean;
}

export class DockerClient {
  private docker: Docker;

  constructor(socketPath = '/var/run/docker.sock') {
    this.docker = new Docker({ socketPath });
  }

  async createContainer(opts: CreateContainerOptions): Promise<string> {
    const memoryBytes = this.parseMemory(opts.memoryLimit || '512m');
    const cpuQuota = this.parseCPU(opts.cpuLimit || '1');

    const env = opts.env
      ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`)
      : [];

    const binds = opts.volumeMounts?.map(
      (v) => `${v.host}:${v.container}:${v.mode}`
    );

    const profile = opts.securityProfile;
    const securityOpt: string[] = [];
    if (profile?.seccompProfile) {
      securityOpt.push(`seccomp=${profile.seccompProfile}`);
    }
    if (profile?.noNewPrivileges) {
      securityOpt.push('no-new-privileges:true');
    }
    if (profile?.appArmorProfile) {
      securityOpt.push(`apparmor=${profile.appArmorProfile}`);
    }

    const hostConfig: Docker.HostConfig = {
      Memory: memoryBytes,
      CpuQuota: cpuQuota,
      CpuPeriod: cpuQuota > 0 ? 100000 : undefined,
      NetworkMode: profile?.networkMode || (opts.networkEnabled ? 'bridge' : 'none'),
      Binds: binds,
      ReadonlyRootfs: profile?.readOnlyRootfs ?? true,
      SecurityOpt: securityOpt.length > 0 ? securityOpt : undefined,
      CapDrop: profile?.capabilities?.drop,
      CapAdd: profile?.capabilities?.add,
      PidsLimit: profile?.maxProcesses ?? 100,
    };

    const container = await this.docker.createContainer({
      Image: opts.image,
      Cmd: opts.command,
      Env: env,
      WorkingDir: opts.workingDir,
      Labels: opts.labels,
      HostConfig: hostConfig,
      AttachStdout: true,
      AttachStderr: true,
    });

    logger.info({ containerId: container.id, image: opts.image }, 'Container created');
    return container.id;
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
    logger.debug({ containerId }, 'Container started');
  }

  async stopContainer(containerId: string, timeout = 10): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      await container.stop({ t: timeout });
    } catch (error) {
      logger.warn({ containerId, error: (error as Error).message }, 'Container stop timed out, killing');
      await container.kill();
    }
    logger.debug({ containerId }, 'Container stopped');
  }

  async restartContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.restart({ t: 10 });
    logger.debug({ containerId }, 'Container restarted');
  }

  async removeContainer(containerId: string, opts: RemoveContainerOptions = {}): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.remove({ force: opts.force, v: opts.volumes });
    logger.debug({ containerId }, 'Container removed');
  }

  async execInContainer(
    containerId: string,
    command: string,
    opts: { timeout?: number; env?: Record<string, string>; cwd?: string; stdin?: string; args?: string[] }
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const container = this.docker.getContainer(containerId);

    const cmd = opts.args ? [command, ...opts.args] : ['/bin/sh', '-c', command];

    const exec = await container.exec({
      Cmd: cmd,
      WorkingDir: opts.cwd,
      Env: opts.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : undefined,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: !!opts.stdin,
      Tty: false,
    });

    const stream = await exec.start({ hijack: true, stdin: !!opts.stdin });

    if (opts.stdin) {
      stream.write(opts.stdin);
      stream.end();
    }

    let stdout = '';
    let stderr = '';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timed out after ${opts.timeout ?? 30000}ms`));
      }, opts.timeout ?? 30000);

      stream.on('data', (chunk: Buffer) => {
        const header = chunk[0];
        if (header === 1) stdout += chunk.slice(8).toString('utf-8');
        else if (header === 2) stderr += chunk.slice(8).toString('utf-8');
        else stdout += chunk.toString('utf-8');
      });

      stream.on('end', async () => {
        clearTimeout(timeout);
        try {
          const result = await exec.inspect();
          resolve({
            exitCode: result.ExitCode ?? -1,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async writeFile(containerId: string, filePath: string, content: string): Promise<void> {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/\n/g, '\\n');

    const command = `printf '%b' '${escaped}' > ${filePath}`;
    await this.execInContainer(containerId, command, { timeout: 10000 });
  }

  async readFile(containerId: string, filePath: string): Promise<string> {
    const result = await this.execInContainer(containerId, `cat ${filePath}`, { timeout: 10000 });
    if (result.exitCode !== 0) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }
    return result.stdout;
  }

  async getContainerLogs(containerId: string): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({ stdout: true, stderr: true, tail: 500 });
    return logs.toString('utf-8');
  }

  async listContainers(opts: { all?: boolean; filters?: Record<string, string[]> } = {}): Promise<Docker.ContainerInfo[]> {
    const containers = await this.docker.listContainers({
      all: opts.all,
      filters: opts.filters,
    });
    return containers;
  }

  async inspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo> {
    const container = this.docker.getContainer(containerId);
    return await container.inspect();
  }

  private parseMemory(mem: string): number {
    const match = mem.match(/^(\d+)([kmg]?)b?$/i);
    if (!match) return 512 * 1024 * 1024;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 };
    return value * (multipliers[unit] || 1);
  }

  private parseCPU(cpu: string): number {
    const match = cpu.match(/^(\d+(?:\.\d+)?)$/);
    if (!match) return 100000;
    const value = parseFloat(match[1]);
    return Math.round(value * 100000);
  }
}
