# Engineering constraints

## Obsidian plugin constraints
- Respect Obsidian plugin lifecycle.
- Keep startup work light.
- Avoid unnecessary vault-wide scans.
- Use cleanup-safe registration patterns.
- Prefer Obsidian-compatible APIs and request methods.

## TypeScript constraints
- Prefer strict typing.
- Avoid `any` unless truly unavoidable.
- Use narrowing, guards, and small interfaces.
- Treat Canvas node data as partially unknown and potentially unstable.

## API integration constraints
- Network calls must have a clear user-facing purpose.
- Validate outbound request payloads.
- Validate inbound response data.
- Do not assume external API stability.
- Handle timeout, empty response, malformed JSON, and missing fields.

## Scope constraints
- Do not add ambitious systems unrelated to the immediate plugin workflow.
- Do not expand the project into general RAG infrastructure.
- Do not introduce large dependencies without strong justification.

## Refactor constraints
- Prefer incremental refactors.
- Avoid renaming many files at once.
- Avoid rewriting working code without necessity.
- Preserve the current iteration-friendly development style.
