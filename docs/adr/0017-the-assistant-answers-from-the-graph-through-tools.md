---
status: proposed
---

# The Assistant answers from the graph through tools; Research models are trained separately and never cited

Journalists will want to ask Grivei.ai questions in plain language ("who links this mayor's authority to this supplier?") and get back connections with the source documents behind them. We considered two ways to do it: a model trained or fine-tuned on the graph, or an existing model that calls the graph as tools. We chose tools for the **Assistant**, the journalist-facing feature. The graph's promise is that every link points to the document it came from. A trained model can't reliably cite where a fact came from and will invent plausible links, which for named people is a defamation risk (ADR 0009). It also can't hide Restricted content (ADR 0015), drop a name whose Publication window has ended (ADR 0016), or keep up with each Switchover (ADR 0004). We still want to train models on the data for research, such as Romanian procurement language, Signal discovery or entity matching. These **Research models** are allowed, but they are kept apart from the Assistant's answers.

## Considered Options

- **Train or fine-tune one "Grivei model" and let journalists query it directly:** rejected for the Assistant, for the reasons above. Kept as research (below).
- **Retrieval over document text only (plain RAG):** rejected as the whole answer. It finds documents but not paths through the graph, and the graph already finds connections deterministically.
- **An existing model with graph tools:** chosen.

## Consequences

- **Tools map to what the graph already has:**
  - per-source search (ADR 0005);
  - an entity's neighbours;
  - the path between two entities;
  - Signals for an entity;
  - fetching a Record and its source document.
- **The graph draws connections; the model explains them.** The model turns a question into tool calls, reads what comes back, and writes the answer. It never asserts a link that no tool returned.
- **Citations are checked in code.** Every claim carries the id of a Record, entity or source document. Code checks that each id came back from a tool call in the same session. A claim that fails the check is dropped or shown as unverified.
- **Visibility is enforced in the tool layer.** The tools read the API under the same `GRIVEI_RESTRICTED` switch as the explorer (ADR 0015). With the switch off they return no Restricted content, so the model can't leak what it never received.
- **Domain rules hold in answers too:** money measures are never summed across Sources (ADR 0014), identity is the confirmed CUI and never a name match (ADRs 0003, 0013), and ADR 0009's "Never named" list applies.
- **Private view first.** The Assistant runs only in a Private view until a set of real journalist questions, with expected answers and sources, passes. Putting it on the public host is a separate decision.
- **Research models:**
  - are trained only from rebuildable inputs (the graph, the Raw archive and the name sidecar), with the training set recorded, including which Data-through dates it covers;
  - may be trained on Restricted content (names past their Publication window, court parties, person links across Sources), since the model is itself Restricted. ADR 0009's "Never named" list and the no-CNP rule still apply, because that data is never held in the first place;
  - answer to erasure: model weights can't be edited like the name sidecar (ADR 0016), so when a person's data is erased or purged, every Research model whose recorded training set holds it is retrained without it or deleted;
  - are Restricted: used in a Private view or offline, never served on the public host;
  - are never a source of facts for the Assistant. Anything a Research model suggests reaches a journalist only after a tool confirms it and it passes the citation check.

## Open

1. Which model provider runs the Assistant, and what may be sent to it in a Private view (Restricted content leaving the host). To be settled by research before the Assistant is built.
