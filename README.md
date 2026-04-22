# Obsidian Canvas LLM Plugin

## Overview
This project is an Obsidian plugin that extracts information from selected Canvas nodes and sends the text to an external LLM-powered API for summarization and insight generation.

The goal of this project is to help users better understand their mind maps, discover possible connections between ideas, and think more deeply about their notes.

This project is written in TypeScript and uses the Obsidian Plugin API.

## Current Status
Early development / iterative build.

The plugin can already detect selected Canvas nodes and extract basic node information such as text content, position, size, and id. And build a simple context packet, and send it to an external LLM API. Basic response parsing and error handling are being added.

## Features

## Project Structure
- `src/main.ts`: plugin entry point
- `src/services/contextService.ts`: canvas node extraction and packet building
- `src/services/llm/client.ts`: external LLM API request and response parsing
- `eslint.config.mts`: ESLint configuration for TypeScript and Obsidian plugin rules
### Implemented
- [x] Detect selected node(s) in Obsidian Canvas
- [x] Extract selected node text content
- [x] Save selected node information into variables
- [x] Build a basic text packet by concatenating selected node texts
- [x] Add initial external LLM API request flow
- [x] Parse basic text response from API

### In Progress
- [ ] Improve packet structure for LLM context
- [ ] Improve response validation and fallback handling
- [ ] Render returned AI response inside Obsidian
- [ ] Clean up lint / Obsidian-specific request rules

### Planned
- [ ] Read linked/related node context
- [ ] Display returned AI response inside Obsidian
- [ ] Context size control / token budget strategy
- [ ] Settings panel for API configuration
- [ ] Better UI feedback for loading / errors

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

## Tech Stack
- TypeScript
- Obsidian Plugin API
- Node.js
- npm

## Next Steps
- Finish basic API request flow
- Validate returned response
- Render the result inside Obsidian
- Expand from plain text packet to structured context packet

## Development Approach
This project is being developed iteratively.
Each iteration focuses on one small, testable feature before moving to the next step.

## Development Notes
- The current API integration is still experimental and may change as the request/response format is refined.
- Obsidian-specific lint rules and request patterns are being reviewed during development.
- Some ESLint rules are temporarily adjusted to match the current development stage and implementation approach.
- The project is being built step by step with small testable iterations.
- This project was developed iteratively with AI-assisted coding support for debugging, refactoring, and development acceleration, while the project scope, feature decisions, and integration logic were defined and reviewed manually.
