# PROTOTYPE: explorer GraphQL schema (throwaway)

Draft SDL for the wayfinder ticket "GraphQL schema: what the explorer API exposes" (#33).
Never merged; the decision lives in the ticket's resolution comment.

- `schema.graphql`: the draft.
- `screens.graphql`: one operation per decided screen (main screen, zoomed county,
  entity Overview / Records / Relationships, Record page, Coverage).
- `validate.mjs`: `npm i graphql && node validate.mjs` builds the schema and validates every screen against it.

Open decisions are marked `# Q<n>` in the SDL and put to the user in the ticket session.
