---
domain: coding
category: fantasy-bros
date-created: 2026-08-30
date-revised: 2026-08-30
type: plan
status: DONE
aliases:
tags:
---

# 2026-08-30-fantasypros-api-integration

## goal

Add a safe FantasyPros public API ingestion path to the NFL Google Sheet, add a historical NFL performance view, and document the full set of questions that the documented public API can answer. The existing official NFL Draft tracker remains unchanged and authoritative for draft results.

## evidence

FantasyPros v2 is a read-only JSON API at `https://api.fantasypros.com/public/v2/json` authenticated with an `x-api-key` header. Its documented API has player, news, injury, player-comparison, rankings, consensus rankings, expert, projection, NFL player-points, and MLB lineup endpoints. It documents NFL, MLB, NBA, NHL, PGA, and NCAAF sport keys, but the current workbook is NFL-specific. Season-scoped data supports seasons from 2012 onward, while the NFL player-points endpoint provides weekly values, total points, games, and averages for a selected season and scoring mode.

## scope

- Implement NFL ingestion only. Support for other sports remains documented in the question catalog but is not wired into the NFL workbook.
- Use `PropertiesService.getScriptProperties()` for the API key. The key is never written to a sheet, source file, log row, test fixture, or documentation example.
- Add manual menu actions only. No recurring FantasyPros trigger is installed because the public documentation does not state a rate limit or refresh allowance.
- Persist source tables in script-managed `FantasyPros-*` tabs, preserving the existing draft surfaces and user-owned fantasy-league inputs.
- Build `FantasyPros History` from stored player-point facts so historical comparisons work offline after a successful import.

## data-contract

The latest NFL refresh retrieves player metadata, rankings, PPR consensus rankings, preseason projections, current injuries, and recent news. Historical import retrieves NFL player points for every requested season and scoring mode `STD`, `HALF`, and `PPR`. Each request validates HTTP 200 and required array shape before any target tab is replaced. A failed request leaves existing stored data intact, reports a source-specific error, and never includes the key in its message.

## workbook-surfaces

`FantasyPros Players`, `FantasyPros Rankings`, `FantasyPros Consensus`, `FantasyPros Projections`, `FantasyPros Injuries`, and `FantasyPros News` hold the most recent normalized NFL data. `FantasyPros Player Points` stores append-safe season, scoring, player, total, average, and week-level JSON facts. `FantasyPros History` summarizes player points across imported seasons and provides a sortable historical table. `Update Log` records the refresh state and provider base URL.

## verification

The Node harness will verify request construction, missing-key refusal, response validation, normalized row shapes, no-write-on-failure behavior, replacement-safe latest refresh, append-safe historical import, and historical summary construction. Verification also includes `node --check < apps-script/code.gs`, the full Node test suite, and a review of the question catalog against the downloaded official OpenAPI specification.

## implementation-findings

The initial historical-import test failed after a second import because the import loop appended the header returned for each of the three scoring modes. The failure was reproduced by the `FantasyPros historical import replaces requested seasons and builds a PPR history view` test, which returned six rows instead of four. The importer now starts with one canonical header and appends only each response's data rows. It also ignores empty rows left by `clearContent()` before deduplication.

Independent review verified that the ranking normalizer initially expected a legacy response shape. The official `PlayerRanking` schema uses `id`, `team_id`, and `positions`, while its `PlayerRank` object uses uppercase `ECR`, `ECR_MIN`, `ECR_MAX`, `ECR_STD`, and `ADP` metric maps. The normalizer and its test fixture now use those documented fields, selecting the `ALL` metric from each map for the current all-position import.

The same review confirmed that the documented injury schema uses `name` and `injury_type`, not `player_name` or `practice_report_injury_type`, and does not guarantee a team or position field. The injury normalizer and catalog now reflect that contract. Review also found a data-loss race: two historical imports could read the same old fact table and each overwrite the other's new season range. The historical import now acquires the document lock across its full read, fetch, merge, replace, and history-build operation, with a regression test proving a locked import makes no request or write.

A follow-up review confirmed that consensus rankings use a separate documented player shape with flat `rank_ecr` values, so the workbook now uses a dedicated consensus normalizer and fixture. It also found that general ranking metrics may be nested by scoring key. The ranking normalizer now emits one row for every documented scoring metric that contains an `ALL` value, preserving those variants instead of discarding them.

## risks-and-non-goals

The public API does not expose a user's private fantasy-league roster, matchup, transaction, waiver, or draft history. Those questions require a league-host API or an imported league export and are explicitly excluded. Historical depth depends on the provider returning records for the requested season and on the API key's entitlement. The first import is intentionally manual so the commissioner controls quota use.
