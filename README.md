# Grivei.ai

Public procurement as an explorable network.

Grivei.ai is a public-money watchdog. It takes large public databases and uses agents to connect the dots: contracts, firms and officials in one Postgres graph, with every link tied to its source document.

## Status

Research phase. The first source, public procurement from SEAP, is harvested and loaded into the graph. Which Sources come next is being mapped; person-level Sources wait on an entity-linking policy. Results so far are signals to verify in the source documents, not conclusions.

## What's here

- [`watchdog/`](watchdog/): the project itself. SEAP harvester and loader, Postgres schema and views, export tools, graph viewers, diagrams and the first reports. See [`watchdog/README.md`](watchdog/README.md).
- [`site/`](site/): the landing page for [grivei.ai](https://grivei.ai/), a static "under construction" page in English and Romanian. See [`site/README.md`](site/README.md).

## More

- [Work in progress on my portfolio](https://george.vrancianu.eu/work-in-progress/)
- Built by [George Vrancianu](https://github.com/george-vrancianu)
