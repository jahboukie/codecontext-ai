# CodeContext Pro Developer Edition - Codebase Index

**Generated**: 2025-08-15  
**Version**: 2.0.2

## Project Overview
**CodeContext Pro** is a universal persistent memory and code execution system that works with any LLM (ChatGPT, Claude, etc.). This is the local-only developer edition providing AI-native execution capabilities with comprehensive security hardening.

### Key Features
- 🧠 Universal persistent memory system compatible with all LLMs
- 🚀 Secure multi-language code execution engine
- 🎯 Context generation for enhanced AI interactions
- 📝 Conversation recording and memory retention
- 🔍 Advanced semantic code search and intelligence
- 🛡️ Enterprise-grade security with sandboxing
- 🏠 Complete local-first architecture (no cloud dependencies)

---
## 1. Top-Level Packages / Subsystems

| Area | Path | Stack | Responsibility |
|------|------|-------|----------------|
| (Removed Cloud Backend) | `backend/` (deleted) | (Removed) | All Firebase/Stripe functionality removed – purely local edition |
| CLI | `cli/` | Node.js + Commander + TS | Developer UX: commands for init, login, execute, search, memory, status, upgrade |
| Execution Engine | `execution-engine/` | Express + Secure Worker sandbox | Sandboxed multi-language execution + security + memory learning |
| Semantic / Code Intelligence (mostly in CLI) | `cli/src/services/*` | Local embeddings, vector store, parsing | Code indexing, semantic + hybrid search, dependency graphs, concept extraction |
| Dashboard (placeholder) | `dashboard/` | Static HTML | (Early stub) Potential future web UI |
| Docs / Plans | `*.md` root + plans | Markdown | Architecture, security, spatial intelligence, TODOs |
| Test Utilities | `battle-test-suite.js`, `enhanced-security-tests.js` | Node scripts | Security & robustness testing harnesses |

---
## 2. Cloud Backend (Removed)

All Firebase Functions, Firestore usage, Stripe webhooks and remote quota validation were intentionally removed for the Local Edition. Execution & indexing limits plus feature gating now occur purely via local JSON state inside the project (`.codecontext/subscription.json`) and an optional sponsorship marker (`.codecontext/sponsor.json`).

There are no network calls, telemetry, or remote authentication flows. The previous `backend/` directory has been deleted.

---
## 3. CLI Commands (Representative)

Located in `cli/src/commands/`:
- `init` – Project initialization (writes `.codecontext` config).
- `execute` – Rich local execution surface (templates, streaming, sessions, auto dependency detection, friendly errors) – always offline.
- `run` – Wrapper / simplified execution (not fully inspected here).
- `context`, `search` – Token / semantic context retrieval & search.
- `memory` – Team / individual memory operations.
- `record` – Records something (likely conversation/execution context).
- `status` – Shows local usage (exec/file counts) & sponsor state.
- `sponsor` – Explains sponsorship model & how to enable higher limits.
(Removed legacy commands: `login`, `upgrade`).

CLI Supporting Services (`cli/src/services/` key ones):
-- (Removed) `apiClient.ts` – previously talked to remote API.
-- `subscriptionManager.ts` – Tracks and records execution/file usage locally; (sponsor-aware planned).
- `enhancedExecutionService.ts` – Orchestrates local/cloud execution: language detection, templates (`api-call`, `data-analysis`, `web-server`), dependency inference, session state, friendly errors.
- `semanticCodeSearchEngine.ts` – Hybrid semantic/textual/structural/conceptual search; integrates:
  - `embeddingService.ts`
  - `vectorStore.ts` / `faissStore.ts` (FAISS adapter?)
  - `codeContentIndexer.ts` (function/class/file extraction)
  - `dependencyGraphBuilder.ts` (call/import relationships)
  - `codeIntelligenceDatabase.ts` (SQLite or similar structured store) 
- Memory Engines: `memoryEngine.ts`, `teamMemoryEngine.ts`, `semanticMemoryEngine.ts`, `semanticTeamMemoryEngine.ts` – Execution + team knowledge retention & pattern mining.
- `contextualSuggestionEngine.ts` – Suggests related code (improves AI prompts).

Config / Persistence:
- `.codecontext/` project folder for config + sessions + usage tracking + sponsor flag.

---
## 4. Execution Engine (`execution-engine/`)

Entry: `src/index.ts`
- Express API: `/execute`, `/history`, `/patterns/:language`, `/errors/:language`, `/performance/:language`, `/health`, `/security/status`.
- Integrates `SecureExecutionEngine` + `ExecutionMemoryManager`.

Security Layer: `secureExecutionEngine.ts`
- Uses Worker Threads isolation + `mainSecurityManager` (not fully inspected) to sandbox JS.
- Enforces memory limits, timeout, captures console, collects violations, returns `securityReport` + improvement suggestions.
- Current secure path supports only JavaScript eval (non-JS code gets “Language not supported” in secure mode) – mismatch with advertised multi-language support (JS/TS/Python/Go/Rust). Multi-language is an aspirational claim; real support incomplete.

Memory Integration: `memoryIntegration.ts` (not expanded here) – Predicts success probability, stores execution outcomes, suggests improvements.

---
## 5. Semantic Intelligence / Indexing Flow (High-Level)

1. Parse project → extract functions, classes, files (AST-based in `codeContentIndexer.ts`).
2. Store structural metadata in `codeIntelligenceDatabase.ts` (likely SQLite; fields: complexity, lines, embeddings, concepts).
3. Generate embeddings (embedding service) → Persist in vector store (FAISS or JSON fallback) for semantic similarity search.
4. Build dependency graph (imports, calls) enabling structural / relationship queries.
5. Hybrid search merges textual (SQL LIKE), semantic (vector similarity), conceptual (concept extraction table), structural (patterns) results → rank → insights.

---
## 6. Cross-Cutting Concerns

| Concern | Current State | Notes / Gaps |
|---------|---------------|--------------|
| Authentication | None (local trust) | Login removed; optional sponsor.json honor system. |
| Authorization | Local file-based gating | Free vs sponsor limits enforced pre-execution. |
| Billing | Community sponsorship (honor system) | No payment integration in code. |
| Usage Quotas | Local JSON counters | Free: 40 exec / 50 files; sponsor tier (planned uplift). |
| Security (Execution) | Secure Worker + manager | Non-JS languages not sandboxed (gap vs marketing); no network / fs policy enumeration in index. |
| Security (API) | Basic checks | Lacks rate limiting, audit logs, abuse alerts. |
| Data Privacy | Credentials stored locally with restrictive perms | Need encryption at rest (optional) and key rotation guidance. |
| Error Handling | Mixed (try/catch, console.error) | Central structured logging absent. |
| Observability | None (intentional) | Telemetry removed for privacy; future optional opt-in. |
| Testing | Few ad-hoc test scripts | Missing automated unit/integration tests for critical paths (execute validation, Stripe events, secure engine sandbox escapes). |
| Docs | Several strategic docs | Need Quickstart, Security model overview, API reference, “Vibe Flow” onboarding doc. |
| Packaging | CLI exists (published?) | Need version pinning, release script, binary or npx story. |
| CI/CD | Not visible | Add pipeline: lint + build + minimal test + deploy functions. |
| Windows Support | Likely (Node-based) | Confirm path & permission handling (fs mode 0o600 on Windows is advisory only). |

---
## 7. MVP Surface (Proposed for "Vibe Coders")

Prioritize flow speed, minimal friction, immediate “AI augmented execution win”.

Essential User Stories:
1. Install CLI (`npm i -g codecontext-pro` or npx) and run `ctx execute --code "console.log('hi')"` locally (no auth) → instant success.
2. Create account on minimal web page → copy API key → `ctx login`.
3. Run cloud-gated execution requiring validation (e.g., with memory or semantic search) → usage decremented.
4. Run `ctx search "function to validate stripe webhook"` → get ranked results.
5. View usage & tier: `ctx status`.

Secondary (Nice-to-Have for MVP+):
- Session-based execution state (`--session`) persistence.
- Template-driven natural language run (`--run "create a web server on port 4000"`).
- Basic semantic memory suggestions on failed executions.
- Security score surfaced in CLI execution results.

Deferred (Post-MVP):
- Multi-language secure sandbox (Python/Go/Rust actual support).
- Team memory synchronization & dashboard UI.
- Conceptual / structural advanced search insights UI.
- Automated dependency installation w/ license compliance checks.

---
## 8. Immediate Risks / Technical Debt (Pre-Ship Fix List)

1. Secure engine language claims vs actual implementation (only JS) – adjust wording or add minimal Python support path.
2. Lack of logging structure – introduce lightweight JSON logger (local only) for execution engine.
3. File indexing quota enforcement not yet implemented – enforce before large repo indexing.
4. Credentials file permission semantics on Windows (0o600 not enforced) – document alternative (OS guidance).
5. Need unit tests for subscription gating & semantic search scoring.
6. Potential future web dashboard security considerations (if reintroduced) – plan ahead.

---
## 9. Recommended Local Edition Hardening Checklist

- [ ] Implement sponsor tier limit uplift in SubscriptionManager.
- [ ] Add CLI version flag.
- [ ] Enforce file indexing limit (block when exceeding free tier).
- [ ] Update docs: Quickstart (install → execute → search → sponsor optional).
- [ ] Document security model (sandbox boundaries, unsupported languages, no telemetry policy).
- [ ] Add minimal opt-in metrics flag (future; keep default none).
- [ ] Basic unit tests: subscription gating, execution path, semantic search ranking.
## 10. Suggested Next Additions for Developer Delight

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| Inline Code Snippet Copy in Search Results (CLI) | S | M | Add `--copy` flag using clipboardy |
| Cached Embedding Warm Start | M | M | Persist embedding batch progress to resume large repos |
| `ctx doctor` Command | S | M | Diagnose env (node, python, docker, permissions) |
| Execution Diff Assist | M | H | Show diff between last successful & failed attempts in session |
| Basic Web Dashboard for Usage | M | M | Thin read-only UI calling existing endpoints |

---
## 11. High-Level Directory Inventory (Condensed)

```
backend/                (Removed – legacy Firebase/Stripe layer)
cli/                    CLI source (commands + services)
execution-engine/       Secure execution service (Express + sandbox + memory)
dashboard/              Static placeholder
*.md                    Architecture & planning docs
test-*                  Experimental test harness scripts
```

---
## 12. Open Questions (To Clarify Before Launch)

1. Pricing enforcement beyond execution count (file indexing limits enforcement path?).
2. Are developer keys intended for internal use only? Need rotation & audit story.
3. Cloud execution path – is there currently a remote execution API, or only local sandbox + quota check? (CLI hints at cloud mode.)
4. Do we need basic analytics (daily active CLI users, executions) for early retention tracking? 
5. Final product name differentiation: "CodeContext Pro" vs "Vibe Coders" branding layer – marketing alignment.

---
## 13. Summary

The codebase has strong early foundations in: local quota-gated execution, rich CLI ergonomics, semantic code indexing, and a security-conscious sandbox (JS). Primary blockers to a Local Edition release are polish (sponsor tier uplift, version flag), language support clarity, and basic test coverage. Address the Hardening Checklist and you have a compelling privacy-first developer tool.

---
Maintainer: (auto-generated index)
