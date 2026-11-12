# A contract's URL is its award notice code plus its contract number

A SEAP Record page is citable, so its URL must name exactly one Record for good. A direct purchase (DA, DAN) is keyed by its public code: `/explore/record/DA35638732`. A contract is keyed by its award notice code and a slug of its contract number: `/explore/record/CAN1172752/123-14-07-2026`. This follows ADR 0002's amendment, which identifies a contract by award notice code and contract number. One award notice publishes several contracts (`CAN1172752` publishes two, at 328.35M and 306.00M RON), and the subsequent contracts under a framework can share its code (`CAN1145000`). An award notice is the document a contract comes from, not a Record of its own. Its bare code, `/explore/record/CAN1145000`, opens the list of its contracts, so a code pasted from SEAP always lands somewhere.

The slug is the contract number with its punctuation folded to hyphens. Duplicates within a notice get `-2`, `-3`, … in contract-date order, then by value. A blank number becomes `fara-numar`, with the same suffix rule.

## Considered Options

- **Public code alone**: rejected because it doesn't identify one Record for contracts.
- **Award notice page with contracts as anchors** (`/record/CAN1172752#2`): rejected because the fragment isn't part of the citable identity, and an ordinal changes when SEAP adds a contract.
- **A synthetic id**: rejected because readers can't build or recognise it from SEAP, and it would depend on the graph instead of the source.

## Consequences

- Every Record row shows the contract number beside the code, so two contracts under one notice can be told apart.
- A Go-to card on an exact notice code opens the notice's contract list, or the contract itself when there is only one.
- A slug can change if SEAP edits a contract number. The old slug then falls back to the notice's contract list rather than a dead page.
