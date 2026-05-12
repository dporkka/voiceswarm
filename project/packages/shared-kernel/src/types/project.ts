/**
 * Project and organization types.
 * Projects are the primary organizational unit for work.
 */

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ProjectVisibility {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

/** Technology stack configuration for a project */
export interface ProjectStack {
  languages: string[];
  frameworks: string[];
  runtime: string;
  packageManager: string;
  buildTool: string;
  testFramework: string;
  linter: string;
  formatter: string;
}

/** Repository configuration */
export interface RepoConfig {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'gitea';
  owner: string;
  name: string;
  defaultBranch: string;
  cloneUrl: string;
  webhookUrl: string | null;
}

/** Core Project domain model */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  stack: ProjectStack;
  repo: RepoConfig | null;
  orgId: string;
  ownerId: string;
  memberIds: string[];
  agentIds: string[];
  tags: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a project */
export interface CreateProjectInput {
  name: string;
  description: string;
  visibility?: ProjectVisibility;
  stack?: Partial<ProjectStack>;
  repo?: RepoConfig;
  orgId: string;
  tags?: string[];
  settings?: Record<string, unknown>;
}

/** Input for updating a project */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  stack?: Partial<ProjectStack>;
  tags?: string[];
  settings?: Record<string, unknown>;
}

/** Organization model */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Organization membership */
export interface OrgMembership {
  id: string;
  orgId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: Date;
}
