# Obsidian Canvas LLM Plugin

## Overview
This project is an early-stage Obsidian plugin for building AI-ready context from Obsidian Canvas selections.

The current direction follows the AI·99% vision: keep the user inside Canvas, extract selected and nearby topology-aware context, render that context into a structured prompt, send it to an external LLM API, and write the result back into Canvas as native elements.

This is not a full agent framework, vector database, background indexer, or general RAG platform. The current focus is a narrow, reliable Canvas context pipeline.

## Current Status
Early development / iterative build.

The current workflow is:

```text
Canvas selection
-> selected/group/file/related enrichment
-> ContextPacket
-> AI·99% Markdown prompt
-> LLM request
-> Canvas summary write-back
```

The plugin can detect selected Canvas nodes, read supported text content, recursively expand readable group content, collect related context through direction-aware Canvas traversal, render an AI·99% style Markdown prompt, call an OpenAI-compatible API through Obsidian `requestUrl`, and write the returned summary back into the active Canvas.

Markdown file-node content reading is integrated. Text-layer PDF extraction is experimental and depends on Obsidian's internal PDF.js API being available. Scanned PDFs, OCR, image understanding, attachments, streaming rendering, WebAI Bridge, toolbar triggers, and edge-release triggers are not implemented yet.

## Features
- Detect selected node(s) in the active Obsidian Canvas.
- Extract selected text, file, group, position, size, and id metadata.
- Read Markdown content from Canvas file nodes through the Obsidian Vault API.
- Attempt experimental embedded-text extraction from text-layer PDF file nodes.
- Classify Canvas file references as Markdown, PDF, image, unsupported, or unknown.
- Recursively extract readable text, Markdown, and PDF content inside selected groups.
- Recursively extract readable content inside related group nodes.
- Preserve group hierarchy metadata with `sourceGroupId`, `sourceGroupLabel`, and `sourceGroupPath`.
- Build a structured `ContextPacket` with primary context, related context, text limits, and legacy text output.
- Collect related context through direction-aware BFS traversal.
- Configure related hop depth and parent/child traversal toggles.
- Apply simple rule-based related-node scoring, sorting, and limiting.
- Render an AI·99% style Markdown prompt from the `ContextPacket`.
- Recognize `/本地提示词` nodes as local instruction prompt content.
- Serialize selected + related packet nodes into a limited Graph TD section.
- Configure API key, base URL, model, temperature, max tokens, related context controls, and global prompt.
- Provide a bottom status-bar current-question input with Enter-to-send behavior.
- Send external LLM requests through Obsidian `requestUrl`.
- Validate LLM responses and extract readable response text defensively.
- Guard against sending selected nodes with no readable text, Markdown, or PDF content.
- Show minimal loading, success, and failure notices.
- Write successful LLM output back into Canvas as native text/group/edge elements.

## Project Structure
- `src/main.ts`: plugin lifecycle, command flow, notices, status-bar question input, and service orchestration
- `src/canvasTypes.ts`: Canvas runtime and Canvas file data types
- `src/contextTypes.ts`: structured context packet and related context types
- `src/types.ts`: compatibility barrel for shared exported types
- `src/settings.ts`: plugin settings and settings tab
- `src/services/canvasService.ts`: active Canvas selection and active Canvas file access
- `src/services/canvasFileParser.ts`: defensive `.canvas` JSON parsing
- `src/services/canvasFileReferenceService.ts`: Canvas file-node classification, Markdown reading, and experimental PDF embedded-text extraction
- `src/services/canvasGroupContextService.ts`: recursive selected/related group content extraction
- `src/services/canvasResultService.ts`: writes LLM summary UI elements back into the active Canvas
- `src/services/contextService.ts`: selected node extraction, context packet building, and rendered prompt building
- `src/services/contextNodeBuilder.ts`: shared `ContextPacket` node construction
- `src/services/contextText.ts`: text normalization and compression
- `src/services/promptRenderService.ts`: AI·99% Markdown prompt rendering from `ContextPacket`
- `src/services/relatedContextService.ts`: direction-aware BFS related context discovery, scoring, sorting, limiting, and group expansion
- `src/services/llm/client.ts`: Obsidian-compatible external LLM request and response validation
- `src/services/llm/service.ts`: prompt/message assembly for LLM calls
- `src/services/llm/prompts.ts`: default system prompt
- `src/services/llm/types.ts`: LLM request and response types
- `src/services/llm/errors.ts`: reserved LLM error module
- `eslint.config.mts`: ESLint configuration for TypeScript and Obsidian plugin rules

## Roadmap Status

### Implemented
- [x] Detect selected node(s) in Obsidian Canvas
- [x] Extract selected text/file/group node metadata
- [x] Read Markdown file node content through the Obsidian Vault API
- [x] Attempt experimental embedded-text extraction from text-layer PDF file nodes
- [x] Track file content read / unsupported / missing / error / non-file status
- [x] Recursively extract readable text, Markdown, and PDF content inside selected groups
- [x] Recursively extract readable content inside related group nodes
- [x] Preserve group hierarchy metadata with `sourceGroupId`, `sourceGroupLabel`, and `sourceGroupPath`
- [x] Build a structured `ContextPacket` with primary context, related context, and text limits
- [x] Collect related context through direction-aware BFS traversal
- [x] Configure related hop depth and parent/child traversal toggles
- [x] Apply simple rule-based related node scoring and sorting
- [x] Render an AI·99% style Markdown prompt from the `ContextPacket`
- [x] Recognize `/本地提示词` nodes as local instruction prompt content
- [x] Serialize selected + related packet nodes into a limited Graph TD section
- [x] Configure API key, base URL, model, temperature, max tokens, related context controls, and global prompt
- [x] Provide a bottom status-bar current-question input with Enter-to-send behavior
- [x] Send external LLM requests through Obsidian `requestUrl`
- [x] Validate and parse readable text from LLM responses defensively
- [x] Guard against sending selected nodes with no readable text, Markdown, or PDF content
- [x] Show minimal loading, success, and failure notices
- [x] Write successful LLM output back into Canvas as a native text node
- [x] Auto-size the generated summary node based on returned text
- [x] Create a group around multiple selected source nodes
- [x] Connect the source node or selected-node group to the generated summary node

### In Progress
- [ ] Shift related context defaults toward AI·99% ancestor/upstream traversal
- [ ] Improve Graph TD ordering and topology serialization for prompt readability
- [ ] Promote `/本地提示词` nodes to high-priority context that can bypass hop depth
- [ ] Make primary and related context size limits configurable from Settings
- [ ] Manually validate Markdown, text-layer PDF, selected group, nested group, and related group behavior in Obsidian
- [ ] Tune Canvas summary placement, generated group bounds, edge rendering, and refresh reliability
- [ ] Reduce development debug output behind an explicit debug mode

### Planned
- [ ] Add Canvas toolbar or context-menu AI trigger
- [ ] Add edge-release AI trigger that writes the result at the release position
- [ ] Add regenerate/retry support for generated AI result nodes
- [ ] Add an AI result node lifecycle: queued, loading, completed, failed
- [ ] Add visual loading/completed/error state styling for generated AI nodes
- [ ] Add streaming response support and throttled Canvas rendering
- [ ] Add context-too-long detection and user-facing status output
- [ ] Add WebAI Bridge channel settings after the official API path is stable
- [ ] Add WebAI Bridge SSE/error handling for CAPTCHA, rate limits, and auth failures
- [ ] Add external search injection into the historical context section
- [ ] Add dynamic PDF/OCR capability loading as an extension center
- [ ] Add OCR for scanned PDFs and image-only documents
- [ ] Add image, attachment, and multimodal node adapters
- [ ] Move heavy parsing work to worker-based execution where needed
- [ ] Add focused fixtures or tests for packet rendering, topology traversal, and related scoring

## Manual Test Notes
- Select a plain text Canvas node and run `Send selected canvas text`; confirm `renderedPrompt` appears in the console and a summary node is written back.
- Select a group containing text, Markdown, or text-layer PDF nodes; confirm extracted content appears in `primaryContext`.
- Use related parent/child settings and inspect `relatedNodesArray` for `minHop`, `directions`, `score`, and `viaSelectedNodeIds`.
- Use a related group node and confirm `relatedNodesArray[].groupNodes` includes readable group contents.
- Edit `Global prompt` in Settings and confirm `<<全局设定>>` changes in `renderedPrompt`.
- Type a current question in the bottom status bar input and confirm `<<本轮问题>>` uses that text.
- Clear the status bar input and confirm the default summary question is used.

## Iteration Log

### Iteration 1
- Set up plugin development environment
- Learned basic Obsidian plugin structure
- Confirmed Canvas view access

### Iteration 2
- Detected selected Canvas nodes
- Extracted node information into variables
- Explored the actual data structure of selected Canvas nodes

### Iteration 3
- Extracted text from selected nodes
- Built a simple concatenated text packet
- Refactored Canvas context logic into `contextService.ts`

### Iteration 4
- Added initial API client for external LLM requests
- Implemented basic response parsing for returned text
- Started handling empty / invalid API responses
- Investigated TypeScript and ESLint issues related to API response typing and Obsidian request rules

### Iteration 5
- Split Canvas, context, related context, and LLM responsibilities into service modules
- Added structured context packet types and related context discovery
- Added defensive LLM response validation and Obsidian `requestUrl` transport
- Added Canvas write-back for LLM summaries using native Canvas text, group, and edge elements
- Added minimal loading, success, and failure feedback

### Iteration 6
- Added Canvas file-reference classification and file content status summaries
- Added Markdown file node content reading through the Obsidian Vault API
- Added an experimental PDF embedded-text extraction path for selected PDF file nodes
- Removed bundled PDF worker usage to avoid interfering with Obsidian's built-in PDF viewer
- Kept OCR, image, attachment, and multimodal extraction out of scope

### Iteration 7
- Added settings-controlled related hop depth and parent/child traversal
- Replaced direct-neighbor related context with direction-aware BFS traversal
- Added recursive selected/related group extraction with group hierarchy metadata
- Added AI·99% style prompt rendering from `ContextPacket`
- Added editable global prompt settings and bottom status-bar current-question input

## Next Steps
- First: make ancestor-first topology and high-priority local prompt behavior match AI·99% MVP1 more closely
- Next: make context limits and debug output configurable
- Then: add an AI result node lifecycle for loading, completion, and failure
- After that: add Canvas toolbar/context-menu trigger and edge-release trigger
- Later: add streaming renderer, WebAI Bridge support, search injection, OCR, image, and multimodal support

## Tech Stack
- TypeScript
- Obsidian Plugin API
- Node.js
- npm

## Development Approach
This project is being developed iteratively.
Each iteration focuses on one small, testable feature before moving to the next step.

## Development Notes
- The current API integration is still experimental and may change as the request/response format is refined.
- External requests use Obsidian `requestUrl`.
- Some ESLint rules are temporarily adjusted to match the current development stage and implementation approach.
- The project is being built step by step with small testable iterations.
- New functionality should preserve a component-driven service structure, with responsibilities kept clearly separated across modules.
- Plain text Canvas nodes remain the most important verified baseline.
- Markdown file node content reading is implemented through the Obsidian Vault API.
- PDF file node embedded-text extraction is experimental and depends on Obsidian's internal PDF.js API being available; scanned/image-only PDFs are not OCRed.
- Image, attachment, OCR, streaming, WebAI Bridge, and multimodal node content extraction still require future design, implementation, and manual validation.
- Manual Obsidian Canvas testing is still required for UI refresh, group rendering, edge rendering, status-bar input behavior, and prompt correctness.
- This project was developed iteratively with AI-assisted coding support for debugging, refactoring, and development acceleration, while the project scope, feature decisions, and integration logic were defined and reviewed manually.
