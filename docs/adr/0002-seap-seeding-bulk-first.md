# SEAP seeding: bulk exports first, national crawl only for current-quarter award notices

Release 1 seeds SEAP nationally, from 2021-01-01 onward, from ADR's quarterly exports on data.gov.ro. The bulk is the record of truth for every closed quarter, and it replaces crawled rows by public code when it lands. The only crawl is a nightly, national, day-by-day pass over award notices and SCNA (with their contracts) for the quarter the bulk hasn't reached yet. Direct purchases are not crawled at all. They lag until their quarter's file appears, up to about 5 months, and the explorer shows each record type's data-through date so the lag is visible rather than hidden.

## Considered Options

- **Crawl everything** (per-authority sweeps of `api-pub`): rejected. Direct purchases can't be crawled nationally because of a 2,000-row cap, so every refresh would be a sweep of about 15k requests, plus a one-off mapping of about 15k CUIs to SEAP ids. All of it would run against an undocumented, Referer-checked API.
- **Bulk only**: rejected because contracts, where the large sums are, would be up to 5 months stale, while crawling them nationally costs about 1k requests a week.
- **Crawl current-quarter direct purchases too**: rejected for Release 1. Direct purchases are individually small, and the sweep is the most expensive and fragile part of the crawl.

## Consequences

- Each record keeps two dates. Publication date (how the bulk files are cut) assigns the quarter and sets the bulk/crawl boundary. Award or finalisation date drives aggregation and Signals.
- Crawled rows whose public code never shows up in the bulk are kept, tagged crawl-only, not deleted.
- Each bulk file is validated before loading, and a file that fails is quarantined. Each quarter loads all or nothing, and a re-uploaded quarter replaces that quarter wholesale. A known gap, like the mis-uploaded Q2 2025 DAN file, stays empty and shows as a gap.
- County and locality come from ANAF for every authority and supplier with a Romanian CUI. SEAP's per-entity endpoints are only a fallback.
- The earlier Brașov/Timișoara crawl batches are reseeded from bulk and kept only as a validation fixture.
