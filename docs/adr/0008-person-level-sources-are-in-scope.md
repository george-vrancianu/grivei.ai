# Person-level Sources are in scope; their Go-live waits on a legal posture and a linking policy

Until now, a Source whose subjects are people was blocked on an entity-linking map, and person-level data was out of scope. We lift that gate. People Sources (ONRC company administrators first, then AEP's individual donors and the parties on portal.just.ro) are planned and built through the normal [release recipe](../release-recipe.md). Two decisions must be in place before any of them reaches **Go-live**, not before work starts: the legal posture for person-level data ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/122)) and the entity-linking policy ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/124)). The reason: ONRC's open files name about 3.1M administrators with date and place of birth, which is a far safer person key than names alone. Most of the cross-Source Signals worth having run through people. And the [legal research](https://github.com/george-vrancianu/grivei.ai/issues/121) shows the risk is in what gets published, not in building the pipeline.

## Considered Options

- **Keep the gate until the entity-linking map lands**: rejected, because it serialised every people Source behind one design effort, even ONRC, where the person key is strongest.
- **Lift it with no Go-live check**: rejected, because donors and criminal-case parties are special-category data, and Law 190/2018's exemption does not cover private individuals.

## Consequences

- ONRC can become an explorable Source with its administrators, and is the leading Release 2 candidate (the order is decided [here](https://github.com/george-vrancianu/grivei.ai/issues/125)).
- ANI stays dropped. That is for legal and access reasons (CCR Decision 297/2025, Law 180/2026), not because of the gate ([research](https://github.com/george-vrancianu/grivei.ai/issues/114)).
- ADR 0003 still holds: CNPs are never stored or shown, and natural-person SEAP suppliers stay "Persoană fizică".
