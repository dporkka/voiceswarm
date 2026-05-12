import { createLogger } from '@aasop/observability';
import type { MemoryEntry, IngestionConfig } from './service.js';
import type { SemanticMemory } from './semantic.js';
import type { ProjectMemory } from './project.js';

const logger = createLogger('memory-ingestion');

export class MemoryIngestionPipeline {
  constructor(
    private semantic: SemanticMemory,
    private project: ProjectMemory,
    private config: IngestionConfig
  ) {}

  async process(entry: MemoryEntry): Promise<MemoryEntry> {
    logger.debug({ id: entry.id, type: entry.type }, 'Processing memory entry');

    if (!entry.embedding && this.config.generateEmbeddings) {
      entry.embedding = await this.generateEmbedding(entry.content);
    }

    if (this.config.classifyContent && !entry.type) {
      entry.type = this.classifyContent(entry.content);
    }

    if (this.config.extractEntities) {
      entry.metadata = {
        ...entry.metadata,
        entities: this.extractEntities(entry.content),
      };
    }

    if (this.config.linkRelated) {
      entry.metadata = {
        ...entry.metadata,
        relatedIds: await this.findRelated(entry),
      };
    }

    await Promise.all([
      this.semantic.store(entry).catch((err) => {
        logger.warn({ id: entry.id, error: err.message }, 'Failed to store in semantic memory');
      }),
      entry.projectId
        ? this.project.store(entry).catch((err) => {
            logger.warn({ id: entry.id, error: err.message }, 'Failed to store in project memory');
          })
        : Promise.resolve(),
    ]);

    logger.info({ id: entry.id, type: entry.type }, 'Memory entry processed');
    return entry;
  }

  async batchProcess(entries: MemoryEntry[]): Promise<MemoryEntry[]> {
    logger.info({ count: entries.length }, 'Batch processing memory entries');
    return Promise.all(entries.map((e) => this.process(e)));
  }

  private async generateEmbedding(content: string): Promise<number[]> {
    try {
      const response = await fetch('http://localhost:8000/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: content,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        logger.warn('Embedding generation failed, using zero vector');
        return new Array(1536).fill(0).map(() => (Math.random() - 0.5) * 0.01);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data[0]?.embedding || new Array(1536).fill(0);
    } catch {
      logger.warn('Embedding service unavailable, using random vector');
      return new Array(1536).fill(0).map(() => (Math.random() - 0.5) * 0.01);
    }
  }

  private classifyContent(content: string): MemoryEntry['type'] {
    const lower = content.toLowerCase();
    if (lower.includes('```') || lower.includes('function') || lower.includes('class ')) return 'code';
    if (lower.includes('task:') || lower.includes('todo:') || lower.includes('action item')) return 'task';
    if (lower.includes('user:') || lower.includes('assistant:') || lower.includes('said:')) return 'conversation';
    if (lower.includes('doc:') || lower.includes('documentation') || lower.includes('## ')) return 'document';
    if (lower.includes('observe:') || lower.includes('noted:') || lower.includes('found:')) return 'observation';
    return 'fact';
  }

  private extractEntities(content: string): string[] {
    const entities: string[] = [];
    const patterns = [
      /(?:mentioned|refers to|called|named)\s+["']?([A-Z][a-zA-Z\s]+)["']?/g,
      /(?:file|path|directory)\s+[`"']([^`"']+)[`"']/g,
      /(?:API|endpoint|url)\s+[`"']([^`"']+)[`"']/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        entities.push(match[1]);
      }
    }
    return entities;
  }

  private async findRelated(entry: MemoryEntry): Promise<string[]> {
    if (!entry.embedding) return [];
    const results = await this.semantic.search(entry.embedding, 3, 0.85);
    return results.filter((r) => r.entry.id !== entry.id).map((r) => r.entry.id);
  }
}
