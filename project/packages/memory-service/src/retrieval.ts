import { createLogger } from '@aasop/observability';
import type { MemoryEntry, RetrievalConfig, SemanticSearchResult, ContextWindow } from './service.js';
import type { SemanticMemory } from './semantic.js';
import type { EpisodicMemory } from './episodic.js';
import type { ProjectMemory } from './project.js';
import { ContextAssembler } from './context.js';

const logger = createLogger('memory-retrieval');

export class MultiStageRetrieval {
  private config: RetrievalConfig;

  constructor(
    private semantic: SemanticMemory,
    private episodic: EpisodicMemory,
    private project: ProjectMemory,
    private contextAssembler: ContextAssembler,
    config: RetrievalConfig
  ) {
    this.config = config;
  }

  async search(query: string, overrides?: Partial<RetrievalConfig>): Promise<SemanticSearchResult[]> {
    const config = { ...this.config, ...overrides };

    const queryEmbedding = await this.generateQueryEmbedding(query);

    const [semanticResults, episodicResults] = await Promise.all([
      this.semantic.search(queryEmbedding, config.semanticTopK, config.minScore),
      this.episodic.query({ limit: config.episodicLimit }),
    ]);

    const combined: SemanticSearchResult[] = [...semanticResults];

    for (const entry of episodicResults) {
      if (!combined.some((r) => r.entry.id === entry.id)) {
        combined.push({ entry, score: 0.5, distance: 0.5 });
      }
    }

    if (config.rerank) {
      return this.rerank(combined, query);
    }

    return combined.sort((a, b) => b.score - a.score);
  }

  async getContext(
    query: string,
    opts: { projectId?: string; agentId?: string; taskId?: string }
  ): Promise<ContextWindow> {
    const config = this.config;

    const queryEmbedding = await this.generateQueryEmbedding(query);

    const [semanticResults, episodicResults, projectResults] = await Promise.all([
      this.semantic.search(queryEmbedding, config.semanticTopK, config.minScore),
      this.episodic.query({
        agentId: opts.agentId,
        taskId: opts.taskId,
        projectId: opts.projectId,
        limit: config.episodicLimit,
      }),
      opts.projectId
        ? this.project.searchByEmbedding(opts.projectId, queryEmbedding, config.projectTopK)
        : Promise.resolve([]),
    ]);

    const allEntries: MemoryEntry[] = [];
    const seen = new Set<string>();

    for (const r of semanticResults) {
      if (!seen.has(r.entry.id)) {
        allEntries.push(r.entry);
        seen.add(r.entry.id);
      }
    }
    for (const e of episodicResults) {
      if (!seen.has(e.id)) {
        allEntries.push(e);
        seen.add(e.id);
      }
    }
    for (const p of projectResults) {
      if (!seen.has(p.id)) {
        allEntries.push(p);
        seen.add(p.id);
      }
    }

    return this.contextAssembler.assemble(allEntries, {
      maxTokens: config.maxContextTokens,
      strategy: 'hierarchical',
      prioritizeRecent: true,
      prioritizeImportant: true,
    });
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await fetch('http://localhost:8000/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        return new Array(1536).fill(0).map(() => (Math.random() - 0.5) * 0.01);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data[0]?.embedding || new Array(1536).fill(0);
    } catch {
      return new Array(1536).fill(0).map(() => (Math.random() - 0.5) * 0.01);
    }
  }

  private rerank(results: SemanticSearchResult[], query: string): SemanticSearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    const reranked = results.map((r) => {
      const content = r.entry.content.toLowerCase();
      let termMatches = 0;
      for (const term of queryTerms) {
        if (term.length > 2 && content.includes(term)) termMatches++;
      }
      const termScore = queryTerms.length > 0 ? termMatches / queryTerms.length : 0;
      const adjustedScore = r.score * 0.7 + termScore * 0.3;
      return { ...r, score: adjustedScore };
    });

    return reranked.sort((a, b) => b.score - a.score);
  }
}
