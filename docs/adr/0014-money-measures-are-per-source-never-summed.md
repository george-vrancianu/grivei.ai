# Money measures are per Source and never summed across Sources

Several Sources on the Release order carry an amount: SEAP (awarded value), PNRR (contracted and paid), State aid (aid granted), EU funds (contracted value and payments to beneficiaries), and Curtea de Conturi (prejudicii, which are auditor estimates). Each Source has its own **money measure**, fixed in its Release. The Money lens shows the chosen Source's measure only, one Source at a time, the same way search is per Source (ADR 0005). Measures are never added together, into a "total public money" or otherwise, and never shown on one scale. A Source without an amount, like portal.just.ro, declares a count lens instead. Decision: [ticket](https://github.com/george-vrancianu/grivei.ai/issues/125).

## Considered Options

- **One combined "public money" total per entity or county**: rejected. The measures are different facts. An award is not a payment, a grant overlaps the contracts it funds (an EU or PNRR beneficiary buys through SEAP with that money), and a prejudiciu is an estimate. Adding them double-counts and implies a figure no Source publishes.
- **A new lens type per Source**: rejected. The Money lens already works with any amount by county, so a Source only supplies its measure and its placement rule.

## Consequences

- An entity page shows each Source's amount in that Source's own section, labelled with its measure, and never as a page-wide total.
- When a recipient also appears as a supplier (aid, PNRR, firm donors), that overlap is entity-page context, never a sum and never a Signal by itself.
- Curtea de Conturi's prejudicii get their own Money lens measure, clearly labelled as auditor estimates. Abateri financiar-contabile are never summed.
