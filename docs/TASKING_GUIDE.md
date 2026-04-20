# Tasking guide for coding agents

## Good first tasks
Examples of safe first tasks:
- improve packet structure without changing the full request flow
- add types for selected Canvas nodes
- improve response parsing and fallback handling
- add small user-facing notices for success and failure
- isolate packet building into a helper if the current file is getting crowded
- add settings loading and validation for API configuration

## Tasks that require caution
Use caution before doing these:
- adding related-node traversal
- changing how Canvas selection is detected
- changing how requests are sent
- changing project structure
- introducing UI rendering for returned results

## Tasks to avoid by default
Avoid these unless explicitly requested:
- embeddings
- semantic retrieval systems
- memory stores
- autonomous agent behavior
- backend infrastructure
- sweeping architecture rewrites

## Recommended task pattern
When given a coding task, follow this order:
1. inspect the existing files involved
2. identify the smallest useful change
3. implement that change
4. preserve current behavior where possible
5. explain manual verification steps

## When proposing a plan
A good plan should include:
- files to inspect
- files to change
- smallest implementation step
- likely risks
- manual test method
