# Obsidian Canvas LLM Plugin

## Overview
This project is an Obsidian plugin that extracts information from selected Canvas nodes and sends the text to an external LLM-powered API for summarization and insight generation.

The goal of this project is to help users better understand their mind maps, discover possible connections between ideas, and think more deeply about their notes.

This project is written in TypeScript and uses the Obsidian Plugin API.

## Current Status
Early development / iterative build.

The plugin can already detect selected Canvas nodes and extract basic node information such as text content, position, size, and id.

## Features

### Implemented
- [x] Detect selected node(s) in Obsidian Canvas
- [x] Extract selected node text content
- [x] Save selected node information into variables
- [x] Build a basic text packet by concatenating selected node texts

### In Progress
- [ ] Send extracted text to external API
- [ ] Improve packet structure for LLM context
- [ ] Add logging and error handling

### Planned
- [ ] Read linked/related node context
- [ ] Display returned AI response inside Obsidian
- [ ] Context size control / token budget strategy
- [ ] Settings panel for API configuration

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
-Refactored canvas context logic into `contextService.ts`.


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
