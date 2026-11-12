# Investigations are Grivei.ai's own cases, not a Source; only cited facts are public

Grivei.ai adds **Investigations**: cases that agents work up from a Signal, joining Sources and reading their source documents along a published playbook. They take on the desk and document side of the reporting job. An Investigation is not a Source. It is not a public registry, has no Connector, Coverage or placement rule, and is never a Release. Its public part holds only cited facts and Open questions. Its conclusions, the **Findings**, are never published and go only to named journalists. A Signal stays "worth verifying, never a conclusion", and an Investigation does not change that in public.

## Considered Options

- **Make Investigations a Source ("our own source")**: rejected. A Source is a public registry, and the release recipe (Connector, mandatory Coverage lens, placement rule, denominator) has nothing to attach to in agent-written cases.
- **Publish Findings**: rejected. A conclusion naming an organisation or person is where defamation (Civil Code arts. 72 and 75) and the limits of the art. 7 journalistic derogation bite hardest. Journalists who take a Finding further publish under their own responsibility.
- **Let agents do outward reporting** (right-of-reply letters, Law 544/2001 requests): rejected. Those actions are outward-facing and can't be undone. The agent drafts them and a human sends them.
- **Keep Explained Investigations private**: rejected. Once a weak Signal turns out to be innocent, the entities it touches are owed the explanation, as a courtesy, on the same pages that show the Signal.
- **Regenerate Investigations on every rebuild** (ADR 0004): rejected. Agent output isn't deterministic, and a published text must not change under its readers.

## Consequences

- **Opening and scope:**
  - A person opens an Investigation from a Signal or from a tip tied to an entity. Agents may keep an internal queue, but its ordering is never shown.
  - A new entity joins only through a strong key: a CUI, or ONRC name + birth date. A name-only link stays an Open question until a document confirms it.
- **Evidence:**
  - Every fact cites a source-document passage (with its fetched copy in the Raw archive) or a Record or entity page. Anything uncited is an Open question or is cut.
  - The playbook is a versioned methodology section, and each Investigation names the version it followed.
- **Outcomes:** **Explained** or **Unexplained**, never "suspicious" or "confirmed". Both are published once they pass the steps below.
  - A Signal keeps its count and gets a label linking to its Investigation.
- **Before publication:**
  - every organisation and Named person in the public part gets a **Right of reply**: 10 working days, with the answer, or its absence, published verbatim; the entity can add a statement but not block publication;
  - then **Editor sign-off**, which only a named human gives, never an agent.
- **Findings:**
  - each hand-off to a journalist or newsroom is recorded (who, when, which Investigation);
  - Grivei.ai never publishes a Finding, even after a story runs or a conviction; it may link to a published story as an external source.
- **ADR 0009 binds both layers:** only Named persons are named, and no family or friendship is inferred, even in a private Finding.
  - Until person-level Go-live, Investigations use organisation-level joins only, and people-based steps stay out of the public part.
- **Storage:** an Investigation is a versioned file outside the graph, pinned to the data-through dates it was written against.
  - A rebuild reloads it and never regenerates it.
  - When the data behind it changes, its page shows a notice instead of a silent edit.
- **Changes after publication:**
  - an Investigation is re-opened only on a new fact, as a new version, and earlier versions stay readable;
  - corrections follow ADR 0009's path and appear as a visible new version.
- **Legal gate:** no Investigation is published until the lawyer review and the DPIA from ADR 0009 cover Investigations, Findings and hand-offs.
- **Readers find them** on the entity, Record and Signal pages they touch and on an `/investigations` index. They have no search surface of their own (ADR 0005 is per Source).
- **Language:** written in Romanian, with an English translation reviewed at sign-off. Quoted source passages stay in Romanian.
