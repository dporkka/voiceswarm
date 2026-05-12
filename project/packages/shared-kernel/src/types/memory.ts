/**
 * Memory types for agentic memory system.
 * Memory provides context and learning across sessions.
 */

export enum MemoryType {
  SEMANTIC = 'semantic',
  EPISODIC = 'episodic',
  PROJECT = 'project',
  TASK = 'task',
  CONVERSATION = 'conversation',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
}

export enum MemoryAccess {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
}

/** Source attribution for memory */
export interface MemorySource {
  type: 'task' | 'conversation' | 'document' | 'code' | 'observation' | 'feedback';
  id: string;
  agentId: string;
  timestamp: Date;
}

/** A memory entry in the vector store */
export interface MemoryEntry {
  id: string;
  content: string;
  type: MemoryType;
  embedding: number[] | null;
  metadata: MemoryMetadata;
  source: MemorySource;
  access: MemoryAccess;
  tags: string[];
  relatedMemoryIds: string[];
  confidence: number;
  decayFactor: number;
  agentId: string;
  projectId: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

/** Memory metadata */
export interface MemoryMetadata {
  language?: string;
  filePath?: string;
  codeSnippet?: string;
  summary?: string;
  keywords?: string[];
  importance?: number;
  expiresAt?: Date;
}

/** Query for semantic memory search */
export interface MemoryQuery {
  embedding: number[];
  type?: MemoryType;
  agentId?: string;
  projectId?: string;
  tags?: string[];
  limit?: number;
  minConfidence?: number;
  maxAgeMs?: number;
}

/** Result of a memory search */
export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

/** Working memory for active task context */
export interface WorkingMemory {
  agentId: string;
  taskId: string;
  projectId: string;
  context: Record<string, unknown>;
  recentMemories: string[];
  scratchpad: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Consolidated summary of episodic memories */
export interface MemoryConsolidation {
  id: string;
  agentId: string;
  projectId: string;
  summary: string;
  keyLearnings: string[];
  sourceIds: string[];
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

/** Input for creating a memory entry */
export interface CreateMemoryInput {
  content: string;
  type: MemoryType;
  metadata?: Partial<MemoryMetadata>;
  source: MemorySource;
  access?: MemoryAccess;
  tags?: string[];
  relatedMemoryIds?: string[];
  confidence?: number;
  agentId: string;
  projectId: string;
}

/** Input for memory search */
export interface SearchMemoryInput {
  query: string;
  type?: MemoryType;
  agentId?: string;
  projectId?: string;
  orgId?: string;
  tags?: string[];
  limit?: number;
  minConfidence?: number;
  maxAgeMs?: number;
}
