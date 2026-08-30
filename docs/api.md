# api

## official-nfl-source-contract

The source URL is `https://www.nfl.com/draft/tracker/2026/prospects`. `fetchOfficialDraftSnapshot_` requests server-rendered HTML, extracts Next Flight payloads, reads the `useFetchProspectsProfiles` and `useFetchExperienceTeams` query state, and outputs round, pick, overall pick, team, and player values.

## validation-and-failure-handling

The parser requires HTTP 200, at least 250 prospect profiles, rounds one through seven, positive integer pick numbers, unique overall picks, nonempty team and player values, and no more than 257 selections. A snapshot smaller than the last known good player count is rejected. A failed fetch or validation never clears or overwrites `Players-Draft Tracker!A2:E258`.

## execution

The authorized time-driven trigger calls `scheduledDraftRefresh` once per minute. Manual refresh calls `refreshDraftNow`. LockService prevents overlap. Each success, error, skip, duration, pick count, changed-row count, source URL, and hash is appended to `Update Log!A:H`.

## fantasypros-public-api

FantasyPros public v2 is a read-only JSON service at `https://api.fantasypros.com/public/v2/json`. Every request sends the `x-api-key` header from the Apps Script property `fantasyProsApiKey`; the key is never stored in a sheet, code, log, or documentation example. The integration uses only NFL endpoints: players, rankings, consensus rankings, projections, injuries, news, and player points. The full provider coverage and analytical boundary are documented in [fantasypros-question-catalog](fantasypros-question-catalog.md).

## fantasypros-execution-and-history

`Refresh FantasyPros NFL data` manually replaces the latest normalized `FantasyPros Players`, `FantasyPros Rankings`, `FantasyPros Consensus`, `FantasyPros Projections`, `FantasyPros Injuries`, and `FantasyPros News` tables only after every response validates. `Import FantasyPros NFL history` asks for an inclusive season range from 2012 through the last completed season, imports `STD`, `HALF`, and `PPR` player-point facts, and rebuilds `FantasyPros History` from PPR totals. No FantasyPros time-driven trigger is installed because its public documentation does not declare a refresh allowance or rate limit.
