# AGENTS.md

## Purpose of this repository
This repository is an Obsidian plugin project.
The plugin reads selected nodes from an Obsidian Canvas, builds a context packet from them, and sends that context to an external LLM API.

The current project is **not** a full agent framework, not a vector database project, and not a general-purpose RAG platform.
It is currently an **early-stage Obsidian Canvas context plugin**.

## Current project state
The repository already has early working pieces:
- selected Canvas node detection
- extraction of node fields such as text, file, id, position, and size
- structured `ContextPacket` construction from selected node data
- direct-neighbor related Canvas context
- simple rule-based related node scoring and sorting
- external LLM request flow using Obsidian `requestUrl`
- defensive LLM response validation and readable text extraction
- minimal loading, success, and failure notices
- guard against sending selected nodes with no text or file content
- plain text Canvas nodes are the current verified context baseline
- non-text node content recognition and extraction is not implemented yet
- native Canvas write-back for LLM results:
  - summary text node
  - selected-node group
  - group-to-summary edge

Important: preserve this incremental state.
Do not redesign the entire plugin unless explicitly asked.

## Main v1 goal
The main v1 goal is to keep improving the plugin as a reliable and structured **context packet pipeline** with lightweight native Canvas result output.

V1 should focus on:
1. collecting selected nodes safely
2. optionally reading directly related Canvas nodes
3. ranking or filtering context in a simple rule-based way
4. building a structured packet for the LLM
5. validating and handling API responses safely
6. writing useful LLM results back into the active Canvas with native Canvas elements
7. showing useful user feedback in Obsidian

The UI direction for v1 should remain native Canvas elements, not a custom view or a complex UI framework.

The current next priority is improving plain text Canvas node context management before adapting non-text node content. Future non-text work should recognize and extract file, PDF, image, attachment, and multimodal content only after the text context pipeline is more reliable.

## What v1 is allowed to build
Allowed work:
- refactor existing context extraction logic into clearer modules
- improve typing
- improve packet structure
- add small helper utilities
- add settings for API configuration
- improve error handling and notices
- add minimal UI for displaying results
- add native Canvas result write-back
- add a generated summary text node
- add a selected-node group
- add a group-to-summary edge
- improve lightweight result node layout and sizing
- add simple context size limits
- add direct-neighbor Canvas context if it can be implemented safely
- add settings-controlled related context range or hop depth
- improve rule-based scoring for related text nodes
- add small, explicit non-text Canvas node adapters later, only when safely scoped
- integrate extracted non-text content into the existing `ContextPacket` pipeline later, after text context behavior is improved

Canvas UI work should remain lightweight, manually verifiable, and implemented through focused service modules.

## What v1 must not build unless explicitly requested
Do not add these by default:
- embeddings
- vector databases
- background indexing of the whole vault
- long-term memory systems
- autonomous multi-step agents
- tool orchestration frameworks
- MCP servers
- cloud sync logic
- heavy dependency chains
- major architecture rewrites unrelated to the current plugin goal

## How to think about this project
Treat this project as a **small Obsidian plugin with one narrow workflow**:

selected Canvas nodes -> context extraction -> ContextPacket -> LLM request -> validated response -> native Canvas summary/group/edge write-back -> user feedback

When proposing changes, prefer the smallest useful improvement that keeps this workflow stable.

## Repository expectations
Use the existing structure as the starting point.
Current important files mentioned by the repository documentation:
- `src/main.ts`
- `src/canvasTypes.ts`
- `src/contextTypes.ts`
- `src/services/contextService.ts`
- `src/services/relatedContextService.ts`
- `src/services/canvasService.ts`
- `src/services/canvasResultService.ts`
- `src/services/llm/client.ts`
- `eslint.config.mts`

Do not move files or rename modules unless there is a strong reason.
If structure changes are suggested, explain why first.

## Engineering rules for agents
- Keep changes small and reviewable.
- Prefer modifying existing files over introducing many new abstractions.
- Avoid speculative abstractions.
- Preserve Obsidian plugin lifecycle clarity.
- Preserve the component-driven service structure.
- Keep `main.ts` focused on lifecycle, command registration, and orchestration.
- Keep business logic in service modules.
- Keep Canvas file write-back logic in Canvas-focused services.
- Preserve existing Canvas JSON fields when writing results.
- Use TypeScript types instead of `any` whenever possible.
- Handle malformed API responses defensively.
- Respect Obsidian plugin constraints and lint rules.
- Use Obsidian `requestUrl` for external API calls.
- Do not introduce custom views unless explicitly requested.

## Before coding
Before making changes, first understand:
1. what already works
2. what is still in progress
3. what the smallest next implementation step is

If the task is ambiguous, prefer a minimal implementation that matches the current iteration plan.
For the current iteration plan, prioritize plain text context selection, clipping, related-node range control, and related-node scoring before non-text node extraction.

## After coding
After making changes, always report:
1. which files were changed
2. what behavior changed
3. how to test it manually in Obsidian
4. any risks, limitations, or follow-up work

## Manual testing mindset
Assume this project is tested primarily through manual plugin loading in Obsidian.
Prioritize changes that are easy to verify through commands, notices, and visible plugin behavior.
Important manual checks include:
- selected empty nodes should not send an API request
- successful LLM responses should create a summary text node
- selected nodes should get grouped when usable bounds exist
- the selected-node group should connect to the summary node with an edge
- Canvas refresh and rendering behavior must be visually checked
- invalid or malformed API responses should show clear failure notices
- plain text nodes are the currently verified baseline
- do not claim file, PDF, image, attachment, or multimodal node support before explicit implementation and manual validation
- verify text-only related context behavior before expanding to non-text nodes

## Existing known warnings
Lint currently passes with warnings only.
Known warning categories:
- unused `eslint-disable` comments in `src/main.ts` and `src/settings.ts`

## Output style for coding agents
When responding about code changes:
- be concrete
- be brief but specific
- avoid vague claims
- explain decisions in repository terms
- do not oversell the implementation
