import { createLogger } from '@aasop/observability';
import { SemanticMemory } from './semantic.js';
import { EpisodicMemory } from './episodic.js';
import { ProjectMemory } from './project.js';
import { ContextAssembler } from './context.js';
import { MemoryIngestionPipeline } from './ingestion.js';
import { MultiStageRetrieval } from './retrieval.js';

const logger = createLogger('memory-service');

export interface MemoryEntry {
  id: string;
  content: string;
  type: 'fact' | 'conversation' | 'code' | 'document' | 'task' | 'observation';
  metadata: Record<string, unknown>;
  embedding?: number[];
  projectId?: string;
  agentId?: string;
  taskId?: string;
  timestamp: Date;
  importance?: number;
  tags?: string[];
}

export interface SemanticSearchResult {
  entry: MemoryEntry;
  score: number;
  distance: number;
}

export interface EpisodicQuery {
  agentId?: string;
  taskId?: string;
  projectId?: string;
  startTime?: Date;
  endTime?: Date;
  eventType?: string;
  limit?: number;
}

export interface ContextWindow {
  entries: MemoryEntry[];
  totalTokens: number;
  maxTokens: number;
  windowType: 'sliding' | 'hierarchical' | 'summarized';
}

export interface IngestionConfig {
  generateEmbeddings: boolean;
  classifyContent: boolean;
  extractEntities: boolean;
  linkRelated: boolean;
  maxTokensPerChunk: number;
  chunkOverlap: number;
}

export interface RetrievalConfig {
  semanticTopK: number;
  episodicLimit: number;
  projectTopK: number;
  minScore: number;
  rerank: boolean;
  maxContextTokens: number;
}

export class MemoryService {
  private ingestion: MemoryIngestionPipeline;
  private retrieval: MultiStageRetrieval;

  constructor(
    private semantic: SemanticMemory,
    private episodic: EpisodicMemory,
    private project: ProjectMemory,
    private context: ContextAssembler,
    config?: { ingestion?: Partial<IngestionConfig>; retrieval?: Partial<RetrievalConfig> }
  ) {
    this.ingestion = new MemoryIngestionPipeline(semantic, project, {
      generateEmbeddings: true,
      classifyContent: true,
      extractEntities: true,
      linkRelated: true,
      maxTokensPerChunk: 512,
      chunkOverlap: 50,
      ...config?.ingestion,
    });

    this.retrieval = new MultiStageRetrieval(semantic, episodic, project, context, {
      semanticTopK: 5,
      episodicLimit: 10,
      projectTopK: 5,
      minScore: 0.7,
      rerank: true,
      maxContextTokens: 4000,
      ...config?.retrieval,
    });
  }

  async store(entry: MemoryEntry): Promise<MemoryEntry> {
    logger.info({ id: entry.id, type: entry.type }, 'Storing memory entry');
    return this.ingestion.process(entry);
  }

  async search(query: string, config?: Partial<RetrievalConfig>): Promise<SemanticSearchResult[]> {
    logger.info({ query }, 'Searching memories');
    return this.retrieval.search(query, config);
  }

  async getContext(
    query: string,
    opts: { projectId?: string; agentId?: string; taskId?: string } = {}
  ): Promise<ContextWindow> {
    logger.info({ query, projectId: opts.projectId }, 'Assembling context');
    return this.retrieval.getContext(query, opts);
  }

  async getById(id: string): Promise<MemoryEntry | null> {
    const semantic = await this.semantic.getById(id);
    if (semantic) return semantic;

    const episodic = await this.episodic.getById(id);
    if (episodic) return episodic;

    const project = await this.project.getById(id);
    return project || null;
  }

  async queryEpisodic(query: EpisodicQuery): Promise<MemoryEntry[]> {
    return this.episodic.query(query);
  }

  async getProjectMemories(projectId: string, limit = 20): Promise<MemoryEntry[]> {
    return this.project.getByProject(projectId, limit);
  }

  async delete(id: string): Promise<void> {
    logger.info({ id }, 'Deleting memory entry');
    await Promise.all([
      this.semantic.delete(id).catch(() => {}),
      this.episodic.delete(id).catch(() => {}),
      this.project.delete(id).catch(() => {}),
    ]);
  }

  async batchStore(entries: MemoryEntry[]): Promise<MemoryEntry[]> {
    logger.info({ count: entries.length }, 'Batch storing memory entries');
    return Promise.all(entries.map((e) => this.ingestion.process(e)));
  }

  async getStats(): Promise<{
    semantic: { count: number };
    episodic: { count: number };
    project: { count: number };
  }> {
    const [semantic, episodic, project] = await Promise.all([
      this.semantic.count(),
      this.episodic.count(),
      this.project.count(),
    ]);
    return { semantic, episodic, project };
  }
}
