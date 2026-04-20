# Acceptance checklist

Use this checklist before considering a task complete.

## Functional
- [ ] The plugin still loads in Obsidian.
- [ ] Existing command flow still works.
- [ ] Selected Canvas nodes can still be read.
- [ ] The LLM request flow still works or fails clearly.
- [ ] Response handling is more reliable than before, not less.

## Scope
- [ ] The change stays within the requested task.
- [ ] No unrelated architecture expansion was introduced.
- [ ] No heavy new dependency was added without justification.

## Code quality
- [ ] Types were improved or preserved.
- [ ] Error handling was considered.
- [ ] File responsibilities remain clear.
- [ ] `main.ts` did not become a dumping ground.

## UX
- [ ] User-facing errors are understandable.
- [ ] Debugging the change manually is possible.
- [ ] The plugin behavior is easier to reason about after the change.

## Verification
- [ ] Manual test steps are documented in the agent response.
- [ ] Changed files are listed clearly.
- [ ] Follow-up limitations are stated honestly.
