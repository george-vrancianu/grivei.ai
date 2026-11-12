# App code uses a UI library that wraps MUI

The explorer's frontend imports its components from an in-house UI library, never from MUI directly. The UI library is the only code that imports `@mui/*`. Each wrapped component exposes the MUI props of what it wraps, so app code keeps MUI's full API (props, `sx`, theme tokens) and gives up only the import. Above the wrapped MUI components, the frontend is organised in atomic levels (atoms, molecules, organisms, templates, pages). Every component lives in its own folder, and components are split into subcomponents wherever a part can stand alone.

The reasons: one place to set defaults, accessibility and bilingual behaviour; a single seam if MUI is upgraded or replaced; and components small and presentational enough to be built and mocked one at a time in a component workbench, in parallel with the backend ([Release 1 spec](https://github.com/george-vrancianu/grivei.ai/issues/37)).

## Considered Options

- **MUI directly in app code**: rejected. Defaults and fixes would be repeated at every call site, and an MUI upgrade would touch the whole app.
- **Wrappers with a narrowed, custom prop API**: rejected. It costs a design for every prop and blocks app code whenever a needed MUI prop wasn't anticipated. Passing MUI's props through keeps the wrapper thin.

## Consequences

- A lint rule forbids `@mui/*` imports outside the UI library, so the boundary holds without review.
- A component app code needs and the UI library lacks is added to the UI library first, as a wrapper.
- The conventions (atomic levels, folder shape, splitting, presentational components) live in `explorer/CLAUDE.md`.
