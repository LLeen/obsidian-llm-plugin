# Obsidian Canvas LLM Plugin

## Overview
This project is an Obsidian plugin that extracts information from selected Canvas nodes and sends the text to an external LLM-powered API for summarization and insight generation.

The goal of this project is to help users better understand their mind maps, discover possible connections between ideas, and think more deeply about their notes.

This project is written in TypeScript and uses the Obsidian Plugin API.

## Current Status
Early development / iterative build.

The plugin can detect selected Canvas nodes, extract basic node information such as text content, file reference, position, size, and id, read supported Canvas file-node content, build a structured context packet, and send it to an external LLM API.

The plugin now validates LLM responses more defensively, uses Obsidian-compatible request handling, and can write the returned summary back into the active Canvas as a native text node. It can also create a group around the selected nodes and connect that group to the generated summary node.

The current workflow is still text-first: selected Canvas nodes -> text/file-reference content extraction -> `ContextPacket` -> LLM request -> validated response text -> native Canvas summary/group/edge write-back. Markdown file node content reading is integrated. PDF file nodes have an experimental embedded-text extraction path that depends on Obsidian's internal PDF.js API being available, and still needs manual validation in Obsidian. Image, attachment, OCR, and multimodal content extraction are not implemented.

## Features
- Detect selected node(s) in the active Obsidian Canvas.
- Extract selected Canvas text node content and node metadata.
- Read Markdown content from selected Canvas file nodes through the Obsidian Vault API.
- Attempt embedded-text extraction from selected PDF file nodes without bundling a PDF worker.
- Classify Canvas file references as Markdown, PDF, image, unsupported, or unknown.
- Build a structured `ContextPacket` with primary context, related context, and text limits.
- Include direct-neighbor related Canvas context from Canvas edges.
- Apply simple rule-based related-node scoring, sorting, and limiting.
- Configure Zhipu/OpenAI-compatible API settings from the plugin settings tab.
- Send external LLM requests through Obsidian `requestUrl`.
- Validate LLM responses and extract readable response text defensively.
- Write successful LLM output back into Canvas as native text/group/edge elements.

## Project Structure
- `src/main.ts`: plugin lifecycle, command flow, notices, and service orchestration
- `src/canvasTypes.ts`: Canvas runtime and Canvas file data types
- `src/contextTypes.ts`: structured context packet types
- `src/types.ts`: compatibility barrel for shared exported types
- `src/settings.ts`: plugin settings and settings tab
- `src/services/canvasService.ts`: active Canvas selection and active Canvas file access
- `src/services/canvasFileParser.ts`: defensive `.canvas` JSON parsing
- `src/services/canvasFileReferenceService.ts`: Canvas file-node classification, Markdown reading, and experimental PDF embedded-text extraction
- `src/services/canvasResultService.ts`: writes LLM summary UI elements back into the active Canvas
- `src/services/contextService.ts`: selected node extraction and context packet building
- `src/services/contextNodeBuilder.ts`: shared ContextPacket node construction
- `src/services/contextText.ts`: text normalization and compression
- `src/services/relatedContextService.ts`: direct-neighbor related context discovery, scoring, sorting, and limiting
- `src/services/llm/client.ts`: Obsidian-compatible external LLM request and response validation
- `src/services/llm/service.ts`: prompt/message assembly for LLM calls
- `src/services/llm/prompts.ts`: default system prompt
- `src/services/llm/types.ts`: LLM request and response types
- `src/services/llm/errors.ts`: reserved LLM error module
- `eslint.config.mts`: ESLint configuration for TypeScript and Obsidian plugin rules
### Implemented
- [x] Detect selected node(s) in Obsidian Canvas
- [x] Extract selected node text content
- [x] Save selected node information into variables
- [x] Classify selected Canvas file node references
- [x] Read Markdown file node content through the Obsidian Vault API
- [x] Track file content read / unsupported / missing / error / non-file status
- [x] Build a structured context packet from selected node data
- [x] Apply simple selected-node text limits to the structured context packet
- [x] Include direct-neighbor related context from Canvas edges
- [x] Apply simple rule-based related node scoring and sorting
- [x] Add initial external LLM API request flow
- [x] Add settings for API key, base URL, model, temperature, and max tokens
- [x] Validate and parse text response from API
- [x] Use Obsidian `requestUrl` for external API requests
- [x] Guard against sending selected nodes with no text or file content
- [x] Show minimal loading, success, and failure notices
- [x] Write LLM summary back into the active Canvas as a text node
- [x] Auto-size the generated summary node based on returned text
- [x] Create a group around selected nodes
- [x] Connect the selected-node group to the generated summary node

### In Progress
- [ ] Improve context extraction and selection rules for selected plain text Canvas nodes
- [ ] Improve context clipping and text budget behavior for long text node content
- [ ] Manually validate experimental embedded-text extraction from selected PDF file nodes
- [ ] Confirm when Obsidian's internal PDF.js API is available for plugin-side extraction
- [ ] Make related context range configurable from the current 1-hop baseline
- [ ] Improve related text node scoring and ranking rules
- [ ] Select more relevant related text nodes for the `ContextPacket`
- [ ] Tune generated Canvas node placement and sizing after manual UI testing

### Planned
- [ ] Add safer handling for Canvas refresh behavior after write-back
- [ ] Add configurable context size limits and clipping strategy
- [ ] Add configurable related-node limits and scoring weights
- [ ] Support richer related context selection beyond direct neighbors if needed
- [ ] Adapt non-text Canvas node recognition and extraction after text context management is improved
- [ ] Add explicit image, attachment, OCR, and multimodal adapters only after the text and file-reference pipeline is more reliable
- [ ] Add manual tests or fixtures for non-text Canvas node extraction before claiming support
- [ ] Improve generated group and edge layout after visual testing
- [ ] Add optional result metadata such as model, timestamp, or source selection summary
- [ ] Add focused tests or fixtures for Canvas packet and related-node ranking behavior

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
- Refactored canvas context logic into `contextService.ts`.

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

## Tech Stack
- TypeScript
- Obsidian Plugin API
- Node.js
- npm

## Next Steps
- Refine selected plain text node context clipping and selection behavior
- Make related context range configurable from the current 1-hop baseline
- Improve related text node scoring and ranking rules
- Manually verify Markdown and PDF file-node context behavior in Obsidian
- Confirm whether Obsidian's internal PDF.js API is available for plugin-side PDF embedded-text extraction
- Defer OCR, image, attachment, and multimodal extraction until the text and file-reference pipeline is more reliable
- Manually verify generated summary, group, and edge rendering in Obsidian Canvas
- Tune Canvas result placement and sizing based on real UI behavior

## Development Approach
This project is being developed iteratively.
Each iteration focuses on one small, testable feature before moving to the next step.

## Development Notes
- The current API integration is still experimental and may change as the request/response format is refined.
- External requests use Obsidian `requestUrl`.
- Some ESLint rules are temporarily adjusted to match the current development stage and implementation approach.
- The project is being built step by step with small testable iterations.
- New functionality should preserve a component-driven service structure, with responsibilities kept clearly separated across modules.
- Plain text Canvas nodes remain the current verified baseline.
- Markdown file node content reading is implemented through the Obsidian Vault API.
- PDF file node embedded-text extraction is experimental and depends on Obsidian's internal PDF.js API being available; scanned/image-only PDFs are not OCRed.
- Image, attachment, OCR, and multimodal node content extraction still require future design, implementation, and manual validation.
- Manual Obsidian Canvas testing is still required for UI refresh, group rendering, and edge rendering behavior.
- This project was developed iteratively with AI-assisted coding support for debugging, refactoring, and development acceleration, while the project scope, feature decisions, and integration logic were defined and reviewed manually.
