# V1 scope

## Core v1 objective
Turn the current simple selected-text flow into a safer and more structured **Canvas context packet pipeline**.

## In scope
### 1. Selected node extraction
- reliably detect selected Canvas nodes
- safely extract text and basic metadata
- handle missing or malformed fields defensively

### 2. Basic related context
- optionally include directly related Canvas nodes
- keep this simple and local
- prefer 1-hop relationships only for v1

### 3. Structured packet building
- move from plain concatenated text to a structured packet
- clearly separate selected content from related content
- include room for constraints such as max length

### 4. API robustness
- validate request inputs
- validate response shape
- handle empty, invalid, or partial responses
- surface clear user-facing errors

### 5. Obsidian-side feedback
- provide useful notices or UI feedback
- make it clear whether sending succeeded or failed
- make debugging easier during development

### 6. Settings
- add or improve API-related settings when useful
- keep the settings small and practical

## Out of scope
The following are out of scope for v1 unless explicitly requested:
- embeddings
- semantic search over the whole vault
- vector store integration
- background indexing
- long-term memory
- multi-agent systems
- autonomous planning
- complex ranking pipelines
- server-side orchestration frameworks

## V1 success condition
V1 is successful if the plugin can:
1. read selected nodes reliably
2. optionally include limited nearby context
3. build a structured packet
4. send that packet to the external API safely
5. handle responses and failures predictably
6. make the behavior understandable to the user and developer
