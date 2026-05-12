# Autonomous Agentic Software Organization Platform
## Complete Architecture Strategy & Engineering Roadmap

**Version:** 1.0.0  
**Status:** DRAFT  
**Classification:** Architecture Decision Record — Strategic  
**Stakeholders:** Engineering Leadership, Product, Platform Architecture, Security, DevOps

---

## Table of Contents

- [Item 16: Frontend Architecture](#item-16-frontend-architecture)
- [Item 17: Backend Architecture](#item-17-backend-architecture)
- [Item 29: Step-by-Step Implementation Roadmap](#item-29-step-by-step-implementation-roadmap)
- [Item 30: MVP Scope](#item-30-mvp-scope)
- [Item 31: Enterprise Roadmap](#item-31-enterprise-roadmap)
- [Item 32: Technical Debt Prevention Strategy](#item-32-technical-debt-prevention-strategy)
- [Item 33: Performance Bottleneck Analysis](#item-33-performance-bottleneck-analysis)
- [Item 34: Failure-Mode Analysis (FMEA)](#item-34-failure-mode-analysis-fmea)
- [Item 35: Tradeoff Analysis](#item-35-tradeoff-analysis)
- [Item 40: Long-Term Maintainability Analysis](#item-40-long-term-maintainability-analysis)

---

## Item 16: Frontend Architecture

### 16.1 Philosophy & Strategic Principles

The frontend of the Autonomous Agentic Software Organization Platform serves as the **mission control interface for an AI-driven software organization**. It is not merely a dashboard—it is a real-time operating environment where human operators supervise, direct, and collaborate with autonomous agents executing complex software engineering workflows. This demands a frontend architecture that treats real-time collaboration, terminal streaming, IDE-like code editing, and AI chat as first-class citizens rather than bolted-on features.

**Core Principles:**
1. **Real-Time-First**: Every component must gracefully handle streaming data, live updates, and concurrent mutations
2. **Agent-Centric**: The UI orbits around agents as the primary actors, not humans
3. **Progressive Disclosure**: Surface critical status prominently; drill down to full observability
4. **Keyboard-Native**: Power users must navigate efficiently without reaching for a mouse
5. **Resilient Offline**: Graceful degradation when connectivity flickers during long-running operations

### 16.2 App Structure: Next.js App Router Organization

```
app/
├── (auth)/                          # Auth group — no sidebar layout
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── invite/[token]/page.tsx
│
├── (platform)/                      # Main platform — with shell layout
│   ├── layout.tsx                   # Root platform shell
│   ├── page.tsx                     # Dashboard home
│   │
│   ├── agents/                      # Agent management
│   │   ├── page.tsx                 # Agent listing
│   │   ├── [agentId]/
│   │   │   ├── page.tsx             # Agent detail
│   │   │   ├── sessions/
│   │   │   ├── knowledge/
│   │   │   └── settings/
│   │   └── create/page.tsx
│   │
│   ├── tasks/                       # Task orchestration
│   │   ├── page.tsx                 # Task queue/list
│   │   ├── [taskId]/
│   │   │   ├── page.tsx             # Task detail
│   │   │   ├── timeline/
│   │   │   ├── logs/
│   │   │   └── artifacts/
│   │   └── templates/
│   │
│   ├── workflows/                   # Durable workflow definitions
│   │   ├── page.tsx
│   │   ├── [workflowId]/
│   │   └── builder/
│   │
│   ├── projects/                    # Project workspace
│   │   ├── page.tsx
│   │   └── [projectId]/
│   │       ├── page.tsx
│   │       ├── files/
│   │       ├── kanban/
│   │       ├── code-review/
│   │       └── settings/
│   │
│   ├── ide/                         # Embedded IDE experience
│   │   ├── page.tsx
│   │   └── [[...path]]/
│   │
│   ├── terminal/                    # Terminal sessions
│   │   ├── page.tsx
│   │   └── [sessionId]/
│   │
│   ├── chat/                        # AI chat interface
│   │   ├── page.tsx
│   │   └── [conversationId]/
│   │
│   ├── voice/                       # Voice orchestration
│   │   └── page.tsx
│   │
│   ├── observability/               # Metrics, traces, logs
│   │   ├── page.tsx
│   │   ├── traces/
│   │   ├── metrics/
│   │   ├── logs/
│   │   └── alerts/
│   │
│   ├── team/                        # Collaboration
│   │   ├── page.tsx
│   │   ├── members/
│   │   └── activity/
│   │
│   ├── settings/                    # Org settings
│   │   ├── page.tsx
│   │   ├── billing/
│   │   ├── integrations/
│   │   ├── security/
│   │   └── api-keys/
│   │
│   └── admin/                       # Admin panel (role-gated)
│       ├── page.tsx
│       ├── users/
│       ├── organizations/
│       └── system/
│
├── api/                             # Route handlers
│   ├── auth/[...nextauth]/
│   ├── webhooks/
│   ├── sse/
│   └── upload/
│
├── layout.tsx                       # Root layout (providers, fonts)
├── loading.tsx                      # Global loading shell
├── error.tsx                        # Global error boundary
├── not-found.tsx
└── globals.css

components/
├── ui/                              # shadcn/ui base (monorepo shared)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── ...
├── atoms/                           # Atomic design — atoms
│   ├── status-dot.tsx
│   ├── agent-avatar.tsx
│   ├── code-block.tsx
│   ├── time-ago.tsx
│   └── priority-badge.tsx
├── molecules/                       # Composable units
│   ├── task-card.tsx
│   ├── agent-card.tsx
│   ├── message-bubble.tsx
│   ├── log-line.tsx
│   └── metric-sparkline.tsx
├── organisms/                       # Complex sections
│   ├── kanban-board/
│   ├── chat-panel/
│   ├── terminal-panel/
│   ├── file-explorer/
│   ├── workflow-visualizer/
│   ├── code-diff-viewer/
│   └── dashboard-widget/
├── templates/                       # Page-level layouts
│   ├── platform-shell/
│   ├── auth-layout/
│   └── settings-layout/
└── providers/                       # React context providers
    ├── query-provider.tsx
    ├── websocket-provider.tsx
    ├── theme-provider.tsx
    └── auth-provider.tsx

lib/
├── api/                             # tRPC/OpenAPI clients
│   ├── trpc-client.ts
│   ├── rest-client.ts
│   └── hooks/
├── stores/                          # Zustand stores
│   ├── use-agent-store.ts
│   ├── use-task-store.ts
│   ├── use-ui-store.ts
│   ├── use-terminal-store.ts
│   └── use-chat-store.ts
├── hooks/                           # Custom hooks
│   ├── use-websocket.ts
│   ├── use-optimistic.ts
│   ├── use-infinite-scroll.ts
│   ├── use-keyboard-shortcut.ts
│   ├── use-agent-stream.ts
│   └── use-voice-command.ts
├── utils/
│   ├── cn.ts                        # tailwind merge
│   ├── format.ts                    # date/number formatting
│   ├── validators.ts                # zod schema helpers
│   └── constants.ts
└── types/
    ├── api.ts
    ├── agent.ts
    ├── task.ts
    └── workflow.ts
```

**Route Organization Strategy:**

| Concern | Pattern | Rationale |
|---------|---------|-----------|
| Auth routes | `(auth)` group | Clean separation, different layout shell |
| Platform routes | `(platform)` group | Shared sidebar + topbar + context |
| Dynamic segments | `[id]` with parallel routes | Deep-linking, shareable URLs |
| API routes | `route.ts` in App Router | Direct handler access, streaming support |
| Parallel routes | `@modal`, `@sidebar` | Complex layouts without prop drilling |
| Intercepting routes | `(.)modal` | Modal overlays preserving context |

### 16.3 Component Architecture: Atomic Design + shadcn/ui

**Atomic Design Hierarchy:**

The component architecture follows a modified Atomic Design methodology where shadcn/ui provides the foundational **UI primitives** (atoms), and the application builds **domain-specific components** (molecules, organisms) on top.

**Layer 1: UI Primitives (shadcn/ui)** — The design system's building blocks, kept as close to upstream shadcn/ui as possible to benefit from updates:
- Form controls: Button, Input, Select, Textarea, Checkbox, Radio, Switch
- Layout: Card, Dialog, Sheet, Tabs, Accordion, Collapsible
- Data display: Table, Badge, Avatar, Skeleton, Separator
- Feedback: Toast, Alert, Progress, Tooltip
- Navigation: Command (Cmd+K), Breadcrumb, Navigation Menu
- Overlay: Popover, Dropdown Menu, Context Menu, Hover Card
- Advanced: Calendar, Carousel, Resizable, Scroll Area, Sonner

**Layer 2: Domain Atoms** — Context-aware primitives specific to the agentic platform:

| Component | Props | Description |
|-----------|-------|-------------|
| `StatusDot` | `status: 'idle' \| 'running' \| 'success' \| 'error' \| 'warning'` | Animated status indicator with semantic color |
| `AgentAvatar` | `agentId, size, showStatus` | Avatar with agent-type icon overlay |
| `CodeBlock` | `code, language, showLineNumbers, collapsible` | Syntax-highlighted code with copy action |
| `TimeAgo` | `date, precision` | Human-relative time with tooltip for absolute |
| `PriorityBadge` | `level: 1-5` | Color-coded priority with icon |
| `CostPill` | `cents, currency` | Normalized cost display |
| `TokenBar` | `used, limit, type` | Visual token consumption indicator |

**Layer 3: Molecules** — Composable units that combine atoms for specific use cases:
- `TaskCard`: Combines StatusDot + PriorityBadge + TimeAgo + AgentAvatar for task display
- `MessageBubble`: CodeBlock + markdown rendering + action buttons for chat
- `LogLine`: Timestamp + severity color + structured log content
- `MetricSparkline`: Mini chart with trend indicator for dashboard widgets

**Layer 4: Organisms** — Complex, self-contained sections:

**KanbanBoard Organism:**
```typescript
interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCardMove: (cardId: string, from: string, to: string, index: number) => void;
  onCardClick: (cardId: string) => void;
  realTimeUpdates: boolean;
  swimlaneField?: string;
  filters: KanbanFilter[];
}
```
Built on `@dnd-kit/core` with `@dnd-kit/sortable` for accessible drag-and-drop. Supports multi-column swimlanes (e.g., grouping by agent or priority), real-time card position synchronization via WebSocket broadcasts, optimistic updates with rollback on conflict, and keyboard-only reordering (Alt+Arrow keys).

**TerminalPanel Organism:**
Built on `xterm.js` with `xterm-addon-fit`, `xterm-addon-web-links`, and `xterm-addon-search`. Features include multi-tab session management (up to 10 concurrent sessions per user), theme synchronization with the app theme system (automatic color mapping from Tailwind colors to xterm.js theme), buffer search (Cmd+F), scrollback buffer (configurable, default 10,000 lines), WebSocket-driven streaming with backpressure handling, and session persistence (reconnect restores scrollback).

**ChatPanel Organism:**
Implements message threading with infinite scroll pagination, streaming response rendering with progressive markdown parsing (using `react-markdown` + `remark-gfm`), code block extraction with syntax highlighting via `react-syntax-highlighter`, inline action buttons ("Run", "Copy", "Insert into Editor"), typing indicators, message editing/branching (fork conversation from any point), and voice input integration.

**FileExplorer Organism:**
Tree view with lazy loading, multi-select, drag-and-drop for file reordering, context menu for file operations, git status indicators (modified, added, deleted), and integration with Monaco Editor for file content display.

### 16.4 State Management: Zustand + React Query Architecture

**State Classification Framework:**

| State Type | Technology | Persistence | Scope | Example |
|------------|-----------|-------------|-------|---------|
| Server State | React Query (tanstack-query) | HTTP cache | Global | Tasks, agents, workflows |
| Global UI State | Zustand | localStorage | Global | Sidebar collapsed, theme, active tab |
| Domain State | Zustand | In-memory | Feature | Active agent selection, filter state |
| Ephemeral State | useState/useReducer | None | Component | Form inputs, dropdown open |
| Real-Time State | Zustand + WebSocket | None | Global | Live logs, streaming output |

**Zustand Store Architecture:**

```typescript
// stores/use-agent-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

interface AgentState {
  // State
  agents: Agent[];
  selectedAgentId: string | null;
  filters: AgentFilters;
  viewMode: 'grid' | 'list' | 'timeline';

  // Computed (via selectors)
  selectedAgent: Agent | null;
  filteredAgents: Agent[];

  // Actions
  setAgents: (agents: Agent[]) => void;
  selectAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  setFilters: (filters: Partial<AgentFilters>) => void;
  setViewMode: (mode: 'grid' | 'list' | 'timeline') => void;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    immer(
      subscribeWithSelector((set, get) => ({
        agents: [],
        selectedAgentId: null,
        filters: { status: 'all', type: 'all', search: '' },
        viewMode: 'grid',

        selectedAgent: null, // computed via selector
        filteredAgents: [], // computed via selector

        setAgents: (agents) => set({ agents }, false, 'agents/setAgents'),
        selectAgent: (id) => set({ selectedAgentId: id }, false, 'agents/selectAgent'),
        updateAgentStatus: (id, status) =>
          set((state) => {
            const agent = state.agents.find((a) => a.id === id);
            if (agent) agent.status = status;
          }, false, 'agents/updateStatus'),
        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
          }, false, 'agents/setFilters'),
        setViewMode: (mode) => set({ viewMode: mode }, false, 'agents/setViewMode'),
      }))
    ),
    { name: 'AgentStore' }
  )
);

// Selector hooks for computed values
export const useSelectedAgent = () =>
  useAgentStore((s) => s.agents.find((a) => a.id === s.selectedAgentId));

export const useFilteredAgents = () =>
  useAgentStore((s) =>
    s.agents.filter((a) => {
      const statusMatch = s.filters.status === 'all' || a.status === s.filters.status;
      const typeMatch = s.filters.type === 'all' || a.type === s.filters.type;
      const searchMatch = !s.filters.search ||
        a.name.toLowerCase().includes(s.filters.search.toLowerCase());
      return statusMatch && typeMatch && searchMatch;
    })
  );
```

**React Query Integration Pattern:**

```typescript
// hooks/use-agents.ts
export function useAgents(filters: AgentFilters) {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: () => api.agents.list(filters),
    staleTime: 30 * 1000,      // 30s stale
    gcTime: 5 * 60 * 1000,     // 5min cache
    refetchInterval: (query) => {
      // Aggressive polling when agents are running
      const data = query.state.data as Agent[] | undefined;
      const hasRunning = data?.some((a) => a.status === 'running');
      return hasRunning ? 2000 : false; // 2s poll if running, else stop
    },
    placeholderData: keepPreviousData,
  });
}

export function useAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.agents.update,
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      const previous = queryClient.getQueryData(['agents']);
      queryClient.setQueryData(['agents'], (old: Agent[] | undefined) =>
        old?.map((a) => (a.id === variables.id ? { ...a, ...variables } : a))
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['agents'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
```

### 16.5 Real-Time Integration: WebSocket Architecture

**WebSocket Provider Architecture:**

```typescript
// providers/websocket-provider.tsx
interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  lastPing: number;
  latency: number;
  subscribe: (channel: string, handler: MessageHandler) => () => void;
  publish: (channel: string, payload: unknown) => void;
}

// Multi-channel subscription with automatic reconnection
// Channels: agents, tasks, terminal:{sessionId}, chat:{conversationId},
//           notifications, presence, workflows

// Hook for real-time agent updates
function useAgentRealtime(agentId: string) {
  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribe(`agent:${agentId}`, (message) => {
      switch (message.type) {
        case 'status_change':
          queryClient.setQueryData(['agents', agentId], (old: Agent) => ({
            ...old,
            status: message.payload.status,
          }));
          break;
        case 'log_stream':
          // Append to log store
          useTerminalStore.getState().appendLog(message.payload.line);
          break;
        case 'artifact_update':
          queryClient.invalidateQueries({ queryKey: ['agents', agentId, 'artifacts'] });
          break;
      }
    });
  }, [agentId, subscribe, queryClient]);
}
```

**Optimistic Update Pattern:**

All real-time mutations follow an optimistic update pattern:
1. **Optimistic Phase**: UI updates immediately via Zustand/React Query optimistic update
2. **Pending Phase**: Visual indicator shows sync status (subtle pulse on changed row)
3. **Confirmed Phase**: Server acknowledgment removes pending indicator
4. **Conflict Phase**: Server returns different state → smooth transition to actual state with brief highlight
5. **Error Phase**: Rollback to previous state with toast notification

### 16.6 Terminal Component: xterm.js Integration

**Architecture:**

```typescript
// components/organisms/terminal-panel.tsx
interface TerminalPanelProps {
  sessionId: string;
  agentId?: string;
  readOnly?: boolean;
  onData?: (data: string) => void;
  theme?: 'dark' | 'light' | 'system';
}

// Component structure:
// TerminalPanel
// ├── TerminalTabs          # Multi-session tabs
// │   ├── Tab (session-1)
// │   ├── Tab (session-2)   # "+" button for new
// │   └── ...
// ├── TerminalToolbar       # Search, clear, copy, font size
// │   ├── SearchBox
// │   ├── ActionButtons
// │   └── ConnectionStatus
// └── TerminalContainer     # xterm.js mount point
//     ├── XTermInstance
//     └── Scrollbar
```

**Key Implementation Details:**
- **Session Management**: Each terminal session maps to a backend PTY process running in a sandbox. Sessions are identified by UUID and persist across reconnections for 24 hours.
- **WebSocket Protocol**: Binary messages for terminal data (base64-encoded), control messages as JSON for resize, heartbeat, and session management.
- **Theme Mapping**: Automatic mapping from Tailwind CSS color variables to xterm.js `ITheme` interface. The dark theme uses slate-950 background with zinc-100 foreground; the light theme uses white background with slate-900 foreground.
- **Search Integration**: `xterm-addon-search` provides in-buffer search with regex support. Results are highlighted in amber/yellow.
- **Link Detection**: `xterm-addon-web-links` auto-detects URLs and file paths. Clicking a file path navigates the IDE panel to that file.
- **Performance**: Terminal output exceeding 10,000 lines triggers buffer compaction—older lines are written to a background IndexedDB store for on-demand retrieval.

### 16.7 Kanban Board: Drag-and-Drop with Real-Time Sync

**Architecture:**

```
KanbanBoard
├── SwimlaneHeader        # Optional grouping header
├── ColumnContainer
│   ├── ColumnHeader      # Column name + count + WIP limit
│   ├── DroppableArea
│   │   ├── SortableTaskCard
│   │   │   ├── DragHandle
│   │   │   ├── TaskContent
│   │   │   └── ActionMenu
│   │   └── ...
│   └── AddCardButton
└── BoardToolbar          # Filters, search, view options
```

Built with `@dnd-kit/core` (sensors, collision detection) and `@dnd-kit/sortable`. Supports pointer, keyboard, and touch sensors. Uses `rectIntersection` collision detection for column-based boards. Real-time synchronization broadcasts move operations via WebSocket to all connected clients with operational transformation for conflict resolution (if two users move the same card simultaneously, last-writer-wins with server timestamp).

**Features:**
- **Swimlanes**: Group cards by agent, priority, or custom field. Swimlanes are collapsible and reorderable.
- **WIP Limits**: Visual warning when column exceeds configured work-in-progress limit (amber at 80%, red at 100%).
- **Quick Edit**: Inline editing of title, priority, and assignee without opening full detail view.
- **Bulk Operations**: Multi-select cards (Shift+click range, Cmd+click individual) for bulk status change or reassignment.

### 16.8 IDE-like Features: Monaco Editor Integration

**Monaco Editor Setup:**

```typescript
// components/organisms/code-editor.tsx
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  path: string;
  language: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  diffOriginal?: string;  # If provided, renders diff view
  markers?: EditorMarker[];
}
```

**Integration Architecture:**
- **Lazy Loading**: Monaco is loaded via `@monaco-editor/react` with CDN configuration. Only the required language features are loaded on demand.
- **Theme Synchronization**: Editor theme automatically syncs with app theme via a custom Monaco theme derived from Tailwind colors.
- **File Tree**: Custom-built file tree component supporting lazy loading of directory contents, multi-select, drag-and-drop file movement, and git status badges.
- **Tab System**: Horizontal tab bar with scroll overflow, tab pinning, unsaved change indicators (dot), and recently-closed tab history (Cmd+Shift+T restores).
- **Diff Viewer**: Monaco's built-in diff editor for code review and change visualization. Supports inline and side-by-side modes.
- **Agent Suggestions**: Inline ghost text suggestions from agents via Monaco's `inlineCompletions` provider API. Suggestions appear in muted gray and can be accepted with Tab.

### 16.9 Chat Interface: Streaming AI Conversations

**Architecture:**

```
ChatPanel
├── ChatHeader              # Conversation title, model info, actions
├── MessageList             # Virtualized message scroll area
│   ├── MessageGroup        # Date separator + messages
│   │   ├── MessageBubble   # User/assistant/agent message
│   │   │   ├── Avatar
│   │   │   ├── Content (markdown + code blocks)
│   │   │   ├── Actions (copy, regenerate, branch)
│   │   │   └── Feedback (thumbs up/down)
│   │   └── ...
│   └── ...
├── TypingIndicator         # Animated dots when assistant is "thinking"
├── SuggestedReplies        # Chips for common follow-ups
├── ChatInput               # Textarea + attachments + send
│   ├── AttachmentPreview
│   ├── ModelSelector
│   └── SendButton
└── StreamingStatus         # Token/sec, latency, cost accumulator
```

**Streaming Implementation:**
- Server-Sent Events (SSE) endpoint provides token-by-token streaming
- Each token is appended to a Zustand message buffer
- `react-markdown` re-renders progressively as content arrives
- Code blocks are extracted and syntax-highlighted as they complete
- A running token counter and estimated cost display in the status bar
- If the connection drops mid-stream, automatic resume with `Last-Event-ID` header

### 16.10 Dashboard Widgets: Real-Time Metrics

**Widget Registry:**

| Widget | Data Source | Refresh | Description |
|--------|------------|---------|-------------|
| AgentStatusGrid | WebSocket (agents) | Real-time | Grid of all agents with status, last activity, and quick actions |
| CostAnalytics | React Query (billing) | 60s | Daily/weekly/monthly cost breakdown by agent, model, and task type |
| WorkflowGraph | React Query (workflows) | 30s | Visual DAG of active workflows with node status coloring |
| QueueDepth | WebSocket (tasks) | Real-time | Task queue depth per priority with SLA breach indicators |
| InferenceLatency | React Query (metrics) | 15s | P50/P95/P99 latency per model provider |
| TokenUsage | React Query (usage) | 60s | Token consumption trends with limit proximity warnings |
| ActiveSessions | WebSocket (presence) | Real-time | Who's online, what they're viewing, cursor positions |
| SystemHealth | React Query (health) | 10s | Service health dashboard with dependency status |

### 16.11 Theme System: Comprehensive Design Tokens

**Design Token Architecture:**

```css
/* globals.css — Tailwind CSS v4 compatible */
@layer base {
  :root {
    /* Base colors */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 222 83% 53%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 222 83% 53%;
    --radius: 0.5rem;

    /* Agent semantic colors */
    --agent-idle: 210 40% 96%;
    --agent-running: 217 91% 60%;
    --agent-success: 142 76% 36%;
    --agent-error: 0 84% 60%;
    --agent-warning: 38 92% 50%;

    /* Density tokens */
    --spacing-unit: 0.25rem;
    --font-size-base: 0.875rem;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 222 47% 14%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 11%;
    --popover-foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 11%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62% 50%;
    --destructive-foreground: 210 40% 98%;
    --border: 217 33% 20%;
    --input: 217 33% 20%;
    --ring: 224 76% 48%;
  }
}
```

**Density Settings:**
- **Comfortable** (default): 16px base padding, full descriptions, expanded rows
- **Compact**: 12px base padding, condensed text, minimal whitespace
- **Ultra-Compact**: 8px padding, icon-only buttons where possible, for power users managing many agents

**Accent Color System:**
Users can select from 8 accent colors (blue, indigo, violet, purple, fuchsia, pink, rose, orange). The primary color token is dynamically overridden via CSS variables without recompiling.

### 16.12 Performance Optimization

**Code Splitting Strategy:**

| Route/Feature | Chunk | Size Budget | Strategy |
|---------------|-------|-------------|----------|
| Main shell | `main` | 150 KB initial | Critical path only |
| Monaco Editor | `editor` | 3 MB (lazy) | Dynamic import on first IDE visit |
| Terminal | `terminal` | 500 KB (lazy) | Dynamic import on terminal route |
| Kanban Board | `kanban` | 200 KB (lazy) | Dynamic import on project boards |
| Workflow Visualizer | `workflows` | 300 KB (lazy) | Dynamic import on workflow pages |
| Voice Interface | `voice` | 400 KB (lazy) | Dynamic import on voice route |
| Charts/Analytics | `analytics` | 350 KB (lazy) | Dynamic import on observability pages |

**Virtualization:**
- Message lists: `react-window` or `@tanstack/react-virtual` for chat message virtualization
- Log viewers: Virtual scrolling with 50px row estimation for terminal/log panels
- File trees: Tree virtualization for repositories with 10,000+ files
- Kanban boards: Column virtualization for boards with 500+ cards per column

**Image Optimization:**
- All images served via Next.js `<Image>` with automatic WebP/AVIF conversion
- Agent avatars generated as SVG patterns (no external dependencies)
- Lazy loading for below-fold images with `loading="lazy"`
- Blur placeholder for avatar images during load

**Other Optimizations:**
- `React.memo` on all list items (TaskCard, MessageBubble, LogLine)
- `useMemo` for expensive computations (filtering, sorting, grouping)
- `useCallback` for all event handlers passed to child components
- `IntersectionObserver`-based pagination for infinite scroll lists
- Service Worker for asset caching (Workbox integration)

### 16.13 Accessibility

**WCAG 2.1 AA Compliance Strategy:**

| Requirement | Implementation |
|-------------|---------------|
| Keyboard Navigation | All interactive elements reachable via Tab; custom shortcuts via `react-hotkeys-hook` with help overlay (Cmd+/) |
| Screen Reader | ARIA labels on all icons, `aria-live="polite"` regions for status updates, `role="log"` for terminal output |
| Focus Management | Focus trap in modals, focus restoration on dialog close, skip-to-content link |
| Color Contrast | All text meets 4.5:1 ratio; status indicators use both color AND icon/shape |
| Motion | `prefers-reduced-motion` disables animations; terminal cursor blink respects setting |
| Semantic HTML | Proper heading hierarchy, landmark regions (`<main>`, `<nav>`, `<aside>`), table semantics |

**ARIA Patterns Used:**
- Tabs pattern for IDE tabs and settings sections
- Tree pattern for file explorer
- Listbox pattern for agent/task selectors
- Dialog pattern for all modals
- Live region for real-time notifications
- Log pattern for terminal output streams

### 16.14 Internationalization

**i18n Architecture:**

```typescript
// i18n configuration using next-intl
// Supported locales: en, es, de, fr, ja, zh, ko, pt, ru, ar

// File structure:
// messages/
// ├── en.json           # 3,500+ keys
// ├── es.json
// ├── de.json
// ├── fr.json
// ├── ja.json
// ├── zh.json
// ├── ko.json
// ├── pt.json
// ├── ru.json
// └── ar.json           # RTL language

// Key organization:
{
  "app": { "name": "AgentOS", "tagline": "..." },
  "navigation": { "agents": "Agents", "tasks": "Tasks", ... },
  "agents": { "status": { "idle": "Idle", "running": "Running", ... } },
  "tasks": { "priority": { "low": "Low", "high": "High", ... } },
  "chat": { "placeholder": "Ask an agent...", "streaming": "Thinking..." },
  "errors": { "generic": "Something went wrong", "retry": "Retry" },
  "time": { "just_now": "Just now", "minutes_ago": "{count}m ago" }
}
```

**RTL Support:**
- Layout direction switches via `dir="rtl"` on `<html>`
- CSS logical properties (`margin-inline-start` instead of `margin-left`)
- Icon mirroring for directional icons (arrows, sliders)
- Terminal remains LTR (code is universally LTR)
- Kanban board column order reverses in RTL

---


## Item 17: Backend Architecture

### 17.1 Philosophy & Strategic Principles

The backend of the Autonomous Agentic Software Organization Platform is the **execution nervous system**—it orchestrates autonomous agents, manages durable workflows, routes inference across multiple model providers, maintains persistent memory, enforces governance policies, and provides comprehensive observability. Every design decision prioritizes **fault tolerance**, **horizontal scalability**, and **operational visibility** because the platform must autonomously manage software development workflows that can span hours or days.

**Core Principles:**
1. **Durable Execution**: Every task must survive process restarts, network partitions, and infrastructure failures
2. **Observability by Design**: Every operation emits structured telemetry; debugging production must not require reproduction
3. **Defense in Depth**: Sandboxing, rate limiting, resource quotas, and circuit breakers at every boundary
4. **API-First**: All functionality exposed via typed APIs; the frontend is merely the first consumer
5. **Event-Driven**: Async communication as default; sync only when user-facing latency demands it

### 17.2 API Layer: Fastify Application Structure

**Application Architecture:**

```
src/
├── app.ts                    # Fastify instance factory
├── server.ts                 # Entry point, bootstrap
├── config/
│   ├── index.ts              # Configuration aggregator
│   ├── env.ts                # Environment variable validation (zod)
│   ├── features.ts           # Feature flag definitions
│   └── secrets.ts            # Secret resolution (vault integration)
│
├── plugins/
│   ├── core/                 # Custom plugins
│   │   ├── auth.ts           # JWT + session plugin
│   │   ├── rate-limit.ts     # Tiered rate limiting
│   │   ├── cors.ts           # CORS configuration
│   │   ├── helmet.ts         # Security headers
│   │   ├── request-id.ts     # Correlation ID injection
│   │   ├── logging.ts        # Pino logger configuration
│   │   ├── metrics.ts        # Prometheus metrics endpoint
│   │   ├── health.ts         # Health check endpoints
│   │   ├── cache.ts          # Cache manager plugin
│   │   ├── websocket.ts      # WebSocket gateway
│   │   ├── sse.ts            # Server-Sent Events
│   │   ├── error-handler.ts  # Global error handling
│   │   └── graceful-shutdown.ts
│   │
│   └── integrations/         # Third-party service plugins
│       ├── temporal.ts       # Temporal client
│       ├── redis.ts          # Redis/ioredis
│       ├── postgres.ts       # Database connection pool
│       ├── s3.ts             # Object storage
│       ├── inference-router.ts # vLLM/Ollama/OpenAI client
│       ├── sandbox.ts        # Sandbox orchestrator
│       └── livekit.ts        # Voice/video (LiveKit)
│
├── routes/
│   ├── v1/                   # API Version 1
│   │   ├── agents/
│   │   │   ├── routes.ts     # Route definitions
│   │   │   ├── schemas.ts    # Zod validation schemas
│   │   │   ├── handlers.ts   # Route handlers
│   │   │   └── types.ts      # Route-specific types
│   │   ├── tasks/
│   │   ├── workflows/
│   │   ├── projects/
│   │   ├── chat/
│   │   ├── terminal/
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── billing/
│   │   ├── observability/
│   │   └── webhooks/
│   │
│   ├── v2/                   # API Version 2 (future)
│   │
│   └── internal/             # Internal/health routes (unversioned)
│       ├── health.ts
│       ├── metrics.ts
│       ├── ready.ts
│       └── debug.ts
│
├── services/                 # Business logic layer
│   ├── agents/
│   ├── tasks/
│   ├── workflows/
│   ├── inference/
│   ├── memory/
│   ├── sandbox/
│   ├── billing/
│   └── notifications/
│
├── repositories/             # Data access layer
│   ├── agent.repository.ts
│   ├── task.repository.ts
│   ├── workflow.repository.ts
│   ├── memory.repository.ts
│   └── user.repository.ts
│
├── domain/                   # Domain models
│   ├── agent.ts
│   ├── task.ts
│   ├── workflow.ts
│   ├── organization.ts
│   └── events.ts
│
├── workers/                  # Background job processors
│   ├── task-processor.ts
│   ├── notification-sender.ts
│   ├── usage-aggregator.ts
│   └── cleanup-jobs.ts
│
├── websocket/                # Real-time handlers
│   ├── gateway.ts
│   ├── channels/
│   └── handlers/
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── validate.middleware.ts
│   ├── audit.middleware.ts
│   └── org-context.middleware.ts
│
├── utils/
│   ├── errors.ts             # Custom error classes
│   ├── crypto.ts             # Encryption helpers
│   ├── retry.ts              # Retry logic with backoff
│   ├── circuit-breaker.ts    # Circuit breaker implementation
│   └── validators.ts         # Shared Zod schemas
│
├── types/
│   ├── api.ts
│   ├── database.ts
│   ├── events.ts
│   └── inference.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Fastify Plugin System:**

```typescript
// app.ts — Fastify instance factory
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';

import { requestIdPlugin } from './plugins/core/request-id';
import { loggingPlugin } from './plugins/core/logging';
import { authPlugin } from './plugins/core/auth';
import { errorHandlerPlugin } from './plugins/core/error-handler';
import { healthPlugin } from './plugins/core/health';
import { metricsPlugin } from './plugins/core/metrics';
import { gracefulShutdownPlugin } from './plugins/core/graceful-shutdown';
import { cachePlugin } from './plugins/core/cache';
import { postgresPlugin } from './plugins/integrations/postgres';
import { redisPlugin } from './plugins/integrations/redis';
import { temporalPlugin } from './plugins/integrations/temporal';

export async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  });

  // Phase 1: Core infrastructure (order matters)
  await app.register(loggingPlugin);
  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(gracefulShutdownPlugin);

  // Phase 2: Security
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Monaco requires unsafe-eval
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'wss:', 'https:'],
      },
    },
  });
  await app.register(cors, {
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(rateLimit, {
    max: config.rateLimit.requests,
    timeWindow: config.rateLimit.window,
    keyGenerator: (req) => req.user?.id || req.ip,
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${context.after}`,
      retryAfter: context.after,
    }),
  });

  // Phase 3: Auth
  await app.register(jwt, {
    secret: config.auth.jwtSecret,
    decode: { complete: true },
    sign: { expiresIn: '24h', issuer: 'agentos' },
    verify: { clockTolerance: 60 },
  });
  await app.register(authPlugin);

  // Phase 4: Database & Cache
  await app.register(redisPlugin);
  await app.register(postgresPlugin);
  await app.register(cachePlugin);

  // Phase 5: External integrations
  await app.register(temporalPlugin);

  // Phase 6: Observability
  await app.register(healthPlugin);
  await app.register(metricsPlugin);

  // Phase 7: Routes & WebSocket
  await app.register(websocket);
  await app.register(routes, { prefix: '/api/v1' });
  await app.register(internalRoutes, { prefix: '/' });
  await app.register(websocketGateway, { prefix: '/ws' });

  return app;
}
```

### 17.3 Routing: Organization & Versioning

**Route Organization Pattern:**

Each domain module follows a consistent structure:

```typescript
// routes/v1/agents/routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as schemas from './schemas';
import * as handlers from './handlers';

export default async function agentRoutes(app: FastifyInstance) {
  // Route-level hooks
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', app.requirePermission('agents:read'));

  // CRUD routes with Zod validation
  app.get('/', {
    schema: {
      querystring: schemas.listAgentsQuery,
      response: { 200: schemas.agentListResponse },
      tags: ['Agents'],
      description: 'List all agents with optional filtering',
    },
    handler: handlers.listAgents,
  });

  app.get('/:id', {
    schema: {
      params: schemas.agentIdParam,
      response: { 200: schemas.agentResponse, 404: schemas.notFoundError },
      tags: ['Agents'],
    },
    handler: handlers.getAgent,
  });

  app.post('/', {
    schema: {
      body: schemas.createAgentBody,
      response: { 201: schemas.agentResponse },
      tags: ['Agents'],
    },
    handler: handlers.createAgent,
  });

  app.patch('/:id', {
    schema: {
      params: schemas.agentIdParam,
      body: schemas.updateAgentBody,
      response: { 200: schemas.agentResponse },
      tags: ['Agents'],
    },
    handler: handlers.updateAgent,
  });

  app.delete('/:id', {
    schema: {
      params: schemas.agentIdParam,
      response: { 204: z.void() },
      tags: ['Agents'],
    },
    handler: handlers.deleteAgent,
  });

  // Sub-resource: Agent sessions
  app.get('/:id/sessions', {
    schema: { params: schemas.agentIdParam },
    handler: handlers.listAgentSessions,
  });

  // Action routes
  app.post('/:id/start', {
    schema: { params: schemas.agentIdParam, body: schemas.startAgentBody },
    handler: handlers.startAgent,
  });

  app.post('/:id/stop', {
    schema: { params: schemas.agentIdParam },
    handler: handlers.stopAgent,
  });
}
```

**Versioning Strategy:**
- **URL-based versioning**: `/api/v1/...`, `/api/v2/...`
- **Semantic versioning**: Breaking changes increment major version
- **Deprecation headers**: `Deprecation: true`, `Sunset: <date>` headers on deprecated endpoints
- **Minimum 6-month overlap**: Old versions supported for 6 months after new version release
- **Version discovery**: `GET /api/versions` returns available versions with deprecation status

**Health Check Endpoints:**

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health/live` | Liveness probe | `200 { "status": "alive" }` |
| `GET /health/ready` | Readiness probe | `200 { "status": "ready", "checks": {...} }` or `503` |
| `GET /health/deep` | Deep health check | Detailed dependency status (DB, Redis, Temporal, etc.) |

### 17.4 Validation: Zod Schema Architecture

**Schema Organization:**

```typescript
// routes/v1/agents/schemas.ts
import { z } from 'zod';
import { agentStatusSchema, agentTypeSchema } from '@/utils/validators';

// Reusable primitives
const uuidSchema = z.string().uuid();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Request schemas
export const agentIdParam = z.object({ id: uuidSchema });

export const listAgentsQuery = z.object({
  ...paginationSchema.shape,
  status: agentStatusSchema.optional(),
  type: agentTypeSchema.optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'status', 'createdAt', 'lastActivity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createAgentBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: agentTypeSchema,
  model: z.string().min(1),
  systemPrompt: z.string().max(10000).optional(),
  tools: z.array(z.string()).max(50).default([]),
  maxTokens: z.number().int().min(100).max(128000).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  metadata: z.record(z.unknown()).optional(),
});

export const updateAgentBody = createAgentBody.partial();

export const startAgentBody = z.object({
  taskId: uuidSchema.optional(),
  context: z.record(z.unknown()).optional(),
});

// Response schemas
export const agentResponse = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  type: agentTypeSchema,
  status: agentStatusSchema,
  model: z.string(),
  systemPrompt: z.string().nullable(),
  tools: z.array(z.string()),
  maxTokens: z.number(),
  temperature: z.number(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime().nullable(),
  createdBy: z.string(),
  organizationId: uuidSchema,
});

export const agentListResponse = z.object({
  data: z.array(agentResponse),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Error schemas
export const notFoundError = z.object({
  statusCode: z.literal(404),
  error: z.literal('Not Found'),
  message: z.string(),
  code: z.string(),
});

// Type exports
export type CreateAgentInput = z.infer<typeof createAgentBody>;
export type UpdateAgentInput = z.infer<typeof updateAgentBody>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuery>;
```

### 17.5 Authentication: Multi-Strategy Auth

**Authentication Architecture:**

```typescript
// plugins/core/auth.ts
import fp from 'fastify-plugin';

export default fp(async (app: FastifyInstance) => {
  // JWT verification decorator
  app.decorate('authenticate', async (request, reply) => {
    try {
      const token = extractBearerToken(request);
      const decoded = await request.jwtVerify<{ sub: string; orgId: string; role: string }>();
      request.user = {
        id: decoded.sub,
        organizationId: decoded.orgId,
        role: decoded.role,
        permissions: decoded.permissions,
      };
    } catch {
      reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'AUTH_INVALID_TOKEN',
      });
    }
  });

  // API Key authentication (for programmatic access)
  app.decorate('authenticateApiKey', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) return reply.status(401).send({ error: 'API key required' });

    const keyData = await app.cache.wrap(
      `apikey:${apiKey}`,
      () => app.repositories.apiKeys.validate(apiKey),
      60 * 1000 // 1-minute cache
    );

    if (!keyData || keyData.revokedAt) {
      return reply.status(401).send({ error: 'Invalid or revoked API key' });
    }

    request.user = {
      id: keyData.userId,
      organizationId: keyData.organizationId,
      role: keyData.role,
      permissions: keyData.permissions,
      authMethod: 'api_key',
    };

    // Track API key usage asynchronously
    app.repositories.apiKeys.recordUsage(apiKey).catch(() => {});
  });

  // WebSocket token authentication
  app.decorate('authenticateWs', async (connection, request) => {
    const token = new URL(request.url, 'http://localhost').searchParams.get('token');
    if (!token) { connection.socket.close(1008, 'Token required'); return; }

    try {
      const decoded = app.jwt.verify(token);
      connection.user = decoded;
    } catch {
      connection.socket.close(1008, 'Invalid token');
    }
  });
});
```

**Session Management:**
- **JWT access tokens**: Short-lived (15 minutes), signed with RS256, contain user ID, org ID, role, permissions
- **Refresh tokens**: Long-lived (7 days), stored as httpOnly secure cookies, rotation on every use
- **Session store**: Redis-backed session tracking for instant revocation capability
- **API Keys**: Long-lived keys for programmatic access, prefix `aos_` for easy identification, rate-limited per key
- **WebSocket Auth**: Token passed as query parameter during WebSocket handshake, validated once at connection time

### 17.6 Authorization: Permission System

**Permission Model:**

The platform implements **Attribute-Based Access Control (ABAC)** with role-based defaults:

```typescript
// Permission hierarchy
const PERMISSIONS = {
  // Agent permissions
  'agents:read':   { description: 'View agents', scope: 'organization' },
  'agents:write':  { description: 'Create/modify agents', scope: 'organization' },
  'agents:delete': { description: 'Delete agents', scope: 'organization' },
  'agents:run':    { description: 'Start/stop agents', scope: 'organization' },

  // Task permissions
  'tasks:read':    { description: 'View tasks', scope: 'organization' },
  'tasks:write':   { description: 'Create/modify tasks', scope: 'organization' },
  'tasks:delete':  { description: 'Delete tasks', scope: 'organization' },
  'tasks:assign':  { description: 'Assign tasks to agents', scope: 'organization' },

  // Project permissions
  'projects:read':  { description: 'View projects', scope: 'project' },
  'projects:write': { description: 'Modify projects', scope: 'project' },

  // Admin permissions
  'users:manage':  { description: 'Manage organization users', scope: 'organization' },
  'billing:manage':{ description: 'Manage billing', scope: 'organization' },
  'settings:manage':{ description: 'Manage organization settings', scope: 'organization' },
  'system:admin':  { description: 'System administration', scope: 'global' },
} as const;

// Default roles
const ROLES = {
  owner:        Object.keys(PERMISSIONS),                    // All permissions
  admin:        ['agents:read', 'agents:write', 'agents:run', 'tasks:*', 'projects:*', 'users:manage', 'billing:manage', 'settings:manage'],
  developer:    ['agents:read', 'agents:write', 'agents:run', 'tasks:*', 'projects:read', 'projects:write'],
  viewer:       ['agents:read', 'tasks:read', 'projects:read'],
  'api-service':['agents:run', 'tasks:read', 'tasks:write'], // Service account role
} as const;
```

**Authorization Middleware:**

```typescript
// middleware/auth.middleware.ts
export function requirePermission(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // Check role-based permissions
    const userPermissions = request.user.permissions || [];
    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p) || userPermissions.includes('*')
    );

    if (!hasPermission) {
      // Log denied access for audit
      request.log.warn({
        userId: request.user.id,
        required: requiredPermissions,
        actual: userPermissions,
        path: request.routerPath,
      }, 'Authorization denied');

      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
      });
    }

    // Resource-level checks (e.g., project membership)
    if (request.params.projectId) {
      const hasAccess = await checkProjectAccess(
        request.user.id,
        request.params.projectId
      );
      if (!hasAccess) {
        return reply.status(403).send({ error: 'Not a member of this project' });
      }
    }
  };
}
```

### 17.7 Database Access: Repository Pattern

**Repository Architecture:**

```typescript
// repositories/base.repository.ts
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(
    protected db: Kysely<Database>,
    protected table: keyof Database,
    protected cache: CacheManager,
  ) {}

  async findById(id: string): Promise<T | undefined> {
    const cacheKey = `${this.table}:${id}`;

    return this.cache.wrap(cacheKey, async () => {
      return this.db
        .selectFrom(this.table as string)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .selectAll()
        .executeTakeFirst() as Promise<T | undefined>;
    }, 30_000);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<T>> {
    let query = this.db
      .selectFrom(this.table as string)
      .where('deletedAt', 'is', null);

    // Apply filters
    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        query = query.where(key, '=', value);
      }
    }

    // Apply sorting
    query = query.orderBy(options.sortBy || 'createdAt', options.sortOrder || 'desc');

    // Apply pagination
    const count = await query.select(({ fn }) => [fn.count('id').as('count')]).executeTakeFirst();
    const items = await query
      .limit(options.limit)
      .offset((options.page - 1) * options.limit)
      .selectAll()
      .execute() as T[];

    return {
      data: items,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: Number(count?.count || 0),
        totalPages: Math.ceil(Number(count?.count || 0) / options.limit),
      },
    };
  }

  async create(data: CreateInput): Promise<T> {
    const result = await this.db
      .insertInto(this.table as string)
      .values(data as any)
      .returningAll()
      .executeTakeFirstOrThrow() as T;

    // Invalidate list caches
    await this.cache.deletePattern(`${this.table}:list:*`);
    return result;
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    const result = await this.db
      .updateTable(this.table as string)
      .set({ ...data, updatedAt: new Date() } as any)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow() as T;

    // Invalidate caches
    await this.cache.delete(`${this.table}:${id}`);
    await this.cache.deletePattern(`${this.table}:list:*`);
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .updateTable(this.table as string)
      .set({ deletedAt: new Date() })
      .where('id', '=', id)
      .execute();

    await this.cache.delete(`${this.table}:${id}`);
    await this.cache.deletePattern(`${this.table}:list:*`);
  }
}
```

**Query Builder (Kysely):**

The platform uses **Kysely** as the query builder for type-safe SQL. Unlike ORMs, Kysely provides:
- Full SQL expressiveness with TypeScript type safety
- No N+1 query problems (explicit joins)
- Compile-time query validation against the database schema
- Excellent performance (zero runtime overhead)

```typescript
// Example: Complex query with joins
async function getAgentWithTasks(agentId: string) {
  return db
    .selectFrom('agents')
    .where('agents.id', '=', agentId)
    .where('agents.deletedAt', 'is', null)
    .leftJoin('tasks', 'tasks.agentId', 'agents.id')
    .leftJoin('users', 'users.id', 'agents.createdBy')
    .select([
      'agents.id', 'agents.name', 'agents.status', 'agents.model',
      'users.name as creatorName',
      (eb) => eb.fn.count('tasks.id').as('taskCount'),
      (eb) => eb.fn.max('tasks.createdAt').as('lastTaskAt'),
    ])
    .groupBy('agents.id')
    .executeTakeFirst();
}
```

**Transaction Management:**

```typescript
// Repository method with transaction
async function transferTaskToAgent(taskId: string, fromAgentId: string, toAgentId: string) {
  return db.transaction().execute(async (trx) => {
    // Lock the task row
    const task = await trx
      .selectFrom('tasks')
      .where('id', '=', taskId)
      .forUpdate()
      .selectAll()
      .executeTakeFirstOrThrow();

    // Update task assignment
    await trx
      .updateTable('tasks')
      .set({ agentId: toAgentId, updatedAt: new Date() })
      .where('id', '=', taskId)
      .execute();

    // Log the transfer
    await trx
      .insertInto('activity_logs')
      .values({
        organizationId: task.organizationId,
        actorId: task.assignedBy,
        action: 'task_transferred',
        resourceType: 'task',
        resourceId: taskId,
        metadata: { fromAgentId, toAgentId },
      })
      .execute();

    return task;
  });
}
```

### 17.8 Caching Layer: Multi-Tier Strategy

**Cache Hierarchy:**

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│  L1: In-Memory (Node.js Map)                                │
│  ├── Scope: Single process                                  │
│  ├── TTL: 30 seconds                                        │
│  ├── Size: 1000 entries (LRU)                               │
│  └── Use: Hot entity lookups, auth sessions                 │
│                                                             │
│  L2: Shared Redis                                           │
│  ├── Scope: All processes                                   │
│  ├── TTL: 5 minutes                                         │
│  ├── Serialization: JSON                                    │
│  └── Use: Entity caches, rate limit counters, sessions      │
│                                                             │
│  L3: CDN / Edge Cache                                       │
│  ├── Scope: Geographic                                      │
│  ├── TTL: 1 hour (configurable)                             │
│  └── Use: Static assets, API responses (GET only)           │
│                                                             │
│  L4: Database Query Cache (optional)                        │
│  ├── Scope: Query result                                    │
│  └── Use: Expensive analytical queries                      │
└─────────────────────────────────────────────────────────────┘
```

**Cache Manager Implementation:**

```typescript
// plugins/core/cache.ts
import { LRUCache } from 'lru-cache';
import IORedis from 'ioredis';

class MultiTierCache {
  private l1: LRUCache<string, unknown>;  // In-memory
  private l2: IORedis;                     // Redis

  async get<T>(key: string): Promise<T | null> {
    // L1 check
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) return l1Value as T;

    // L2 check
    const l2Value = await this.l2.get(key);
    if (l2Value) {
      const parsed = JSON.parse(l2Value);
      this.l1.set(key, parsed); // Backfill L1
      return parsed;
    }
    return null;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    this.l1.set(key, value, { ttl: ttlMs });
    await this.l2.set(key, JSON.stringify(value), 'PX', ttlMs);
  }

  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.l2.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) this.l1.delete(key);
      await this.l2.del(...keys);
    }
  }

  // Cache-aside pattern with stampede protection
  async wrap<T>(key: string, fn: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // Distributed lock to prevent cache stampede
    const lockKey = `lock:${key}`;
    const lock = await this.l2.set(lockKey, '1', 'PX', 5000, 'NX');

    if (lock === 'OK') {
      try {
        const value = await fn();
        await this.set(key, value, ttlMs);
        return value;
      } finally {
        await this.l2.del(lockKey);
      }
    } else {
      // Another process is computing; wait and retry
      await new Promise((r) => setTimeout(r, 100));
      return this.wrap(key, fn, ttlMs);
    }
  }
}
```

**Cache Invalidation Strategy:**

| Pattern | Implementation | Use Case |
|---------|---------------|----------|
| TTL-based | Automatic expiry after configured duration | Entity lookups, session data |
| Write-through | Cache updated synchronously on write | User profiles, settings |
| Write-behind | Cache updated asynchronously via events | Analytics counters |
| Tag-based | Resources tagged for bulk invalidation | Organization-scoped data |
| Event-driven | Pub/sub invalidation messages | Cross-process consistency |

### 17.9 Background Jobs: Processing Pipeline

**Job Architecture:**

The platform uses **BullMQ** (Redis-backed) for job queuing with Temporal for durable workflows:

```typescript
// workers/task-processor.ts
import { Queue, Worker, Job } from 'bullmq';
import { TemporalClient } from '@temporalio/client';

// Job definitions
interface TaskJobData {
  taskId: string;
  agentId: string;
  organizationId: string;
  instructions: string;
  context: Record<string, unknown>;
  maxExecutionTime: number; // seconds
  priority: number;
}

// Queue configuration
const taskQueue = new Queue('tasks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

// Priority levels: critical (1), high (2), normal (3), low (4)
const PRIORITY_WEIGHTS = { critical: 1, high: 2, normal: 3, low: 4 };

// Worker implementation
const taskWorker = new Worker<TaskJobData>(
  'tasks',
  async (job: Job<TaskJobData>) => {
    const { taskId, agentId, instructions } = job.data;

    // Update progress
    await job.updateProgress({ stage: 'initializing', percent: 5 });

    // Start Temporal workflow for durable execution
    const workflowHandle = await temporalClient.workflow.start(
      agentTaskWorkflow,
      {
        taskQueue: `agent-tasks-${agentId}`,
        workflowId: `task-${taskId}`,
        args: [job.data],
        retry: { maximumAttempts: 1 }, // BullMQ handles retries
      }
    );

    // Poll workflow for progress updates
    await pollWorkflowProgress(workflowHandle, job);

    return workflowHandle.result();
  },
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: { max: 50, duration: 1000 }, // Rate limit
  }
);

// Dead letter queue handler
taskWorker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    // Move to dead letter queue for manual inspection
    await deadLetterQueue.add('failed-task', {
      originalJob: job.data,
      error: err.message,
      stack: err.stack,
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
    });

    // Notify user
    await notificationQueue.add('task-failed', {
      taskId: job.data.taskId,
      error: err.message,
    });
  }
});
```

**Retry Logic:**

| Job Type | Max Attempts | Backoff | Dead Letter |
|----------|-------------|---------|-------------|
| Task execution | 3 | Exponential (5s, 25s, 125s) | Yes |
| Notification | 5 | Exponential (1s base) | After 24h |
| Usage aggregation | 3 | Linear (10s) | Yes |
| Cleanup jobs | 2 | Fixed (60s) | No (idempotent) |
| Export/generation | 2 | Exponential (10s) | Yes |

### 17.10 File Handling: Upload, Download & Streaming

**File Processing Pipeline:**

```typescript
// routes/v1/files/handlers.ts
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

export async function uploadFile(request, reply) {
  const data = await request.file();
  if (!data) return reply.status(400).send({ error: 'No file provided' });

  // Validate file
  const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
  const ALLOWED_TYPES = ['application/zip', 'text/plain', ...];

  if (data.file.truncated) {
    return reply.status(413).send({ error: 'File too large' });
  }

  // Virus scan (ClamAV)
  const scanResult = await virusScanner.scanStream(data.file);
  if (scanResult.infected) {
    return reply.status(400).send({ error: 'File failed security scan' });
  }

  // Stream to S3 with progress tracking
  const uploadId = crypto.randomUUID();
  const key = `uploads/${request.user.organizationId}/${uploadId}/${data.filename}`;

  await s3Client.upload({
    Bucket: config.s3.bucket,
    Key: key,
    Body: data.file,
    ContentType: data.mimetype,
    Metadata: {
      'uploaded-by': request.user.id,
      'organization-id': request.user.organizationId,
      'original-name': data.filename,
    },
  });

  // Record in database
  const fileRecord = await fileRepository.create({
    id: uploadId,
    name: data.filename,
    key,
    size: data.file.bytesRead,
    mimeType: data.mimetype,
    organizationId: request.user.organizationId,
    uploadedBy: request.user.id,
  });

  return reply.status(201).send(fileRecord);
}

// Streaming download with range support
export async function downloadFile(request, reply) {
  const { id } = request.params;
  const fileRecord = await fileRepository.findById(id);

  if (!fileRecord) return reply.status(404).send({ error: 'File not found' });

  // Check authorization
  if (fileRecord.organizationId !== request.user.organizationId) {
    return reply.status(403).send({ error: 'Access denied' });
  }

  // Get object from S3
  const range = request.headers.range;
  const s3Object = await s3Client.getObject({
    Bucket: config.s3.bucket,
    Key: fileRecord.key,
    Range: range,
  });

  reply.header('Content-Type', fileRecord.mimeType);
  reply.header('Content-Length', s3Object.ContentLength);
  reply.header('Accept-Ranges', 'bytes');
  if (range) reply.header('Content-Range', s3Object.ContentRange);

  return reply.status(range ? 206 : 200).send(s3Object.Body);
}
```

### 17.11 Error Handling: Structured Error Architecture

**Error Class Hierarchy:**

```typescript
// utils/errors.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, unknown>;

  constructor(options: {
    code: string;
    message: string;
    statusCode: number;
    isOperational?: boolean;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.context = options.context || {};
    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(fields: Record<string, string[]>) {
    super({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      context: { fields },
    });
    this.fields = fields;
  }
  fields: Record<string, string[]>;
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super({
      code: 'NOT_FOUND',
      message: `${resource} with id '${id}' not found`,
      statusCode: 404,
      context: { resource, id },
    });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super({
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      statusCode: 429,
      context: { retryAfter },
    });
  }
}

export class InferenceError extends AppError {
  constructor(provider: string, originalError: Error) {
    super({
      code: 'INFERENCE_FAILED',
      message: `Inference via ${provider} failed`,
      statusCode: 502,
      isOperational: true,
      context: { provider },
      cause: originalError,
    });
  }
}

export class SandboxError extends AppError {
  constructor(reason: string, exitCode?: number) {
    super({
      code: 'SANDBOX_ERROR',
      message: `Sandbox execution failed: ${reason}`,
      statusCode: 500,
      context: { reason, exitCode },
    });
  }
}
```

**Global Error Handler:**

```typescript
// plugins/core/error-handler.ts
export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    // Log the error
    request.log.error({
      err: error,
      code: error.code,
      path: request.routerPath,
      method: request.method,
      requestId: request.id,
    }, 'Request error');

    // Operational errors → structured response
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.constructor.name,
        message: error.message,
        code: error.code,
        context: error.context,
        requestId: request.id,
      });
    }

    // Validation errors (Zod/Fastify)
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: error.message,
        code: 'VALIDATION_FAILED',
        details: error.validation,
        requestId: request.id,
      });
    }

    // Programming errors → generic response (don't leak internals)
    request.log.fatal({ err: error }, 'Unexpected error');

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      requestId: request.id, // For support lookup only
    });
  });
});
```

### 17.12 Logging: Pino Structured Logging

**Logging Configuration:**

```typescript
// plugins/core/logging.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: true } }
    : undefined, // JSON in production
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.body.password',
      'req.body.token',
      'req.body.apiKey',
      'res.body.token',
      '*.secret',
      '*.password',
      '*.apiKey',
      'password',
      'token',
      'creditCard',
    ],
    remove: true,
  },
  base: {
    service: 'agentos-api',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
  },
});

// Per-request logging with correlation IDs
app.addHook('onRequest', async (request, reply) => {
  request.log = request.log.child({
    requestId: request.id,
    userId: request.user?.id,
    organizationId: request.user?.organizationId,
    path: request.routerPath,
    method: request.method,
  });
});

// Request/response logging
app.addHook('onResponse', async (request, reply) => {
  request.log.info({
    res: { statusCode: reply.statusCode },
    responseTime: reply.elapsedTime,
  }, 'request completed');
});
```

**Log Levels by Environment:**

| Level | Development | Staging | Production |
|-------|-------------|---------|------------|
| trace | No | No | No |
| debug | Yes | No | No |
| info | Yes | Yes | Yes |
| warn | Yes | Yes | Yes |
| error | Yes | Yes | Yes |
| fatal | Yes | Yes | Yes |

**Correlation ID Propagation:**

```
[User Agent] → x-request-id: abc-123
  → [API Gateway] → request.id = abc-123
    → [Fastify Handler] → logs include requestId: abc-123
      → [BullMQ Job] → job.data.requestId = abc-123
        → [Temporal Worker] → workflow context: abc-123
          → [Inference Call] → x-request-id: abc-123
            → [Sandbox] → environment: REQUEST_ID=abc-123
```

### 17.13 Configuration: Environment & Feature Flags

**Configuration Schema (Zod-validated):**

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().default(20),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_POOL_SIZE: z.coerce.number().default(10),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('agentos'),

  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),

  // S3
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().default('agentos-uploads'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),

  // Temporal
  TEMPORAL_HOST: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('agentos'),

  // Inference
  DEFAULT_MODEL_PROVIDER: z.string().default('openai'),
  MAX_CONCURRENT_INFERENCES: z.coerce.number().default(50),
  INFERENCE_TIMEOUT: z.coerce.number().default(30000),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  METRICS_PORT: z.coerce.number().default(9090),

  // Feature Flags
  FEATURE_NEW_DASHBOARD: z.enum(['true', 'false']).default('false'),
  FEATURE_VOICE_COMMANDS: z.enum(['true', 'false']).default('false'),
  FEATURE_ADVANCED_ANALYTICS: z.enum(['true', 'false']).default('false'),
});

export const config = envSchema.parse(process.env);
```

**Feature Flag System:**

```typescript
// config/features.ts
class FeatureFlagManager {
  private flags: Map<string, boolean> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  isEnabled(flag: string, context?: { userId?: string; orgId?: string }): boolean {
    // 1. Environment variable override
    const envValue = process.env[`FEATURE_${flag.toUpperCase()}`];
    if (envValue !== undefined) return envValue === 'true';

    // 2. Database override (per-organization)
    if (context?.orgId) {
      const orgFlag = this.getOrgFlag(flag, context.orgId);
      if (orgFlag !== undefined) return orgFlag;
    }

    // 3. Default from config
    return DEFAULT_FLAGS[flag] || false;
  }

  // For A/B testing: deterministic rollout based on user ID hash
  isEnabledForUser(flag: string, userId: string, rolloutPercent: number): boolean {
    const hash = crypto.createHash('sha256')
      .update(`${flag}:${userId}`)
      .digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket < rolloutPercent;
  }
}
```

**Secret Management:**
- Development: `.env` file (never committed)
- Staging: Environment variables from CI/CD pipeline
- Production: Secrets injected via HashiCorp Vault / AWS Secrets Manager
- Runtime: Secrets loaded at startup, never logged, redacted from all output
- Rotation: Secrets support hot-reloading via file watch or Vault dynamic credentials

---


## Item 29: Step-by-Step Implementation Roadmap

### 29.1 Overview & Strategic Timeline

The implementation roadmap spans six primary phases over 24 weeks, progressing from infrastructure foundation through advanced enterprise features. Each phase builds upon the previous, with explicit dependency chains, risk mitigation strategies, and measurable success criteria. The roadmap assumes a core team of 6-8 engineers scaling to 12+ by Phase 5.

```
Timeline Visualization (24 Weeks)

Phase 0: Foundation        ████░░░░░░░░░░░░░░░░░░░░░░░░  Weeks 1-4
Phase 1: Core Platform     ░░████░░░░░░░░░░░░░░░░░░░░░░  Weeks 4-8
Phase 2: Agent Runtime     ░░░░████░░░░░░░░░░░░░░░░░░░░  Weeks 8-12
Phase 3: Intelligence      ░░░░░░████░░░░░░░░░░░░░░░░░░  Weeks 12-16
Phase 4: Collaboration     ░░░░░░░░████░░░░░░░░░░░░░░░░  Weeks 16-20
Phase 5: Voice & Advanced  ░░░░░░░░░░████░░░░░░░░░░░░░░  Weeks 20-24
Phase 6: Scale             ░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Week 24+
```

### 29.2 Phase 0: Foundation (Weeks 1-4)

**Theme:** "Build the ship before sailing"

| Workstream | Deliverables | Effort |
|------------|-------------|--------|
| Monorepo Setup | Turborepo + pnpm workspace, shared packages (types, config, UI kit) | 3d |
| CI/CD Pipeline | GitHub Actions: lint, test, build, deploy; preview environments per PR | 5d |
| Development Environment | Docker Compose (Postgres 16, Redis 7, Temporal, MinIO); dev script automation; hot reload | 3d |
| Database Schema | Core tables: users, organizations, agents, tasks, workflows, sessions, files, activity_logs | 5d |
| API Skeleton | Fastify app structure, plugin system, route organization, health endpoints | 4d |
| Frontend Shell | Next.js project setup, shadcn/ui integration, layout structure, navigation | 4d |
| Authentication | JWT auth flow, login/register UI, session management, protected routes | 5d |
| Infrastructure | Terraform modules: VPC, EKS, RDS, ElastiCache, S3, ALB, DNS | 5d |

**Dependencies:** None (foundational)

**Risks & Mitigation:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CI/CD complexity delays other work | Medium | High | Start with GitHub Actions templates; iterate |
| Database schema changes in later phases | High | Medium | Use migrations from day one; colocate schema with code |
| Docker performance on developer machines | Medium | Medium | Support both Docker and local development |
| Team unfamiliar with Temporal | Medium | Medium | Schedule Temporal workshop in Week 2 |

**Success Criteria:**
- [ ] All team members can run full stack locally with single command (`pnpm dev`)
- [ ] Every PR triggers lint, type-check, unit tests, and preview deployment
- [ ] Database migrations run automatically on deploy
- [ ] Auth flow works end-to-end (register → login → access protected page)
- [ ] Infrastructure deploys to staging environment

**Team Size:** 3-4 engineers (1 senior backend, 1 senior frontend, 1 DevOps/infrastructure, 1 full-stack)

### 29.3 Phase 1: Core Platform (Weeks 4-8)

**Theme:** "Identity, organization, and the first agents"

| Workstream | Deliverables | Effort |
|------------|-------------|--------|
| Organizations | CRUD, member management, invitation system, org-scoped data | 4d |
| User Management | Profiles, roles, permissions, API key generation | 3d |
| Agent CRUD | Create, configure, list, update, delete agents; agent types (code, review, test) | 5d |
| Basic Agent Execution | Simple task execution with direct OpenAI/Anthropic API calls | 5d |
| Task Queue | BullMQ integration, job submission, status tracking, retry logic | 4d |
| Dashboard | Agent status overview, recent activity, basic metrics | 4d |
| Basic Observability | Structured logging, request tracing, error reporting (Sentry) | 3d |
| API Documentation | OpenAPI/Swagger generation from Zod schemas | 2d |

**Dependencies:** Phase 0 (foundation)

**Risks & Mitigation:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM API rate limits during development | High | Medium | Implement request batching; use multiple keys |
| Org scoping complexity in queries | Medium | Medium | Abstract org-scoping into repository base class |
| Permission system becomes bottleneck | Low | High | Design flexible RBAC from the start |

**Success Criteria:**
- [ ] Users can create organizations and invite team members
- [ ] Agents can be created, configured, and deleted
- [ ] Basic agent execution produces visible results in the UI
- [ ] Tasks are queued, processed, and their status tracked
- [ ] Dashboard shows agent status and recent activity
- [ ] All API endpoints are documented and testable via Swagger UI

**Team Size:** 4-5 engineers (+1 backend engineer)

### 29.4 Phase 2: Agent Runtime (Weeks 8-12)

**Theme:** "Robust, sandboxed, durable execution"

| Workstream | Deliverables | Effort |
|------------|-------------|--------|
| Temporal Integration | Workflow definitions, worker setup, durable task execution | 6d |
| Sandbox System | Docker-based sandboxing, resource limits (CPU, memory, network), timeout enforcement | 6d |
| Tool System | Tool registry, built-in tools (file ops, shell, git, web search), custom tool loading | 5d |
| Code Agent | Autonomous coding loop: plan → execute → verify → iterate | 5d |
| Artifact Management | File generation, storage, versioning, retrieval | 3d |
| Error Recovery | Automatic retry, partial result recovery, failure notification | 3d |
| Advanced Agent UI | Agent detail page, execution timeline, log viewer, artifact browser | 4d |
| Cost Tracking | Per-execution token counting, cost estimation, usage aggregation | 3d |

**Dependencies:** Phase 1 (core platform)

**Risks & Mitigation:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Temporal learning curve | High | Medium | Pair programming with Temporal expert; start simple |
| Sandbox escape vulnerabilities | Medium | Critical | Use gVisor/firecracker; security audit before production |
| Code agent quality | High | High | Extensive prompt engineering; evaluation framework |
| Resource contention (many sandboxes) | Medium | High | Implement resource quotas and queue-based scheduling |

**Success Criteria:**
- [ ] Agent tasks survive API server restarts (Temporal durability)
- [ ] Code executes in isolated sandboxes with enforced resource limits
- [ ] Agents can use tools (file operations, shell commands, git)
- [ ] Code agents can write, test, and iterate on code autonomously
- [ ] Generated artifacts are stored and accessible via UI
- [ ] Cost per execution is tracked and visible

**Team Size:** 5-6 engineers (+1 infrastructure/specialist)

### 29.5 Phase 3: Intelligence (Weeks 12-16)

**Theme:** "Multi-model routing, persistent memory, and smart agents"

| Workstream | Deliverables | Effort |
|------------|-------------|--------|
| Model Router | Multi-provider support (OpenAI, Anthropic, Google, local), load balancing, failover | 5d |
| Prompt Management | Prompt versioning, A/B testing, template system, optimization | 4d |
| Memory System | Short-term (conversation), long-term (vector DB), episodic (event history) | 6d |
| Agent Orchestration | Multi-agent collaboration, agent delegation, workflow patterns | 5d |
| Code Review Agent | Automated PR review, style checking, security analysis | 4d |
| Test Generation Agent | Automatic test generation from code or requirements | 4d |
| Analytics Engine | Usage analytics, performance trends, cost optimization suggestions | 3d |
| Model Evaluation | Benchmarking framework, quality metrics, regression detection | 3d |

**Dependencies:** Phase 2 (agent runtime)

**Risks & Mitigation:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Vector DB scalability | Medium | Medium | Start with pgvector; migrate to Pinecone/Qdrant if needed |
| Model provider API changes | Medium | Medium | Abstract provider interface; version lock dependencies |
| Multi-agent coordination complexity | High | High | Start with sequential orchestration; parallel later |
| Memory retrieval accuracy | Medium | Medium | Hybrid search (vector + keyword); relevance scoring |

**Success Criteria:**
- [ ] Automatic failover between model providers on failure
- [ ] Agents remember context across sessions (persistent memory)
- [ ] Multi-agent workflows execute successfully
- [ ] Code review agent provides actionable feedback
- [ ] Usage analytics show trends and optimization opportunities
- [ ] Model quality benchmarks run automatically on changes

**Team Size:** 6-7 engineers (+1 ML/platform engineer)

### 29.6 Phase 4: Collaboration (Weeks 16-20)

**Theme:** "Real-time teamwork and rich interfaces"

| Workstream | Deliverables | Effort |
|------------|-------------|--------|
| WebSocket Gateway | Real-time bidirectional communication, channel subscription, presence | 4d |
| Terminal Streaming | xterm.js integration, multi-session PTY, real-time output streaming | 5d |
| Kanban Board | Drag-and-drop task management, swimlanes, real-time sync | 4d |
| Chat Interface | Streaming AI chat, message threading, code blocks, markdown | 5d |
| IDE Integration | Monaco editor, file tree, tabs, diff viewer, agent suggestions | 5d |
| Presence System | Who's online, cursor positions, activity feed | 3d |
| Notifications | In-app notifications, email digests, webhook triggers | 3d |
| Comments & Annotations | Inline comments on code, tasks, and artifacts | 3d |

**Dependencies:** Phase 3 (intelligence)

**Risks & Mitigation:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WebSocket scaling | Medium | High | Use Redis adapter for multi-instance; implement backpressure |
| Terminal PTY complexity | High | Medium | Use node-pty; thorough security review |
| Monaco bundle size | Medium | Medium | Dynamic import; load language features on demand |
| Real-time sync conflicts | Medium | Medium | Operational transformation for concurrent edits |

**Success Criteria:**
- [ ] Real-time updates work across multiple connected clients
- [ ] Terminal sessions stream output with <100ms latency
- [ ] Kanban board supports drag-and-drop with real-time sync
- [ ] Chat interface streams AI responses smoothly
- [ ] IDE supports file editing with syntax highlighting and git integration
- [ ] Users see who's online and what they're working on

**Team Size:** 7-9 engineers (+2 frontend specialists)

### 29.7 Phase 5: Voice & Advanced Features (Weeks 20-24)

**Theme:** "Voice-driven orchestration and enterprise readiness"

| Workstream | Deliverables | Effort |
|------------|-------------|--------|
| Voice Interface | LiveKit integration, speech-to-text, voice commands, audio streaming | 5d |
| Advanced Observability | Distributed tracing (OpenTelemetry), custom metrics, alerting | 4d |
| Git Integration | Deep GitHub/GitLab integration, PR automation, branch management | 4d |
| Advanced Workflows | Visual workflow builder, conditional logic, parallel execution | 5d |
| Enterprise Auth | SSO/SAML support, SCIM provisioning, advanced RBAC | 4d |
| Audit Logging | Comprehensive audit trail, compliance reporting, data retention | 3d |
| Performance Optimization | Query optimization, caching strategy, bundle size reduction | 4d |
| Mobile Responsiveness | Responsive layouts, touch gestures, mobile-optimized views | 3d |

**Dependencies:** Phase 4 (collaboration)

**Risks & Mitigation:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LiveKit complexity | Medium | Medium | Start with basic rooms; add features incrementally |
| SAML integration | Low | High | Use established library (passport-saml); extensive testing |
| Performance regression | High | Medium | Establish performance baselines in Phase 0; continuous monitoring |

**Success Criteria:**
- [ ] Voice commands can trigger agent actions
- [ ] Distributed traces link frontend actions to backend execution
- [ ] GitHub PRs can be created and managed from the platform
- [ ] Visual workflow builder creates executable workflows
- [ ] SSO login works with major identity providers
- [ ] Audit logs capture all significant actions

**Team Size:** 9-12 engineers (+2-3 specialists)

### 29.8 Phase 6: Scale & Polish (Week 24+)

**Theme:** "Production hardening and continuous improvement"

| Workstream | Deliverables | Timeline |
|------------|-------------|----------|
| Performance Tuning | Query optimization, connection pool tuning, cache hit ratio >90% | Ongoing |
| Multi-Region | Data replication, regional inference routing, latency optimization | Months 6-8 |
| Advanced Analytics | Custom dashboards, predictive insights, anomaly detection | Months 6-8 |
| Marketplace | Agent templates, tool marketplace, community sharing | Months 7-9 |
| Compliance | SOC 2 preparation, GDPR compliance, security certifications | Months 6-9 |
| Self-Hosting | On-premises deployment, air-gapped operation, custom infrastructure | Months 8-12 |

**Dependencies:** All previous phases

**Success Criteria:**
- [ ] Platform handles 1000+ concurrent agents
- [ ] P99 API latency <200ms for all endpoints
- [ ] Multi-region deployment reduces latency for global users
- [ ] SOC 2 Type II audit initiated
- [ ] Self-hosted version deploys in <1 hour

**Team Size:** 12-15 engineers

### 29.9 Resource Summary

| Phase | Duration | Backend | Frontend | Platform/Infra | QA/Automation | Total |
|-------|----------|---------|----------|----------------|---------------|-------|
| 0: Foundation | 4 weeks | 2 | 2 | 1 | — | 4-5 |
| 1: Core Platform | 4 weeks | 2 | 2 | 1 | — | 4-5 |
| 2: Agent Runtime | 4 weeks | 3 | 2 | 1 | — | 5-6 |
| 3: Intelligence | 4 weeks | 3 | 2 | 1 | 1 | 6-7 |
| 4: Collaboration | 4 weeks | 3 | 3 | 1 | 1 | 7-9 |
| 5: Voice & Advanced | 4 weeks | 3 | 3 | 2 | 1 | 9-12 |
| 6: Scale | Ongoing | 4 | 3 | 3 | 2 | 12-15 |

---

## Item 30: MVP Scope

### 30.1 MVP Definition

The Minimum Viable Product is a functional autonomous agent platform that enables a **single developer or small team** to create AI agents, assign them coding tasks, observe their execution in real-time, and review the results. The MVP validates core value hypotheses around autonomous code generation quality, sandboxed execution safety, and real-time observability.

### 30.2 Core Features Included

| Feature | Description | Priority |
|---------|-------------|----------|
| **User Registration & Login** | Email/password auth, JWT sessions, basic profile | P0 |
| **Organization Creation** | Single organization per user, org-scoped resources | P0 |
| **Agent CRUD** | Create, configure, list, edit, and delete agents | P0 |
| **Agent Configuration** | Model selection, system prompt, temperature, max tokens | P0 |
| **Task Submission** | Submit natural language coding tasks to agents | P0 |
| **Sandboxed Execution** | Docker-based code execution with resource limits | P0 |
| **Real-Time Output Streaming** | Live terminal output streaming via WebSocket | P0 |
| **Task Status Tracking** | Pending, running, completed, failed states | P0 |
| **Artifact Storage** | Generated files stored and downloadable | P0 |
| **Basic Dashboard** | Agent list, task history, status overview | P0 |
| **Cost Display** | Per-task token usage and estimated cost | P1 |
| **Error Display** | Clear error messages when tasks fail | P0 |
| **Task Retry** | One-click retry for failed tasks | P1 |

### 30.3 Explicitly Excluded Features (Post-MVP)

| Feature | Reason for Exclusion | Planned Phase |
|---------|---------------------|---------------|
| Multi-model routing | Single provider (OpenAI) sufficient for validation | Phase 3 |
| Persistent memory | Agents start fresh per task; sufficient for MVP | Phase 3 |
| Multi-agent collaboration | Single-agent tasks prove core value | Phase 3 |
| Kanban board | Task list sufficient for single-user MVP | Phase 4 |
| Real-time collaboration | Single-user focus for initial validation | Phase 4 |
| Voice interface | High complexity; low validation value | Phase 5 |
| SSO/SAML | Email auth sufficient for individual developers | Phase 5 |
| Advanced analytics | Basic usage display sufficient | Phase 5 |
| GitHub integration | Manual copy-paste sufficient for MVP | Phase 5 |
| Visual workflow builder | Sequential task execution sufficient | Phase 5 |
| Mobile responsiveness | Desktop-first for developer audience | Phase 5 |
| Audit logging | Single org; low compliance need initially | Phase 5 |

### 30.4 Target Users & Use Cases

**Primary Persona:**

| Attribute | Description |
|-----------|-------------|
| Name | "Indie Developer Alex" |
| Role | Solo developer or technical founder |
| Pain Point | Spending too much time on boilerplate, repetitive coding tasks |
| Goal | Offload routine coding to AI agents and focus on architecture |
| Technical Skill | Proficient in multiple languages, comfortable with dev tools |
| Stack | JavaScript/TypeScript, Python, or Go projects |

**Use Cases:**

| ID | Use Case | Steps | Success Metric |
|----|----------|-------|----------------|
| UC-1 | Generate a new API endpoint | 1. Describe endpoint requirements → 2. Agent generates code → 3. Review output → 4. Copy to project | Code compiles and passes basic tests |
| UC-2 | Write unit tests | 1. Paste existing code → 2. Request test generation → 3. Agent writes tests → 4. Review and iterate | Test coverage >70% for target code |
| UC-3 | Refactor legacy code | 1. Paste code to refactor → 2. Describe desired changes → 3. Agent refactors → 4. Review diff | Refactored code passes original tests |
| UC-4 | Debug an error | 1. Paste error message and code → 2. Agent analyzes → 3. Agent proposes fix → 4. Apply fix | Error resolved |
| UC-5 | Generate documentation | 1. Paste code → 2. Request docs → 3. Agent generates README/JSDoc → 4. Review | Documentation is accurate and complete |

### 30.5 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Task completion rate | >80% | (completed tasks / total tasks) × 100 |
| Code quality score | >7/10 | Human evaluation of 50 generated code samples |
| Time to first task | <5 minutes | User testing sessions |
| Time to result | <2 minutes median | Backend analytics |
| User retention (7-day) | >40% | Product analytics |
| NPS score | >30 | Survey at 1-week mark |
| Sandbox security | 0 escapes | Penetration testing |
| API availability | >99.5% | Uptime monitoring |

### 30.6 MVP Timeline (10 Weeks)

```
Week 1-2:  ████████  Foundation (monorepo, CI/CD, DB, auth)
Week 3-4:  ████████  Core API (agents, tasks, sandbox)
Week 5-6:  ████████  Agent Execution (Temporal, tools, streaming)
Week 7-8:  ████████  Frontend (dashboard, agent UI, real-time output)
Week 9:    ████      Integration (end-to-end testing, bug fixes)
Week 10:   ████      Launch (performance testing, security review, deploy)
```

### 30.7 Resource Requirements

| Resource | Specification | Cost (Monthly) |
|----------|--------------|----------------|
| API Servers | 2× AWS EC2 c6i.2xlarge (8 vCPU, 16 GB) | $280 |
| Database | AWS RDS PostgreSQL 16 (db.r6g.xlarge) | $350 |
| Cache | AWS ElastiCache Redis (cache.r6g.large) | $175 |
| Sandbox Workers | 3× EC2 c6i.4xlarge (dedicated for sandboxes) | $630 |
| Object Storage | AWS S3 (artifacts) | $50 |
| LLM API | OpenAI API (GPT-4o, GPT-4o-mini) | $500-2000 |
| Monitoring | Datadog / Sentry | $200 |
| CI/CD | GitHub Actions (team plan) | $40 |
| Domain & DNS | Route 53 | $25 |
| **Total** | | **~$3,250-5,000/month** |

### 30.8 Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LLM output quality insufficient | High | Medium | Extensive prompt engineering; fallback to human review; quality gates |
| Sandbox security vulnerability | Critical | Low | gVisor runtime; no network access by default; resource limits; security audit |
| Timeline slips due to complexity | High | Medium | Strict MVP scope enforcement; weekly scope reviews; feature cutting process |
| Performance issues at launch | Medium | Medium | Load testing in Week 9; performance budgets from Day 1; horizontal scaling ready |
| LLM API rate limiting | Medium | High | Implement request queuing; use multiple API keys; graceful degradation |

---


## Item 31: Enterprise Roadmap

### 31.1 Enterprise Feature Philosophy

Enterprise features transform the platform from a powerful developer tool into a production-grade organizational system. These features address the needs of engineering leaders who must balance developer productivity with security, compliance, governance, and cost control. Every enterprise feature is designed to reduce operational risk while maximizing the autonomous output of AI agents.

### 31.2 Enterprise Feature Matrix

| Feature | Target Segment | Complexity | Timeline | Dependencies |
|---------|---------------|------------|----------|--------------|
| SSO/SAML Integration | All Enterprise | Medium | Month 5-6 | Auth system maturity |
| Advanced RBAC | All Enterprise | Medium | Month 5-6 | User/role system |
| Audit Logging | Regulated industries | Medium | Month 5-7 | Activity tracking |
| SOC 2 Compliance | All Enterprise | High | Month 6-9 | All governance features |
| GDPR Compliance | EU/Global | Medium | Month 6-8 | Data handling |
| SLA Guarantees | Large Enterprise | High | Month 7-9 | Infrastructure maturity |
| Dedicated Infrastructure | Large Enterprise | High | Month 8-10 | Terraform modules |
| Advanced Analytics | Engineering Leaders | Medium | Month 7-9 | Data warehouse |
| Custom Model Deployment | Large Enterprise | High | Month 8-12 | Model routing |
| Priority Support | All Enterprise | Low | Month 5+ | Support team |
| White-Label Options | Resellers | Medium | Month 10-12 | Theme system |
| Migration Assistance | All Enterprise | Medium | Month 6+ | Data export tools |

### 31.3 SSO/SAML Integration

**Architecture:**

```
┌──────────────────────────────────────────────────────────────┐
│                    SSO Authentication Flow                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  User ──► Platform ──► SAML IDP Selection ──► Redirect      │
│                        (Okta/Auth0/Azure AD)                  │
│                                                               │
│  User ◄── Platform ◄── SAML Assertion ◄──── Authenticate    │
│           │                                                     │
│           ├──► Parse SAML response                            │
│           ├──► Create/federate user                           │
│           ├──► Generate JWT tokens                            │
│           └──► Redirect to dashboard                          │
│                                                               │
│  [Just-In-Time Provisioning] ──► Auto-create org users        │
│  [Attribute Mapping] ──► Map SAML attrs to roles/teams        │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Details:**
- **Protocol Support**: SAML 2.0 (primary), OIDC (secondary), WS-Federation (legacy)
- **Identity Providers**: Okta, Auth0, Azure AD, Google Workspace, OneLogin, Ping Identity
- **Security**: Signed SAML assertions, encrypted assertions, strict audience validation, clock skew tolerance
- **JIT Provisioning**: Users created on first login; attributes mapped to roles
- **Session Bridging**: Platform session duration configurable per organization (default: 8 hours)
- **Certificate Management**: Automatic certificate rotation with 30-day advance notification

**Configuration per Organization:**

```typescript
interface SsoConfiguration {
  provider: 'saml' | 'oidc';
  saml: {
    entryPoint: string;          // IdP SSO URL
    issuer: string;              // SP entity ID
    cert: string;                // IdP signing certificate
    privateKey: string;          // SP private key
    decryptionCert?: string;     // Assertion decryption
    wantAssertionsSigned: boolean;
    wantResponseSigned: boolean;
    signatureAlgorithm: 'sha256' | 'sha512';
  };
  attributeMapping: {
    email: string;               // SAML attribute for email
    firstName?: string;
    lastName?: string;
    groups?: string;             // For role mapping
    department?: string;
  };
  roleMapping: {                 // Map IdP groups to platform roles
    [groupName: string]: PlatformRole;
  };
  jitProvisioning: boolean;
  enforceSso: boolean;           // Block password login
}
```

### 31.4 Advanced RBAC & Audit

**Role Hierarchy:**

```
System Admin (platform-level)
    │
    ├── Organization Owner
    │       ├── Admin
    │       │       ├── Team Lead
    │       │       │       └── Developer
    │       │       │
    │       │       ├── QA Engineer
    │       │       └── Viewer
    │       │
    │       ├── Billing Manager
    │       └── Security Manager
    │
    └── Auditor (read-only, cross-org)
```

**Permission Granularity:**

| Level | Description | Example |
|-------|-------------|---------|
| Global | Platform-wide actions | system:admin, system:config |
| Organization | Org-scoped actions | agents:create, billing:view |
| Project | Project-scoped actions | project:write, project:deploy |
| Resource | Individual resource | agent:run:agent-123, task:view:task-456 |
| Field | Field-level access | hide cost fields from developers |

**Audit Logging:**

Every action generates an immutable audit record:

```typescript
interface AuditLogEntry {
  id: string;                    // ULID for sortability
  timestamp: string;             // ISO 8601 with nanoseconds
  organizationId: string;
  actor: {
    type: 'user' | 'api_key' | 'agent' | 'system';
    id: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  action: string;                // agents:start, tasks:create, etc.
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  context: {
    before?: Record<string, unknown>;   // Previous state (for updates)
    after?: Record<string, unknown>;    // New state
    metadata?: Record<string, unknown>; // Additional context
  };
  result: 'success' | 'failure' | 'denied';
  errorCode?: string;
  sessionId: string;
  correlationId: string;
  complianceFlags: {
    gdprRelevant: boolean;
    soxRelevant: boolean;
    hipaaRelevant: boolean;
  };
}
```

**Audit Features:**
- **Immutable Storage**: Write-once, append-only log; cryptographic chain of hashes
- **Retention Policies**: Configurable per organization (default: 7 years)
- **Export Formats**: JSON, CSV, SIEM-compatible (CEF, LEEF)
- **Real-time Streaming**: Webhook and Kafka streaming to external SIEM
- **Query Interface**: Filter by actor, action, resource, date range, result
- **Tamper Detection**: Periodic hash verification; alerts on mismatch
- **Compliance Reports**: Pre-built reports for SOC 2, ISO 27001, GDPR

### 31.5 Compliance Framework

**SOC 2 Readiness:**

| Trust Service Criteria | Implementation | Status Tracking |
|------------------------|---------------|----------------|
| **Security** | Encryption at rest/transit, access controls, vulnerability scanning, penetration testing | Automated checks |
| **Availability** | 99.9% SLA, auto-scaling, disaster recovery, backup testing | Uptime monitoring |
| **Processing Integrity** | Input validation, error handling, data reconciliation, audit trails | Test coverage |
| **Confidentiality** | Encryption, access controls, NDA enforcement, data classification | Access reviews |
| **Privacy** (optional) | Data minimization, consent management, data subject rights, DPO | Privacy assessments |

**GDPR Compliance:**

| Requirement | Implementation |
|-------------|---------------|
| Lawful basis | Contractual necessity for processing; consent for analytics |
| Data minimization | Only collect necessary data; automatic purging of old data |
| Right to access | Self-service data export; complete within 30 days |
| Right to erasure | Automated deletion workflow; cascade to all systems |
| Right to portability | Standardized JSON/CSV export of all user data |
| Data Processing Agreement | Standard DPA available; custom DPA for enterprise |
| Data Protection Officer | Contact information published; privacy@ email |
| Breach notification | 72-hour internal notification; 72-hour supervisory authority reporting |
| Cross-border transfer | EU data stays in EU; Standard Contractual Clauses for transfers |
| Records of processing | Automated RoPA generation per organization |

**Data Classification:**

```typescript
type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

const classificationRules: DataClassificationRule[] = [
  { pattern: /password|secret|token|key/i, classification: 'restricted' },
  { pattern: /credit_card|ssn|tax_id/i, classification: 'restricted' },
  { pattern: /source_code|proprietary/i, classification: 'confidential' },
  { pattern: /email|name|phone/i, classification: 'internal' },
  { pattern: /.*/, classification: 'public' }, // default
];
```

### 31.6 SLA Guarantees

**Service Level Agreement Tiers:**

| Metric | Starter | Professional | Enterprise |
|--------|---------|--------------|------------|
| **Uptime** | 99.0% | 99.9% | 99.95% |
| **API Response (p50)** | 500ms | 300ms | 200ms |
| **API Response (p99)** | 5s | 2s | 1s |
| **Inference Response** | Best effort | <30s | <15s |
| **Support** | Community | Business hours | 24/7 |
| **Incident Response** | — | 4 hours | 1 hour |
| **Sandbox Startup** | <30s | <15s | <10s |
| **Data Retention** | 30 days | 90 days | Custom |

**SLA Monitoring & Enforcement:**
- Real-time SLA dashboard for each customer
- Automated alerts when SLA thresholds approach breach
- Monthly SLA reports delivered automatically
- Service credits for verified SLA breaches
- Dedicated status page with historical uptime data

### 31.7 Dedicated Infrastructure

**Deployment Options:**

| Option | Description | Use Case |
|--------|-------------|----------|
| **Shared Cloud** | Multi-tenant SaaS | Small-mid organizations |
| **Dedicated Cloud** | Single-tenant, managed by us | Security-conscious orgs |
| **VPC Peering** | Deploy in customer VPC | Network isolation requirements |
| **On-Premises** | Customer-managed deployment | Air-gapped environments |

**Dedicated Cloud Architecture:**

```
Customer A (tenant-a.acme.com)
├── Kubernetes Namespace: agentos-tenant-a
├── Dedicated Postgres Instance
├── Dedicated Redis Instance
├── Dedicated Sandbox Workers (3 nodes)
└── Isolated LLM API Keys

Customer B (tenant-b.acme.com)
├── Kubernetes Namespace: agentos-tenant-b
├── Dedicated Postgres Instance
├── Dedicated Redis Instance
├── Dedicated Sandbox Workers (5 nodes)
└── Isolated LLM API Keys

Shared Components (platform-managed)
├── API Gateway (routing layer)
├── Temporal Cluster (orchestration)
├── Monitoring Stack
└── Backup Infrastructure
```

### 31.8 Advanced Analytics

**Analytics Dimensions:**

| Dimension | Metrics | Visualization |
|-----------|---------|---------------|
| **Agent Performance** | Tasks/hour, success rate, code quality score, cost per task | Trend lines, comparison charts |
| **Team Productivity** | Tasks completed per developer, time saved, velocity trends | Leaderboard, heatmaps |
| **Cost Optimization** | Spend by model, provider, agent type; cost trends | Breakdown charts, forecasts |
| **Quality Metrics** | Test pass rate, review iteration count, bug detection rate | Quality scorecards |
| **Usage Patterns** | Peak hours, popular agents, feature adoption | Usage funnels, cohort analysis |
| **Security Posture** | Policy violations, access anomalies, sandbox incidents | Security dashboard |

**Data Warehouse Integration:**
- Automatic sync to Snowflake/BigQuery/Redshift
- Pre-built dbt models for common analytics
- Custom report builder with SQL access (read-only replicas)
- Scheduled report generation and email delivery
- API access for BI tool integration (Tableau, Looker, Metabase)

### 31.9 Custom Model Deployment

**Supported Deployment Options:**

| Model Type | Deployment | Hardware | Use Case |
|------------|-----------|----------|----------|
| Open Source (Llama, Mistral) | vLLM / TGI | A100/H100 GPUs | Cost optimization, data privacy |
| Fine-tuned Models | Custom endpoint | Varies | Domain-specific coding |
| Proprietary API | Routed endpoint | N/A (API) | Fallback, specific capabilities |
| Self-hosted API | Customer infrastructure | Customer-provided | Maximum data control |

**Model Routing Configuration:**

```typescript
interface ModelRoutingRule {
  priority: number;
  condition: {
    taskType?: string[];
    agentType?: string[];
    organizationId?: string[];
    costLimit?: number;
    latencyRequirement?: 'low' | 'medium' | 'high';
  };
  target: {
    provider: string;
    model: string;
    endpoint?: string;           // Custom endpoint for self-hosted
    apiKeyRef: string;            // Reference to stored credential
    fallback?: string;            // Fallback model ID
  };
  overrides?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}
```

### 31.10 Priority Support

**Support Tiers:**

| Feature | Standard | Professional | Enterprise |
|---------|----------|--------------|------------|
| Channels | Community Discord | Email + Chat | Dedicated Slack |
| Response Time | Best effort | <4 hours | <1 hour (critical) |
| Availability | — | Business hours | 24/7/365 |
| Dedicated Engineer | No | No | Yes (named contact) |
| Custom Training | No | No | Yes |
| Quarterly Reviews | No | No | Yes |
| Architecture Guidance | No | No | Yes |
| Escalation Path | GitHub Issues | Ticket system | Direct phone line |

### 31.11 White-Label Options

**Customization Capabilities:**

| Element | Customization Level |
|---------|-------------------|
| **Logo** | Upload custom logo; SVG and PNG support |
| **Colors** | Primary, secondary, accent colors; dark/light variants |
| **Domain** | Custom subdomain or CNAME (agents.customer.com) |
| **Favicon** | Custom favicon and app icons |
| **Email Templates** | Branded notification emails |
| **Login Page** | Custom background, messaging, links |
| **Footer** | Custom links, copyright, terms |
| **Terminology** | Custom labels for "agents", "tasks", "workflows" |
| **Help Links** | Point to customer's documentation |

### 31.12 Migration Assistance

**Migration Sources:**

| Source | Migration Approach | Effort |
|--------|-------------------|--------|
| GitHub Copilot | Export chat history; import as task templates | Low |
| Cursor | Export AI rules; convert to agent configurations | Low |
| Cody/Sourcegraph | Export code intelligence graphs; rebuild in platform | Medium |
| Custom Scripts | Manual import via API; migration toolkit | Medium |
| Legacy CI/CD | Export pipeline definitions; convert to workflows | High |

**Migration Toolkit:**
- **Data Export**: Complete organization export in standardized format
- **Data Import**: Bulk import with validation and error reporting
- **Mapping Tool**: Visual field mapping for custom migrations
- **Validation Suite**: Post-migration data integrity checks
- **Rollback Plan**: Point-in-time restore capability
- **Migration Engineer**: Dedicated support for enterprise migrations

---

## Item 32: Technical Debt Prevention Strategy

### 32.1 Philosophy

Technical debt in an AI agent platform compounds at an exponential rate due to the inherent complexity of orchestrating autonomous systems, managing multiple model providers, maintaining sandbox security, and supporting real-time collaboration. The prevention strategy treats technical debt as a **first-class operational concern** with the same visibility and accountability as feature delivery or system uptime.

**Core Tenets:**
1. **Visibility**: All debt is tracked, categorized, and visible
2. **Budgeting**: 20% of every sprint is allocated to debt reduction
3. **Prevention**: Code quality gates catch debt before it enters main
4. **Measurement**: Debt metrics are tracked and trended

### 32.2 Architecture Decision Records (ADRs)

**ADR Process:**

```
┌────────────────────────────────────────────────────────────────┐
│                    ADR Lifecycle                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Idea] ──► [Draft] ──► [Review] ──► [Accepted/Rejected]     │
│              │              │                                     │
│              │              ├──► Team Review (2 reviewers)       │
│              │              ├──► Architecture Review (if major)  │
│              │              └──► Record decision + rationale     │
│              │                                                   │
│  Template:   docs/architecture/adr/NNNN-title.md               │
│                                                                 │
│  NNNN-sequential-number-title.md                                │
│  ├── Status: Draft → Proposed → Accepted → Deprecated          │
│  ├── Context: What is the problem and constraints?             │
│  ├── Decision: What we decided and why                          │
│  ├── Consequences: Positive, negative, neutral                  │
│  ├── Alternatives: Options considered and rejected              │
│  └── References: Links to discussions, research                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**ADR Registry (Example):**

| # | Title | Status | Date | Author |
|---|-------|--------|------|--------|
| 0001 | Use Fastify over Express | Accepted | 2024-01-15 | Lead Backend |
| 0002 | PostgreSQL as primary database | Accepted | 2024-01-15 | Architect |
| 0003 | Temporal for workflow orchestration | Accepted | 2024-01-20 | Architect |
| 0004 | Kysely over Prisma for queries | Accepted | 2024-01-22 | Lead Backend |
| 0005 | Zustand over Redux for state | Accepted | 2024-01-25 | Lead Frontend |
| 0006 | WebSocket over SSE for bidirectional | Accepted | 2024-02-01 | Architect |
| 0007 | gVisor for sandbox runtime | Accepted | 2024-02-10 | Security Lead |

**When to Write an ADR:**
- Any new dependency added to the project
- Any architectural pattern change
- Any database schema change affecting multiple services
- Any security-related decision
- Any performance optimization strategy
- Any integration approach (build vs buy)

### 32.3 Code Quality Gates

**Pre-Commit Hooks (husky + lint-staged):**

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

```json
// .lintstagedrc
{
  "*.{ts,tsx}": [
    "eslint --fix --max-warnings=0",
    "prettier --write",
    "bash -c 'tsc --noEmit'"
  ],
  "*.css": ["prettier --write"],
  "*.{md,mdx}": ["prettier --write"],
  "*.json": ["prettier --write"]
}
```

**CI/CD Quality Pipeline:**

```yaml
# .github/workflows/quality.yml
name: Quality Gates
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Lint
        run: pnpm lint:strict
      - name: Type Check
        run: pnpm typecheck
      - name: Unit Tests
        run: pnpm test:unit --coverage
      - name: Coverage Threshold
        run: |
          pnpm coverage:check             --branches 70             --functions 80             --lines 80             --statements 80
      - name: Bundle Size
        run: pnpm bundlesize
      - name: Dependency Audit
        run: pnpm audit --audit-level=moderate
      - name: SonarQube Scan
        run: sonar-scanner
      - name: Knip (Dead Code Detection)
        run: pnpm knip
```

**Quality Metrics Dashboard:**

| Metric | Threshold | Trend Target |
|--------|-----------|--------------|
| Test coverage (lines) | >80% | Increasing |
| Test coverage (branches) | >70% | Increasing |
| TypeScript strict errors | 0 | Maintain zero |
| ESLint warnings | 0 | Maintain zero |
| SonarQube code smells | <50 | Decreasing |
| SonarQube vulnerabilities | 0 | Maintain zero |
| Dependency vulnerabilities | 0 critical, <5 moderate | Resolve within 7 days |
| Bundle size (main) | <200 KB | Decreasing |
| Dead code (knip) | 0 exports | Maintain zero |
| Cyclomatic complexity | <15 per function | <10 average |

### 32.4 Refactoring Budget

**Budget Allocation:**

```
Sprint Capacity Allocation
├── Feature Development    60%  (new capabilities)
├── Technical Debt         20%  (refactoring, cleanup)
├── Bug Fixes              15%  (production issues)
└── Learning/Exploration    5%  (research, prototyping)
```

**Debt Classification:**

| Category | Severity | Sprint Allocation | Resolution Time |
|----------|----------|-------------------|-----------------|
| Critical | Blocks development | Immediate | Same sprint |
| High | Significant slowdown | 20% budget | Within 2 sprints |
| Medium | Noticeable friction | 10% budget | Within 4 sprints |
| Low | Minor inconvenience | Opportunistic | As time permits |

**Refactoring Ticket Template:**

```markdown
## Refactor: [Component/Area]

### Debt Type
- [ ] Code complexity
- [ ] Performance bottleneck
- [ ] Outdated dependency
- [ ] Architectural inconsistency
- [ ] Test coverage gap
- [ ] Documentation debt

### Problem
[Clear description of the technical debt]

### Impact
- Development velocity: [slowdown description]
- Risk: [potential issues if not addressed]
- User impact: [if applicable]

### Proposed Solution
[Approach to resolve]

### Acceptance Criteria
- [ ] Refactoring complete
- [ ] Tests pass
- [ ] No regression in performance
- [ ] Documentation updated

### Effort Estimate
[Story points or time estimate]
```

### 32.5 Fitness Functions

**Automated Architectural Fitness Checks:**

```typescript
// fitness-functions/architecture.test.ts
import { expect, describe, it } from 'vitest';
import { readDirectoryStructure } from './utils';

describe('Architecture Fitness Functions', () => {
  it('should not allow cross-domain imports', () => {
    const violations = checkImportRules({
      'services/agents': ['services/tasks'], // Agents cannot import tasks
      'services/tasks': ['services/agents'],   // Tasks cannot import agents
      'routes': ['services'],                  // Routes can import services
      'repositories': ['domain'],              // Repositories can import domain
    });
    expect(violations).toHaveLength(0);
  });

  it('should keep frontend bundle size under limit', () => {
    const bundleStats = require('../.next/analyze/__bundle_analysis.json');
    expect(bundleStats.pages['/_app'].gzipSize).toBeLessThan(200 * 1024); // 200KB
  });

  it('should not have circular dependencies', () => {
    const cycles = detectCircularDependencies('src/');
    expect(cycles).toHaveLength(0);
  });

  it('should maintain database query performance', () => {
    const slowQueries = getQueriesExceedingThreshold(100); // 100ms
    expect(slowQueries).toHaveLength(0);
  });

  it('should have all API endpoints documented', () => {
    const undocumented = findUndocumentedRoutes('src/routes/', 'docs/api/');
    expect(undocumented).toHaveLength(0);
  });

  it('should not introduce new TypeScript any types', () => {
    const newAnyCount = countNewAnyTypes('HEAD~1', 'HEAD');
    expect(newAnyCount).toBe(0);
  });
});
```

**Fitness Function Categories:**

| Category | Check | Frequency | Enforcement |
|----------|-------|-----------|-------------|
| **Architecture** | Import rule compliance | Every PR | Blocking CI check |
| **Architecture** | Circular dependency absence | Every PR | Blocking CI check |
| **Architecture** | Layer boundary enforcement | Every PR | Blocking CI check |
| **Performance** | Bundle size budget | Every PR | Blocking CI check |
| **Performance** | API response time | Every deploy | Alert on breach |
| **Performance** | Database query time | Every deploy | Alert on breach |
| **Performance** | Memory usage | Every deploy | Alert on breach |
| **Quality** | Test coverage threshold | Every PR | Blocking CI check |
| **Quality** | TypeScript strictness | Every PR | Blocking CI check |
| **Security** | Dependency vulnerability | Daily | Blocking if critical |
| **Security** | Secret scanning | Every PR | Blocking if found |
| **Documentation** | API documentation coverage | Every PR | Blocking CI check |
| **Documentation** | ADR requirement compliance | Every PR | Blocking CI check |

### 32.6 Dependency Management

**Automated Update Strategy:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    versioning-strategy: "lockfile-only"
    groups:
      patch-updates:
        patterns: ["*"]
        update-types: ["patch"]
      minor-updates:
        patterns: ["*"]
        update-types: ["minor"]
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
    labels:
      - "dependencies"
      - "automated"
```

**Dependency Health Metrics:**

| Metric | Target | Tool |
|--------|--------|------|
| Outdated dependencies | <5 | npm-outdated / dependabot |
| Security vulnerabilities | 0 critical, <3 moderate | Snyk / npm audit |
| License compliance | 0 violations | FOSSA / license-checker |
| Dependency freshness score | >80% | libyear |
| Bundle size impact per dep | Track in PR | bundlesize |

**Vulnerability Response SLA:**

| Severity | Detection | Fix Target |
|----------|-----------|------------|
| Critical | Automated (Snyk) | 24 hours |
| High | Automated | 72 hours |
| Moderate | Weekly scan | 2 weeks |
| Low | Monthly review | Next sprint |

### 32.7 Documentation Requirements

**Documentation Pyramid:**

```
                    ┌─────────────┐
                    │   Decision   │  ADRs — Why we chose X
                    │   Records    │  (1 per major decision)
                    ├─────────────┤
                    │  Architecture │  C4 diagrams, data flow,
                    │   Diagrams    │  component interaction
                    ├─────────────┤
                    │    API        │  OpenAPI specs, examples,
                    │ Documentation │  SDK references
                    ├─────────────┤
                    │   Runbooks    │  Incident response, deployment,
                    │               │  troubleshooting
                    ├─────────────┤
                    │   READMEs     │  Per-service, per-module
                    │               │  setup instructions
                    ├─────────────┤
                    │   Inline      │  Code comments, JSDoc/TSDoc
                    │   Comments    │  (WHY not WHAT)
                    └─────────────┘
```

**Documentation Checklist for Every PR:**

- [ ] README updated if service/component changed
- [ ] API docs updated if endpoints modified
- [ ] ADR written if architectural decision made
- [ ] Runbook updated if operational procedures changed
- [ ] Inline comments for complex logic
- [ ] TypeScript types exported and documented

### 32.8 Knowledge Sharing Practices

**Structured Knowledge Transfer:**

| Activity | Frequency | Participants | Format |
|----------|-----------|--------------|--------|
| Architecture Review | Weekly | Senior engineers | Discussion + ADR |
| Code Review | Every PR | 2 reviewers | GitHub PR |
| Tech Talks | Bi-weekly | All engineering | 30-min presentation |
| Post-Mortems | After incidents | All stakeholders | 1-hour structured review |
| Onboarding Pairing | Daily (first 2 weeks) | New hire + buddy | Pair programming |
| Documentation Day | Monthly | All engineers | 4 hours dedicated to docs |
| Cross-Team Sync | Weekly | Frontend + Backend | 30-min alignment |

**Code Review Standards:**

```markdown
## Code Review Checklist

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] Error handling is comprehensive
- [ ] Input validation is thorough

### Architecture
- [ ] Follows established patterns
- [ ] No circular dependencies
- [ ] Proper layer separation

### Quality
- [ ] Tests cover happy path and edge cases
- [ ] No code duplication (DRY)
- [ ] Functions are focused and small (<50 lines)
- [ ] Naming is clear and consistent

### Performance
- [ ] No N+1 queries
- [ ] Proper use of caching
- [ ] No unnecessary re-renders (frontend)

### Security
- [ ] No secrets in code
- [ ] Input is sanitized
- [ ] Authorization checks present

### Documentation
- [ ] Complex logic is commented
- [ ] API changes are documented
- [ ] ADR written if needed
```

### 32.9 Architecture Review Process

**Review Tiers:**

| Tier | Scope | Reviewers | Duration | Trigger |
|------|-------|-----------|----------|---------|
| **Lightweight** | Single component, no external impact | Tech Lead + 1 | 15 min | PR review |
| **Standard** | Multi-component, API changes | Architecture team | 1 hour | Pre-implementation |
| **Deep** | Architectural change, new dependency | All senior engineers | Half day | RFC process |
| **External** | Security-critical, compliance | External auditor | Varies | Annual / event-driven |

**Architecture Review Board (ARB):**
- Meets weekly
- 3-5 senior engineers with rotating membership
- Maintains architecture vision and roadmap
- Approves ADRs for significant decisions
- Reviews fitness function trends quarterly

---


## Item 33: Performance Bottleneck Analysis

### 33.1 Performance Philosophy

Performance in an autonomous agent platform is not merely about response times—it is about **the perceived velocity of intelligence**. Users judge the platform not by milliseconds shaved from API calls but by how quickly agents appear to "think," how smoothly output streams, and how rapidly complex workflows complete. Every performance optimization must therefore target the **end-to-end user experience** rather than isolated metrics.

**Performance Budgets:**

| Layer | Metric | Budget | Measurement |
|-------|--------|--------|-------------|
| **Frontend (TTI)** | Time to Interactive | <3s | Lighthouse |
| **Frontend (FCP)** | First Contentful Paint | <1.5s | Lighthouse |
| **Frontend (LCP)** | Largest Contentful Paint | <2.5s | Lighthouse |
| **API (p50)** | Request response | <100ms | APM |
| **API (p99)** | Request response | <500ms | APM |
| **Inference (p50)** | LLM response start | <2s | Custom |
| **Inference (p95)** | LLM response start | <10s | Custom |
| **Streaming** | Token delivery interval | <100ms | Custom |
| **WebSocket** | Message latency | <50ms | Custom |
| **Sandbox startup** | Container ready | <10s | Custom |
| **Database (p99)** | Query execution | <50ms | APM |
| **Cache (p99)** | Cache operation | <5ms | APM |

### 33.2 Database Query Optimization

**Optimization Strategies:**

```sql
-- Strategy 1: Covering indexes for common queries
CREATE INDEX CONCURRENTLY idx_tasks_org_status_created
ON tasks (organization_id, status, created_at DESC)
INCLUDE (id, title, agent_id, priority);
-- This index covers the most common task list query completely

-- Strategy 2: Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_tasks_running
ON tasks (organization_id, agent_id)
WHERE status = 'running';
-- Only indexes running tasks (small, hot subset)

-- Strategy 3: Expression indexes for computed filters
CREATE INDEX CONCURRENTLY idx_agents_name_lower
ON agents (LOWER(name));
-- Enables case-insensitive search without full scan

-- Strategy 4: GIN indexes for JSON/Array columns
CREATE INDEX CONCURRENTLY idx_tasks_tags_gin
ON tasks USING GIN (tags);
-- Fast JSONB/Array containment queries

-- Strategy 5: BRIN indexes for time-series data
CREATE INDEX CONCURRENTLY idx_audit_logs_time_brin
ON audit_logs USING BRIN (created_at)
WITH (pages_per_range = 128);
-- Small, effective for append-only time-series
```

**Query Optimization Patterns:**

```typescript
// BEFORE: N+1 query problem
const agents = await db.selectFrom('agents').selectAll().execute();
for (const agent of agents) {
  const tasks = await db.selectFrom('tasks')
    .where('agentId', '=', agent.id)
    .selectAll().execute(); // N queries!
  agent.tasks = tasks;
}

// AFTER: Single query with JOIN
const agentsWithTasks = await db
  .selectFrom('agents')
  .leftJoin('tasks', 'tasks.agentId', 'agents.id')
  .where('agents.organizationId', '=', orgId)
  .select([
    'agents.id', 'agents.name', 'agents.status',
    'tasks.id as taskId', 'tasks.title as taskTitle', 'tasks.status as taskStatus'
  ])
  .execute();

// Group in application code
const agentMap = new Map();
for (const row of agentsWithTasks) {
  if (!agentMap.has(row.id)) {
    agentMap.set(row.id, { ...row, tasks: [] });
  }
  if (row.taskId) {
    agentMap.get(row.id).tasks.push({
      id: row.taskId, title: row.taskTitle, status: row.taskStatus
    });
  }
}
```

**Slow Query Detection:**

```sql
-- Identify slow queries (PostgreSQL)
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 50  -- >50ms average
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 33.3 N+1 Query Prevention

**Detection Strategy:**

```typescript
// Automatic N+1 detection in development
// middleware/n-plus-one-detector.ts
const queryLog: Map<string, number> = new Map();

export function createNPlusOneDetector(threshold = 5) {
  return {
    trackQuery(query: string, params: unknown[]) {
      const key = query.replace(/\$\d+/g, '?'); // Normalize
      const count = (queryLog.get(key) || 0) + 1;
      queryLog.set(key, count);

      if (count >= threshold) {
        console.warn(
          `[N+1 DETECTED] Query "${key.substring(0, 100)}..." ` +
          `executed ${count} times. Consider using a JOIN.`
        );
        // In test mode, throw error
        if (process.env.NODE_ENV === 'test') {
          throw new Error(`N+1 query detected: ${key.substring(0, 100)}`);
        }
      }
    },
    reset() { queryLog.clear(); },
  };
}
```

**Prevention Patterns:**

| Pattern | Implementation | Use Case |
|---------|---------------|----------|
| **Batch Loading** | DataLoader pattern | GraphQL resolvers, nested data |
| **Join Preloading** | Eager joins in Kysely | List views with related data |
| **CTE Preloading** | Common Table Expressions | Complex hierarchical data |
| **Materialized Views** | Periodic refresh | Expensive aggregations |
| **Computed Columns** | Generated columns | Frequently accessed calculations |
| **Application-level Join** | Fetch-then-map | Small result sets |

### 33.4 Connection Pool Sizing

**Pool Configuration:**

```typescript
// database/postgres.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,

  // Pool sizing formula:
  // connections = (core_count * 2) + effective_spindle_count
  // For cloud: (vCPU * 2) + (IOPS / 1000)
  // Example: 4 vCPU RDS instance → 10-12 connections per pool
  max: config.database.poolSize,       // Default: 20
  min: 2,                               // Always keep warm connections

  // Connection lifecycle
  idleTimeoutMillis: 30000,             // Close idle connections after 30s
  connectionTimeoutMillis: 5000,        // Fail fast if no connection available
  keepAlive: true,                       // TCP keepalive
  keepAliveInitialDelayMillis: 10000,   // Start keepalive after 10s

  // Health check
  application_name: 'agentos-api',
  statement_timeout: 30000,             // Kill queries >30s
  query_timeout: 25000,                 // Client-side timeout
});

// Monitor pool health
setInterval(() => {
  const metrics = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    utilization: pool.totalCount > 0 
      ? ((pool.totalCount - pool.idleCount) / pool.totalCount * 100).toFixed(1)
      : 0,
  };

  if (metrics.waiting > 5) {
    logger.warn({ metrics }, 'Connection pool under pressure');
  }
}, 10000);
```

**Pool Sizing Per Service:**

| Service | Pool Size | Rationale |
|---------|-----------|-----------|
| API Server (per instance) | 20 | Primary database access |
| Background Workers | 10 | Lower priority, smaller pool |
| Migration Runner | 5 | One-time, burst capacity |
| Analytics/Reporting | 5 | Read-only, can be deprioritized |
| Sandbox Service | 10 | Isolated task execution |

### 33.5 Cache Hit Ratio Optimization

**Multi-Tier Cache Strategy:**

```typescript
// Cache configuration by data type
const cacheConfig = {
  // User profiles: read frequently, change rarely
  'user:*': { ttl: 300, l1: true, l2: true },        // 5 min

  // Agent configs: read frequently, change rarely
  'agent:*': { ttl: 60, l1: true, l2: true },        // 1 min

  // Task lists: change often, read frequently
  'tasks:list:*': { ttl: 10, l1: true, l2: true },   // 10 sec

  // Task details: change often
  'task:*': { ttl: 5, l1: true, l2: true },           // 5 sec

  // Agent status: real-time, very short TTL
  'agent:status:*': { ttl: 2, l1: true, l2: true },   // 2 sec

  // Settings: read frequently, change rarely
  'settings:*': { ttl: 600, l1: true, l2: true },     // 10 min

  // Usage stats: computed, longer TTL
  'usage:*': { ttl: 300, l1: true, l2: true },        // 5 min

  // Session data: sliding expiration
  'session:*': { ttl: 1800, l1: true, l2: true },     // 30 min
};
```

**Cache Warming:**

```typescript
// Cache warmer — pre-populate hot data after deploy
async function warmCache() {
  // Warm agent configurations
  const agents = await db.selectFrom('agents')
    .where('status', '!=', 'deleted')
    .selectAll().execute();

  for (const agent of agents) {
    await cache.set(`agent:${agent.id}`, agent, 60_000);
  }

  // Warm organization settings
  const orgs = await db.selectFrom('organizations')
    .selectAll().execute();

  for (const org of orgs) {
    await cache.set(`settings:${org.id}`, org.settings, 600_000);
  }

  logger.info({ 
    agents: agents.length, 
    orgs: orgs.length 
  }, 'Cache warmed');
}
```

### 33.6 Inference Latency Optimization

**Model Routing Strategy:**

```typescript
// services/inference/router.ts
interface RoutingDecision {
  provider: string;
  model: string;
  estimatedLatency: number;
  estimatedCost: number;
  quality: number; // 0-1
  fallbackChain: string[];
}

class InferenceRouter {
  async route(request: InferenceRequest): Promise<RoutingDecision> {
    const providers = this.getAvailableProviders();

    // Scoring function
    const scored = providers.map((p) => ({
      provider: p,
      score: this.calculateScore(p, request),
    }));

    // Sort by score (latency + cost + quality weighted)
    scored.sort((a, b) => b.score - a.score);

    return {
      provider: scored[0].provider.id,
      model: scored[0].provider.model,
      estimatedLatency: scored[0].provider.latencyP50,
      estimatedCost: scored[0].provider.costPer1K,
      quality: scored[0].provider.qualityScore,
      fallbackChain: scored.slice(1).map((s) => s.provider.id),
    };
  }

  private calculateScore(provider: Provider, request: InferenceRequest): number {
    const latencyWeight = request.priority === 'high' ? 0.6 : 0.3;
    const costWeight = request.optimizeCost ? 0.4 : 0.1;
    const qualityWeight = 1 - latencyWeight - costWeight;

    const latencyScore = 1 / (1 + provider.latencyP50 / 1000);
    const costScore = 1 / (1 + provider.costPer1K / 0.01);
    const qualityScore = provider.qualityScore;

    return latencyWeight * latencyScore +
           costWeight * costScore +
           qualityWeight * qualityScore;
  }
}
```

**Latency Optimization Techniques:**

| Technique | Implementation | Expected Improvement |
|-----------|---------------|---------------------|
| **Connection pooling** | Keep-alive HTTP/2 to providers | 50-100ms per request |
| **Streaming responses** | SSE instead of polling | 90% reduction in perceived latency |
| **Request batching** | Batch small requests | 30-50% throughput improvement |
| **Caching completions** | Cache exact/semantic matches | Up to 100% for repeated prompts |
| **Warm pools** | Pre-warmed model instances | Eliminates cold start (5-10s) |
| **Parallel tool calls** | Execute tools concurrently | Linear reduction in tool time |
| **Speculative execution** | Predict next request | 20-30% hit rate |
| **Client-side buffering** | Buffer tokens before render | Smoother UI, lower re-render |

### 33.7 WebSocket Connection Scaling

**Scaling Architecture:**

```
                    ┌─────────────┐
                    │    ALB      │
                    │  (Layer 7)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼─────┐ ┌───▼──────┐
        │  API-1    │ │  API-2   │ │  API-3   │
        │  (WS)     │ │  (WS)    │ │  (WS)    │
        └─────┬─────┘ └────┬─────┘ └───┬──────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │   Pub/Sub   │  (Cross-instance broadcast)
                    └─────────────┘
```

**WebSocket Optimization:**

```typescript
// websocket/gateway.ts
import { FastifyInstance } from 'fastify';

export async function websocketGateway(app: FastifyInstance) {
  app.register(require('@fastify/websocket'), {
    options: {
      maxPayload: 1024 * 1024, // 1 MB
      perMessageDeflate: {
        zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
      },
    },
  });

  // Connection limits per user
  const userConnections = new Map<string, Set<WebSocket>>();
  const MAX_CONNECTIONS_PER_USER = 5;

  app.get('/ws', { websocket: true }, (connection, req) => {
    const userId = req.user?.id;
    if (!userId) { connection.socket.close(1008, 'Auth required'); return; }

    // Connection limiting
    const connections = userConnections.get(userId) || new Set();
    if (connections.size >= MAX_CONNECTIONS_PER_USER) {
      connection.socket.close(1008, 'Too many connections');
      return;
    }
    connections.add(connection.socket);
    userConnections.set(userId, connections);

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (connection.socket.readyState === 1) {
        connection.socket.ping();
      }
    }, 30000);

    // Message handling
    connection.socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(userId, data, connection.socket);
      } catch {
        connection.socket.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    // Cleanup
    connection.socket.on('close', () => {
      clearInterval(heartbeat);
      connections.delete(connection.socket);
      if (connections.size === 0) userConnections.delete(userId);
    });
  });
}
```

**WebSocket Scaling Targets:**

| Metric | Target | Per-Instance Capacity |
|--------|--------|----------------------|
| Concurrent connections | 100,000 | 10,000 per instance |
| Messages/second | 1,000,000 | 100,000 per instance |
| Connection memory | <5 MB per 1000 connections | — |
| Reconnection time | <2 seconds | — |
| Message latency (p99) | <50ms | — |

### 33.8 Frontend Rendering Optimization

**React Optimization Patterns:**

```typescript
// 1. Virtualization for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5, // Render 5 extra items
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${item.start}px)`,
              height: `${item.size}px`,
            }}
          >
            <MessageBubble message={messages[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Memoization for expensive components
const AgentCard = memo(function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <Card onClick={onClick}>
      <AgentAvatar agent={agent} />
      <AgentStatus agent={agent} />
      <AgentMetrics agent={agent} />
    </Card>
  );
}, (prev, next) => prev.agent.id === next.agent.id && prev.agent.status === next.agent.status);

// 3. Code splitting with preloading
const TerminalPanel = lazy(() => import('./terminal-panel'));

function AgentDetail({ agentId }: { agentId: string }) {
  // Preload terminal when user hovers terminal tab
  const preloadTerminal = () => {
    const TerminalPanelPreload = import('./terminal-panel');
  };

  return (
    <Tabs>
      <Tab onMouseEnter={preloadTerminal}>Terminal</Tab>
      <Suspense fallback={<TerminalSkeleton />}>
        <TerminalPanel agentId={agentId} />
      </Suspense>
    </Tabs>
  );
}
```

### 33.9 Memory Usage Optimization

**Backend Memory Management:**

```typescript
// 1. Streaming instead of buffering
// BAD: Buffer entire response
const tasks = await db.selectFrom('tasks').selectAll().execute();
reply.send(tasks);

// GOOD: Stream results
const stream = db.selectFrom('tasks')
  .selectAll()
  .stream();
reply.raw.writeHead(200, { 'Content-Type': 'application/json' });
reply.raw.write('[');
let first = true;
for await (const task of stream) {
  if (!first) reply.raw.write(',');
  reply.raw.write(JSON.stringify(task));
  first = false;
}
reply.raw.write(']');
reply.raw.end();

// 2. Object pooling for high-frequency operations
class ObjectPool<T> {
  private pool: T[] = [];
  private create: () => T;
  private reset: (obj: T) => void;

  constructor(create: () => T, reset: (obj: T) => void, size = 100) {
    this.create = create;
    this.reset = reset;
    for (let i = 0; i < size; i++) this.pool.push(create());
  }

  acquire(): T {
    return this.pool.pop() || this.create();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// 3. Circuit breaker to prevent memory exhaustion
import CircuitBreaker from 'opossum';

const inferenceBreaker = new CircuitBreaker(callInference, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10,
  maxQueueSize: 100, // Prevent unbounded queue growth
});
```

### 33.10 Network Transfer Optimization

```typescript
// 1. Response compression
import fastifyCompress from '@fastify/compress';
app.register(fastifyCompress, {
  global: true,
  threshold: 1024, // Only compress responses >1KB
  brotliOptions: { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } },
  zlibOptions: { level: 6 },
});

// 2. Selective field fetching (GraphQL-style)
// Client requests only needed fields
GET /api/agents?fields=id,name,status

// Server returns only requested fields
const fieldMap = {
  id: 'agents.id',
  name: 'agents.name',
  status: 'agents.status',
  model: 'agents.model',
  // ...
};

// 3. Pagination with cursor-based navigation
// More efficient than OFFSET for large datasets
GET /api/agents?cursor=eyJpZCI6ImFiYy0xMjMiLCJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjMwOjAwWiJ9&limit=20

// 4. ETags for cache validation
reply.header('ETag', `"${hash}"`);
reply.header('Cache-Control', 'private, max-age=60');

// Client sends: If-None-Match: "abc123"
// Server responds: 304 Not Modified (no body)

// 5. Batched API requests
POST /api/batch
{
  "requests": [
    { "method": "GET", "path": "/agents/123" },
    { "method": "GET", "path": "/tasks?agentId=123" },
    { "method": "GET", "path": "/agents/123/sessions" }
  ]
}
```

### 33.11 Storage I/O Patterns

| Pattern | Implementation | Benefit |
|---------|---------------|---------|
| **Write-behind caching** | Buffer writes, flush periodically | 80% reduction in write IOPS |
| **Read-through caching** | Cache on miss | Reduced read latency |
| **Bulk operations** | INSERT/UPDATE many rows at once | 10x throughput improvement |
| **Partition pruning** | Partition by time/tenant | Query only relevant partitions |
| **Column selection** | SELECT only needed columns | Reduced I/O and memory |
| **Async replication** | Read replicas for queries | Read scaling without write impact |
| **Connection multiplexing** | PgBouncer in transaction mode | Handle 10x more connections |
| **WAL archiving** | Continuous archiving | Point-in-time recovery |

---

## Item 34: Failure-Mode Analysis (FMEA)

### 34.1 FMEA Methodology

The Failure Mode and Effects Analysis (FMEA) for the Autonomous Agentic Software Organization Platform follows a systematic approach to identify, analyze, and mitigate potential failure modes across all critical subsystems. Each failure mode is scored on three dimensions:

- **Severity (S)**: Impact on system and users (1-10, 10 = catastrophic)
- **Occurrence (O)**: Likelihood of failure (1-10, 10 = very likely)
- **Detection (D)**: Ability to detect before impact (1-10, 10 = undetectable)
- **Risk Priority Number (RPN)**: S × O × D (range: 1-1000)

**RPN Thresholds:**

| RPN Range | Action Required |
|-----------|----------------|
| 1-100 | Low risk — monitor |
| 101-300 | Medium risk — mitigation recommended |
| 301-500 | High risk — mitigation required before production |
| 501+ | Critical risk — must fix before launch |

### 34.2 Database Failures

#### Failure Mode: DB-001 Connection Pool Exhaustion

| Attribute | Detail |
|-----------|--------|
| **Failure** | All connections in pool are consumed; new requests block and eventually timeout |
| **Cause** | Long-running queries holding connections; connection leak (unclosed transactions); sudden traffic spike |
| **Severity** | 8 (Complete API unavailability) |
| **Occurrence** | 5 (Moderate — occurs under load) |
| **Detection** | 3 (Pool metrics easily monitored) |
| **RPN** | **120** |
| **Symptoms** | API requests timeout; error logs show "connection pool exhausted"; latency spikes |
| **Mitigation** | 1. Connection pool sizing per service (max 20) <br> 2. Query timeout enforcement (30s statement_timeout) <br> 3. Circuit breaker on DB calls <br> 4. Connection pool monitoring with alerts <br> 5. PgBouncer for connection multiplexing |
| **Recovery** | Automatic — circuit breaker opens, requests fail fast; pool recovers when connections released |

#### Failure Mode: DB-002 Primary Database Crash

| Attribute | Detail |
|-----------|--------|
| **Failure** | Primary PostgreSQL instance crashes; all writes fail, reads may fail if no failover |
| **Severity** | 9 (All mutations fail, potential data loss) |
| **Occurrence** | 2 (Rare with managed RDS) |
| **Detection** | 2 (Immediate with health checks) |
| **RPN** | **36** |
| **Symptoms** | Write operations fail with connection errors; read replica promoted; brief unavailability |
| **Mitigation** | 1. RDS Multi-AZ deployment (automatic failover <60s) <br> 2. Synchronous replication to standby <br> 3. Automated backups every 15 minutes <br> 4. Read replicas in multiple AZs <br> 5. WAL archiving to S3 |
| **Recovery** | Automatic — RDS promotes standby to primary within 60 seconds |

#### Failure Mode: DB-003 Replication Lag

| Attribute | Detail |
|-----------|--------|
| **Failure** | Read replica lags significantly behind primary; stale data served to users |
| **Severity** | 5 (Inconsistent reads, stale data) |
| **Occurrence** | 4 (Occurs under heavy write load) |
| **Detection** | 4 (Replication lag metrics available) |
| **RPN** | **80** |
| **Symptoms** | User creates agent, but it doesn't appear in list; task status appears outdated |
| **Mitigation** | 1. Monitor replication lag with alert at >5s <br> 2. Route reads to primary when lag exceeds threshold <br> 3. Use read-your-writes consistency pattern <br> 4. Cache invalidation via pub/sub instead of relying on replica freshness |
| **Recovery** | Automatic — routing switches to primary; replica catches up naturally |

#### Failure Mode: DB-004 Data Corruption

| Attribute | Detail |
|-----------|--------|
| **Failure** | Database files become corrupted; queries return incorrect results or crash |
| **Severity** | 10 (Potential data loss, integrity compromise) |
| **Occurrence** | 1 (Extremely rare with managed services) |
| **Detection** | 6 (May go undetected until specific data accessed) |
| **RPN** | **60** |
| **Symptoms** | Queries returning wrong data; checksum errors in logs; application crashes on specific records |
| **Mitigation** | 1. PostgreSQL page checksums enabled <br> 2. Automated backups with point-in-time recovery <br> 3. Regular integrity checks (pg_dump --data-only for verification) <br> 4. Transactional integrity (ACID) <br> 5. Immutable audit log (separate storage) |
| **Recovery** | Manual — restore from backup to specific point in time; verify data integrity |

### 34.3 Inference Provider Failures

#### Failure Mode: INF-001 Provider Rate Limiting

| Attribute | Detail |
|-----------|--------|
| **Failure** | LLM API provider returns 429 Too Many Requests; inference requests fail |
| **Severity** | 7 (Agent execution stalls) |
| **Occurrence** | 7 (Common under heavy usage) |
| **Detection** | 2 (Explicit 429 response) |
| **RPN** | **98** |
| **Symptoms** | Agent tasks hang; error logs show 429 responses; fallback to backup provider |
| **Mitigation** | 1. Multi-provider routing with automatic failover <br> 2. Token bucket rate limiter per provider <br> 3. Exponential backoff with jitter <br> 4. Request queue with priority ordering <br> 5. Pre-emptive rate limit tracking (don't send if quota near limit) |
| **Recovery** | Automatic — requests routed to fallback provider; queue drains when primary recovers |

#### Failure Mode: INF-002 Provider Outage

| Attribute | Detail |
|-----------|--------|
| **Failure** | LLM provider completely unavailable; all requests fail |
| **Severity** | 8 (Cannot execute any agent tasks) |
| **Occurrence** | 3 (Rare but impactful) |
| **Detection** | 2 (Health checks detect quickly) |
| **RPN** | **48** |
| **Symptoms** | All inference requests fail; circuit breaker opens; agents cannot execute |
| **Mitigation** | 1. Multi-provider setup (OpenAI, Anthropic, Google, self-hosted) <br> 2. Circuit breaker per provider <br> 3. Automatic failover with health checking <br> 4. Graceful degradation (use smaller/faster models) <br> 5. Queue and retry when provider recovers |
| **Recovery** | Automatic — traffic shifts to healthy providers |

#### Failure Mode: INF-003 Model Quality Degradation

| Attribute | Detail |
|-----------|--------|
| **Failure** | Model produces low-quality output; code doesn't compile; incorrect answers |
| **Severity** | 6 (Poor user experience, wasted tokens) |
| **Occurrence** | 5 (Varies by model and prompt) |
| **Detection** | 7 (Difficult to detect automatically) |
| **RPN** | **210** |
| **Symptoms** | Agent success rate drops; user complaints about output quality; high retry rates |
| **Mitigation** | 1. Output quality scoring (compile check, test pass) <br> 2. A/B testing between models <br> 3. Automatic rollback to previous model version on quality drop <br> 4. User feedback loop (thumbs up/down) <br> 5. Prompt versioning with quality tracking <br> 6. Graceful degradation chain: best model → fast model → cached response |
| **Recovery** | Automatic for detected degradation; manual for subtle quality issues |

#### Failure Mode: INF-004 Excessive Token Usage

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent generates excessive output; costs skyrocket; context window exceeded |
| **Severity** | 6 (Financial impact, execution failure) |
| **Occurrence** | 5 (Common with poorly constrained prompts) |
| **Detection** | 3 (Token counting on every request) |
| **RPN** | **90** |
| **Symptoms** | Unusually high billing; context length errors; truncated responses |
| **Mitigation** | 1. Per-organization token quotas with hard limits <br> 2. Per-request max_tokens enforcement <br> 3. Streaming response with early truncation <br> 4. Cost alerts at 80% of budget <br> 5. Automatic budget suspension at 100% |
| **Recovery** | Automatic — hard limit prevents further spend; organization notified |

### 34.4 Sandbox Failures

#### Failure Mode: SAN-001 Resource Exhaustion (CPU/Memory)

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent task consumes all allocated CPU/memory; sandbox killed by OOM |
| **Severity** | 6 (Task fails, potential denial of service) |
| **Occurrence** | 6 (Common with unbounded loops) |
| **Detection** | 2 (Container metrics exposed) |
| **RPN** | **72** |
| **Symptoms** | Container exits with OOMKilled; high CPU throttling; task fails with resource error |
| **Mitigation** | 1. cgroup-based resource limits (CPU: 2 cores, Memory: 4GB default) <br> 2. OOM killer precedence set to container (not host) <br> 3. Resource usage monitoring with alerts <br> 4. Automatic scaling of sandbox workers <br> 5. Queue-based scheduling with resource awareness |
| **Recovery** | Automatic — container killed, task marked failed, resources freed |

#### Failure Mode: SAN-002 Sandbox Escape

| Attribute | Detail |
|-----------|--------|
| **Failure** | Malicious code escapes container isolation; gains host access |
| **Severity** | 10 (Complete platform compromise) |
| **Occurrence** | 1 (Rare with gVisor) |
| **Detection** | 4 (Behavioral monitoring may catch) |
| **RPN** | **40** |
| **Symptoms** | Unexpected host processes; network connections from host; file system access outside container |
| **Mitigation** | 1. gVisor (runsc) container runtime <br> 2. No container privileges (drop all capabilities) <br> 3. Read-only root filesystem <br> 4. No host network access <br> 5. Seccomp-bpf syscall filtering <br> 6. AppArmor/SELinux profiles <br> 7. Network isolation (no internet by default) <br> 8. File system restrictions (tmpfs only) <br> 9. Regular penetration testing <br> 10. Vulnerability scanning of base images |
| **Recovery** | Isolate affected node; terminate all containers; forensic analysis; rotate credentials |

#### Failure Mode: SAN-003 Malicious Code Execution

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent generates code that is intentionally harmful (deletion, exfiltration, crypto mining) |
| **Severity** | 9 (Data destruction, unauthorized access) |
| **Occurrence** | 3 (Agent could be prompted to generate harmful code) |
| **Detection** | 5 (Static analysis may catch some patterns) |
| **RPN** | **135** |
| **Symptoms** | Suspicious network connections; unusual file operations; crypto mining processes |
| **Mitigation** | 1. Static code analysis before execution (Semgrep, CodeQL) <br> 2. Network deny-by-default (no outbound connections) <br> 3. File system restrictions (read-only except /tmp) <br> 4. Execution timeout (max 5 minutes per step) <br> 5. Behavioral monitoring (syscall profiling) <br> 6. Allow-list of permitted system calls <br> 7. Code review requirement for destructive operations |
| **Recovery** | Kill container; quarantine generated code; alert security team; review agent instructions |

#### Failure Mode: SAN-004 Network Abuse from Sandbox

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent uses network access for abuse (spam, DDoS, port scanning) |
| **Severity** | 8 (Platform reputation damage, legal liability) |
| **Occurrence** | 3 (Requires network access to be enabled) |
| **Detection** | 4 (Network monitoring can detect) |
| **RPN** | **96** |
| **Mitigation** | 1. Default-deny network policy <br> 2. Explicit allow-list of domains/IPs if network needed <br> 3. Egress traffic monitoring and rate limiting <br> 4. DNS filtering for known malicious domains <br> 5. Traffic volume alerts per sandbox |
| **Recovery** | Kill container; revoke network access; report abuse to provider |

### 34.5 Network Failures

#### Failure Mode: NET-001 Network Partition (Split Brain)

| Attribute | Detail |
|-----------|--------|
| **Failure** | Network partition causes nodes to lose connectivity; split-brain scenario |
| **Severity** | 7 (Data inconsistency, duplicate processing) |
| **Occurrence** | 2 (Rare in cloud environments) |
| **Detection** | 3 (Health checks fail across partition) |
| **RPN** | **42** |
| **Symptoms** | Inconsistent data across nodes; duplicate task execution; leader election flapping |
| **Mitigation** | 1. Temporal handles workflow consistency across partitions <br> 2. Database-level consistency (ACID transactions) <br> 3. Idempotent operation design <br> 4. Circuit breakers prevent cascade failures <br> 5. Automatic reconciliation on partition heal |
| **Recovery** | Automatic — partitioned nodes stop processing; reconcile when partition heals |

#### Failure Mode: NET-002 Latency Spike

| Attribute | Detail |
|-----------|--------|
| **Failure** | Sudden increase in network latency; API requests slow down significantly |
| **Severity** | 6 (Degraded user experience) |
| **Occurrence** | 5 (Occurs during traffic spikes, DDoS) |
| **Detection** | 2 (Latency metrics tracked) |
| **RPN** | **60** |
| **Symptoms** | API response times increase 10x; WebSocket messages delayed; timeouts increase |
| **Mitigation** | 1. Auto-scaling based on latency <br> 2. CDN for static assets <br> 3. Request coalescing for identical requests <br> 4. Graceful degradation (disable non-essential features) <br> 5. Geographic distribution (multi-region) |
| **Recovery** | Automatic — scaling kicks in; manual if DDoS (enable rate limiting, WAF) |

#### Failure Mode: NET-003 DNS Resolution Failure

| Attribute | Detail |
|-----------|--------|
| **Failure** | DNS resolution fails for critical services; connections cannot be established |
| **Severity** | 7 (External dependencies unreachable) |
| **Occurrence** | 3 (DNS outages happen) |
| **Detection** | 2 (Immediate for active connections) |
| **RPN** | **42** |
| **Symptoms** | Cannot connect to LLM APIs; database connections fail; webhook delivery fails |
| **Mitigation** | 1. DNS caching at application layer <br> 2. Multiple DNS resolver fallback <br> 3. IP address fallback for critical services <br> 4. Connection retry with exponential backoff <br> 5. Circuit breaker on DNS-dependent operations |
| **Recovery** | Automatic — retry with fallback; circuit breaker opens during prolonged outage |

### 34.6 Agent Failures

#### Failure Mode: AGT-001 Infinite Loop

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent enters infinite loop: repeatedly calling same tool with same arguments |
| **Severity** | 6 (Task never completes, wasted tokens/compute) |
| **Occurrence** | 6 (Common with insufficient prompt constraints) |
| **Detection** | 4 (Pattern detection possible) |
| **RPN** | **144** |
| **Symptoms** | Task runs indefinitely; same tool calls repeated; token usage skyrockets |
| **Mitigation** | 1. Maximum iteration limit (default: 50 steps) <br> 2. Tool call deduplication (same args within 3 calls = loop) <br> 3. Execution timeout (max 10 minutes) <br> 4. Token budget per task <br> 5. Pattern detection: flag repeated identical tool calls <br> 6. Human-in-the-loop approval for loops >10 iterations |
| **Recovery** | Automatic — task terminated after limit reached; partial results preserved |

#### Failure Mode: AGT-002 Hallucination (Fabricated Information)

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent generates plausible but incorrect information; references non-existent files/functions |
| **Severity** | 7 (Incorrect code, misleading output) |
| **Occurrence** | 7 (Very common with LLMs) |
| **Detection** | 8 (Very difficult to detect automatically) |
| **RPN** | **392** |
| **Symptoms** | Code references non-existent imports; claims about API that don't exist; incorrect file paths |
| **Mitigation** | 1. Tool verification — agent must verify via tool call, not assume <br> 2. File existence check before referencing <br> 3. Code compilation as validation step <br> 4. Test execution to verify behavior <br> 5. Self-correction loop: agent reviews own output <br> 6. Human review requirement for critical changes <br> 7. Grounding: retrieve actual codebase context before generation |
| **Recovery** | Agent self-correction loop; human review flagged items |

#### Failure Mode: AGT-003 Tool Misuse

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent uses tools incorrectly: wrong arguments, wrong tool for task, destructive operations |
| **Severity** | 8 (Data loss, security issues) |
| **Occurrence** | 5 (Moderate — improves with better prompting) |
| **Detection** | 5 (Some misuse patterns detectable) |
| **RPN** | **200** |
| **Symptoms** | File operations on wrong paths; shell commands with incorrect flags; git operations on wrong branch |
| **Mitigation** | 1. Tool parameter validation (strict schema enforcement) <br> 2. Path validation (must be within workspace) <br> 3. Destructive operation confirmation (rm, git reset) <br> 4. Dry-run mode for destructive tools <br> 5. Tool use examples in system prompt <br> 6. Tool output interpretation guidance |
| **Recovery** | Undo capability for destructive operations; workspace snapshots before changes |

#### Failure Mode: AGT-004 Context Window Exhaustion

| Attribute | Detail |
|-----------|--------|
| **Failure** | Agent conversation exceeds model context window; oldest messages truncated |
| **Severity** | 5 (Loss of early context; degraded performance) |
| **Occurrence** | 7 (Common in long tasks) |
| **Detection** | 2 (Token count tracked) |
| **RPN** | **70** |
| **Symptoms** | Agent forgets earlier instructions; references lost; performance degrades |
| **Mitigation** | 1. Proactive context summarization <br> 2. Hierarchical memory (recent detailed + older summarized) <br> 3. Token count monitoring with alerts at 80% <br> 4. Automatic checkpointing and context compaction <br> 5. Smart truncation (preserve system prompt, summarize history) |
| **Recovery** | Automatic — context compacted; agent informed of summarization |

### 34.7 Workflow Failures

#### Failure Mode: WF-001 Deadlock

| Attribute | Detail |
|-----------|--------|
| **Failure** | Two or more workflows block each other waiting for shared resources |
| **Severity** | 7 (Workflows stall permanently) |
| **Occurrence** | 3 (Rare with proper design) |
| **Detection** | 4 (Workflow timeout monitoring) |
| **RPN** | **84** |
| **Symptoms** | Workflows stuck in "running" state for hours; no progress; resource locks held |
| **Mitigation** | 1. Temporal handles deadlock prevention via timeouts <br> 2. Resource lock timeout (max 5 minutes) <br> 3. Lock ordering convention (always acquire A before B) <br> 4. Workflow heartbeat detection <br> 5. Automatic workflow termination on deadlock detection |
| **Recovery** | Automatic — Temporal workflow timeout triggers compensation; locks released |

#### Failure Mode: WF-002 Starvation

| Attribute | Detail |
|-----------|--------|
| **Failure** | Low-priority workflows never get executed because high-priority tasks consume all resources |
| **Severity** | 5 (Some tasks never complete) |
| **Occurrence** | 5 (Common with priority systems) |
| **Detection** | 5 (Requires monitoring queue wait times) |
| **RPN** | **125** |
| **Symptoms** | Low-priority tasks in queue for hours; high-priority tasks completing fine |
| **Mitigation** | 1. Priority queue with aging (priority increases with wait time) <br> 2. Reserved capacity for each priority tier (25% minimum) <br> 3. Fair scheduling algorithm <br> 4. Queue depth monitoring with alerts <br> 5. Escalation rules for long-waiting tasks |
| **Recovery** | Automatic — aging mechanism ensures eventual execution |

#### Failure Mode: WF-003 Workflow Version Mismatch

| Attribute | Detail |
|-----------|--------|
| **Failure** | Workflow code updated while workflows are running; state schema incompatibility |
| **Severity** | 8 (Workflow corruption, state loss) |
| **Occurrence** | 3 (Occurs during deployments) |
| **Detection** | 4 (Version check on workflow resume) |
| **RPN** | **96** |
| **Symptoms** | Workflows fail with serialization errors; state cannot be deserialized; execution resumes at wrong point |
| **Mitigation** | 1. Workflow versioning strategy (Temporal handles this natively) <br> 2. Schema evolution support (backward-compatible state changes) <br> 3. Blue/green deployment for workflow workers <br> 4. State migration scripts for breaking changes <br> 5. Version pinning for long-running workflows |
| **Recovery** | Manual — state migration or workflow restart from last checkpoint |

### 34.8 Cache Failures

#### Failure Mode: CCH-001 Cache Stampede

| Attribute | Detail |
|-----------|--------|
| **Failure** | Multiple requests simultaneously miss cache; all hit database simultaneously |
| **Severity** | 6 (Database overload, API latency spike) |
| **Occurrence** | 5 (Common after cache expiry or cold start) |
| **Detection** | 3 (Request rate and DB load monitoring) |
| **RPN** | **90** |
| **Symptoms** | Sudden DB connection spike; API latency increases 10x; cache miss rate jumps to 100% |
| **Mitigation** | 1. Staggered TTL (add random jitter to expiry) <br> 2. Distributed locking for cache computation <br> 3. Probabilistic early revalidation <br> 4. Cache warming on deploy <br> 5. Circuit breaker on DB under load |
| **Recovery** | Automatic — stampede protection prevents DB overload; cache repopulates |

#### Failure Mode: CCH-002 Cache Invalidation Failure

| Attribute | Detail |
|-----------|--------|
| **Failure** | Cache not invalidated after data update; stale data served |
| **Severity** | 5 (Inconsistent data displayed) |
| **Occurrence** | 4 (Bugs in invalidation logic) |
| **Detection** | 6 (Difficult — data looks valid but is stale) |
| **RPN** | **120** |
| **Symptoms** | Updated data not reflected in UI; old values persist after refresh |
| **Mitigation** | 1. Event-driven invalidation (pub/sub on updates) <br> 2. Version-stamped cache entries <br> 3. Cache TTL as safety net (short for volatile data) <br> 4. Write-through pattern for critical data <br> 5. Periodic cache consistency checks <br> 6. Manual cache flush capability |
| **Recovery** | TTL expiry eventually resolves; manual flush if urgent |

### 34.9 Security Failures

#### Failure Mode: SEC-001 Credential Leakage

| Attribute | Detail |
|-----------|--------|
| **Failure** | API keys, tokens, or passwords exposed in logs, code, or agent output |
| **Severity** | 9 (Unauthorized access, data breach) |
| **Occurrence** | 4 (Accidental exposure common) |
| **Detection** | 3 (Secret scanning can catch) |
| **RPN** | **108** |
| **Symptoms** | Secrets in Git history; API keys in logs; passwords in agent chat |
| **Mitigation** | 1. Pino redaction for all sensitive fields <br> 2. Pre-commit hooks with secret scanning (gitleaks) <br> 3. CI/CD secret scanning <br> 4. Credential vault integration (HashiCorp Vault) <br> 5. Automatic credential rotation <br> 6. Agent output filtering for known secret patterns <br> 7. Audit logging of all credential access |
| **Recovery** | Immediate rotation of exposed credentials; incident response procedure |

#### Failure Mode: SEC-002 Privilege Escalation

| Attribute | Detail |
|-----------|--------|
| **Failure** | User gains unauthorized access to resources or permissions beyond their role |
| **Severity** | 9 (Data breach, unauthorized actions) |
| **Occurrence** | 2 (Requires vulnerability exploitation) |
| **Detection** | 4 (Audit logs may reveal) |
| **RPN** | **72** |
| **Symptoms** | User accessing admin functions; viewing other orgs' data; unauthorized API calls |
| **Mitigation** | 1. Defense in depth: auth + RBAC + resource-level checks <br> 2. Principle of least privilege <br> 3. Input validation on all resource IDs <br> 4. Organization scoping on every query <br> 5. Regular access audits <br> 6. Automated anomaly detection for access patterns |
| **Recovery** | Revoke compromised sessions; audit all actions taken; fix vulnerability |

#### Failure Mode: SEC-003 Data Exfiltration

| Attribute | Detail |
|-----------|--------|
| **Failure** | Sensitive data extracted from the platform by unauthorized actor |
| **Severity** | 10 (Regulatory breach, legal liability) |
| **Occurrence** | 2 (Requires exploit or insider) |
| **Detection** | 5 (DLP monitoring may catch) |
| **RPN** | **100** |
| **Symptoms** | Large data downloads; unusual export patterns; data in unauthorized locations |
| **Mitigation** | 1. Rate limiting on data export <br> 2. Data loss prevention (DLP) scanning <br> 3. Encryption at rest and in transit <br> 4. Access logging for all data access <br> 5. Anomaly detection on data access patterns <br> 6. Data classification and handling policies <br> 7. Network egress monitoring |
| **Recovery** | Incident response; breach notification; forensic investigation |

#### Failure Mode: SEC-004 Injection Attack

| Attribute | Detail |
|-----------|--------|
| **Failure** | Malicious input injected into prompts, code, or queries |
| **Severity** | 8 (Remote code execution, data manipulation) |
| **Occurrence** | 3 (Prompt injection common with LLMs) |
| **Detection** | 4 (Input validation catches most; prompt injection is harder) |
| **RPN** | **96** |
| **Symptoms** | Agent behaves unexpectedly; unauthorized actions via prompt manipulation; SQL injection patterns |
| **Mitigation** | 1. Parameterized queries (Kysely prevents SQL injection) <br> 2. Input validation with Zod on all inputs <br> 3. Prompt injection detection (heuristic patterns) <br> 4. Sandboxed code execution <br> 5. Output encoding for all rendered content <br> 6. Content Security Policy headers <br> 7. Separate system and user prompt boundaries |
| **Recovery** | Terminate affected agent sessions; review logs; patch vulnerability |

---


## Item 35: Tradeoff Analysis

### 35.1 Methodology

Each architectural tradeoff is evaluated using a structured framework:

| Dimension | Description | Scoring |
|-----------|-------------|---------|
| **Time to Market** | Speed of initial delivery | 1-10 (10 = fastest) |
| **Scalability** | Ability to handle growth | 1-10 (10 = most scalable) |
| **Operational Complexity** | Day-to-day operational burden | 1-10 (10 = simplest) |
| **Team Velocity** | Developer productivity | 1-10 (10 = highest) |
| **Cost Efficiency** | Infrastructure and operational costs | 1-10 (10 = most efficient) |
| **Flexibility** | Ability to adapt to change | 1-10 (10 = most flexible) |
| **Risk Profile** | Technical and organizational risk | 1-10 (10 = lowest risk) |

**Decision Weighting:**

| Phase | Time to Market | Scalability | Operational Complexity | Team Velocity | Cost Efficiency | Flexibility | Risk Profile |
|-------|---------------|-------------|----------------------|---------------|----------------|-------------|--------------|
| MVP (0-3 months) | 30% | 10% | 15% | 25% | 10% | 5% | 5% |
| Growth (3-12 months) | 15% | 20% | 15% | 20% | 15% | 10% | 5% |
| Scale (12+ months) | 5% | 25% | 15% | 15% | 15% | 10% | 15% |

### 35.2 Microservices vs Modular Monolith

**Decision: Start with Modular Monolith, extract services at scale**

```
Score Comparison (MVP Phase):

Dimension          | Modular Monolith | Microservices | Winner
-------------------|------------------|---------------|--------
Time to Market     | 9                | 4             | Monolith
Scalability        | 6                | 9             | Microservices
Operational Comp.  | 8                | 4             | Monolith
Team Velocity      | 9                | 5             | Monolith
Cost Efficiency    | 9                | 5             | Monolith
Flexibility        | 6                | 8             | Microservices
Risk Profile       | 8                | 5             | Monolith
-------------------|------------------|---------------|--------
MVP Weighted Score | 8.4              | 5.4           | MONOLITH
Growth Weighted    | 7.2              | 7.0           | MONOLITH (slight)
Scale Weighted     | 6.5              | 8.0           | MICROSERVICES
```

**Rationale:**

The platform's domains (agents, tasks, workflows, billing) are tightly coupled by nature—an agent executes a task within a workflow, consuming tokens that affect billing. In the early stages, the cost of inter-service communication, distributed transaction management, and operational complexity far outweighs the benefits of independent deployability.

**Monolith Structure:**

```
┌──────────────────────────────────────────────────────────┐
│                  API Gateway (Fastify)                    │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Agents  │  Tasks   │Workflows │ Billing  │ Observability│
│  Module  │  Module  │  Module  │  Module  │   Module     │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│              Shared Infrastructure Layer                  │
│  (DB Access, Cache, Events, Auth, Logging, Config)       │
└──────────────────────────────────────────────────────────┘
```

**Extraction Criteria (when to split):**
- A module requires independent scaling (10x different load patterns)
- A module needs a different technology stack
- A module has a separate deployment cadence (daily vs weekly)
- Team size exceeds Dunbar's number for codebase familiarity (15 engineers)
- Module boundary is well-defined with clear interfaces

### 35.3 Strong vs Eventual Consistency

**Decision: Strong consistency for critical data, eventual consistency for analytics**

| Data Type | Consistency Model | Rationale |
|-----------|------------------|-----------|
| User/Org data | Strong (ACID) | Critical for auth, billing; cannot tolerate inconsistency |
| Agent state | Strong (ACID) | State transitions must be reliable |
| Task status | Strong (ACID) | Status drives workflows; must be accurate |
| Workflow state | Strong (Temporal guarantees) | Temporal provides exactly-once execution |
| Billing/usage | Strong (ACID) | Financial data requires precision |
| Session data | Strong (Redis transactions) | Real-time state must be accurate |
| Analytics | Eventual (async aggregation) | Approximate is acceptable; freshness matters less |
| Search indexes | Eventual (async indexing) | Slight delay acceptable for search |
| Cache | Eventual (TTL-based) | By definition eventually consistent |
| Activity feeds | Eventual (async) | Near-real-time is sufficient |
| Audit logs | Strong (append-only) | Must be accurate and complete |
| Notifications | Eventual (queued) | Best-effort delivery acceptable |

**Implementation:**

```typescript
// Strong consistency: Database transaction
async function createAgentWithBilling(data: CreateAgentInput, orgId: string) {
  return db.transaction().execute(async (trx) => {
    const agent = await trx.insertInto('agents').values(data).returningAll().execute();
    await trx.insertInto('audit_logs').values({ action: 'agent_created', ... }).execute();
    await trx.insertInto('usage_events').values({ type: 'agent_created', ... }).execute();
    return agent;
  });
}

// Eventual consistency: Async event processing
async function updateSearchIndex(agent: Agent) {
  // Fire and forget — search index updates asynchronously
  await eventBus.publish('agent.updated', agent);
  // Search indexer consumes event and updates index
}
```

### 35.4 Latency vs Cost

**Decision: Tiered strategy based on use case**

| Use Case | Latency Target | Cost Strategy |
|----------|---------------|---------------|
| **Streaming agent output** | <100ms token delivery | Premium model for quality; streaming hides latency |
| **Dashboard data** | <500ms page load | Cache aggressively; cheap model for summaries |
| **Batch code review** | <30s total | Cheapest adequate model; parallel processing |
| **Real-time chat** | <2s first token | Fast model (GPT-4o-mini); upgrade if needed |
| **Test generation** | <10s total | Cost-optimized; correctness > speed |
| **Documentation** | <30s total | Cheapest model; quality sufficient |
| **Emergency fix** | <5s first token | Premium model; speed priority |

**Cost Optimization Techniques:**

```typescript
// Smart model selection
function selectModel(task: Task): ModelConfig {
  switch (task.type) {
    case 'code_review':
      return { model: 'gpt-4o-mini', provider: 'openai' }; // Cheap, good enough
    case 'architecture_design':
      return { model: 'gpt-4o', provider: 'openai' }; // Premium for complex tasks
    case 'test_generation':
      return { model: 'claude-3-haiku', provider: 'anthropic' }; // Fast, cheap
    case 'emergency_fix':
      return { model: 'gpt-4o', provider: 'openai' }; // Fastest, best quality
    default:
      return { model: 'gpt-4o-mini', provider: 'openai' }; // Default to cheap
  }
}

// Prompt caching for repeated contexts
const promptCache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 60 });
async function getCompletion(prompt: string, context: string) {
  const cacheKey = hash(context + prompt);
  const cached = promptCache.get(cacheKey);
  if (cached) return cached;

  const result = await inferenceClient.complete(prompt, context);
  promptCache.set(cacheKey, result);
  return result;
}

// Token usage optimization
function optimizePrompt(prompt: string, maxTokens: number): string {
  // Remove unnecessary whitespace
  // Truncate context to most relevant sections
  // Use shorter variable names in code context
  // Summarize long conversation history
  return compressedPrompt;
}
```

### 35.5 Flexibility vs Type Safety

**Decision: Maximum type safety with flexible interfaces at boundaries**

| Layer | Type Safety | Flexibility Strategy |
|-------|-------------|---------------------|
| Database schema | Strict (Zod + Kysely) | Migrations for schema evolution |
| API contracts | Strict (Zod validation) | Versioning for breaking changes |
| Internal modules | Strict (TypeScript strict) | Interfaces for testability |
| External integrations | Flexible (runtime validation) | Adapter pattern for provider changes |
| Configuration | Strict (Zod schema) | Environment-based overrides |
| Plugin system | Flexible (dynamic loading) | Contract-based with runtime validation |

**Implementation Pattern:**

```typescript
// Strict internally, flexible at boundaries
interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: unknown) => Promise<unknown>;
}

// Flexible input at boundary
class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  async execute(toolName: string, rawParams: unknown) {
    const tool = this.tools.get(toolName);
    if (!tool) throw new NotFoundError('Tool', toolName);

    // Validate at boundary
    const params = tool.parameters.parse(rawParams);

    // Strict internal execution
    return tool.execute(params);
  }
}
```

### 35.6 Build vs Buy Analysis

| Component | Build | Buy | Decision | Rationale |
|-----------|-------|-----|----------|-----------|
| **Auth (OAuth/JWT)** | 4 | 9 | **Buy** (Clerk/Auth0) | Security-critical; faster integration |
| **Auth (SSO/SAML)** | 3 | 9 | **Buy** (WorkOS) | Complex protocol; compliance needs |
| **Database** | 2 | 10 | **Buy** (RDS/Neon) | Managed service reduces ops burden |
| **Cache** | 4 | 9 | **Buy** (ElastiCache/Upstash) | Managed Redis; automatic failover |
| **Queue** | 5 | 8 | **Buy** (BullMQ on Redis) | Open-source; sufficient capability |
| **Workflow Engine** | 4 | 9 | **Buy** (Temporal) | Durable execution is complex; Temporal is proven |
| **Sandbox** | 5 | 8 | **Hybrid** (gVisor + custom) | gVisor runtime + custom orchestration |
| **LLM Routing** | 7 | 5 | **Build** | Core differentiator; custom logic needed |
| **Terminal** | 3 | 9 | **Buy** (xterm.js) | Mature library; extensive ecosystem |
| **Editor** | 2 | 10 | **Buy** (Monaco Editor) | Microsoft's investment; feature-complete |
| **Drag-and-Drop** | 4 | 8 | **Buy** (@dnd-kit) | Accessibility, touch support built-in |
| **Charts/Graphs** | 4 | 8 | **Buy** (Recharts/Tremor) | Sufficient for dashboard needs |
| **Voice** | 3 | 9 | **Buy** (LiveKit) | Complex media handling; global infrastructure |
| **Observability** | 4 | 8 | **Hybrid** | Custom dashboards + managed backend (Datadog) |
| **File Storage** | 3 | 10 | **Buy** (S3/R2) | Proven, cheap, infinite scale |
| **Search** | 5 | 7 | **Hybrid** (pgvector + Algolia) | pgvector for similarity; Algolia for full-text |
| **Email** | 2 | 9 | **Buy** (Resend/SendGrid) | Deliverability expertise required |
| **Payments** | 1 | 10 | **Buy** (Stripe) | Compliance, fraud, tax handling |
| **Analytics** | 5 | 7 | **Hybrid** | Custom events + managed platform (PostHog) |

### 35.7 SQL vs NoSQL for Different Workloads

| Workload | Technology | Rationale |
|----------|-----------|-----------|
| **Transactional data** | PostgreSQL | ACID, complex queries, joins, JSON support |
| **Session/cache** | Redis | Sub-millisecond, pub/sub, TTL |
| **Time-series metrics** | TimescaleDB (PostgreSQL extension) | SQL interface, time-series optimizations |
| **Vector search** | pgvector (PostgreSQL extension) | Same DB, ACID vectors, ivfflat/hnsw |
| **Full-text search** | PostgreSQL tsvector + Algolia | SQL for simple, Algolia for advanced |
| **Event sourcing** | PostgreSQL (append-only) | ACID events, temporal queries |
| **Analytics/OLAP** | ClickHouse (future) | Columnar, fast aggregations |
| **Document storage** | PostgreSQL JSONB | Simpler ops; migrate to Mongo only if needed |
| **Graph relationships** | PostgreSQL with recursive CTEs | Simpler ops; Neo4j only if needed |
| **Blob storage** | S3 | Cheap, infinite, CDN-integrated |

**Why PostgreSQL as Primary:**

```
PostgreSQL Ecosystem:
├── Core: ACID transactions, MVCC, sophisticated query planner
├── Extensions:
│   ├── pgvector: Vector similarity search (for agent memory)
│   ├── TimescaleDB: Time-series data (for metrics)
│   ├── PostGIS: Geospatial (future location features)
│   ├── pg_cron: Scheduled jobs within database
│   └── pg_stat_statements: Query performance analysis
├── JSONB: Semi-structured data without separate document DB
├── Full-text search: tsvector/tsquery for basic search
├── Listen/Notify: Real-time event streaming
└── Partitioning: Native table partitioning for large tables
```

### 35.8 REST vs GraphQL vs tRPC

**Decision: tRPC for internal, REST (OpenAPI) for external**

| Aspect | REST | GraphQL | tRPC |
|--------|------|---------|------|
| Type Safety | Manual | Schema-based | End-to-end TypeScript |
| API Discovery | Swagger/OpenAPI | Schema introspection | IDE autocomplete |
| Frontend DX | Good | Excellent (Apollo) | Excellent (no code gen) |
| Bundle Size | N/A | ~30KB (Apollo) | ~5KB |
| Caching | HTTP caching | Complex (DataLoader) | React Query |
| File Uploads | Native | Multipart workaround | Native |
| Streaming | SSE/WebSocket | Subscriptions | WebSocket |
| External API | Standard | Requires schema | Not suitable |
| Learning Curve | Low | Medium | Low |

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├──────────────────┬──────────────────────────────────────────┤
│  External API    │  Internal API (tRPC)                    │
│  (OpenAPI/REST)  │                                          │
│                  │  ┌─────────┐    ┌─────────┐             │
│  /api/v1/agents  │  │  Next.js │◄───│  tRPC   │             │
│  /api/v1/tasks   │  │  Client  │    │  Router │             │
│  /api/v1/...     │  └─────────┘    └────┬────┘             │
│                  │                       │                  │
│  Webhooks        │                  Zod validation          │
│  SSO callbacks   │                       │                  │
│  File uploads    │                  Business logic          │
│                  │                       │                  │
└──────────────────┴───────────────────────┴──────────────────┘
```

### 35.9 Self-Hosted vs Managed Services

| Service | Self-Hosted | Managed | Decision | Rationale |
|---------|-------------|---------|----------|-----------|
| **Application servers** | Kubernetes | ECS/Fargate | **Managed** | Less ops, auto-scaling |
| **Database** | PostgreSQL on EC2 | RDS/Neon | **Managed** | Backups, failover, patching |
| **Cache** | Redis on EC2 | ElastiCache | **Managed** | Cluster mode, failover |
| **Queue** | Redis + BullMQ | Same | **Hybrid** | BullMQ on managed Redis |
| **Object storage** | MinIO | S3/R2 | **Managed** | 99.999999999% durability |
| **LLM inference** | vLLM on GPU | OpenAI API | **Hybrid** | API for ease; self-hosted for cost |
| **Observability** | Grafana stack | Datadog | **Managed** | Faster setup, better features |
| **Search** | Elasticsearch | Algolia | **Managed** | Better relevance, less ops |
| **Email** | Postfix | Resend | **Managed** | Deliverability expertise |
| **DNS** | BIND | Route 53 | **Managed** | Global anycast, health checks |
| **CDN** | Nginx | CloudFront | **Managed** | Edge locations, DDoS protection |
| **CI/CD** | Jenkins | GitHub Actions | **Managed** | Integrated, simpler |

### 35.10 Sync vs Async Processing

| Operation | Pattern | Technology | Rationale |
|-----------|---------|-----------|-----------|
| **User login** | Sync | Direct DB query | Must complete before response |
| **Agent creation** | Sync | DB transaction | User waits for confirmation |
| **Agent execution** | Async | Temporal + BullMQ | Long-running, user doesn't wait |
| **Task status update** | Async | Event-driven | Many consumers need to know |
| **Billing charge** | Sync (critical path) | DB transaction | User must see confirmation |
| **Usage aggregation** | Async | Background job | Approximate real-time OK |
| **Notification send** | Async | Queue | Best-effort delivery |
| **Search index update** | Async | Event consumer | Eventual consistency OK |
| **Audit log write** | Async (fire-and-forget) | Background job | Must not block main flow |
| **Cache invalidation** | Async | Pub/sub | Eventual consistency OK |
| **Export generation** | Async | Background job | File created, then downloaded |
| **Report generation** | Async | Background job | Large result set |
| **Real-time streaming** | Async | WebSocket/SSE | Continuous data flow |
| **Image processing** | Async | Background job | CPU-intensive |
| **Email delivery** | Async | Queue | External service dependency |

### 35.11 Multi-Tenant Isolation Strategies

| Strategy | Implementation | Isolation Level | Cost | Complexity |
|----------|---------------|----------------|------|------------|
| **Shared DB, Row-Level Security** | PostgreSQL RLS policies | Logical | Low | Medium |
| **Shared DB, Schema per Tenant** | Separate schemas | Schema | Medium | High |
| **Database per Tenant** | Separate RDS instances | Full | High | High |
| **Kubernetes Namespace per Tenant** | Separate deployments | Infrastructure | High | Very High |
| **Fully Dedicated Stack** | Separate infrastructure | Complete | Very High | Very High |

**Decision: Row-Level Security (RLS) for shared tier, Schema per Tenant for dedicated tier**

```sql
-- Row-Level Security Implementation
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_org_isolation ON agents
  USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Application sets org context
SET LOCAL app.current_org_id = 'org-123-uuid';

-- All queries automatically filtered by RLS
SELECT * FROM agents; -- Only returns org-123's agents
```

**RLS Benefits:**
- Automatic data isolation (cannot forget WHERE clause)
- Single database (simpler operations)
- Cross-tenant analytics possible with elevated privileges
- Easy tenant provisioning (just an org row)
- Efficient resource utilization

---

## Item 40: Long-Term Maintainability Analysis

### 40.1 Maintainability Philosophy

Software systems decay over time—a phenomenon known as **software entropy**. In an AI agent platform, this decay accelerates due to rapid changes in model capabilities, evolving security requirements, and the inherent complexity of autonomous systems. The maintainability strategy treats **longevity as a first-class requirement**, designing for a 10+ year operational lifespan through deliberate technology choices, defensive architecture, and institutional knowledge preservation.

**Maintainability Pillars:**

| Pillar | Description | Measurement |
|--------|-------------|-------------|
| **Comprehensibility** | Can new engineers understand and modify the code? | Time to first meaningful PR |
| **Testability** | Can changes be validated with confidence? | Test coverage, mutation score |
| **Deployability** | Can changes reach production safely and quickly? | Lead time for changes |
| **Operability** | Can the system be understood and managed in production? | MTTR, alert quality |
| **Extensibility** | Can new capabilities be added without modification? | Plugin API stability |
| **Observability** | Can internal state be understood from external outputs? | Time to root cause |

### 40.2 Technology Selection Criteria

**Evaluation Framework:**

```
Technology Scorecard (each dimension scored 1-10):

┌──────────────────────────────────────────────────────────────┐
│ Dimension          │ Weight │ Score │ Weighted │ Threshold   │
├──────────────────────────────────────────────────────────────┤
│ Maturity           │  20%   │   ?   │   ?      │ >7          │
│ Community          │  15%   │   ?   │   ?      │ >7          │
│ Documentation      │  10%   │   ?   │   ?      │ >7          │
│ Type Safety        │  10%   │   ?   │   ?      │ >8          │
│ Performance        │  10%   │   ?   │   ?      │ >6          │
│ Security Track     │  10%   │   ?   │   ?      │ >8          │
│ Governance         │   5%   │   ?   │   ?      │ >5          │
│ Upgrade Path       │   5%   │   ?   │   ?      │ >6          │
│ Vendor Lock-in     │   5%   │   ?   │   ?      │ Low risk    │
│ Hiring Pool        │   5%   │   ?   │   ?      │ >6          │
│ License            │   5%   │   ?   │   ?      │ Permissive  │
└──────────────────────────────────────────────────────────────┘
Minimum weighted score: 7.0/10
```

**Selected Technologies Assessment:**

| Technology | Maturity | Community | Type Safety | Security | Governance | Upgrade Path | Score |
|------------|----------|-----------|-------------|----------|------------|--------------|-------|
| TypeScript | 10 | 10 | 10 | 8 | 9 | 8 | **9.5** |
| Next.js | 9 | 10 | 9 | 8 | 9 | 7 | **8.8** |
| Fastify | 8 | 7 | 9 | 8 | 7 | 7 | **7.6** |
| PostgreSQL | 10 | 10 | 7 | 10 | 10 | 10 | **9.4** |
| Temporal | 8 | 7 | 8 | 8 | 8 | 7 | **7.7** |
| Redis | 10 | 10 | 6 | 9 | 9 | 9 | **9.0** |
| Docker | 10 | 10 | 5 | 8 | 8 | 8 | **8.5** |
| Kubernetes | 9 | 10 | 5 | 8 | 9 | 6 | **8.0** |
| Tailwind CSS | 9 | 10 | 6 | 8 | 8 | 7 | **8.2** |
| Zustand | 8 | 8 | 9 | 7 | 7 | 7 | **7.5** |
| tRPC | 8 | 8 | 10 | 7 | 7 | 6 | **7.6** |
| Kysely | 7 | 6 | 10 | 7 | 6 | 6 | **7.0** |

### 40.3 Dependency Minimization Strategy

**Principles:**
1. **Default skepticism**: Every dependency must justify its existence
2. **Single responsibility**: Each dependency does one thing well
3. **Active maintenance**: Must have commits within the last 3 months
4. **Community health**: More than 100 stars, multiple maintainers
5. **Security hygiene**: No known CVEs, dependency scanning passes

**Dependency Inventory Management:**

```typescript
// dependencies.config.ts
// Centralized dependency decisions
export const dependencies = {
  // Core framework — non-negotiable
  framework: [
    { name: 'next', reason: 'App Router, SSR, API routes', locked: true },
    { name: 'fastify', reason: 'High-performance Node.js server', locked: true },
  ],

  // UI — carefully curated
  ui: [
    { name: 'tailwindcss', reason: 'Utility-first, no runtime', locked: true },
    { name: '@radix-ui/*', reason: 'shadcn/ui primitives', locked: true },
    { name: '@tanstack/react-query', reason: 'Server state management', locked: true },
    { name: 'zustand', reason: 'Client state management', locked: true },
  ],

  // Database — single source
  database: [
    { name: 'kysely', reason: 'Type-safe query builder', locked: true },
    { name: 'pg', reason: 'PostgreSQL driver', locked: true },
  ],

  // Infrastructure — proven
  infra: [
    { name: 'ioredis', reason: 'Redis client with cluster support', locked: true },
    { name: 'bullmq', reason: 'Queue processing', locked: true },
    { name: '@temporalio/*', reason: 'Workflow orchestration', locked: true },
  ],

  // Utilities — minimal
  utils: [
    { name: 'zod', reason: 'Schema validation', locked: true },
    { name: 'pino', reason: 'Structured logging', locked: true },
    { name: 'date-fns', reason: 'Date manipulation', locked: true },
  ],
};

// Rules for new dependencies
const DEPENDENCY_RULES = [
  'Must solve a problem not solvable with existing deps',
  'Bundle size must be <50KB gzipped',
  'Must be actively maintained (commits in last 3 months)',
  'Must have >100 GitHub stars or corporate backing',
  'Must pass security audit',
  'Must not duplicate functionality of existing deps',
  'Must have TypeScript definitions (first-party or @types)',
  'Requires ADR and team approval',
];
```

**Dependency Health Monitoring:**

| Check | Frequency | Tool | Action on Failure |
|-------|-----------|------|-------------------|
| Outdated packages | Weekly | npm-outdated | Create update PR |
| Security vulnerabilities | Daily | Snyk/npm audit | Block CI if critical |
| Unused dependencies | Weekly | depcheck | Remove if confirmed unused |
| Bundle size impact | Every PR | bundlesize | Block if exceeds budget |
| License compliance | Every PR | FOSSA | Block if violation |
| Community health | Quarterly | GitHub API | Flag for replacement if declining |

### 40.4 Interface Stability Commitments

**API Versioning Policy:**

```
API Stability Guarantees:

┌──────────────────────────────────────────────────────────────┐
│ Version │ Status        │ Support Duration │ Breaking Changes │
├──────────────────────────────────────────────────────────────┤
│ v1      │ Current       │ Minimum 12 months │ None planned    │
│ v2      │ Beta          │ —                │ Active dev       │
│ v3      │ Not started   │ —                │ —                │
└──────────────────────────────────────────────────────────────┘

Deprecation Policy:
1. Feature marked as deprecated with @deprecated annotation
2. Deprecation header added to API responses
3. Sunset date published in documentation (minimum 6 months notice)
4. Migration guide published
5. Email notification to all API consumers
6. After sunset date: 410 Gone response with migration link
```

**Internal Module Contracts:**

```typescript
// interfaces/agent-service.ts
// Stable interface — changes require ADR and migration plan
export interface AgentService {
  create(config: AgentConfig): Promise<Agent>;
  get(id: string): Promise<Agent | null>;
  list(filters: AgentFilters): Promise<Paginated<Agent>>;
  start(id: string, context?: TaskContext): Promise<Task>;
  stop(id: string): Promise<void>;
  delete(id: string): Promise<void>;

  // Events
  onStatusChange(handler: (agentId: string, status: AgentStatus) => void): () => void;
}

// Version tag for interface evolution
export const AGENT_SERVICE_VERSION = '1.2.0';
```

### 40.5 Upgrade Path Planning

**Technology Upgrade Calendar:**

| Technology | Current | Target | Upgrade Frequency | Next Upgrade |
|------------|---------|--------|-------------------|--------------|
| Node.js | 20 LTS | 22 LTS | Every 12 months | Q2 2025 |
| TypeScript | 5.4 | 5.6+ | Every 6 months | Quarterly |
| Next.js | 14 | 15 | Every 6 months | On release |
| PostgreSQL | 16 | 17 | Every 12 months | Q4 2025 |
| Redis | 7.2 | 7.4+ | Every 12 months | Q2 2025 |
| Tailwind CSS | 3.4 | 4.0 | Every 6 months | On release |
| React | 18 | 19 | Every 12 months | On release |

**Upgrade Process:**

```
Upgrade Process (every technology):

Week 1: Announcement & Planning
├── ADR for upgrade decision
├── Compatibility matrix review
├── Breaking changes analysis
└── Test plan creation

Week 2: Development
├── Update in feature branch
├── Run full test suite
├── Fix deprecations and breaking changes
└── Update documentation

Week 3: Validation
├── Staging environment deployment
├── Integration testing
├── Performance regression testing
└── Security scan

Week 4: Rollout
├── Canary deployment (5% traffic)
├── Monitor for 48 hours
├── Gradual rollout (25% → 50% → 100%)
└── Post-deployment monitoring
```

### 40.6 Documentation Strategy

**Documentation Architecture:**

```
docs/
├── README.md                    # Project overview, quick start
├── CONTRIBUTING.md              # Contribution guidelines
├── ARCHITECTURE.md              # High-level architecture
├── DECISIONS/                   # Architecture Decision Records
│   ├── 0001-fastify-over-express.md
│   ├── 0002-postgresql-primary.md
│   └── ...
├── API/                         # API documentation (auto-generated)
│   ├── openapi.yaml
│   └── webhooks.md
├── RUNBOOKS/                    # Operational runbooks
│   ├── incident-response.md
│   ├── database-failover.md
│   ├── cache-purge.md
│   └── deployment.md
├── FRONTEND/                    # Frontend documentation
│   ├── component-guide.md
│   ├── state-management.md
│   └── performance.md
├── BACKEND/                     # Backend documentation
│   ├── service-overview.md
│   ├── database-schema.md
│   └── authentication.md
├── DEVELOPMENT/                 # Developer guides
│   ├── local-setup.md
│   ├── testing.md
│   └── debugging.md
└── SECURITY/                    # Security documentation
    ├── security-model.md
    ├── sandbox-isolation.md
    └── incident-response.md
```

**Documentation Quality Standards:**

| Check | Method | Frequency |
|-------|--------|-----------|
| Broken links | lychee link checker | Every PR |
| Code examples compile | embedme | Every PR |
| Markdown linting | markdownlint | Every PR |
| API docs in sync | OpenAPI diff | Every PR |
| README freshness | Manual review | Monthly |
| Documentation coverage | ReadTheDocs analytics | Monthly |

### 40.7 Onboarding Ramp Design

**Engineering Onboarding (Week 1-4):**

| Day | Activity | Deliverable |
|-----|----------|-------------|
| 1 | Environment setup, repo clone, local dev running | `pnpm dev` runs successfully |
| 2 | Architecture walkthrough, read core ADRs | Architecture diagram drawn |
| 3 | Pair on first bug fix | Merged PR |
| 4 | Database schema review, write a migration | Successful migration |
| 5 | Testing workshop, write tests for bug fix | >80% coverage on touched code |
| 6-7 | Feature development with buddy | Feature PR ready for review |
| 8-10 | Independent feature development | First independent PR merged |
| 11-15 | Onboarding project (small feature) | Deployed to production |
| 16-20 | Take ownership of a component | Component documentation updated |

**Knowledge Areas to Cover:**

| Area | Resource | Time |
|------|----------|------|
| Codebase structure | Guided tour + README | 2 hours |
| Architecture patterns | ADR reading + discussion | 4 hours |
| Development workflow | Pair programming | 8 hours |
| Testing practices | Workshop + exercises | 4 hours |
| Deployment process | Shadow + practice | 4 hours |
| Incident response | Runbook walkthrough | 2 hours |
| Security practices | Security guide + quiz | 2 hours |
| Domain concepts | Domain model documentation | 4 hours |

### 40.8 Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  5% of tests, highest confidence
                    │ (~50)   │  Playwright, critical user journeys
                    ├─────────┤
                    │ Contract│  10% of tests, API contracts
                    │ (~100)  │  Pact, consumer-driven
                    ├─────────┤
                    │Integration│ 25% of tests, component interaction
                    │  (~250)  │  TestContainers, real DB/cache
                    ├─────────┤
                    │  Unit   │  60% of tests, fast feedback
                    │  (~600) │  Vitest, in-memory, <100ms each
                    └─────────┘
```

**Testing Standards:**

| Layer | Framework | Mocking | Target Coverage |
|-------|-----------|---------|-----------------|
| **Unit** | Vitest | Manual mocks | 80% lines, 70% branches |
| **Integration** | Vitest + TestContainers | Real services | 60% of integration points |
| **Contract** | Pact | Pact mock server | 100% of external APIs |
| **E2E** | Playwright | None (real app) | All critical user journeys |
| **Chaos** | Chaos Mesh | None (production-like) | All failure modes |

**Contract Testing:**

```typescript
// pact/consumer.spec.ts
import { Pact } from '@pact-foundation/pact';

describe('Agent API Contract', () => {
  const provider = new Pact({
    consumer: 'agentos-frontend',
    provider: 'agentos-api',
    port: 1234,
  });

  it('should return agent details', async () => {
    await provider.addInteraction({
      state: 'agent exists',
      uponReceiving: 'a request for agent details',
      withRequest: {
        method: 'GET',
        path: '/api/v1/agents/123',
        headers: { Authorization: 'Bearer token' },
      },
      willRespondWith: {
        status: 200,
        body: like({
          id: '123',
          name: 'Code Reviewer',
          status: 'idle',
          model: 'gpt-4o',
        }),
      },
    });

    const client = new ApiClient(provider.mockService.baseUrl);
    const agent = await client.getAgent('123');
    expect(agent.name).toBe('Code Reviewer');
  });
});
```

**Chaos Testing:**

```typescript
// chaos/experiments.spec.ts
describe('Chaos Experiments', () => {
  it('should handle database failure gracefully', async () => {
    await chaos.terminatePod('postgres-0');

    // API should return 503 with retry-after header
    const response = await api.getAgents();
    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBeDefined();

    // Service should recover after database restart
    await chaos.startPod('postgres-0');
    await waitForHealthy();

    const recovery = await api.getAgents();
    expect(recovery.status).toBe(200);
  });

  it('should handle LLM provider outage', async () => {
    await chaos.blockTraffic('openai-api');

    // Should fail over to backup provider
    const result = await api.executeAgent('task-123');
    expect(result.provider).not.toBe('openai');

    await chaos.restoreTraffic('openai-api');
  });
});
```

### 40.9 Monitoring for Maintainability

**Maintainability Metrics Dashboard:**

| Metric | Target | Tool | Alert Threshold |
|--------|--------|------|-----------------|
| Code coverage | >80% | Vitest + SonarQube | <75% |
| TypeScript strict errors | 0 | tsc | >0 |
| Cyclomatic complexity | <10 avg | SonarQube | >15 |
| Code duplication | <3% | SonarQube | >5% |
| Dependency freshness | <5 outdated | npm-outdated | >10 |
| Security vulnerabilities | 0 critical | Snyk | >0 |
| Documentation coverage | >90% | Custom tool | <80% |
| Test execution time | <5 min | CI | >10 min |
| Build time | <3 min | CI | >5 min |
| Deployment frequency | >1/day | CI/CD | <3/week |
| Change failure rate | <15% | Incident tracking | >25% |
| MTTR (mean time to recovery) | <1 hour | Incident tracking | >4 hours |
| Code review turnaround | <24 hours | GitHub | >48 hours |
| Bus factor | >2 per component | Git analysis | =1 |

### 40.10 Architectural Fitness Functions

**Automated Architecture Governance:**

```typescript
// fitness-functions/architecture.spec.ts
describe('Architecture Fitness Functions', () => {
  it('should not allow cycles in module dependencies', () => {
    const cycles = detectCycles('src/modules');
    expect(cycles).toHaveLength(0);
  });

  it('should enforce module boundary rules', () => {
    const violations = checkModuleBoundaries({
      'agents': { allowedImports: ['database', 'events', 'inference'] },
      'billing': { allowedImports: ['database', 'events'] },
      'inference': { allowedImports: ['cache'] },
    });
    expect(violations).toHaveLength(0);
  });

  it('should keep API response times under budget', async () => {
    const responseTimes = await loadTest('/api/v1/agents', { duration: '1m', rps: 100 });
    expect(responseTimes.p99).toBeLessThan(500);
    expect(responseTimes.p50).toBeLessThan(100);
  });

  it('should maintain bundle size budget', () => {
    const stats = require('./.next/analyze/client.json');
    const totalSize = Object.values(stats).reduce((a: number, b: number) => a + b, 0);
    expect(totalSize).toBeLessThan(500 * 1024); // 500KB
  });

  it('should not have TypeScript errors', () => {
    const result = execSync('tsc --noEmit', { encoding: 'utf-8' });
    expect(result).toBe('');
  });

  it('should have test coverage above threshold', () => {
    const coverage = JSON.parse(readFileSync('./coverage/coverage-summary.json', 'utf-8'));
    expect(coverage.total.lines.pct).toBeGreaterThanOrEqual(80);
    expect(coverage.total.branches.pct).toBeGreaterThanOrEqual(70);
  });

  it('should not have any critical vulnerabilities', () => {
    const audit = JSON.parse(execSync('npm audit --json', { encoding: 'utf-8' }));
    const critical = audit.vulnerabilities.filter((v: any) => v.severity === 'critical');
    expect(critical).toHaveLength(0);
  });

  it('should maintain documentation coverage', () => {
    const docs = globSync('docs/**/*.md');
    const sourceFiles = globSync('src/**/*.{ts,tsx}');
    const coverage = docs.length / sourceFiles.length;
    expect(coverage).toBeGreaterThan(0.1); // At least 1 doc per 10 files
  });

  it('should not allow raw SQL outside repositories', () => {
    const violations = grep('src/', /sql|query/, {
      exclude: ['src/repositories/', 'src/migrations/'],
    });
    expect(violations).toHaveLength(0);
  });
});
```

### 40.11 Succession Planning & Bus Factor Mitigation

**Bus Factor Analysis:**

```
Component          │ Primary Owner │ Secondary Owner │ Bus Factor │ Risk
───────────────────┼───────────────┼─────────────────┼────────────┼──────
Auth system        │ Engineer A    │ Engineer B      │ 2          │ Medium
Agent execution    │ Engineer C    │ Engineer D      │ 2          │ Medium
Sandbox security   │ Engineer E    │ Engineer A      │ 2          │ Medium
Inference routing  │ Engineer D    │ Engineer C      │ 2          │ Medium
Database schema    │ Engineer B    │ Engineer E      │ 2          │ Medium
Frontend framework │ Engineer F    │ Engineer G      │ 2          │ Medium
DevOps/Infrastructure│ Engineer G  │ Engineer H      │ 2          │ Medium
Temporal workflows │ Engineer C    │ Engineer A      │ 2          │ Medium
───────────────────┼───────────────┼─────────────────┼────────────┼──────
Overall Bus Factor: 2 (acceptable minimum: 2)
Target Bus Factor: 3 (by month 12)
```

**Bus Factor Mitigation Strategies:**

| Strategy | Implementation | Timeline |
|----------|---------------|----------|
| **Pair programming** | Regular pairing sessions across components | Ongoing |
| **Rotating on-call** | Weekly rotation covering all components | Month 2+ |
| **Code review rotation** | Reviewers assigned outside primary expertise | Ongoing |
| **Documentation requirements** | Every component must have runbook + ADR | Ongoing |
| **Cross-training sessions** | Monthly deep-dive into different components | Monthly |
| **No single approver** | Require 2 approvals for critical components | Ongoing |
| **Shadow deployment** | New team member shadows experienced engineer | First month |
| **Incident participation** | All engineers participate in incident response | Ongoing |
| **Open internal RFCs** | Architecture decisions reviewed by full team | Per decision |
| **Recording critical knowledge** | Video recordings of complex system walkthroughs | Quarterly |

**Knowledge Distribution Metrics:**

| Metric | Current | Target (12 months) |
|--------|---------|-------------------|
| Unique committers per component | 2-3 | >4 |
| % of components with documented runbook | 100% | 100% |
| % of components with ADR | 80% | 100% |
| Average code review participation | 3 reviewers | 4 reviewers |
| On-call rotation coverage | 4 engineers | 6 engineers |
| Cross-component PRs (mobility indicator) | 10% | 20% |

### 40.12 10-Year Technology Roadmap

**Long-Term Technology Evolution:**

| Year | Focus | Technology Evolution |
|------|-------|---------------------|
| **Year 1-2** | Foundation | Establish core stack; prove product-market fit |
| **Year 2-3** | Scale | Optimize bottlenecks; add caching layers; multi-region |
| **Year 3-5** | Maturity | Extract microservices where warranted; advanced ML pipelines |
| **Year 5-7** | Platform | Plugin ecosystem; third-party integrations; marketplace |
| **Year 7-10** | Ecosystem | Industry standards; open-source contributions; research partnerships |

**Technology Refresh Triggers:**

| Signal | Threshold | Action |
|--------|-----------|--------|
| Framework EOL announced | 12 months before EOL | Begin migration planning |
| Security vulnerability | Critical in core dependency | Emergency upgrade within 24h |
| Performance regression | >20% degradation in benchmarks | Investigation + upgrade or replacement |
| Community decline | <50% of peak activity | Evaluate alternatives |
| Better alternative emerges | 2x improvement in key metric | ADR + proof of concept |
| Hiring difficulty | <20% of candidates know stack | Training program + gradual migration |

---

*End of Architecture Strategy Document*

**Document Metadata:**
- Version: 1.0.0
- Status: Draft
- Authors: Platform Architecture Team
- Reviewers: Engineering Leadership, Security, DevOps
- Next Review: 2025-03-01
- Distribution: Internal Engineering

