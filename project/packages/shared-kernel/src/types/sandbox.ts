/**
 * Sandbox types for isolated agent execution environments.
 */

export enum SandboxStatus {
  PENDING = 'pending',
  CREATING = 'creating',
  RUNNING = 'running',
  PAUSED = 'paused',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

export enum SandboxRuntime {
  NODE_20 = 'node_20',
  PYTHON_3_11 = 'python_3_11',
  PYTHON_3_12 = 'python_3_12',
  RUST = 'rust',
  GO_1_21 = 'go_1_21',
  JAVA_21 = 'java_21',
  DOCKER = 'docker',
}

export enum SandboxNetworkMode {
  ISOLATED = 'isolated',
  LIMITED = 'limited',
  FULL = 'full',
}

/** Resource limits for a sandbox */
export interface SandboxResources {
  cpuCores: number;
  memoryMb: number;
  diskMb: number;
  networkEnabled: boolean;
  networkMode: SandboxNetworkMode;
  allowedHosts: string[];
  gpuCount: number;
  timeoutMs: number;
}

/** A mounted volume in a sandbox */
export interface SandboxVolume {
  name: string;
  sourcePath: string;
  mountPath: string;
  readOnly: boolean;
}

/** Sandbox configuration */
export interface SandboxConfig {
  runtime: SandboxRuntime;
  resources: SandboxResources;
  volumes: SandboxVolume[];
  environmentVariables: Record<string, string>;
  prebuiltImage: string | null;
  entrypoint: string | null;
  command: string[];
  workingDir: string;
  templateId: string | null;
}

/** Core Sandbox domain model */
export interface Sandbox {
  id: string;
  name: string;
  status: SandboxStatus;
  config: SandboxConfig;
  agentId: string | null;
  taskId: string | null;
  projectId: string;
  orgId: string;
  podName: string | null;
  ipAddress: string | null;
  ports: SandboxPort[];
  startedAt: Date | null;
  terminatedAt: Date | null;
  lastHealthCheck: Date | null;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  exitCode: number | null;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Exposed port */
export interface SandboxPort {
  containerPort: number;
  hostPort: number;
  protocol: 'tcp' | 'udp';
  serviceName: string | null;
}

/** Sandbox template for quick provisioning */
export interface SandboxTemplate {
  id: string;
  name: string;
  description: string;
  runtime: SandboxRuntime;
  prebuiltImage: string;
  defaultConfig: Partial<SandboxConfig>;
  packages: string[];
  initScript: string | null;
  orgId: string | null;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Sandbox event */
export interface SandboxEvent {
  sandboxId: string;
  event: 'created' | 'started' | 'stopped' | 'paused' | 'resumed' | 'destroyed' | 'health_check' | 'error';
  data: Record<string, unknown>;
  timestamp: Date;
}

/** Input for creating a sandbox */
export interface CreateSandboxInput {
  name: string;
  config: SandboxConfig;
  agentId?: string;
  taskId?: string;
  projectId: string;
  templateId?: string;
}
