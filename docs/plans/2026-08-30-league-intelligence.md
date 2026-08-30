---
domain: coding
category: fantasy-bros
date-created: 2026-08-30
date-revised: 2026-08-30
type: plan
status: INPRG
aliases:
tags:
---

# 2026-08-30-league-intelligence

## goal

Build a league-aware fantasy-football intelligence layer that combines provider player data, explicitly selected podcast and article sources, and direct ESPN league state to produce evidence-backed lineup, waiver, trade, and matchup findings. Generic ESPN editorial material is out of scope unless it is directly connected to the user's league state.

## evidence

Fantasy Football Today presents start-sit, waiver-wire, trade, and listener-question analysis on its official podcast page. The Fantasy Footballers publishes daily fantasy-football analysis covering rankings, start-sit, waiver, trade, and injury topics on its official site. Both expose regularly refreshed episode and article listings. FantasyPros provides player rankings, projections, news, injuries, and historical points, but does not provide private-league state. ESPN league access can supply the roster, matchup, waiver, transaction, and settings context required to make advice league-specific, subject to public visibility or private-league authorization.

## scope

- Define normalized, time-aware metadata for sources, source items, extracted findings, player identities, league snapshots, availability, recommendations, evidence, and outcomes.
- Ingest source-item metadata and publisher-provided descriptions from Fantasy Football Today and The Fantasy Footballers, then send authorized audio processing to a user-controlled local machine or VPS.
- Require a direct ESPN league snapshot before creating a lineup, waiver, or opponent-specific recommendation.
- Join provider player data and editorial claims through canonical player identity records, retaining source attribution and time validity.
- Separate factual state, source opinion, inferred recommendation, and commissioner action so each can be inspected and corrected independently.

## non-goals

- Do not submit ESPN lineup changes, waiver claims, trades, or other mutations.
- Do not use ESPN editorial content as a generic source of advice.
- Do not make a recommendation if the player match, league snapshot, scoring rules, or source evidence is missing or stale.
- Do not store ESPN session cookies, FantasyPros keys, or a transcription-provider key in code, sheets, logs, or documentation.

## delivery-slices

1. Metadata schema and source registry: document canonical entities, keys, relations, freshness rules, evidence requirements, and question-to-data routing.
2. Source ingestion: import current episode and article metadata plus publisher-provided descriptions, deduplicate source items, and write reviewable source records.
3. League context: ingest selected ESPN league settings, teams, rosters, schedule, transactions, waiver state, and player availability when authorized.
4. Findings and recommendations: extract attributable player claims, bind them to league context, and publish a recommendation queue with confidence, conflicts, and evidence links.
5. Evaluation: capture the decision taken and later outcome so recommendation quality can be audited rather than assumed.

## verification

Every ingestion path needs fixtures covering a valid source item, duplicate suppression, unknown player resolution, stale league context, missing secret refusal, private-league authorization failure, and conflicting source claims. Recommendation generation must be tested to reject incomplete or stale league context. The final implementation requires a full relevant Node suite, a clean diff, and an independent review of the schema, source provenance, and secret handling.

## implementation-findings

Independent review found that the first schema draft could not validate transcript provenance because it used an ambiguous content hash. It also omitted extraction-run lineage on transcript-derived findings, a season-aware mapping to identify the connected user's team, team-level waiver priority or budget, and a versioned source freshness policy. The schema now records explicit hashes and retrieval time, extraction lineage, a league membership record, team-scoped waiver state, and policy-versioned time-to-live fields before a recommendation engine is built.

The re-review found that article source items cannot require podcast-audio fields and that freshness-policy provenance needs a persistable field on each recommendation input. The schema now separates optional audio artifacts from source items and binds every time-sensitive recommendation input to its freshness policy.

## dependencies

- The user must provide the ESPN sport, season, league ID, and public or private visibility. Private access requires user-managed session credentials stored locally as Script Properties, never sent in chat.
- The user selected local or VPS transcript extraction. That worker must retain audio and full transcript artifacts outside Apps Script and Git, then return timestamped structured findings and permitted excerpts through a validated import contract.
- The current project uses Google Apps Script, so background polling must remain manual until a rate-limit, refresh frequency, and API-cost decision is recorded.
