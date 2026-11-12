## Language

- **Code, comments, docs and commit messages:** English.
- **User-facing copy:** the landing page (`site/`) is bilingual, English by default with Romanian at `/ro/`. See `site/CLAUDE.md`.
- Romanian source data stays as it is (institution names, SEAP fields, document titles); don't translate data, only the prose around it.

## Explorer frontend

- **Before writing frontend code:** read `explorer/CLAUDE.md` (UI library wrapping MUI, atomic components; ADR 0006).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `george-vrancianu/grivei.ai` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
