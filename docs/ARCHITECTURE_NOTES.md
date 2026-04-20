# Architecture notes

## Desired responsibility split

### `src/main.ts`
Keep this file small.
Responsibilities should stay limited to:
- plugin lifecycle
- loading settings
- registering commands
- wiring services together

### `src/services/contextService.ts`
This should remain the main place for Canvas context logic.
Responsibilities may include:
- reading selected nodes
- normalizing node data
- extracting text and metadata
- collecting related nodes if supported
- building the context packet

### `src/services/llm/client.ts`
This should remain the place for external LLM communication.
Responsibilities may include:
- request construction
- API call execution
- response parsing
- error normalization

## Suggested additional modules only if needed
Add small modules only when they clearly reduce complexity.
Examples:
- `src/types/context.ts`
- `src/services/packetBuilder.ts`
- `src/services/responseParser.ts`
- `src/utils/guards.ts`

Do not split files just for style.
Only split when responsibility becomes meaningfully clearer.

## Suggested packet shape direction
The packet should evolve from a single concatenated text blob toward a structured object.
A useful direction is:
- selected nodes
- related nodes
- user intent or prompt
- constraints such as max context size

The exact shape can remain simple in v1.

## Architecture principle
Prefer a narrow pipeline over a broad framework.
This repository should feel like a focused plugin, not an unfinished platform.
