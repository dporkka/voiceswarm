import { createLogger } from '@aasop/observability';
import type { MemoryEntry, ContextWindow } from './service.js';

const logger = createLogger('context-assembler');

interface ContextAssemblyOptions {
  maxTokens: number;
  strategy: 'sliding' | 'hierarchical' | 'summarized';
  prioritizeRecent?: boolean;
  prioritizeImportant?: boolean;
  summaryBudget?: number;
}

export class ContextAssembler {
  private maxTokens: number;

  constructor(maxTokens = 4000) {
    this.maxTokens = maxTokens;
  }

  async assemble(
    entries: MemoryEntry[],
    opts: Partial<ContextAssemblyOptions> = {}
  ): Promise<ContextWindow> {
    const options: ContextAssemblyOptions = {
      maxTokens: opts.maxTokens ?? this.maxTokens,
      strategy: opts.strategy ?? 'sliding',
      prioritizeRecent: opts.prioritizeRecent ?? true,
      prioritizeImportant: opts.prioritizeImportant ?? true,
      summaryBudget: opts.summaryBudget ?? 500,
    };

    let selected: MemoryEntry[];

    switch (options.strategy) {
      case 'hierarchical':
        selected = this.hierarchicalSelect(entries, options);
        break;
      case 'summarized':
        selected = await this.summarizedSelect(entries, options);
        break;
      case 'sliding':
      default:
        selected = this.slidingWindowSelect(entries, options);
        break;
    }

    const totalTokens = this.estimateTokens(selected);

    logger.debug(
      { entries: entries.length, selected: selected.length, totalTokens, strategy: options.strategy },
      'Context assembled'
    );

    return {
      entries: selected,
      totalTokens,
      maxTokens: options.maxTokens,
      windowType: options.strategy,
    };
  }

  private slidingWindowSelect(
    entries: MemoryEntry[],
    opts: ContextAssemblyOptions
  ): MemoryEntry[] {
    let sorted = [...entries];

    if (opts.prioritizeImportant && opts.prioritizeRecent) {
      sorted.sort((a, b) => {
        const impDiff = (b.importance ?? 1) - (a.importance ?? 1);
        if (impDiff !== 0) return impDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    } else if (opts.prioritizeRecent) {
      sorted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else if (opts.prioritizeImportant) {
      sorted.sort((a, b) => (b.importance ?? 1) - (a.importance ?? 1));
    }

    const result: MemoryEntry[] = [];
    let currentTokens = 0;

    for (const entry of sorted) {
      const entryTokens = this.estimateEntryTokens(entry);
      if (currentTokens + entryTokens > opts.maxTokens) break;
      result.push(entry);
      currentTokens += entryTokens;
    }

    return result;
  }

  private hierarchicalSelect(
    entries: MemoryEntry[],
    opts: ContextAssemblyOptions
  ): MemoryEntry[] {
    const layers = new Map<string, MemoryEntry[]>();

    for (const entry of entries) {
      const layer = entry.type;
      const existing = layers.get(layer) || [];
      existing.push(entry);
      layers.set(layer, existing);
    }

    const layerOrder = ['conversation', 'task', 'code', 'document', 'fact', 'observation'];
    const result: MemoryEntry[] = [];
    let currentTokens = 0;

    for (const layer of layerOrder) {
      const layerEntries = (layers.get(layer) || []).sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      const layerBudget = Math.floor(opts.maxTokens * 0.3);
      let layerTokens = 0;

      for (const entry of layerEntries) {
        const entryTokens = this.estimateEntryTokens(entry);
        if (currentTokens + entryTokens > opts.maxTokens) break;
        if (layerTokens + entryTokens > layerBudget) break;
        result.push(entry);
        currentTokens += entryTokens;
        layerTokens += entryTokens;
      }
    }

    return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async summarizedSelect(
    entries: MemoryEntry[],
    opts: ContextAssemblyOptions
  ): Promise<MemoryEntry[]> {
    const recent = this.slidingWindowSelect(entries, {
      ...opts,
      maxTokens: opts.maxTokens - (opts.summaryBudget ?? 500),
    });

    const older = entries.filter(
      (e) => !recent.some((r) => r.id === e.id)
    );

    if (older.length > 0) {
      const summaryContent = `## Summary of ${older.length} older memories\n\n${older
        .map((e) => `- [${e.type}] ${e.content.slice(0, 200)}${e.content.length > 200 ? '...' : ''}`)
        .join('\n')}`;

      const summaryEntry: MemoryEntry = {
        id: `summary_${Date.now()}`,
        content: summaryContent,
        type: 'fact',
        metadata: { isSummary: true, originalCount: older.length },
        timestamp: new Date(),
        importance: 0.5,
      };

      recent.unshift(summaryEntry);
    }

    return recent;
  }

  private estimateTokens(entries: MemoryEntry[]): number {
    return entries.reduce((sum, e) => sum + this.estimateEntryTokens(e), 0);
  }

  private estimateEntryTokens(entry: MemoryEntry): number {
    return Math.ceil(entry.content.length / 4) + 2;
  }
}
