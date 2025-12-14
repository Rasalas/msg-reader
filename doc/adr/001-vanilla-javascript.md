# ADR 001: Vanilla JavaScript over Frameworks

## Status
Accepted

## Context
For an email reader application that parses and displays .msg and .eml files, a decision was needed on whether to use a JavaScript framework (React, Vue, Svelte, etc.) or vanilla JavaScript with ES Modules.

## Decision
Use vanilla JavaScript with ES Modules and no framework.

## Rationale

1. **Scope**: The application is relatively simple - file input, parsing, list display, and content rendering. This doesn't justify framework complexity.

2. **Bundle Size**: No framework runtime means smaller builds. The app loads quickly and works well on slower connections.

3. **Longevity**: Vanilla JS is stable. No framework version migrations, no breaking changes, no deprecation cycles.

4. **Debugging**: Direct DOM manipulation is easier to debug than virtual DOM abstractions.

5. **Learning Curve**: New contributors can understand the codebase without framework knowledge.

## Consequences

### Positive
- Small bundle size (~200KB including all dependencies)
- No build complexity from framework tooling
- Direct control over DOM updates
- Simple debugging with browser DevTools
- Long-term stability without framework churn

### Negative
- Manual state management (solved with MessageHandler class)
- No virtual DOM for list performance (mitigated with VirtualList implementation)
- More boilerplate for UI updates
- No component lifecycle hooks (solved with clear initialization patterns)

## Alternatives Considered

| Option | Reason for Rejection |
|--------|---------------------|
| React | Large runtime, overkill for scope |
| Vue | Additional build complexity |
| Svelte | Smaller community, less long-term stability |
| Preact | Still adds framework concepts for minimal benefit |
