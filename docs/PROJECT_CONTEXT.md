# Project context

## Project type
This is an Obsidian Community Plugin written in TypeScript.
It targets Canvas-based note workflows and sends selected Canvas content to an external LLM API.

## Current plugin workflow
The current workflow is approximately:

1. user selects one or more Canvas nodes
2. plugin extracts node information
3. plugin builds a basic context packet from selected text
4. plugin sends the packet to an external LLM API
5. plugin parses the returned text response

## Current implementation baseline
According to the current project documentation, the repository already includes:
- selected node detection
- selected node text extraction
- saving selected node info into variables
- basic text concatenation packet building
- initial external LLM API flow
- basic text response parsing

## Current status
This repository is in early development.
The project is being built iteratively, not through a large upfront architecture rewrite.

## Near-term development direction
The next development direction is to move from a plain text packet to a better structured context packet.
This means improving how context is selected, represented, limited, and sent.

## Important non-goals for now
At the current stage, the plugin is not trying to:
- understand the whole vault
- build a full graph reasoning engine
- create persistent agent memory
- perform large-scale semantic indexing
- become a general chatbot inside Obsidian

## Design principle
The plugin should stay understandable.
A user should be able to answer:
- what content was selected
- what extra context was included
- what was sent to the model
- why the result was generated
