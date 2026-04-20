- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
# AGENTS.md

## Purpose of this repository
This repository is an Obsidian plugin project.
The plugin reads selected nodes from an Obsidian Canvas, builds a context packet from them, and sends that context to an external LLM API.

The current project is **not** a full agent framework, not a vector database project, and not a general-purpose RAG platform.
It is currently an **early-stage Obsidian Canvas context plugin**.

## Current project state
The repository already has early working pieces:
- selected Canvas node detection
- basic extraction of node fields such as text, id, position, and size
- simple packet construction from selected node text
- initial external LLM request flow
- basic response parsing

Important: preserve this incremental state.
Do not redesign the entire plugin unless explicitly asked.

## Main v1 goal
The main v1 goal is to improve the plugin from a simple text concatenation flow into a more reliable and structured **context packet pipeline**.

V1 should focus on:
1. collecting selected nodes safely
2. optionally reading directly related Canvas nodes
3. ranking or filtering context in a simple rule-based way
4. building a structured packet for the LLM
5. validating and handling API responses safely
6. showing useful user feedback in Obsidian

## What v1 is allowed to build
Allowed work:
- refactor existing context extraction logic into clearer modules
- improve typing
- improve packet structure
- add small helper utilities
- add settings for API configuration
- improve error handling and notices
- add minimal UI for displaying results
- add simple context size limits
- add direct-neighbor Canvas context if it can be implemented safely

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

selected Canvas nodes -> context extraction -> packet building -> LLM request -> response handling -> user-visible result

When proposing changes, prefer the smallest useful improvement that keeps this workflow stable.

## Repository expectations
Use the existing structure as the starting point.
Current important files mentioned by the repository documentation:
- `src/main.ts`
- `src/services/contextService.ts`
- `src/services/llm/client.ts`
- `eslint.config.mts`

Do not move files or rename modules unless there is a strong reason.
If structure changes are suggested, explain why first.

## Engineering rules for agents
- Keep changes small and reviewable.
- Prefer modifying existing files over introducing many new abstractions.
- Avoid speculative abstractions.
- Preserve Obsidian plugin lifecycle clarity.
- Keep `main.ts` focused on lifecycle and command registration.
- Keep business logic in service modules.
- Use TypeScript types instead of `any` whenever possible.
- Handle malformed API responses defensively.
- Respect Obsidian plugin constraints and lint rules.
- Prefer Obsidian-compatible request patterns over browser `fetch` where required.

## Before coding
Before making changes, first understand:
1. what already works
2. what is still in progress
3. what the smallest next implementation step is

If the task is ambiguous, prefer a minimal implementation that matches the current iteration plan.

## After coding
After making changes, always report:
1. which files were changed
2. what behavior changed
3. how to test it manually in Obsidian
4. any risks, limitations, or follow-up work

## Manual testing mindset
Assume this project is tested primarily through manual plugin loading in Obsidian.
Prioritize changes that are easy to verify through commands, notices, and visible plugin behavior.

## Output style for coding agents
When responding about code changes:
- be concrete
- be brief but specific
- avoid vague claims
- explain decisions in repository terms
- do not oversell the implementation
